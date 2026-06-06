import { ArrowUp, ChevronDown, Cpu, Globe, Mic, Paperclip } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Engine = "google" | "duckduckgo" | "bing";

const ENGINES: Record<Engine, { name: string; url: string }> = {
	google: { name: "Google", url: "https://www.google.com/search?q=" },
	duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
	bing: { name: "Bing", url: "https://www.bing.com/search?q=" },
};

export default function SearchAndChat({
	isChatActive,
	onActivate,
	onChatSubmit,
}: {
	isChatActive: boolean;
	onActivate: () => void;
	onChatSubmit: (query: string) => void;
}) {
	const [engine, setEngine] = useState<Engine>("google");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
	const [query, setQuery] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const modelDropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setIsDropdownOpen(false);
			}
			if (
				modelDropdownRef.current &&
				!modelDropdownRef.current.contains(e.target as Node)
			) {
				setIsModelDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const executeWebSearch = () => {
		if (!query.trim()) return;

		// Natively parse direct URL strings (e.g. google.com.au or https://...)
		const isUrl = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/.*)?$/i.test(
			query.trim(),
		);
		if (isUrl) {
			window.location.href = query.startsWith("http")
				? query
				: `https://${query}`;
			return;
		}

		// Execute Search Engine Endpoint
		window.location.href = `${ENGINES[engine].url}${encodeURIComponent(query)}`;
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			if (e.metaKey || e.ctrlKey) {
				e.preventDefault();
				if (query.trim()) {
					onChatSubmit(query);
					setQuery("");
				}
			}
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		executeWebSearch();
	};

	return (
		<div
			className={`w-full px-4 transition-all duration-[350ms] ease-out ${
				isChatActive
					? "fixed bottom-8 left-0 right-0 z-50 mx-auto max-w-3xl"
					: "relative z-10 mx-auto max-w-2xl"
			}`}
		>
			<form
				onSubmit={handleSubmit}
				className={`flex flex-col gap-2 rounded-xl border bg-zinc-900 p-3 shadow-xl transition-all duration-[350ms] ease-out focus-within:border-zinc-700 ${
					isChatActive ? "border-zinc-700" : "border-zinc-800"
				}`}
			>
				{/* Top Row: Text Entry Zone */}
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={onActivate}
					placeholder="Search the web or ask the AI..."
					className="w-full resize-none border-0 bg-transparent p-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-0"
				/>

				{/* Bottom Row: Utility Bar Mapping */}
				<div className="flex w-full items-center justify-between border-t border-zinc-800/40 pt-1.5">
					{/* Left Aligned Actions */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
						>
							<Paperclip size={18} />
						</button>

						<div className="relative" ref={dropdownRef}>
							<button
								type="button"
								onClick={() => setIsDropdownOpen(!isDropdownOpen)}
								className="flex cursor-pointer items-center gap-1 rounded-full border border-zinc-800 bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-700"
							>
								<Globe size={14} />
								{ENGINES[engine].name}
								<ChevronDown size={14} />
							</button>

							{isDropdownOpen && (
								<div className="absolute bottom-full left-0 z-50 mb-2 flex w-32 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
									{(Object.keys(ENGINES) as Engine[]).map((eng) => (
										<button
											key={eng}
											type="button"
											onClick={() => {
												setEngine(eng);
												setIsDropdownOpen(false);
											}}
											className={`px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-800 ${engine === eng ? "text-zinc-100" : "text-zinc-400"}`}
										>
											{ENGINES[eng].name}
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Right Aligned Actions */}
					<div className="flex items-center gap-2">
						<div className="relative" ref={modelDropdownRef}>
							<button
								type="button"
								onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
								className="flex cursor-pointer items-center gap-1 rounded-full border border-zinc-800 bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-700"
							>
								<Cpu size={14} />
								Gemini
								<ChevronDown size={14} />
							</button>

							{isModelDropdownOpen && (
								<div className="absolute right-0 bottom-full z-50 mb-2 flex w-32 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
									<button
										type="button"
										onClick={() => setIsModelDropdownOpen(false)}
										className="px-3 py-2 text-left text-xs text-zinc-100 transition-colors hover:bg-zinc-800"
									>
										Gemini
									</button>
								</div>
							)}
						</div>

						<button
							type="button"
							className="rounded-md p-1.5 text-zinc-500 transition-colors hover:text-zinc-300"
						>
							<Mic size={18} />
						</button>

						<button
							type="submit"
							className="rounded-full bg-zinc-100 p-1.5 text-zinc-950 shadow-md transition-all hover:bg-white active:scale-95"
						>
							<ArrowUp size={18} />
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
