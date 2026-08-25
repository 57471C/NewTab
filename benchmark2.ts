import "fake-indexeddb/auto";
import { db } from "./src/lib/db.ts";

async function runBenchmark() {
    const chatId = "bench-chat-2";
    // Seed db with 100 messages to simulate a decent sized chat
    const msgs = [];
    for(let i=0; i<100; i++) {
        msgs.push({
            chatId,
            role: "user" as const,
            content: "hello " + i,
            timestamp: Date.now()
        });
    }
    await db.messages.bulkAdd(msgs);

    const start = performance.now();
    const assistantMsgId = await db.messages.add({
        chatId,
        role: "assistant",
        content: "",
        timestamp: Date.now()
    });

    for (let i = 0; i < 200; i++) {
        await db.messages.update(assistantMsgId, {
            content: "chunk " + i
        });
        // simulate useLiveQuery re-triggering on DB mutation
        await db.messages.where("chatId").equals(chatId).sortBy("timestamp");
    }
    const end = performance.now();
    console.log(`Current (DB update + Re-query 200 chunks): ${end - start} ms`);

    const start2 = performance.now();
    let reactState = "";
    const assistantMsgId2 = await db.messages.add({
        chatId,
        role: "assistant",
        content: "",
        timestamp: Date.now()
    });
    for (let i = 0; i < 200; i++) {
        reactState = "chunk " + i;
        // no db update, no re-query during stream
    }
    // Update at completion
    await db.messages.update(assistantMsgId2, {
        content: reactState
    });
    await db.messages.where("chatId").equals(chatId).sortBy("timestamp");
    const end2 = performance.now();
    console.log(`Optimized (React State + 1 DB update/query at end): ${end2 - start2} ms`);
}

runBenchmark().catch(console.error);
