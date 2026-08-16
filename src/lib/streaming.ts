// biome-ignore lint/suspicious/noExplicitAny: Using any for simplicity here to parse the flexible JSON structure
export function extractTokenFromChunk(model: string, data: any): string {
	let token = "";

	if (model.startsWith("grok") || model === "GPT-4") {
		token = data.choices?.[0]?.delta?.content || "";
	} else if (model === "Claude") {
		if (data.type === "content_block_delta") {
			token = data.delta?.text || "";
		}
	} else if (model === "Gemini") {
		token = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
	}

	return token;
}
