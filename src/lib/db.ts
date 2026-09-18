import Dexie, { type EntityTable } from "dexie";

export interface Shortcut {
	id?: number;
	slotIndex: number;
	title: string;
	url: string;
}

export interface ChatMessage {
	id: string;
	chatId: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: number;
}

export interface ChatSession {
	id: string;
	title: string;
	timestamp: number;
}

class NewTabDatabase extends Dexie {
	shortcuts!: EntityTable<Shortcut, "id">;
	messages!: EntityTable<ChatMessage, "id">;
	sessions!: EntityTable<ChatSession, "id">;

	constructor() {
		super("NewTabDatabase");

		this.version(1).stores({
			shortcuts: "++id, &slotIndex",
			messages: "++id, chatId, timestamp",
		});

		this.version(2)
			.stores({
				shortcuts: "++id, &slotIndex",
				messages: "++id, chatId, timestamp",
				sessions: "id, timestamp",
			})
			.upgrade(async (trans) => {
				const sessionsMap = new Map();
				await trans.table("messages").each((msg) => {
					const existing = sessionsMap.get(msg.chatId);
					if (!existing) {
						sessionsMap.set(msg.chatId, {
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
				if (sessionsMap.size > 0) {
					await trans
						.table("sessions")
						.bulkAdd(Array.from(sessionsMap.values()));
				}
			});

		this.version(3).stores({
			shortcuts: "++id, &slotIndex",
			messages: "id, chatId, timestamp",
			sessions: "id, timestamp",
		});

		this.on("ready", async () => {
			const count = await this.shortcuts.count();
			if (count === 0) {
				const initialShortcuts: Shortcut[] = Array.from(
					{ length: 8 },
					(_, i) => ({
						slotIndex: i,
						title: "Add Link",
						url: "",
					}),
				);
				await this.shortcuts.bulkAdd(initialShortcuts);
			}
		});
	}
}

export const db = new NewTabDatabase();

async function ensureOpen() {
	if (db.isOpen()) return;
	try {
		await db.open();
	} catch {
		db.close();
		await db.open();
	}
}

export async function saveShortcut(
	slotIndex: number,
	title: string,
	url: string,
) {
	await ensureOpen();
	const slot = Number(slotIndex);
	if (!Number.isInteger(slot) || slot < 0) {
		throw new Error(`Invalid grid slot: ${slotIndex}`);
	}

	await db.transaction("rw", db.shortcuts, async () => {
		const existing = await db.shortcuts.where("slotIndex").equals(slot).first();
		if (existing?.id !== undefined) {
			await db.shortcuts.update(existing.id, { title, url });
			return;
		}
		try {
			await db.shortcuts.add({ slotIndex: slot, title, url });
		} catch {
			const collision = await db.shortcuts.where("slotIndex").equals(slot).first();
			if (collision?.id === undefined) throw new Error("Could not save shortcut.");
			await db.shortcuts.update(collision.id, { title, url });
		}
	});
}

export async function renameSession(chatId: string, title: string) {
	await ensureOpen();
	const next = title.trim();
	if (!next) return;
	const session = await db.sessions.get(chatId);
	if (!session) return;
	await db.sessions.put({ ...session, title: next.slice(0, 80) });
}

export async function appendMessage(
	chatId: string,
	role: "user" | "assistant" | "system",
	content: string,
) {
	await ensureOpen();
	const safeChatId =
		typeof chatId === "string" && chatId.trim() !== ""
			? chatId
			: crypto.randomUUID();
	const timestamp = Date.now();

	await db.transaction("rw", db.messages, db.sessions, async () => {
		await db.messages.add({
			id: crypto.randomUUID(),
			chatId: safeChatId,
			role,
			content,
			timestamp,
		});

		const session = await db.sessions.get(safeChatId);
		if (!session) {
			await db.sessions.put({
				id: safeChatId,
				title: role === "user" ? content.slice(0, 80) : "New Conversation",
				timestamp,
			});
		} else {
			let newTitle = session.title;
			if (role === "user" && session.title === "New Conversation") {
				newTitle = content.slice(0, 80);
			}
			await db.sessions.put({
				id: safeChatId,
				title: newTitle,
				timestamp: Math.max(session.timestamp, timestamp),
			});
		}
	});
}

export async function reorderShortcuts(
	sourceIndex: number,
	targetIndex: number,
) {
	await ensureOpen();
	await db.transaction("rw", db.shortcuts, async () => {
		const all = await db.shortcuts.orderBy("slotIndex").toArray();
		const [moved] = all.splice(sourceIndex, 1);
		if (!moved) return;
		all.splice(targetIndex, 0, moved);

		await db.shortcuts.bulkPut(
			all.map((item, index) => ({ ...item, slotIndex: -1 - index })),
		);
		await db.shortcuts.bulkPut(
			all.map((item, index) => ({ ...item, slotIndex: index })),
		);
	});
}
