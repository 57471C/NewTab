/// <reference types="chrome" />

const PREF_MODEL = "prefs.aiModel";
const PREF_ENGINE = "prefs.searchEngine";
const PREF_THEME = "prefs.theme";
const PREF_OPEN_LINKS = "prefs.openLinks";
const PREF_HIDDEN_MODELS = "prefs.hiddenModels";
const PREF_OLLAMA_HOST = "prefs.ollamaHost";
const PREF_OLLAMA_MODEL = "prefs.ollamaModel";
const PREF_FOCUS_BOX = "prefs.focusBox";

export type OpenLinksMode = "same" | "new";

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";
const OLLAMA_MODEL_VALUE = "ollama";

const memoryPrefs = new Map<string, string>();

function hasLocalStore(): boolean {
	return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

async function getValue(key: string): Promise<string | null> {
	if (hasLocalStore()) {
		try {
			const res = await chrome.storage.local.get([key]);
			return typeof res[key] === "string" ? res[key] : null;
		} catch (err) {
			console.error("Prefs read error:", err);
			return null;
		}
	}
	return memoryPrefs.get(key) || null;
}

async function setValue(key: string, value: string): Promise<void> {
	if (hasLocalStore()) {
		try {
			await chrome.storage.local.set({ [key]: value });
		} catch (err) {
			console.error("Prefs write error:", err);
		}
		return;
	}
	memoryPrefs.set(key, value);
}

function parseHidden(value: string | null): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		return [];
	}
}

export const prefs = {
	getModel: () => getValue(PREF_MODEL),
	setModel: (model: string) => setValue(PREF_MODEL, model),
	getEngine: () => getValue(PREF_ENGINE),
	setEngine: (engine: string) => setValue(PREF_ENGINE, engine),
	async getTheme(): Promise<"dark" | "light"> {
		const value = await getValue(PREF_THEME);
		return value === "light" ? "light" : "dark";
	},
	setTheme: (theme: "dark" | "light") => setValue(PREF_THEME, theme),
	async getOpenLinks(): Promise<OpenLinksMode> {
		const value = await getValue(PREF_OPEN_LINKS);
		return value === "new" ? "new" : "same";
	},
	setOpenLinks: (mode: OpenLinksMode) => setValue(PREF_OPEN_LINKS, mode),
	async getFocusBox(): Promise<boolean> {
		return (await getValue(PREF_FOCUS_BOX)) !== "off";
	},
	setFocusBox: (on: boolean) => setValue(PREF_FOCUS_BOX, on ? "on" : "off"),
	async getHiddenModels(): Promise<string[]> {
		const stored = parseHidden(await getValue(PREF_HIDDEN_MODELS));
		const ollamaConfigured = Boolean(await getValue(PREF_OLLAMA_HOST));
		if (!ollamaConfigured && !stored.includes(OLLAMA_MODEL_VALUE)) {
			return [...stored, OLLAMA_MODEL_VALUE];
		}
		return stored;
	},
	setHiddenModels: (models: string[]) =>
		setValue(PREF_HIDDEN_MODELS, JSON.stringify(models)),
	async getOllamaHost(): Promise<string> {
		return (await getValue(PREF_OLLAMA_HOST)) || DEFAULT_OLLAMA_HOST;
	},
	setOllamaHost: (host: string) => setValue(PREF_OLLAMA_HOST, host),
	async getOllamaModel(): Promise<string> {
		return (await getValue(PREF_OLLAMA_MODEL)) || DEFAULT_OLLAMA_MODEL;
	},
	setOllamaModel: (model: string) => setValue(PREF_OLLAMA_MODEL, model),
};
