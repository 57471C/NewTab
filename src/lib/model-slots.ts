import type { ProviderId } from "./api-providers";

export type ModelSlot = {
	id: string;
	provider: ProviderId;
	value: string;
};

export const DEFAULT_MODEL_SLOTS: ModelSlot[] = [
	{ id: "gemini-0", provider: "Gemini", value: "gemini-3.8-flash" },
	{ id: "gemini-1", provider: "Gemini", value: "gemini-3.1-pro-preview" },
	{ id: "gemini-2", provider: "Gemini", value: "gemini-3.5-flash-lite" },
	{ id: "claude-0", provider: "Claude", value: "claude-sonnet-5" },
	{ id: "claude-1", provider: "Claude", value: "claude-opus-5-5" },
	{ id: "claude-2", provider: "Claude", value: "claude-haiku-4-5" },
	{ id: "openai-0", provider: "GPT-4", value: "gpt-6-astra" },
	{ id: "openai-1", provider: "GPT-4", value: "gpt-6-sol" },
	{ id: "openai-2", provider: "GPT-4", value: "gpt-6-luna" },
	{ id: "grok-0", provider: "Grok", value: "grok-4.7" },
	{ id: "grok-1", provider: "Grok", value: "grok-4.3" },
	{ id: "grok-2", provider: "Grok", value: "grok-build-0.1" },
	{ id: "ollama", provider: "Ollama", value: "ollama" },
];

export function labelFromSlug(slug: string): string {
	const raw = slug.trim();
	if (!raw) return "Model";
	const tokens = raw.split(/[-_./]+/).filter(Boolean);
	const words: string[] = [];
	for (const token of tokens) {
		const lower = token.toLowerCase();
		if (lower === "gpt") {
			words.push("GPT");
			continue;
		}
		if (lower === "tts" || lower === "stt") {
			words.push(lower.toUpperCase());
			continue;
		}
		if (/^\d+(\.\d+)*$/.test(token)) {
			const last = words[words.length - 1];
			if (last && /^\d+(\.\d+)*$/.test(last)) {
				words[words.length - 1] = `${last}.${token}`;
				continue;
			}
			words.push(token);
			continue;
		}
		words.push(token.charAt(0).toUpperCase() + token.slice(1));
	}
	return words.join(" ");
}

export function parseStoredSlots(raw: string | null): ModelSlot[] {
	if (!raw) return DEFAULT_MODEL_SLOTS.map((slot) => ({ ...slot }));
	try {
		return mergeModelSlots(JSON.parse(raw));
	} catch {
		return DEFAULT_MODEL_SLOTS.map((slot) => ({ ...slot }));
	}
}

export function mergeModelSlots(stored: unknown): ModelSlot[] {
	const overrides = new Map<string, string>();
	if (Array.isArray(stored)) {
		for (const item of stored) {
			if (!item || typeof item !== "object") continue;
			const record = item as { id?: unknown; value?: unknown };
			if (typeof record.id !== "string" || typeof record.value !== "string") {
				continue;
			}
			const value = record.value.trim();
			if (!value) continue;
			overrides.set(record.id, value);
		}
	}
	return DEFAULT_MODEL_SLOTS.map((slot) => ({
		...slot,
		value:
			slot.provider === "Ollama"
				? "ollama"
				: overrides.get(slot.id) || slot.value,
	}));
}

export function slotsForProvider(
	slots: ModelSlot[],
	provider: ProviderId,
): ModelSlot[] {
	return slots.filter((slot) => slot.provider === provider);
}
