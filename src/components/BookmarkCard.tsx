import { useState } from "react";

interface BookmarkItem {
	url: string;
	title: string;
	// Add your other standard bookmark properties here
}

const sanitizeUrl = (url?: string) => {
	if (!url) return "#";
	// Strip control characters (0x00-0x1F and 0x7F) before checking
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
		return "#";
	}
	return url;
};

export function BookmarkCard({ item }: { item: BookmarkItem }) {
	const [imageFailed, setImageFailed] = useState(false);

	// Chrome's built-in sandbox utility layout for favicons
	const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=32`;

	return (
		<a
			href={sanitizeUrl(item.url)}
			className="group relative flex h-28 cursor-pointer flex-col justify-between rounded-xl border border-zinc-850 bg-zinc-900/40 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80 hover:bg-zinc-900"
		>
			{/* Top Row: Favicon with onError Fallback */}
			<div className="relative z-10">
				{!imageFailed ? (
					<img
						src={faviconUrl}
						alt=""
						className="h-5 w-5 rounded-md opacity-70 grayscale filter transition-opacity group-hover:opacity-100"
						onError={() => setImageFailed(true)}
					/>
				) : (
					<div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 opacity-70 transition-opacity group-hover:opacity-100">
						<div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
					</div>
				)}
			</div>

			{/* The Middle: Monogram Mark */}
			<div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden">
				<span className="font-extralight font-sans text-5xl text-zinc-800 uppercase opacity-25 transition-all duration-300 group-hover:scale-110 group-hover:text-zinc-600 group-hover:opacity-45">
					{item.title ? item.title.charAt(0) : "?"}
				</span>
			</div>

			{/* Bottom Row: Site Name */}
			<div className="relative z-10 truncate font-medium text-xs text-zinc-400 transition-colors group-hover:text-zinc-100">
				{item.title}
			</div>
		</a>
	);
}
