import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveHiddenModels } from "./prefs";

describe("resolveHiddenModels", () => {
	it("hides Ollama until the user has saved a picker list", () => {
		assert.deepEqual(resolveHiddenModels(null), ["ollama"]);
	});

	it("keeps Ollama visible after the user ticks it on", () => {
		assert.deepEqual(resolveHiddenModels("[]"), []);
		assert.deepEqual(resolveHiddenModels('["gpt-4o"]'), ["gpt-4o"]);
	});

	it("keeps Ollama hidden when the user ticks it off", () => {
		assert.deepEqual(resolveHiddenModels('["ollama","gpt-4o"]'), [
			"ollama",
			"gpt-4o",
		]);
	});
});
