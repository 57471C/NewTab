function extractMessage(body: string): string {
	const trimmed = body.trim();
	if (!trimmed) return "";
	try {
		const parsed = JSON.parse(trimmed) as {
			error?: { message?: string; status?: string };
			message?: string;
		};
		const raw =
			parsed.error?.message || parsed.message || parsed.error?.status || "";
		return String(raw).replace(/\s+/g, " ").trim();
	} catch {
		return trimmed.replace(/\s+/g, " ").trim().slice(0, 180);
	}
}

export function formatApiError(status: number, body: string): string {
	const detail = extractMessage(body);

	if (status === 401 || status === 403) {
		return "That API key was rejected. Check it in Settings.";
	}
	if (status === 404) {
		if (/no longer available|not found|update your code/i.test(detail)) {
			return "That model is no longer available. Pick another from the list.";
		}
		return "That model was not found. Pick another from the list.";
	}
	if (status === 429) {
		return "Rate limited. Wait a moment and try again.";
	}
	if (status === 503 || status === 529) {
		return "The model is busy. Try again in a few seconds.";
	}
	if (detail && detail.length <= 160 && !detail.startsWith("{")) {
		return detail;
	}
	return `Request failed (${status}). Try again.`;
}

export function formatCaughtError(error: unknown): string {
	if (!(error instanceof Error)) return "Something went wrong. Try again.";
	if (/Failed to fetch|NetworkError|Load failed/i.test(error.message)) {
		return "Could not reach the model host. If this is Ollama, is it running?";
	}
	const match = error.message.match(/^API Error: (\d+) - ([\s\S]*)$/);
	if (match) return formatApiError(Number(match[1]), match[2]);
	if (error.message.length > 200 || error.message.includes("{")) {
		return "Something went wrong. Try again.";
	}
	return error.message;
}
