import chatgptLogo from "../assets/ChatGPT.svg";
import claudeLogo from "../assets/claude.svg";
import geminiLogo from "../assets/gemini.svg";
import grokLogo from "../assets/grok.svg";
import ollamaLogo from "../assets/ollama.svg";
import ollamaLogoDark from "../assets/ollama-dark.svg";

export type ChatModel = {
	label: string;
	value: string;
	icon: string;
	iconDark?: string;
	invert?: boolean;
	invertLight?: boolean;
};

export const AI_MODELS: ChatModel[] = [
	{
		label: "Gemini 3.8 Flash",
		value: "gemini-3.8-flash",
		icon: geminiLogo,
	},
	{
		label: "Gemini 3.5 Flash",
		value: "gemini-3.5-flash",
		icon: geminiLogo,
	},
	{
		label: "Gemini 3.1 Pro",
		value: "gemini-3.1-pro-preview",
		icon: geminiLogo,
	},
	{
		label: "Claude Sonnet 5",
		value: "claude-sonnet-5",
		icon: claudeLogo,
	},
	{
		label: "Claude Haiku 4.5",
		value: "claude-haiku-4-5",
		icon: claudeLogo,
	},
	{
		label: "GPT-5.5",
		value: "gpt-5.5",
		icon: chatgptLogo,
		invert: true,
	},
	{
		label: "GPT-4o",
		value: "gpt-4o",
		icon: chatgptLogo,
		invert: true,
	},
	{ label: "Grok 4.6", value: "grok-4.6", icon: grokLogo, invertLight: true },
	{ label: "Grok 4.3", value: "grok-4.3", icon: grokLogo, invertLight: true },
	{
		label: "Grok 4.20 Fast",
		value: "grok-4.20-0309-non-reasoning",
		icon: grokLogo,
		invertLight: true,
	},
	{
		label: "Grok 4.20 Reasoning",
		value: "grok-4.20-0309-reasoning",
		icon: grokLogo,
		invertLight: true,
	},
	{
		label: "Grok Build",
		value: "grok-build-0.1",
		icon: grokLogo,
		invertLight: true,
	},
	{
		label: "Ollama",
		value: "ollama",
		icon: ollamaLogo,
		iconDark: ollamaLogoDark,
	},
];
