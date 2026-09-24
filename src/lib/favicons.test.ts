import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faviconCandidates } from "./favicons.ts";

describe("faviconCandidates", () => {
	it("walks virtual-directory paths on .local hosts", () => {
		const urls = faviconCandidates("http://www.triplem.local/TripleM.Web/");
		assert.ok(urls.includes("http://www.triplem.local/TripleM.Web/favicon.ico"));
		assert.ok(urls.includes("http://www.triplem.local/favicon.ico"));
		assert.ok(
			!urls.some((url) => url.includes("google.com") || url.includes("duckduckgo.com")),
			"must not leak intranet hosts to public icon CDNs",
		);
	});

	it("still uses public icon CDNs for the open web", () => {
		const urls = faviconCandidates("https://github.com/57471C/NewTab");
		assert.ok(urls.some((url) => url.includes("duckduckgo.com") || url.includes("google.com")));
	});
});
