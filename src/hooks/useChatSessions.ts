import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";

export function useChatSessions() {
	return useLiveQuery(async () => {
		const messages = await db.messages.toArray();
		const sessions = new Map<
			string,
			{ id: string; title: string; timestamp: number }
		>();

		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
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

		return Array.from(sessions.values()).sort(
			(a, b) => b.timestamp - a.timestamp,
		);
	}, []);
}
