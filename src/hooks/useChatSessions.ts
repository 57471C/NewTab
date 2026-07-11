import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";

export function useChatSessions() {
	return useLiveQuery(async () => {
		const chatIds = await db.messages.orderBy("chatId").uniqueKeys();

		const sessions = await Promise.all(
			chatIds.map(async (key) => {
				const chatId = key as string;
				const chatMsgs = db.messages.where("chatId").equals(chatId);

				const [firstUserMsg, lastMsg] = await Promise.all([
					chatMsgs
						.clone()
						.filter((m) => m.role === "user")
						.first(),
					chatMsgs.clone().last(),
				]);

				return {
					id: chatId,
					title: firstUserMsg ? firstUserMsg.content : "New Conversation",
					timestamp: lastMsg ? lastMsg.timestamp : 0,
				};
			}),
		);

		return sessions.sort((a, b) => b.timestamp - a.timestamp);
	}, []);
}
