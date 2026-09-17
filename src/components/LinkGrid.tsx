import { Plus } from "lucide-react";
import { useState } from "react";
import type { ShortcutLink } from "../lib/types";
import Favicon from "./Favicon";

const sanitizedUrlCache = new Map<string, string>();

const sanitizeUrl = (url?: string) => {
	if (!url) return "#";
	const cached = sanitizedUrlCache.get(url);
	if (cached !== undefined) return cached;

	const cleaned = url
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally matching control chars to strip them
		.replace(/[\x00-\x1F\x7F]/g, "")
		.trim()
		.toLowerCase();
	if (
		cleaned.startsWith("javascript:") ||
		cleaned.startsWith("data:") ||
		cleaned.startsWith("vbscript:")
	) {
		sanitizedUrlCache.set(url, "#");
		return "#";
	}
	sanitizedUrlCache.set(url, url);
	return url;
};

export default function LinkGrid({
	links,
	onReorder,
}: {
	links: ShortcutLink[];
	onReorder: (sourceIndex: number, targetIndex: number) => void;
}) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", index.toString());
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = (e: React.DragEvent, targetIndex: number) => {
		e.preventDefault();
		const sourceIndex = Number.parseInt(
			e.dataTransfer.getData("text/plain"),
			10,
		);
		if (
			!Number.isNaN(sourceIndex) &&
			sourceIndex >= 0 &&
			sourceIndex < links.length &&
			sourceIndex !== targetIndex
		) {
			onReorder(sourceIndex, targetIndex);
		}
		setDraggedIndex(null);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
	};

	return (
		<div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-4 px-4 py-8">
			{links.map((link, i) => {
				const isDragging = draggedIndex === i;
				const safeUrl = sanitizeUrl(link.url);

				return (
					<a
						key={link.id}
						href={safeUrl}
						target={safeUrl !== "#" ? "_blank" : "_self"}
						rel="noreferrer"
						draggable={true}
						onDragStart={(e) => handleDragStart(e, i)}
						onDragOver={handleDragOver}
						onDrop={(e) => handleDrop(e, i)}
						onDragEnd={handleDragEnd}
						className={`flex aspect-square cursor-grab flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 ${
							isDragging ? "scale-95 opacity-40" : "opacity-100"
						}`}
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 shadow-inner dark:bg-zinc-800">
							{link.url ? (
								<Favicon url={link.url} alt={link.title} size={24} />
							) : (
								<Plus size={24} className="text-zinc-400 dark:text-zinc-700" />
							)}
						</div>
						<span className="w-full truncate text-center font-medium text-xs text-zinc-700 dark:text-zinc-300">
							{link.title || "Add Link"}
						</span>
					</a>
				);
			})}
		</div>
	);
}
