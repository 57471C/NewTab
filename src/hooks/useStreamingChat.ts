import { useState } from "react";
import { getProviderConfig } from "../lib/api-providers";
import { db } from "../lib/db";
import { extractTokenFromChunk } from "../lib/streaming";
import { vault } from "../lib/vault";

export function useStreamingChat() {
	const [isStreaming, setIsStreaming] = useState(false);

	const streamChat = async (
		prompt: string,
		model: string,
		chatId = "default",
	) => {
		setIsStreaming(true);
		let apiKey: string | null = null;
		try {
			const provider = model.startsWith("grok") ? "Grok" : model;
			apiKey = await vault.get(provider);
			if (!apiKey) {
				throw new Error(
					`API key for ${model} is missing. Please configure it in settings.`,
				);
			}

			await db.messages.add({
				chatId,
				role: "user",
				content: prompt,
				timestamp: Date.now(),
			});

			const assistantMsgId = await db.messages.add({
				chatId,
				role: "assistant",
				content: "",
				timestamp: Date.now(),
			});

			const { endpoint, headers, payload } = getProviderConfig(
				model,
				apiKey,
				prompt,
			);

			let assistantContent = "";
			let updatePromise = Promise.resolve();
			let pendingContent = "";
			let isUpdating = false;
			const decoder = new TextDecoder("utf-8");

			const processChunk = (chunk: string) => {
				const lines = chunk.split("\n");
				let hasUpdates = false;

				for (const line of lines) {
					if (line.trim() === "" || line.includes("[DONE]")) continue;
					if (line.startsWith("data:")) {
						try {
							const data = JSON.parse(line.slice(5).trim());
							const token = extractTokenFromChunk(model, data);
							assistantContent += token;
							hasUpdates = true;
							// biome-ignore lint/correctness/noUnusedVariables: the agent insists this try/catch is necessary to handle partial JSON from stream chunks, pending a more robust streaming implementation
						} catch (e) {
							// Discard incomplete JSON fragments across stream chunks
						}
					}
				}

				if (hasUpdates) {
					pendingContent = assistantContent;
					if (!isUpdating) {
						isUpdating = true;
						updatePromise = updatePromise.then(async () => {
							while (true) {
								const currentContent = pendingContent;
								try {
									await db.messages.update(assistantMsgId, {
										content: currentContent,
									});
								} catch (e) {
									console.error("Stream DB write error:", e);
								}
								if (pendingContent === currentContent) {
									isUpdating = false;
									break;
								}
							}
						});
					}
				}
			};

			if (
				model === "Claude" &&
				typeof chrome !== "undefined" &&
				chrome.runtime
			) {
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
							reject(new Error(msg.error));
							port.disconnect();
						} else if (msg.type === "chunk") {
							processChunk(msg.value);
						} else if (msg.type === "done") {
							await updatePromise;
							const finalMsg = await db.messages.get(assistantMsgId);
							if (finalMsg && pendingContent !== finalMsg.content) {
								await db.messages.update(assistantMsgId, {
									content: pendingContent,
								});
							}
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
					throw new Error(`API Error: ${response.status} - ${errorTxt}`);
				}

				const reader = response.body?.getReader();
				if (!reader) throw new Error("No response body");

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					const chunk = decoder.decode(value, { stream: true });
					processChunk(chunk);
				}
				await updatePromise;
				const finalMsg = await db.messages.get(assistantMsgId);
				if (finalMsg && pendingContent !== finalMsg.content) {
					await db.messages.update(assistantMsgId, {
						content: pendingContent,
					});
				}
			}
		} catch (error: unknown) {
			let errorMessage =
				error instanceof Error ? error.message : "Unknown failure";

			if (apiKey) {
				errorMessage = errorMessage.split(apiKey).join("[REDACTED]");
			}

			let errorLog = error;
			if (error instanceof Error && apiKey) {
				const sanitizedError = new Error(errorMessage);
				sanitizedError.stack = error.stack?.split(apiKey).join("[REDACTED]");
				errorLog = sanitizedError;
			} else if (typeof error === "string" && apiKey) {
				errorLog = error.split(apiKey).join("[REDACTED]");
			}
			console.error("Chat streaming error:", errorLog);
			await db.messages.add({
				chatId,
				role: "system",
				content: `Error: ${errorMessage}`,
				timestamp: Date.now(),
			});
		} finally {
			setIsStreaming(false);
		}
	};

	return { streamChat, isStreaming };
}
