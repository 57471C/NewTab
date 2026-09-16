/// <reference types="chrome" />

const PREF_MODEL = "prefs.aiModel";
const PREF_ENGINE = "prefs.searchEngine";

const memoryPrefs = new Map<string, string>();

function hasLocalStore(): boolean {
	return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export const prefs = {
	async getModel(): Promise<string | null> {
		if (hasLocalStore()) {
			try {
				const res = await chrome.storage.local.get([PREF_MODEL]);
				return typeof res[PREF_MODEL] === "string" ? res[PREF_MODEL] : null;
			} catch (err) {
				console.error("Prefs read error:", err);
				return null;
			}
		}
		return memoryPrefs.get(PREF_MODEL) || null;
	},
	async setModel(model: string): Promise<void> {
		if (hasLocalStore()) {
			try {
				await chrome.storage.local.set({ [PREF_MODEL]: model });
			} catch (err) {
				console.error("Prefs write error:", err);
			}
			return;
		}
		memoryPrefs.set(PREF_MODEL, model);
	},
	async getEngine(): Promise<string | null> {
		if (hasLocalStore()) {
			try {
				const res = await chrome.storage.local.get([PREF_ENGINE]);
				return typeof res[PREF_ENGINE] === "string" ? res[PREF_ENGINE] : null;
			} catch (err) {
				console.error("Prefs read error:", err);
				return null;
			}
		}
		return memoryPrefs.get(PREF_ENGINE) || null;
	},
	async setEngine(engine: string): Promise<void> {
		if (hasLocalStore()) {
			try {
				await chrome.storage.local.set({ [PREF_ENGINE]: engine });
			} catch (err) {
				console.error("Prefs write error:", err);
			}
			return;
		}
		memoryPrefs.set(PREF_ENGINE, engine);
	},
};
