import { useLiveQuery } from "dexie-react-hooks";
import {
	Grid,
	History,
	MessageSquare,
	Moon,
	Pencil,
	Plus,
	Settings,
	Sun,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import newtabLogo from "./assets/newtab.svg";
import ChatFeed from "./components/ChatFeed";
import ChatInput from "./components/ChatInput";
import LinkGrid from "./components/LinkGrid";
import SettingsModal from "./components/SettingsModal";
import Toast from "./components/Toast";
import { useChatSessions } from "./hooks/useChatSessions";
import { useStreamingChat } from "./hooks/useStreamingChat";
import type { ChatAttachment } from "./lib/attachments";
import { db, renameSession, reorderShortcuts, saveShortcut } from "./lib/db";
import { prefs } from "./lib/prefs";

function applyTheme(dark: boolean) {
	document.documentElement.classList.toggle("dark", dark);
}

function typingInField(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		target.isContentEditable
	);
}

function hrefFor(url: string) {
	const trimmed = url.trim();
	if (!trimmed) return null;
	return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
}

function App() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [settingsTick, setSettingsTick] = useState(0);
	const [focusSlot, setFocusSlot] = useState<number | null>(null);
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const toastTimeoutRef = useRef<number | null>(null);
	const [isChatActive, setIsChatActive] = useState(false);
	const [activeChatId, setActiveChatId] = useState<string | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameDraft, setRenameDraft] = useState("");

	const { streamChat, stopChat, isStreaming, streamingContent, streamingChatId } =
		useStreamingChat();

	const handleNewChat = () => {
		setIsChatActive(false);
		setActiveChatId(null);
	};

	const handleSelectChat = (id: string) => {
		setActiveChatId(id);
		setIsChatActive(true);
	};

	const startRename = (id: string, title: string) => {
		setRenamingId(id);
		setRenameDraft(title);
	};

	const commitRename = async () => {
		if (!renamingId) return;
		const next = renameDraft.trim();
		setRenamingId(null);
		if (!next) return;
		try {
			await renameSession(renamingId, next);
		} catch {
			showToast("error", "Failed to rename chat.");
		}
	};

	const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		try {
			await db.transaction("rw", db.messages, db.sessions, async () => {
				await db.messages.where("chatId").equals(id).delete();
				await db.sessions.delete(id);
			});
			if (activeChatId === id) {
				handleNewChat();
			}
		} catch (_error) {
			showToast("error", "Failed to delete chat.");
		}
	};

	const chatSessions = useChatSessions();

	const rawLinks = useLiveQuery(() =>
		db.shortcuts.orderBy("slotIndex").toArray(),
	);

	const links = useMemo(() => {
		return rawLinks
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
	}, [rawLinks]);

	const linksRef = useRef(links);
	linksRef.current = links;

	const showToast = (type: "success" | "error", message: string) => {
		setToast({ type, message });
		if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
		toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3000);
	};

	const openSettings = (slot: number | null = null) => {
		setFocusSlot(slot);
		setIsSettingsOpen(true);
	};

	const closeSettings = () => {
		setIsSettingsOpen(false);
		setFocusSlot(null);
		setSettingsTick((tick) => tick + 1);
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
			console.error("Failed to update shortcut:", error);
			showToast("error", "Failed to update shortcut.");
		}
	};

	const reorderLinks = async (sourceIndex: number, targetIndex: number) => {
		await reorderShortcuts(sourceIndex, targetIndex);
	};

	const handleSubmit = async (
		currentQuery: string,
		searchEngine: string,
		aiModel: string,
		forceChat = false,
		attachments: ChatAttachment[] = [],
	) => {
		const trimmed = currentQuery.trim();
		if (!trimmed && attachments.length === 0) return;

		if (forceChat || isChatActive || attachments.length > 0) {
			setIsChatActive(true);

			const chatId = activeChatId || crypto.randomUUID();
			if (!activeChatId) {
				setActiveChatId(chatId);
			}
			await streamChat(
				trimmed || "Look at the attached image(s).",
				aiModel,
				chatId,
				attachments,
			);
		} else {
			const isUrl =
				/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/.*)?$/i.test(
					trimmed,
				);
			if (isUrl) {
				window.location.href = trimmed.startsWith("http")
					? trimmed
					: `https://${trimmed}`;
				return;
			}

			let searchUrl = "https://www.google.com.au/search?q=";
			if (searchEngine === "DuckDuckGo")
				searchUrl = "https://duckduckgo.com/?q=";
			else if (searchEngine === "Bing")
				searchUrl = "https://www.bing.com/search?q=";

			window.location.href = `${searchUrl}${encodeURIComponent(trimmed)}`;
		}
	};

	useEffect(() => {
		let cancelled = false;
		void prefs.getTheme().then((theme) => {
			if (cancelled) return;
			const dark = theme !== "light";
			setIsDarkMode(dark);
			applyTheme(dark);
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
			if (area !== "local" || !changes["prefs.theme"]) return;
			const next = changes["prefs.theme"].newValue === "light" ? false : true;
			setIsDarkMode(next);
			applyTheme(next);
		};
		chrome.storage.onChanged.addListener(onChange);
		return () => {
			cancelled = true;
			chrome.storage.onChanged.removeListener(onChange);
		};
	}, []);

	useEffect(() => {
		applyTheme(isDarkMode);
	}, [isDarkMode]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (!/^[1-8]$/.test(event.key)) return;
			if (typingInField(event.target)) return;
			if (isSettingsOpen) return;

			const slot = Number(event.key) - 1;
			const link =
				linksRef.current.find((item) => item.index === slot) ??
				linksRef.current[slot];
			if (!link) return;

			event.preventDefault();
			const href = hrefFor(link.url);
			if (!href) {
				setIsChatActive(false);
				setActiveChatId(null);
				openSettings(link.index);
				return;
			}

			void prefs.getOpenLinks().then((mode) => {
				if (mode === "new") window.open(href, "_blank", "noopener");
				else window.location.href = href;
			});
		};

		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isSettingsOpen]);

	const toggleTheme = () => {
		const next = !isDarkMode;
		setIsDarkMode(next);
		applyTheme(next);
		void prefs.setTheme(next ? "dark" : "light");
	};

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-zinc-50 text-zinc-950 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
			<Toast toast={toast} />

			<aside
				className={`flex flex-col border-zinc-200 border-r bg-white transition-all duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 ${
					isExpanded ? "w-64" : "w-16"
				}`}
			>
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="group relative flex h-16 w-full cursor-pointer items-center justify-center border-zinc-200 border-b outline-none transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
				>
					<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
						<img src={newtabLogo} alt="NewTab" className="h-7 w-7" />
					</div>
					{!isExpanded && (
						<div className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-xs text-zinc-900 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
							Expand Menu
						</div>
					)}
				</button>

				<nav className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
					<SidebarItem
						icon={<Grid size={20} />}
						label="Grid"
						expanded={isExpanded}
						onClick={() => {
							setIsChatActive(false);
							setActiveChatId(null);
						}}
					/>
					<div className="flex flex-col overflow-hidden">
						<SidebarItem
							icon={<History size={20} />}
							label="History"
							expanded={isExpanded}
							onClick={() => setIsExpanded(!isExpanded)}
						/>
						{isExpanded && (
							<div className="mt-2 flex flex-col gap-1 overflow-y-auto pr-1 pl-2">
								<button
									type="button"
									onClick={handleNewChat}
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
								>
									<Plus size={14} className="flex-shrink-0" />
									<span className="truncate">New Chat</span>
								</button>
								{chatSessions?.map((session) => (
									<div
										key={session.id}
										className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
											activeChatId === session.id
												? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
												: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
										}`}
									>
										{renamingId === session.id ? (
											<input
												autoFocus
												value={renameDraft}
												onChange={(event) => setRenameDraft(event.target.value)}
												onBlur={() => void commitRename()}
												onKeyDown={(event) => {
													if (event.key === "Enter") {
														event.preventDefault();
														void commitRename();
													}
													if (event.key === "Escape") {
														setRenamingId(null);
													}
												}}
												className="w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
											/>
										) : (
											<>
												<button
													type="button"
													onClick={() => handleSelectChat(session.id)}
													onDoubleClick={(event) => {
														event.preventDefault();
														startRename(session.id, session.title);
													}}
													className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden outline-none"
												>
													<MessageSquare size={14} className="flex-shrink-0" />
													<span className="truncate">{session.title}</span>
												</button>
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														startRename(session.id, session.title);
													}}
													className="flex-shrink-0 rounded p-0.5 text-zinc-400 outline-none hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
													title="Rename chat"
												>
													<Pencil size={12} />
												</button>
												<button
													type="button"
													onClick={(e) => handleDeleteChat(e, session.id)}
													className="flex-shrink-0 rounded p-0.5 text-zinc-400 outline-none hover:bg-zinc-200 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-red-400"
													title="Delete Chat"
												>
													<X size={14} />
												</button>
											</>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</nav>

				<div className="flex flex-col gap-2 border-zinc-200 border-t p-3 dark:border-zinc-800">
					<SidebarItem
						icon={isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
						label={isDarkMode ? "Light Mode" : "Dark Mode"}
						expanded={isExpanded}
						onClick={toggleTheme}
					/>
					<SidebarItem
						icon={<Settings size={20} />}
						label="Settings"
						expanded={isExpanded}
						onClick={() => openSettings()}
					/>
				</div>
			</aside>

			<main className="relative flex flex-1 flex-col">
				{isChatActive ? (
					<ChatFeed
						activeChatId={activeChatId || ""}
						isStreaming={isStreaming && activeChatId === streamingChatId}
						streamingContent={
							activeChatId === streamingChatId ? streamingContent : undefined
						}
					/>
				) : (
					<div className="flex-1 overflow-y-auto p-6">
						<LinkGrid
							links={links}
							onReorder={reorderLinks}
							onEmptyClick={(slot) => openSettings(slot)}
						/>
					</div>
				)}

				<ChatInput
					onSubmit={handleSubmit}
					isStreaming={isStreaming}
					onStop={stopChat}
					reloadToken={settingsTick}
				/>
			</main>

			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={closeSettings}
				links={links}
				onUpdateShortcut={updateShortcutInDB}
				showToast={showToast}
				focusSlot={focusSlot}
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
		<div className="group relative flex w-full">
			<button
				type="button"
				onClick={onClick}
				className="flex w-full items-center rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
			>
				<div className="flex w-8 flex-shrink-0 items-center justify-center">
					{icon}
				</div>
				<span
					className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
						expanded ? "w-auto opacity-100" : "w-0 opacity-0"
					}`}
				>
					{label}
				</span>
			</button>
			{!expanded && (
				<div className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-xs text-zinc-900 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
					{label}
				</div>
			)}
		</div>
	);
}

export default App;
