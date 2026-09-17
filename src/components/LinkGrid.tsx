import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { type OpenLinksMode, prefs } from "../lib/prefs";
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

const tileClass = (isDragging: boolean) =>
	`flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 ${
		isDragging ? "scale-95 opacity-40" : "opacity-100"
	}`;

export default function LinkGrid({
	links,
	onReorder,
	onEmptyClick,
}: {
	links: ShortcutLink[];
	onReorder: (sourceIndex: number, targetIndex: number) => void;
	onEmptyClick: (slotIndex: number) => void;
}) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [openLinks, setOpenLinks] = useState<OpenLinksMode>("same");

	useEffect(() => {
		let cancelled = false;
		void prefs.getOpenLinks().then((mode) => {
			if (!cancelled) setOpenLinks(mode);
		});

		if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
			return () => {
				cancelled = true;
			};
		}

		const onChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: string,
		) => {
			if (area !== "local" || !changes["prefs.openLinks"]) return;
			const next = changes["prefs.openLinks"].newValue;
			setOpenLinks(next === "new" ? "new" : "same");
		};
		chrome.storage.onChanged.addListener(onChange);
		return () => {
			cancelled = true;
			chrome.storage.onChanged.removeListener(onChange);
		};
	}, []);

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

	const openInNewTab = openLinks === "new";

	return (
		<div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-4 px-4 py-8">
			{links.map((link, i) => {
				const isDragging = draggedIndex === i;
				const empty = !link.url.trim();
				const safeUrl = sanitizeUrl(link.url);
				const dragHandlers = {
					draggable: true,
					onDragStart: (e: React.DragEvent) => handleDragStart(e, i),
					onDragOver: handleDragOver,
					onDrop: (e: React.DragEvent) => handleDrop(e, i),
					onDragEnd: handleDragEnd,
				};

				if (empty) {
					return (
						<button
							key={link.id}
							type="button"
							{...dragHandlers}
							onClick={() => onEmptyClick(link.index)}
							className={`${tileClass(isDragging)} cursor-pointer`}
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 shadow-inner dark:bg-zinc-800">
								<Plus size={24} className="text-zinc-400 dark:text-zinc-700" />
							</div>
							<span className="w-full truncate text-center font-medium text-xs text-zinc-700 dark:text-zinc-300">
								{link.title || "Add Link"}
							</span>
						</button>
					);
				}

				return (
					<a
						key={link.id}
						href={safeUrl}
						target={openInNewTab ? "_blank" : "_self"}
						rel={openInNewTab ? "noreferrer" : undefined}
						{...dragHandlers}
						className={`${tileClass(isDragging)} cursor-grab active:cursor-grabbing`}
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 shadow-inner dark:bg-zinc-800">
							<Favicon url={link.url} alt={link.title} size={24} />
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
