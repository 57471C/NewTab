import { Grid, History, Moon, Settings, Sparkles, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import LinkGrid from "./components/LinkGrid";
import SettingsModal from "./components/SettingsModal";
import Toast from "./components/Toast";
import type { ShortcutLink } from "./lib/types";
import { db, saveShortcut, reorderShortcuts } from "./lib/db";

function App() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const toastTimeoutRef = useRef<number | null>(null);

	// Core Link Storage Layer
	const rawLinks = useLiveQuery(() =>
		db.shortcuts.orderBy("slotIndex").toArray(),
	);

	const links: ShortcutLink[] = rawLinks
		? rawLinks.map((link) => ({
				id: String(link.id),
				title: link.title,
				url: link.url,
				index: link.slotIndex,
			}))
		: Array.from({ length: 8 }, (_, i) => ({
				id: `placeholder-${i}`,
				title: "Add Link",
				url: "",
				index: i,
			}));

	const showToast = (type: "success" | "error", message: string) => {
		setToast({ type, message });
		if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
		toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3000);
	};

	const updateShortcutInDB = async (
		slotIndex: number,
		title: string,
		url: string,
	) => {
		const formattedUrl = url.trim();
		if (formattedUrl !== "") {
			try {
				new URL(
					formattedUrl.includes("://")
						? formattedUrl
						: `https://${formattedUrl}`,
				);
			} catch {
				showToast("error", "Please enter a valid URL format.");
				return;
			}
		}

		try {
			await saveShortcut(slotIndex, title, formattedUrl);
			showToast("success", "Shortcut successfully updated.");
		} catch (error) {
			showToast("error", "Failed to update shortcut.");
		}
	};

	const reorderLinks = async (sourceIndex: number, targetIndex: number) => {
		await reorderShortcuts(sourceIndex, targetIndex);
	};

	// Apply the dark mode class token to the HTML root
	useEffect(() => {
		if (isDarkMode) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [isDarkMode]);

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-zinc-50 text-zinc-950 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
			<Toast toast={toast} />

			{/* Left Sidebar Column */}
			<aside
				className={`flex flex-col border-zinc-200 border-r bg-white transition-all duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 ${
					isExpanded ? "w-64" : "w-16"
				}`}
				onMouseEnter={() => setIsExpanded(true)}
				onMouseLeave={() => setIsExpanded(false)}
			>
				<div className="flex h-16 items-center justify-center border-zinc-200 border-b dark:border-zinc-800">
					<div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
						<Sparkles size={18} />
					</div>
				</div>

				<nav className="flex flex-1 flex-col gap-2 p-3">
					<SidebarItem
						icon={<Grid size={20} />}
						label="Grid"
						expanded={isExpanded}
					/>
					<SidebarItem
						icon={<History size={20} />}
						label="History"
						expanded={isExpanded}
					/>
				</nav>

				<div className="flex flex-col gap-2 border-zinc-200 border-t p-3 dark:border-zinc-800">
					<button
						type="button"
						onClick={() => setIsDarkMode(!isDarkMode)}
						className="flex items-center rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
					>
						<div className="flex w-8 items-center justify-center">
							{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
						</div>
						<span
							className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
								isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
							}`}
						>
							{isDarkMode ? "Light Mode" : "Dark Mode"}
						</span>
					</button>

					<SidebarItem
						icon={<Settings size={20} />}
						label="Settings"
						expanded={isExpanded}
						onClick={() => setIsSettingsOpen(true)}
					/>
				</div>
			</aside>

			{/* Right Main Panel Column */}
			<main className="relative flex flex-1 flex-col">
				{/* Streaming Chat Window Viewport */}
				<div className="flex-1 overflow-y-auto p-6">
					<LinkGrid links={links} onReorder={reorderLinks} />
				</div>

				{/* Pill Chat Input Container */}
				<div className="mx-auto w-full max-w-3xl px-4 pb-8">
					<div className="flex min-h-14 w-full items-center rounded-full border border-zinc-200 bg-white px-4 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:ring-zinc-700">
						<input
							type="text"
							className="flex-1 bg-transparent px-2 text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
							placeholder="Ask NewTab Assistant..."
						/>
					</div>
				</div>
			</main>

			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				links={links}
				onUpdateShortcut={updateShortcutInDB}
				showToast={showToast}
			/>
		</div>
	);
}

function SidebarItem({
	icon,
	label,
	expanded,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	expanded: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
		>
			<div className="flex w-8 items-center justify-center">{icon}</div>
			<span
				className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
					expanded ? "w-auto opacity-100" : "w-0 opacity-0"
				}`}
			>
				{label}
			</span>
		</button>
	);
}

export default App;
