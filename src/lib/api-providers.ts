import type { ChatAttachment } from "./attachments";
import { splitDataUrl } from "./attachments";

export interface ChatTurn {
	role: "user" | "assistant" | "system";
	content: string;
	attachments?: ChatAttachment[];
}

export interface ProviderConfig {
	endpoint: string;
	headers: Record<string, string>;
	payload: Record<string, unknown>;
}

export type ProviderId = "Grok" | "Gemini" | "Claude" | "GPT-4";

const HISTORY_LIMIT = 20;

const GEMINI_ALIASES: Record<string, string> = {
	"gemini-2.5-pro": "gemini-3.1-pro-preview",
	"gemini-2.5-flash": "gemini-3.5-flash",
	Gemini: "gemini-3.8-flash",
};

export function resolveProvider(model: string): ProviderId {
	const id = model.toLowerCase();
	if (id.startsWith("grok") || model === "Grok") return "Grok";
	if (id.startsWith("gemini") || model === "Gemini") return "Gemini";
	if (id.startsWith("claude") || model === "Claude") return "Claude";
	if (id.startsWith("gpt") || model === "GPT-4") return "GPT-4";
	return "Grok";
}

function visibleTurns(messages: ChatTurn[]): ChatTurn[] {
	return messages
		.filter(
			(message) =>
				message.role !== "system" &&
				(message.content.trim() || (message.attachments?.length ?? 0) > 0),
		)
		.slice(-HISTORY_LIMIT);
}

function openAiContent(turn: ChatTurn) {
	if (!turn.attachments?.length) return turn.content;
	const parts: Array<Record<string, unknown>> = [];
	if (turn.content.trim()) {
		parts.push({ type: "text", text: turn.content });
	}
	for (const attachment of turn.attachments) {
		parts.push({
			type: "image_url",
			image_url: { url: attachment.dataUrl },
		});
	}
	return parts;
}

function claudeContent(turn: ChatTurn) {
	if (!turn.attachments?.length) return turn.content;
	const parts: Array<Record<string, unknown>> = [];
	if (turn.content.trim()) {
		parts.push({ type: "text", text: turn.content });
	}
	for (const attachment of turn.attachments) {
		const { mime, data } = splitDataUrl(attachment.dataUrl);
		parts.push({
			type: "image",
			source: {
				type: "base64",
				media_type: mime,
				data,
			},
		});
	}
	return parts;
}

function geminiParts(turn: ChatTurn) {
	const parts: Array<Record<string, unknown>> = [];
	if (turn.content.trim()) {
		parts.push({ text: turn.content });
	}
	for (const attachment of turn.attachments ?? []) {
		const { mime, data } = splitDataUrl(attachment.dataUrl);
		parts.push({
			inline_data: {
				mime_type: mime,
				data,
			},
		});
	}
	if (!parts.length) parts.push({ text: " " });
	return parts;
}

export function getProviderConfig(
	model: string,
	apiKey: string,
	messages: ChatTurn[],
): ProviderConfig {
	const turns = visibleTurns(messages);
	const provider = resolveProvider(model);
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	let endpoint = "";
	let payload: Record<string, unknown> = {};

	if (provider === "Grok") {
		endpoint = "https://api.x.ai/v1/chat/completions";
		headers.Authorization = `Bearer ${apiKey}`;
		payload = {
			model,
			stream: true,
			messages: turns.map((turn) => ({
				role: turn.role,
				content: openAiContent(turn),
			})),
		};
	} else if (provider === "GPT-4") {
		endpoint = "https://api.openai.com/v1/chat/completions";
		headers.Authorization = `Bearer ${apiKey}`;
		payload = {
			model: model === "GPT-4" ? "gpt-4o" : model,
			stream: true,
			messages: turns.map((turn) => ({
				role: turn.role,
				content: openAiContent(turn),
			})),
		};
	} else if (provider === "Claude") {
		endpoint = "https://api.anthropic.com/v1/messages";
		headers["x-api-key"] = apiKey;
		headers["anthropic-version"] = "2023-06-01";
		payload = {
			model: model === "Claude" ? "claude-sonnet-5" : model,
			stream: true,
			max_tokens: 4096,
			messages: turns.map((turn) => ({
				role: turn.role === "assistant" ? "assistant" : "user",
				content: claudeContent(turn),
			})),
		};
	} else if (provider === "Gemini") {
		const geminiModel = GEMINI_ALIASES[model] ?? model;
		endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse`;
		headers["x-goog-api-key"] = apiKey;
		payload = {
			contents: turns.map((turn) => ({
				role: turn.role === "assistant" ? "model" : "user",
				parts: geminiParts(turn),
			})),
		};
	}

	return { endpoint, headers, payload };
}
