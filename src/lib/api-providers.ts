export interface ChatTurn {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface ProviderConfig {
	endpoint: string;
	headers: Record<string, string>;
	payload: Record<string, unknown>;
}

const HISTORY_LIMIT = 20;

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
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	let endpoint = "";
	let payload: Record<string, unknown> = {};

	if (model.startsWith("grok")) {
		endpoint = "https://api.x.ai/v1/chat/completions";
		headers.Authorization = `Bearer ${apiKey}`;
		payload = {
			model,
			stream: true,
			messages: turns.map(({ role, content }) => ({ role, content })),
		};
	} else if (model === "GPT-4") {
		endpoint = "https://api.openai.com/v1/chat/completions";
		headers.Authorization = `Bearer ${apiKey}`;
		payload = {
			model: "gpt-4o",
			stream: true,
			messages: turns.map(({ role, content }) => ({ role, content })),
		};
	} else if (model === "Claude") {
		endpoint = "https://api.anthropic.com/v1/messages";
		headers["x-api-key"] = apiKey;
		headers["anthropic-version"] = "2023-06-01";
		payload = {
			model: "claude-3-5-sonnet-latest",
			stream: true,
			max_tokens: 1024,
			messages: turns.map(({ role, content }) => ({ role, content })),
		};
	} else if (model === "Gemini") {
		endpoint =
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";
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
