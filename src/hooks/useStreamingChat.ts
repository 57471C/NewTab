import { useState } from "react";
import { getProviderConfig, resolveProvider } from "../lib/api-providers";
import { appendMessage, db } from "../lib/db";
import { extractTokenFromChunk } from "../lib/streaming";
import { vault } from "../lib/vault";

export function useStreamingChat() {
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamingContent, setStreamingContent] = useState("");
	const [streamingChatId, setStreamingChatId] = useState<string | null>(null);

	const streamChat = async (
		prompt: string,
		model: string,
		chatId = "default",
	) => {
		setIsStreaming(true);
		setStreamingContent("");
		setStreamingChatId(chatId);
		let apiKey: string | null = null;
		let assistantContent = "";
		try {
			const provider = resolveProvider(model);
			apiKey = await vault.get(provider);
			if (!apiKey) {
				throw new Error(
					`API key for ${provider} is missing. Please configure it in settings.`,
				);
			}

			const prior = await db.messages
				.where("chatId")
				.equals(chatId)
				.sortBy("timestamp");

			await appendMessage(chatId, "user", prompt);

			const { endpoint, headers, payload } = getProviderConfig(model, apiKey, [
				...prior.map((message) => ({
					role: message.role,
					content: message.content,
				})),
				{ role: "user", content: prompt },
			]);

			let finalError: Error | null = null;
			const decoder = new TextDecoder("utf-8");
			let streamBuffer = "";

			const processChunk = (chunk: string) => {
				streamBuffer += chunk;
				const lines = streamBuffer.split("\n");
				streamBuffer = lines.pop() ?? "";
				let hasUpdates = false;

				for (const line of lines) {
					if (line.trim() === "" || line.includes("[DONE]")) continue;
					if (line.startsWith("data:")) {
						try {
							const data = JSON.parse(line.slice(5).trim());
							const token = extractTokenFromChunk(model, data);
							assistantContent += token;
							hasUpdates = true;
						} catch (e) {
							console.error("Failed to parse stream JSON:", e);
						}
					}
				}

				if (hasUpdates) {
					setStreamingContent(assistantContent);
				}
			};

			if (provider === "Claude" && typeof chrome !== "undefined" && chrome.runtime) {
				await new Promise<void>((resolve, reject) => {
					const port = chrome.runtime.connect({ name: "anthropic-proxy" });
					port.postMessage({
						action: "stream",
						endpoint,
						headers,
						body: JSON.stringify(payload),
					});

					port.onMessage.addListener(async (msg) => {
						if (msg.type === "error") {
							finalError = new Error(msg.error);
							reject(finalError);
							port.disconnect();
						} else if (msg.type === "chunk") {
							processChunk(msg.value);
						} else if (msg.type === "done") {
							await appendMessage(chatId, "assistant", assistantContent);
							resolve();
						}
					});

					port.onDisconnect.addListener(() => {
						resolve();
					});
				});
			} else {
				const response = await fetch(endpoint, {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					const errorTxt = await response.text();
					finalError = new Error(`API Error: ${response.status} - ${errorTxt}`);
					throw finalError;
				}

				const reader = response.body?.getReader();
				if (!reader) throw new Error("No response body");

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					const chunk = decoder.decode(value, { stream: true });
					processChunk(chunk);
				}

				await appendMessage(chatId, "assistant", assistantContent);
			}
		} catch (error: unknown) {
			let errorMessage =
				error instanceof Error ? error.message : "Unknown failure";

			if (apiKey) {
				errorMessage = errorMessage.replaceAll(apiKey, "[REDACTED]");
			}

			let errorLog = error;
			if (error instanceof Error && apiKey) {
				const sanitizedError = new Error(errorMessage);
				sanitizedError.stack = error.stack?.replaceAll(apiKey, "[REDACTED]");
				errorLog = sanitizedError;
			} else if (typeof error === "string" && apiKey) {
				errorLog = error.replaceAll(apiKey, "[REDACTED]");
			} else if (apiKey) {
				try {
					errorLog = JSON.parse(
						JSON.stringify(error).replaceAll(apiKey, "[REDACTED]"),
					);
				} catch {
					errorLog = String(error).replaceAll(apiKey, "[REDACTED]");
				}
			}
			console.error("Chat streaming error:", errorLog);

			const contentWithErr = `${assistantContent}\n\nError: ${errorMessage}`;
			setStreamingContent(contentWithErr);

			await appendMessage(chatId, "assistant", contentWithErr);
		} finally {
			setIsStreaming(false);
			setStreamingChatId(null);
			setStreamingContent("");
		}
	};

	return { streamChat, isStreaming, streamingContent, streamingChatId };
}
