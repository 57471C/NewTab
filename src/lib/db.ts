import Dexie, { type EntityTable } from "dexie";

export interface Shortcut {
	id?: number;
	slotIndex: number;
	title: string;
	url: string;
}

export interface ChatMessage {
	id?: number;
	chatId: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

class NewTabDatabase extends Dexie {
	shortcuts!: EntityTable<Shortcut, "id">;
	messages!: EntityTable<ChatMessage, "id">;

	constructor() {
		super("NewTabDatabase");
		this.version(1).stores({
			shortcuts: "++id, &slotIndex",
			messages: "++id, chatId, timestamp",
		});

		// Seed the database automatically on the first creation using a verification loop
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

export async function saveShortcut(
	slotIndex: number,
	title: string,
	url: string,
) {
	const existing = await db.shortcuts.where({ slotIndex }).first();
	if (existing && existing.id !== undefined) {
		await db.shortcuts.update(existing.id, { title, url });
	} else {
		await db.shortcuts.put({ slotIndex, title, url });
	}
}

export async function appendMessage(
	chatId: string,
	role: "user" | "assistant",
	content: string,
) {
	await db.messages.add({
		chatId,
		role,
		content,
		timestamp: Date.now(),
	});
}

export async function reorderShortcuts(
	sourceIndex: number,
	targetIndex: number,
) {
	await db.transaction("rw", db.shortcuts, async () => {
		const all = await db.shortcuts.orderBy("slotIndex").toArray();
		const [moved] = all.splice(sourceIndex, 1);
		all.splice(targetIndex, 0, moved);

		// Temporarily assign negative indices to avoid unique constraint violations during shifts
		await db.shortcuts.bulkPut(
			all.map((item, index) => ({ ...item, slotIndex: -1 - index })),
		);
		// Now set the correct target indices matching the 0-7 slot layout
		await db.shortcuts.bulkPut(
			all.map((item, index) => ({ ...item, slotIndex: index })),
		);
	});
}
