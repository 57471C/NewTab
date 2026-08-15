import "fake-indexeddb/auto";
import { performance } from "perf_hooks";
import { db } from "./src/lib/db";

async function runBenchmark() {
	console.log("Generating data...");

	const testCases = [
		{ chats: 1, msgs: 10000 },
		{ chats: 10, msgs: 1000 },
		{ chats: 100, msgs: 100 },
		{ chats: 1000, msgs: 10 },
	];

	for (const tc of testCases) {
		console.log(`\nTesting case: ${tc.chats} chats, ${tc.msgs} msgs each`);
		await db.messages.clear();
		await db.sessions.clear();

		const msgs = [];
		const sessionMap = new Map();
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

				const existing = sessionMap.get(chatId);
				if (!existing) {
					sessionMap.set(chatId, {
						id: chatId,
						title: role === "user" ? content : "New Conversation",
						timestamp,
					});
				} else {
					let newTitle = existing.title;
					if (role === "user" && existing.title === "New Conversation") {
						newTitle = content;
					}
					sessionMap.set(chatId, {
						id: chatId,
						title: newTitle,
						timestamp: Math.max(existing.timestamp, timestamp),
					});
				}
			}
		}
		await db.messages.bulkAdd(msgs);
		await db.sessions.bulkAdd(Array.from(sessionMap.values()));

		// Baseline
		const start1 = performance.now();
		const allMessages1 = await db.messages.toArray();
		const sessions = new Map<
			string,
			{ id: string; title: string; timestamp: number }
		>();
		for (let i = 0; i < allMessages1.length; i++) {
			const msg = allMessages1[i];
			const existing = sessions.get(msg.chatId);
			if (!existing) {
				sessions.set(msg.chatId, {
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
		const res1 = Array.from(sessions.values()).sort(
			(a, b) => b.timestamp - a.timestamp,
		);
		const time1 = performance.now() - start1;

		// Trying the new sessions table optimization
		const start3 = performance.now();
		const mapped = await db.sessions.orderBy("timestamp").reverse().toArray();
		const time3 = performance.now() - start3;

		console.log(`Baseline: ${time1.toFixed(2)} ms`);
		console.log(`New sessions table optimization: ${time3.toFixed(2)} ms`);
	}

	process.exit(0);
}

runBenchmark().catch(console.error);
