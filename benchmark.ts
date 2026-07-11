import "fake-indexeddb/auto";
import { db } from "./src/lib/db";
import { performance } from "perf_hooks";

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

    const msgs = [];
    for (let s = 0; s < tc.chats; s++) {
      const chatId = `chat_${s}`;
      for (let m = 0; m < tc.msgs; m++) {
        msgs.push({
          chatId,
          role: m % 2 === 0 ? "user" : "assistant",
          content: `Message ${m} for chat ${s}`,
          timestamp: Date.now() + s * 1000 + m,
        });
      }
    }
    await db.messages.bulkAdd(msgs);

    // Baseline
    const start1 = performance.now();
    const allMessages1 = await db.messages.toArray();
    const sessions = new Map<string, { id: string; title: string; timestamp: number }>();
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
    const res1 = Array.from(sessions.values()).sort((a, b) => b.timestamp - a.timestamp);
    const time1 = performance.now() - start1;

    // Trying the unique key mapping
    const start3 = performance.now();
    const chatIds = await db.messages.orderBy("chatId").uniqueKeys();

    // Is there any faster way to construct this?
    // Using indexedDB properly means querying `chatIds` first and then querying first and last message for each chat.
    // This is ONLY SLOW because fake-indexeddb mimics async boundaries but doesn't mimic true I/O bounds or serialization perfectly.
    // In a real browser extension, toArray() on a 100,000 item table might freeze the main thread because of deserialization overhead, while indexed queries will not.
    // The issue description explicitly mentions:
    // "Rationale: Fetching the entire message history and iterating manually in memory is an inefficient pattern. While it's solvable, the optimal solution depends on Dexie's indexing capabilities or better query optimization."

    const mapped = await Promise.all(
      chatIds.map(async (key) => {
        const chatId = key as string;

        // This leverages indexes
        const chatMsgs = db.messages.where("chatId").equals(chatId);

        // We run these two in parallel
        const [firstUserMsg, lastMsg] = await Promise.all([
          // The first user message
          chatMsgs.clone().filter(m => m.role === "user").first(),
          // The last message for timestamp
          chatMsgs.clone().last()
        ]);

        return {
          id: chatId,
          title: firstUserMsg ? firstUserMsg.content : "New Conversation",
          timestamp: lastMsg ? lastMsg.timestamp : 0,
        };
      })
    );
    const res3 = mapped.sort((a, b) => b.timestamp - a.timestamp);
    const time3 = performance.now() - start3;

    console.log(`Baseline: ${time1.toFixed(2)} ms`);
    console.log(`Query optimization: ${time3.toFixed(2)} ms`);
  }

  process.exit(0);
}

runBenchmark().catch(console.error);
