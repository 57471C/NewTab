import { Plus } from "lucide-react";
import { useState } from "react";
import type { ShortcutLink } from "../lib/types";

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
		if (!Number.isNaN(sourceIndex) && sourceIndex !== targetIndex) {
			onReorder(sourceIndex, targetIndex);
		}
		setDraggedIndex(null);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
	};

	const getDomain = (url: string) => {
		try {
			const parsedUrl = new URL(
				url.startsWith("http") ? url : `https://${url}`,
			);
			return parsedUrl.hostname;
		} catch {
			return "";
		}
	};

	const sanitizeUrl = (url?: string) => {
		if (!url) return "#";
		const trimmed = url.trim().toLowerCase();
		if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
			return "#";
		}
		return url;
	};

	return (
		<div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-4 px-4 py-8">
			{links.map((link, i) => {
				const isDragging = draggedIndex === i;
				const domain = getDomain(link.url || "");
				const faviconUrl = domain
					? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
					: "";

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
						className={`flex aspect-square cursor-grab flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-200 hover:border-zinc-700 active:cursor-grabbing ${
							isDragging ? "scale-95 opacity-40" : "opacity-100"
						}`}
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 shadow-inner">
							{link.url ? (
								<img
									src={faviconUrl}
									alt={link.title}
									className="h-6 w-6 rounded-sm"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
							) : (
								<Plus size={24} className="text-zinc-700" />
							)}
						</div>
						<span className="w-full truncate text-center font-medium text-xs text-zinc-300">
							{link.title || "Add Link"}
						</span>
					</a>
				);
			})}
		</div>
	);
}
