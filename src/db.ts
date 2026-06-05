import Dexie, { type EntityTable } from "dexie";

// Define the initial schema for our local Bookmark links
export interface Bookmark {
	id?: number;
	title: string;
	url: string;
}

const db = new Dexie("NewTabAssistantDB") as Dexie & {
	bookmarks: EntityTable<Bookmark, "id">;
};

db.version(1).stores({
	bookmarks: "++id, title, url", // Primary key and indexed props
});

export { db };
