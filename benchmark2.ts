import "fake-indexeddb/auto";
import { performance } from "perf_hooks";
import { db } from "./src/lib/db";

async function runBenchmark() {
	console.log("Generating data...");

	const testCases = [
		{ chats: 1, msgs: 100000 },
	];

	for (const tc of testCases) {
		console.log(`\nTesting case: ${tc.chats} chats, ${tc.msgs} msgs each`);
		await db.messages.clear();
		await db.sessions.clear();

		const msgs = [];
		for (let s = 0; s < tc.chats; s++) {
			const chatId = `chat_${s}`;
			for (let m = 0; m < tc.msgs; m++) {
				const role = m % 2 === 0 ? "user" : "assistant";
				const content = `Message ${m} for chat ${s}`;
				const timestamp = Date.now() + s * 1000 + m;
				msgs.push({
					chatId,
					role,
					content,
					timestamp,
				});
			}
		}

		console.log("Adding messages to DB...");
		await db.messages.bulkAdd(msgs as any);

		console.log("Running baseline (toArray)...");
		global.gc && global.gc();
		let startMem = process.memoryUsage().heapUsed;
		const start1 = performance.now();

		const allMessages1 = await db.messages.toArray();
		const sessionsMap1 = new Map();
		for (const msg of allMessages1) {
			const existing = sessionsMap1.get(msg.chatId);
			if (!existing) {
				sessionsMap1.set(msg.chatId, {
					id: msg.chatId,
					title: msg.role === "user" ? msg.content : "New Conversation",
					timestamp: msg.timestamp,
				});
			} else {
				if (msg.role === "user" && existing.title === "New Conversation") {
					existing.title = msg.content;
				}
				if (msg.timestamp > existing.timestamp) {
					existing.timestamp = msg.timestamp;
				}
			}
		}

		const time1 = performance.now() - start1;
		let endMem = process.memoryUsage().heapUsed;
		let mem1 = endMem - startMem;

		console.log("Running optimized (each)...");
		global.gc && global.gc();
		startMem = process.memoryUsage().heapUsed;
		const start2 = performance.now();

		const sessionsMap2 = new Map();
		await db.messages.each(msg => {
			const existing = sessionsMap2.get(msg.chatId);
			if (!existing) {
				sessionsMap2.set(msg.chatId, {
					id: msg.chatId,
					title: msg.role === "user" ? msg.content : "New Conversation",
					timestamp: msg.timestamp,
				});
			} else {
				if (msg.role === "user" && existing.title === "New Conversation") {
					existing.title = msg.content;
				}
				if (msg.timestamp > existing.timestamp) {
					existing.timestamp = msg.timestamp;
				}
			}
		});

		const time2 = performance.now() - start2;
		endMem = process.memoryUsage().heapUsed;
		let mem2 = endMem - startMem;

		console.log(`Baseline (toArray): ${time1.toFixed(2)} ms, Memory Diff: ${(mem1 / 1024 / 1024).toFixed(2)} MB`);
		console.log(`Optimized (each): ${time2.toFixed(2)} ms, Memory Diff: ${(mem2 / 1024 / 1024).toFixed(2)} MB`);
	}

	process.exit(0);
}

runBenchmark().catch(console.error);