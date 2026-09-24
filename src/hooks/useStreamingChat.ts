import { useRef, useState } from "react";
import { formatApiError, formatCaughtError } from "../lib/api-errors";
import { getProviderConfig, resolveProvider } from "../lib/api-providers";
import { attachmentNote, type ChatAttachment } from "../lib/attachments";
import { appendMessage, db } from "../lib/db";
import { prefs } from "../lib/prefs";
import { extractTokenFromChunk } from "../lib/streaming";
import { vault } from "../lib/vault";

function isAbortError(error: unknown) {
	return (
		(error instanceof DOMException && error.name === "AbortError") ||
		(error instanceof Error && error.name === "AbortError")
	);
}

export function useStreamingChat() {
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamingContent, setStreamingContent] = useState("");
	const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const portRef = useRef<chrome.runtime.Port | null>(null);

	const stopChat = () => {
		abortRef.current?.abort();
		portRef.current?.disconnect();
	};

	const streamChat = async (
		prompt: string,
		model: string,
		chatId = "default",
		attachments: ChatAttachment[] = [],
	) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setIsStreaming(true);
		setStreamingContent("");
		setStreamingChatId(chatId);
		let apiKey: string | null = null;
		let assistantContent = "";
		let aborted = false;
		try {
			const [ollamaHost, ollamaModel, slots] = await Promise.all([
				prefs.getOllamaHost(),
				prefs.getOllamaModel(),
				prefs.getModelSlots(),
			]);
			const provider = resolveProvider(model, slots);
			if (provider !== "Ollama") {
				apiKey = await vault.get(provider);
				if (!apiKey) {
					throw new Error(
						`API key for ${provider} is missing. Please configure it in settings.`,
					);
				}
			} else {
				apiKey = "";
			}

			const prior = await db.messages
				.where("chatId")
				.equals(chatId)
				.sortBy("timestamp");

			const storedPrompt = `${prompt}${attachmentNote(attachments)}`.trim();
			await appendMessage(chatId, "user", storedPrompt);

			const { endpoint, headers, payload } = getProviderConfig(
				model,
				apiKey,
				[
					...prior.map((message) => ({
						role: message.role,
						content: message.content,
					})),
					{ role: "user", content: prompt, attachments },
				],
				{ ollamaHost, ollamaModel, slots },
			);

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

			if (
				provider === "Claude" &&
				typeof chrome !== "undefined" &&
				chrome.runtime
			) {
				await new Promise<void>((resolve, reject) => {
					const port = chrome.runtime.connect({ name: "anthropic-proxy" });
					portRef.current = port;
					port.postMessage({
						action: "stream",
						endpoint,
						headers,
						body: JSON.stringify(payload),
					});

					const onAbort = () => {
						aborted = true;
						port.disconnect();
						resolve();
					};
					if (controller.signal.aborted) {
						onAbort();
						return;
					}
					controller.signal.addEventListener("abort", onAbort, { once: true });

					port.onMessage.addListener(async (msg) => {
						if (msg.type === "error") {
							reject(new Error(msg.error));
							port.disconnect();
						} else if (msg.type === "chunk") {
							processChunk(msg.value);
						} else if (msg.type === "done") {
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
					signal: controller.signal,
				});

				if (!response.ok) {
					const errorTxt = await response.text();
					throw new Error(formatApiError(response.status, errorTxt));
				}

				const reader = response.body?.getReader();
				if (!reader) throw new Error("No response body");

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						const chunk = decoder.decode(value, { stream: true });
						processChunk(chunk);
					}
				} catch (error) {
					if (isAbortError(error) || controller.signal.aborted) {
						aborted = true;
					} else {
						throw error;
					}
				}
			}

			if (assistantContent) {
				await appendMessage(chatId, "assistant", assistantContent);
			} else if (aborted || controller.signal.aborted) {
				await appendMessage(chatId, "assistant", "(stopped)");
			}
		} catch (error: unknown) {
			if (isAbortError(error) || controller.signal.aborted) {
				if (assistantContent) {
					await appendMessage(chatId, "assistant", assistantContent);
				}
			} else {
				const errorMessage = formatCaughtError(error);

				let errorLog = error;
				if (error instanceof Error && apiKey) {
					const sanitizedError = new Error(
						error.message.replaceAll(apiKey, "[REDACTED]"),
					);
					sanitizedError.stack = error.stack?.replaceAll(apiKey, "[REDACTED]");
					errorLog = sanitizedError;
				}
				console.error("Chat streaming error:", errorLog);

				const contentWithErr = assistantContent
					? `${assistantContent}\n\n${errorMessage}`
					: errorMessage;
				setStreamingContent(contentWithErr);

				await appendMessage(chatId, "assistant", contentWithErr);
			}
		} finally {
			portRef.current = null;
			if (abortRef.current === controller) abortRef.current = null;
			setIsStreaming(false);
			setStreamingChatId(null);
			setStreamingContent("");
		}
	};

	return {
		streamChat,
		stopChat,
		isStreaming,
		streamingContent,
		streamingChatId,
	};
}
