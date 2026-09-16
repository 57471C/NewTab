export interface ChatTurn {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface ProviderConfig {
	endpoint: string;
	headers: Record<string, string>;
	payload: Record<string, unknown>;
}

export type ProviderId = "Grok" | "Gemini" | "Claude" | "GPT-4";

const HISTORY_LIMIT = 20;

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
		.filter((message) => message.role !== "system" && message.content.trim())
		.slice(-HISTORY_LIMIT);
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
			messages: turns.map(({ role, content }) => ({ role, content })),
		};
	} else if (provider === "GPT-4") {
		endpoint = "https://api.openai.com/v1/chat/completions";
		headers.Authorization = `Bearer ${apiKey}`;
		payload = {
			model: model === "GPT-4" ? "gpt-4o" : model,
			stream: true,
			messages: turns.map(({ role, content }) => ({ role, content })),
		};
	} else if (provider === "Claude") {
		endpoint = "https://api.anthropic.com/v1/messages";
		headers["x-api-key"] = apiKey;
		headers["anthropic-version"] = "2023-06-01";
		payload = {
			model: model === "Claude" ? "claude-sonnet-5" : model,
			stream: true,
			max_tokens: 4096,
			messages: turns.map(({ role, content }) => ({ role, content })),
		};
	} else if (provider === "Gemini") {
		const geminiModel = model === "Gemini" ? "gemini-3.8-flash" : model;
		endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse`;
		headers["x-goog-api-key"] = apiKey;
		payload = {
			contents: turns.map((turn) => ({
				role: turn.role === "assistant" ? "model" : "user",
				parts: [{ text: turn.content }],
			})),
		};
	}

	return { endpoint, headers, payload };
}
