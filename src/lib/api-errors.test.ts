import { describe, it } from "node:test";
import * as assert from "node:assert";
import { formatApiError, formatCaughtError } from "./api-errors";

const geminiBusy = JSON.stringify({
	error: {
		code: 503,
		message:
			"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
		status: "UNAVAILABLE",
	},
});

const geminiRetired = JSON.stringify({
	error: {
		code: 404,
		message:
			"This model models/gemini-2.5-pro is no longer available to new users. Please update your code to use models/gemini-3.1-pro-preview for the latest features and improvements.",
		status: "NOT_FOUND",
	},
});

describe("formatApiError", () => {
	it("maps a rejected key", () => {
		assert.strictEqual(
			formatApiError(401, "{"error":"invalid api key"}"),
			"That API key was rejected. Check it in Settings.",
		);
	});

	it("maps Gemini high demand", () => {
		assert.strictEqual(
			formatApiError(503, geminiBusy),
			"The model is busy. Try again in a few seconds.",
		);
	});

	it("maps a retired Gemini model", () => {
		assert.strictEqual(
			formatApiError(404, geminiRetired),
			"That model is no longer available. Pick another from the list.",
		);
	});

	it("maps rate limits", () => {
		assert.strictEqual(
			formatApiError(429, ""),
			"Rate limited. Wait a moment and try again.",
		);
	});

	it("keeps a short provider message", () => {
		assert.strictEqual(
			formatApiError(400, JSON.stringify({ error: { message: "Bad request." } })),
			"Bad request.",
		);
	});
});

describe("formatCaughtError", () => {
	it("unwraps the old API Error prefix", () => {
		assert.strictEqual(
			formatCaughtError(new Error(`API Error: 503 - ${geminiBusy}`)),
			"The model is busy. Try again in a few seconds.",
		);
	});

	it("passes through a short thrown message", () => {
		assert.strictEqual(
			formatCaughtError(new Error("API key for Gemini is missing. Please configure it in settings.")),
			"API key for Gemini is missing. Please configure it in settings.",
		);
	});

	it("hides raw JSON blobs", () => {
		assert.strictEqual(
			formatCaughtError(new Error(geminiBusy)),
			"Something went wrong. Try again.",
		);
	});
});
