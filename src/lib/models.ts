import chatgptLogo from "../assets/ChatGPT.svg";
import claudeLogo from "../assets/claude.svg";
import geminiLogo from "../assets/gemini.svg";
import grokLogo from "../assets/grok.svg";
import ollamaLogo from "../assets/ollama.svg";
import ollamaLogoDark from "../assets/ollama-dark.svg";
import type { ProviderId } from "./api-providers";
import {
	DEFAULT_MODEL_SLOTS,
	displayLabel,
	type ModelSlot,
} from "./model-slots";

export type { ModelSlot } from "./model-slots";
export {
	DEFAULT_MODEL_SLOTS,
	displayLabel,
	labelFromSlug,
	mergeModelSlots,
	parseStoredSlots,
	slotsForProvider,
} from "./model-slots";

export type ChatModel = {
	slotId: string;
	provider: ProviderId;
	label: string;
	value: string;
	icon: string;
	iconDark?: string;
	invert?: boolean;
	invertLight?: boolean;
};

type ProviderMark = Pick<
	ChatModel,
	"icon" | "iconDark" | "invert" | "invertLight"
>;

export const PROVIDER_MARKS: Record<ProviderId, ProviderMark> = {
	Gemini: { icon: geminiLogo },
	Claude: { icon: claudeLogo },
	"GPT-4": { icon: chatgptLogo, invert: true },
	Grok: { icon: grokLogo, invertLight: true },
	Ollama: { icon: ollamaLogo, iconDark: ollamaLogoDark },
};

export function catalogFromSlots(slots: ModelSlot[]): ChatModel[] {
	return slots.map((slot) => ({
		slotId: slot.id,
		provider: slot.provider,
		value: slot.value,
		label: displayLabel(slot),
		...PROVIDER_MARKS[slot.provider],
	}));
}

export const AI_MODELS: ChatModel[] = catalogFromSlots(DEFAULT_MODEL_SLOTS);
