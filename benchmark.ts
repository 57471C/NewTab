import "fake-indexeddb/auto";
import { db } from "./src/lib/db.ts";

async function runBenchmark() {
    const chatId = "bench-chat";
    // Seed db
    for(let i=0; i<100; i++) {
        await db.messages.add({
            chatId,
            role: "user",
            content: "hello " + i,
            timestamp: Date.now()
        });
    }

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
        await db.messages.where("chatId").equals(chatId).sortBy("timestamp");
    }
    const end = performance.now();
    console.log(`Baseline query 1000 times: ${end - start} ms`);
}

runBenchmark().catch(console.error);
