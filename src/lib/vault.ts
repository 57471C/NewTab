/// <reference types="chrome" />

import type { ProviderId } from "./api-providers";

/**
 * Persistent vault for API keys.
 * Uses chrome.storage.local inside the extension so keys survive restarts,
 * with an in-memory fallback for Vite / plain-browser debugging.
 */
const memoryVault = new Map<string, string>();

export const PROVIDER_IDS: ProviderId[] = ["Grok", "Gemini", "Claude", "GPT-4"];

function hasLocalStore(): boolean {
	return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export const vault = {
	async get(provider: string): Promise<string | null> {
		if (hasLocalStore()) {
			try {
				const res = await chrome.storage.local.get([provider]);
				const value = res[provider];
				return typeof value === "string" && value.length > 0 ? value : null;
			} catch (err) {
				console.error("Vault read error:", err);
				return null;
			}
		}
		return memoryVault.get(provider) || null;
	},
	async set(provider: string, key: string): Promise<void> {
		const trimmed = key.trim();
		if (!trimmed) {
			await vault.remove(provider);
			return;
		}
		if (hasLocalStore()) {
			try {
				await chrome.storage.local.set({ [provider]: trimmed });
			} catch (err) {
				console.error("Vault write error:", err);
			}
			return;
		}
		memoryVault.set(provider, trimmed);
	},
	async remove(provider: string): Promise<void> {
		if (hasLocalStore()) {
			try {
				await chrome.storage.local.remove(provider);
			} catch (err) {
				console.error("Vault delete error:", err);
			}
			return;
		}
		memoryVault.delete(provider);
	},
	async configured(): Promise<Set<ProviderId>> {
		const ready = new Set<ProviderId>();
		if (hasLocalStore()) {
			try {
				const res = await chrome.storage.local.get(PROVIDER_IDS);
				for (const provider of PROVIDER_IDS) {
					if (typeof res[provider] === "string" && res[provider].length > 0) {
						ready.add(provider);
					}
				}
			} catch (err) {
				console.error("Vault list error:", err);
			}
			return ready;
		}
		for (const provider of PROVIDER_IDS) {
			if (memoryVault.get(provider)) ready.add(provider);
		}
		return ready;
	},
};
