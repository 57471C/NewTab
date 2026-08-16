export interface ProviderConfig {
	endpoint: string;
	headers: Record<string, string>;
	payload: Record<string, unknown>;
}

export function getProviderConfig(
	model: string,
	apiKey: string,
	prompt: string,
): ProviderConfig {
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
		endpoint =
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";
		headers["x-goog-api-key"] = apiKey;
		payload = {
			contents: [{ parts: [{ text: prompt }] }],
		};
	}

	return { endpoint, headers, payload };
}
