import { resolveProvider } from "./api-providers";

// biome-ignore lint/suspicious/noExplicitAny: Using any for simplicity here to parse the flexible JSON structure
export function extractTokenFromChunk(model: string, data: any): string {
	const provider = resolveProvider(model);
	let token = "";

	if (provider === "Grok" || provider === "GPT-4") {
		token = data.choices?.[0]?.delta?.content || "";
	} else if (provider === "Claude") {
		if (data.type === "content_block_delta") {
			token = data.delta?.text || "";
		}
	} else if (provider === "Gemini") {
		token = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
	}

	return token;
}
