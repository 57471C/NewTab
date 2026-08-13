/// <reference types="chrome" />

/**
 * Secure vault for API Keys.
 * Defaults to the in-memory sandboxed chrome.storage.session when running as an extension,
 * with a fallback to memory for standard browser debugging.
 */
const memoryVault = new Map<string, string>();

export const vault = {
	async get(provider: string): Promise<string | null> {
		if (typeof chrome !== "undefined" && chrome.storage?.session) {
			try {
				const res = await chrome.storage.session.get([provider]);
				return (res[provider] as string) || null;
			} catch (err) {
				console.error("Vault read error:", err);
				return null;
			}
		}
		return Promise.resolve(memoryVault.get(provider) || null);
	},
	async set(provider: string, key: string): Promise<void> {
		if (typeof chrome !== "undefined" && chrome.storage?.session) {
			try {
				await chrome.storage.session.set({ [provider]: key });
			} catch (err) {
				console.error("Vault write error:", err);
			}
			return;
		}
		memoryVault.set(provider, key);
		return Promise.resolve();
	},
};
