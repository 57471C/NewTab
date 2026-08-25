import "fake-indexeddb/auto";
import { performance } from "node:perf_hooks";
import v8 from "node:v8";
import Dexie from "dexie";

async function runBenchmark() {
	console.log("Generating data...");
	const tempDb = new Dexie("TempDB2");
	tempDb.version(1).stores({ messages: "++id, chatId, timestamp" });

	// Add 500k messages to stress memory, across 1000 chats
	const msgs = [];
	for (let i = 0; i < 500000; i++) {
		msgs.push({
			chatId: `chat_${i % 1000}`,
			role: "user",
			content: `Long message content to increase memory footprint... ${i}`,
			timestamp: Date.now() + i,
		});
	}
	await tempDb.table("messages").bulkAdd(msgs);
	console.log("Data generated.");

	// Helper to force GC if available
	const tryGC = () => {
		if (global.gc) {
			global.gc();
		}
	};

	tryGC();
	const start1 = performance.now();
	const memStatsBefore1 = v8.getHeapStatistics();
	const allMessages = await tempDb.table("messages").toArray();
	const sessionsMap1 = new Map();
	for (const msg of allMessages) {
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
	const memStatsAfter1 = v8.getHeapStatistics();
	const end1 = performance.now();
	console.log(
		`Baseline (.toArray()): ${(end1 - start1).toFixed(2)} ms, Max Heap Used Delta: ${((memStatsAfter1.used_heap_size - memStatsBefore1.used_heap_size) / 1024 / 1024).toFixed(2)} MB`,
	);

	allMessages.length = 0;
	sessionsMap1.clear();
	tryGC();

	const start2 = performance.now();
	const memStatsBefore2 = v8.getHeapStatistics();
	const sessionsMap2 = new Map();
	await tempDb.table("messages").each((msg) => {
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
	const memStatsAfter2 = v8.getHeapStatistics();
	const end2 = performance.now();
	console.log(
		`Optimized (.each()): ${(end2 - start2).toFixed(2)} ms, Max Heap Used Delta: ${((memStatsAfter2.used_heap_size - memStatsBefore2.used_heap_size) / 1024 / 1024).toFixed(2)} MB`,
	);

	process.exit(0);
}

runBenchmark().catch(console.error);
