import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";

export function useChatSessions() {
	return useLiveQuery(async () => {
		const sessions = await db.sessions.orderBy("timestamp").reverse().toArray();
		return sessions;
	}, []);
}
