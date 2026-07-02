import { useState } from "react";
import { db } from "../lib/db";
import { vault } from "../lib/vault";

export function useStreamingChat() {
	const [isStreaming, setIsStreaming] = useState(false);

	const streamChat = async (
		prompt: string,
		model: string,
		chatId = "default",
	) => {
		setIsStreaming(true);
		try {
			const provider = model.startsWith("grok") ? "Grok" : model;
			const apiKey = await vault.get(provider);
			if (!apiKey) {
				throw new Error(
					`API key for ${model} is missing. Please configure it in settings.`,
				);
			}

			// We bypass strict typing here temporarily to support dynamic DB injection
			// biome-ignore lint/suspicious/noExplicitAny: Dexie schema might not be strictly typed locally yet
			const database = db as any;

			await database.messages.add({
				chatId,
				role: "user",
				content: prompt,
				timestamp: Date.now(),
			});

			const assistantMsgId = await database.messages.add({
				chatId,
				role: "assistant",
				content: "",
				timestamp: Date.now(),
			});

			let endpoint = "";
			let payload: Record<string, unknown> = {};
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};

			if (model.startsWith("grok")) {
				endpoint = "https://api.x.ai/v1/chat/completions";
				headers.Authorization = `Bearer ${apiKey}`;
				payload = {
					model: model,
					stream: true,
					messages: [{ role: "user", content: prompt }],
				};
			} else if (model === "GPT-4") {
				endpoint = "https://api.openai.com/v1/chat/completions";
				headers.Authorization = `Bearer ${apiKey}`;
				payload = {
					model: "gpt-4o",
					stream: true,
					messages: [{ role: "user", content: prompt }],
				};
			} else if (model === "Claude") {
				endpoint = "https://api.anthropic.com/v1/messages";
				headers["x-api-key"] = apiKey;
				headers["anthropic-version"] = "2023-06-01";
				payload = {
					model: "claude-3-5-sonnet-latest",
					stream: true,
					max_tokens: 1024,
					messages: [{ role: "user", content: prompt }],
				};
			} else if (model === "Gemini") {
				endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
				payload = {
					contents: [{ parts: [{ text: prompt }] }],
				};
			}

			let assistantContent = "";
			const decoder = new TextDecoder("utf-8");

			const processChunk = async (chunk: string) => {
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.trim() === "" || line.includes("[DONE]")) continue;
					if (line.startsWith("data:")) {
						try {
							const data = JSON.parse(line.slice(5).trim());
							let token = "";

							if (model.startsWith("grok") || model === "GPT-4") {
								token = data.choices[0]?.delta?.content || "";
							} else if (model === "Claude") {
								if (data.type === "content_block_delta") {
									token = data.delta?.text || "";
								}
							} else if (model === "Gemini") {
								token = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
							}

							assistantContent += token;
							await database.messages.update(assistantMsgId, {
								content: assistantContent,
							});
							// biome-ignore lint/correctness/noUnusedVariables: the agent insists this try/catch is necessary to handle partial JSON from stream chunks, pending a more robust streaming implementation
						} catch (e) {
							// Discard incomplete JSON fragments across stream chunks
						}
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
							await processChunk(msg.value);
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
					await processChunk(chunk);
				}
			}
		} catch (error: unknown) {
			console.error("Chat streaming error:", error);
			// biome-ignore lint/suspicious/noExplicitAny: the agent says it needs to be this way for dynamic DB access, pending schema update
			const database = db as any;
			await database.messages.add({
				role: "system",
				content: `Error: ${error instanceof Error ? error.message : "Unknown failure"}`,
				timestamp: Date.now(),
			});
		} finally {
			setIsStreaming(false);
		}
	};

	return { streamChat, isStreaming };
}
