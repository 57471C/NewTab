/// <reference types="chrome" />

const PREF_MODEL = "prefs.aiModel";
const PREF_ENGINE = "prefs.searchEngine";
const PREF_THEME = "prefs.theme";

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
};
