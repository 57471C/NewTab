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
			className="relative h-28 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between group transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-sm"
		>
			{/* Top Row: Favicon with onError Fallback */}
			<div className="relative z-10">
				{!imageFailed ? (
					<img
						src={faviconUrl}
						alt=""
						className="h-5 w-5 rounded-md filter grayscale opacity-70 group-hover:opacity-100 transition-opacity"
						onError={() => setImageFailed(true)}
					/>
				) : (
					<div className="h-5 w-5 rounded-md bg-zinc-800 opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center">
						<div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
					</div>
				)}
			</div>

			{/* The Middle: Monogram Mark */}
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
				<span className="text-5xl font-extralight text-zinc-800 opacity-25 group-hover:opacity-45 group-hover:scale-110 group-hover:text-zinc-600 transition-all duration-300 uppercase font-sans">
					{item.title ? item.title.charAt(0) : "?"}
				</span>
			</div>

			{/* Bottom Row: Site Name */}
			<div className="text-xs font-medium text-zinc-400 group-hover:text-zinc-100 transition-colors truncate relative z-10">
				{item.title}
			</div>
		</a>
	);
}
