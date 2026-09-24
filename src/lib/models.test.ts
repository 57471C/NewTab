import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProvider } from "./api-providers";
import {
	labelFromSlug,
	mergeModelSlots,
	parseStoredSlots,
} from "./model-slots";

describe("labelFromSlug", () => {
	it("title-cases dotted model ids", () => {
		assert.equal(labelFromSlug("grok-4.7"), "Grok 4.7");
		assert.equal(labelFromSlug("gemini-3.8-flash"), "Gemini 3.8 Flash");
		assert.equal(labelFromSlug("claude-haiku-4-5"), "Claude Haiku 4.5");
		assert.equal(labelFromSlug("gpt-6-astra"), "GPT 6 Astra");
	});
});

describe("mergeModelSlots", () => {
	it("keeps three slots per cloud provider and ollama", () => {
		const slots = mergeModelSlots(null);
		assert.equal(slots.filter((slot) => slot.provider === "Grok").length, 3);
		assert.equal(slots.filter((slot) => slot.provider === "Ollama").length, 1);
	});

	it("applies an edited slug by slot id", () => {
		const slots = mergeModelSlots([
			{ id: "grok-0", value: "grok-4.20-0309-reasoning" },
		]);
		assert.equal(
			slots.find((slot) => slot.id === "grok-0")?.value,
			"grok-4.20-0309-reasoning",
		);
		assert.equal(slots.find((slot) => slot.id === "grok-1")?.value, "grok-4.3");
	});

	it("ignores empty overrides", () => {
		const slots = mergeModelSlots([{ id: "openai-0", value: "   " }]);
		assert.equal(
			slots.find((slot) => slot.id === "openai-0")?.value,
			"gpt-6-astra",
		);
	});
});

describe("parseStoredSlots", () => {
	it("falls back to defaults on junk json", () => {
		const slots = parseStoredSlots("{nope");
		assert.equal(slots[0].value, "gemini-3.8-flash");
	});
});

describe("resolveProvider", () => {
	it("uses the slot provider when the slug has no prefix", () => {
		const slots = mergeModelSlots([{ id: "openai-2", value: "o4-mini" }]);
		assert.equal(resolveProvider("o4-mini", slots), "GPT-4");
	});
});
