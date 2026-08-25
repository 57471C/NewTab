import { describe, it } from "node:test";
import * as assert from "node:assert";
import { extractTokenFromChunk } from "./streaming";

describe("extractTokenFromChunk", () => {
	it("should extract token for Grok", () => {
		const model = "grok-1";
		const data = {
			choices: [
				{
					delta: {
						content: "Hello",
					},
				},
			],
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "Hello");
	});

	it("should handle empty content for Grok", () => {
		const model = "grok-1";
		const data = {
			choices: [
				{
					delta: {},
				},
			],
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "");
	});

	it("should handle malformed data for Grok", () => {
		const model = "grok-1";
		const data = {};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "");
	});

	it("should extract token for GPT-4", () => {
		const model = "GPT-4";
		const data = {
			choices: [
				{
					delta: {
						content: " World",
					},
				},
			],
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, " World");
	});

	it("should extract token for Claude", () => {
		const model = "Claude";
		const data = {
			type: "content_block_delta",
			delta: {
				text: "Claude",
			},
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "Claude");
	});

	it("should ignore Claude data if not content_block_delta", () => {
		const model = "Claude";
		const data = {
			type: "message_delta",
			delta: {
				text: "ignored",
			},
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "");
	});

	it("should handle malformed data for Claude", () => {
		const model = "Claude";
		const data = {
			type: "content_block_delta",
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "");
	});

	it("should extract token for Gemini", () => {
		const model = "Gemini";
		const data = {
			candidates: [
				{
					content: {
						parts: [
							{
								text: "Gemini token",
							},
						],
					},
				},
			],
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "Gemini token");
	});

	it("should handle malformed data for Gemini", () => {
		const model = "Gemini";
		const data = {};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "");
	});

	it("should return empty string for unknown model", () => {
		const model = "UnknownModel";
		const data = {
			choices: [
				{
					delta: {
						content: "data",
					},
				},
			],
		};
		const token = extractTokenFromChunk(model, data);
		assert.strictEqual(token, "");
	});
});
