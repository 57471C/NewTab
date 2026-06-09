/// <reference types="chrome" />

/**
 * Secure vault for persisting API Keys.
 * Defaults to the sandboxed chrome.storage.local when running as an extension,
 * with a fallback to localStorage for standard browser debugging.
 */
export const vault = {
	async get(provider: string): Promise<string | null> {
		if (typeof chrome !== "undefined" && chrome.storage) {
			try {
				const res = await chrome.storage.local.get([provider]);
				return (res[provider] as string) || null;
			} catch (err) {
				console.error("Vault read error:", err);
				return null;
			}
		}
		return Promise.resolve(localStorage.getItem(`vault_${provider}`));
	},
	async set(provider: string, key: string): Promise<void> {
		if (typeof chrome !== "undefined" && chrome.storage) {
			try {
				await chrome.storage.local.set({ [provider]: key });
			} catch (err) {
				console.error("Vault write error:", err);
			}
			return;
		}
		localStorage.setItem(`vault_${provider}`, key);
		return Promise.resolve();
	},
};
