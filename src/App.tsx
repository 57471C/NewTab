import { useLiveQuery } from "dexie-react-hooks";
import {
	ArrowUp,
	Globe,
	Grid,
	History,
	MessageSquare,
	Mic,
	Moon,
	Paperclip,
	Plus,
	Settings,
	Sun,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import geminiLogo from "./assets/gemini.svg";
import claudeLogo from "./assets/claude.svg";
import chatgptLogo from "./assets/ChatGPT.svg";
import grokLogo from "./assets/grok.svg";
import LinkGrid from "./components/LinkGrid";
import SettingsModal from "./components/SettingsModal";
import ChatFeed from "./components/ChatFeed";
import Toast from "./components/Toast";
import { db, reorderShortcuts, saveShortcut } from "./lib/db";
import type { ShortcutLink } from "./lib/types";
import { useStreamingChat } from "./hooks/useStreamingChat";

function App() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const toastTimeoutRef = useRef<number | null>(null);
	const [inputValue, setInputValue] = useState("");
	const [isChatActive, setIsChatActive] = useState(false);
	const [searchEngine, setSearchEngine] = useState("Google");
	const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
	const [aiModel, setAiModel] = useState("Gemini");
	const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
	const [activeChatId, setActiveChatId] = useState<string | null>(null);
	const chassisRef = useRef<HTMLDivElement>(null);

	const AI_MODELS = [
		{ label: "Gemini", value: "Gemini", icon: geminiLogo },
		{ label: "Claude", value: "Claude", icon: claudeLogo },
		{ label: "GPT-4", value: "GPT-4", icon: chatgptLogo, invert: true },
		{ label: "Grok 4.3 (Flagship)", value: "grok-4.3", icon: grokLogo },
		{
			label: "Grok 4.20 (Fast)",
			value: "grok-4.20-non-reasoning",
			icon: grokLogo,
		},
		{ label: "Grok 3 (Reasoning)", value: "grok-3", icon: grokLogo },
	];

	const { streamChat, isStreaming } = useStreamingChat();

	const handleNewChat = () => {
		setIsChatActive(false);
		setInputValue("");
		setActiveChatId(null);
	};

	const handleSelectChat = (id: string) => {
		setActiveChatId(id);
		setIsChatActive(true);
	};

	const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		try {
			await db.messages.where("chatId").equals(id).delete();
			if (activeChatId === id) {
				handleNewChat();
			}
		} catch (error) {
			showToast("error", "Failed to delete chat.");
		}
	};

	const chatSessions = useLiveQuery(async () => {
		const messages = await db.messages.orderBy("timestamp").toArray();
		const sessions = new Map<
			string,
			{ id: string; title: string; timestamp: number }
		>();

		for (const msg of messages) {
			const existing = sessions.get(msg.chatId);
			if (!existing) {
				sessions.set(msg.chatId, {
					id: msg.chatId,
					title: msg.role === "user" ? msg.content : "New Conversation",
					timestamp: msg.timestamp,
				});
			} else {
				if (msg.role === "user" && existing.title === "New Conversation") {
					existing.title = msg.content;
				}
				existing.timestamp = Math.max(existing.timestamp, msg.timestamp);
			}
		}

		return Array.from(sessions.values()).sort(
			(a, b) => b.timestamp - a.timestamp,
		);
	}, []);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				chassisRef.current &&
				!chassisRef.current.contains(e.target as Node)
			) {
				setIsSearchMenuOpen(false);
				setIsModelMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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
			// biome-ignore lint/correctness/noUnusedVariables: agent says error needs to be caught for logging, pending schema update
		} catch (error) {
			showToast("error", "Failed to update shortcut.");
		}
	};

	const reorderLinks = async (sourceIndex: number, targetIndex: number) => {
		await reorderShortcuts(sourceIndex, targetIndex);
	};

	const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	const handleSubmit = async (forceChat = false) => {
		if (!inputValue.trim()) return;
		const currentQuery = inputValue;

		if (forceChat || isChatActive) {
			setInputValue("");
			setIsChatActive(true);

			// Generate a unique session token if it doesn't exist yet
			const chatId = activeChatId || crypto.randomUUID();
			if (!activeChatId) {
				setActiveChatId(chatId);
			}
			await streamChat(currentQuery, aiModel, chatId);
		} else {
			let searchUrl = "https://www.google.com/search?q=";
			if (searchEngine === "DuckDuckGo")
				searchUrl = "https://duckduckgo.com/?q=";
			else if (searchEngine === "Bing")
				searchUrl = "https://www.bing.com/search?q=";

			window.location.href = `${searchUrl}${encodeURIComponent(currentQuery)}`;
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e.metaKey || e.ctrlKey);
		}
	};

	// Apply the dark mode class token to the HTML root
	useEffect(() => {
		if (isDarkMode) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [isDarkMode]);

	const selectedModel =
		AI_MODELS.find((m) => m.value === aiModel) || AI_MODELS[0];

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-zinc-50 text-zinc-950 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
			<Toast toast={toast} />

			{/* Left Sidebar Column */}
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
						<img src={reactLogo} alt="React Logo" className="h-6 w-6" />
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
							<div className="mt-2 flex flex-col gap-1 overflow-y-auto pl-8 pr-2">
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
										className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
											activeChatId === session.id
												? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
												: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
										}`}
									>
										<button
											type="button"
											onClick={() => handleSelectChat(session.id)}
											className="flex flex-1 items-center gap-2 overflow-hidden outline-none"
										>
											<MessageSquare size={14} className="flex-shrink-0" />
											<span className="truncate">{session.title}</span>
										</button>
										<button
											type="button"
											onClick={(e) => handleDeleteChat(e, session.id)}
											className="flex-shrink-0 opacity-0 outline-none transition-opacity hover:text-red-600 group-hover:opacity-100 dark:hover:text-red-400"
											title="Delete Chat"
										>
											<X size={14} />
										</button>
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
						onClick={() => setIsDarkMode(!isDarkMode)}
					/>
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
				{isChatActive ? (
					<ChatFeed
						activeChatId={activeChatId || ""}
						isStreaming={isStreaming}
					/>
				) : (
					<div className="flex-1 overflow-y-auto p-6">
						<LinkGrid links={links} onReorder={reorderLinks} />
					</div>
				)}

				{/* Compound Input Chassis */}
				<div className="mx-auto w-full max-w-3xl px-4 pb-8">
					<div
						ref={chassisRef}
						className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl transition-all focus-within:border-zinc-700"
					>
						{/* TOP ROW: TEXT ENTRY ZONE */}
						<textarea
							name="chat-input"
							value={inputValue}
							onChange={handleInputResize}
							onKeyDown={handleKeyDown}
							className="w-full resize-none border-0 bg-transparent p-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-0"
							placeholder="Ask anything or type a web address..."
							rows={1}
							style={{ maxHeight: "200px" }}
						/>

						{/* BOTTOM ROW: UTILITY BAR MAPPING */}
						<div className="flex w-full items-center justify-between border-zinc-800/40 border-t pt-1.5">
							{/* LEFT ALIGNED ACTIONS */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
								>
									<Paperclip size={16} />
								</button>
								<div className="relative">
									<button
										type="button"
										onClick={() => {
											setIsSearchMenuOpen(!isSearchMenuOpen);
											setIsModelMenuOpen(false);
										}}
										className="flex cursor-pointer items-center gap-1 rounded-full border border-zinc-800 bg-zinc-850 px-2.5 py-1 font-medium text-xs text-zinc-300 transition-colors hover:border-zinc-700"
									>
										<Globe size={14} />
										<span>{searchEngine}</span>
									</button>
									{isSearchMenuOpen && (
										<div className="absolute bottom-full left-0 mb-2 w-36 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
											{["Google", "DuckDuckGo", "Bing"].map((engine) => (
												<button
													key={engine}
													type="button"
													onClick={() => {
														setSearchEngine(engine);
														setIsSearchMenuOpen(false);
													}}
													className="block w-full px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
												>
													{engine}
												</button>
											))}
										</div>
									)}
								</div>
							</div>

							{/* RIGHT ALIGNED ACTIONS */}
							<div className="flex items-center gap-2">
								<div className="relative">
									<button
										type="button"
										onClick={() => {
											setIsModelMenuOpen(!isModelMenuOpen);
											setIsSearchMenuOpen(false);
										}}
										className="flex cursor-pointer items-center gap-1 rounded-full border border-zinc-800 bg-zinc-850 px-2.5 py-1 font-medium text-xs text-zinc-300 transition-colors hover:border-zinc-700"
									>
										<img
											src={selectedModel.icon}
											alt={`${selectedModel.label} logo`}
											className={`h-[14px] w-[14px] object-contain ${
												selectedModel.invert ? "invert dark:invert" : ""
											}`}
										/>
										<span>{selectedModel.label}</span>
									</button>
									{isModelMenuOpen && (
										<div className="absolute right-0 bottom-full mb-2 w-48 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
											{AI_MODELS.map((model) => (
												<button
													key={model.value}
													type="button"
													onClick={() => {
														setAiModel(model.value);
														setIsModelMenuOpen(false);
													}}
													className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
												>
													<img
														src={model.icon}
														alt={`${model.label} logo`}
														className={`h-[14px] w-[14px] object-contain ${
															model.invert ? "invert dark:invert" : ""
														}`}
													/>
													{model.label}
												</button>
											))}
										</div>
									)}
								</div>
								<button
									type="button"
									className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
								>
									<Mic size={16} />
								</button>
								<button
									type="button"
									onClick={() => handleSubmit(false)}
									className="rounded-full bg-zinc-100 p-1.5 text-zinc-950 shadow-md transition-all hover:bg-white active:scale-95"
								>
									<ArrowUp size={16} strokeWidth={3} />
								</button>
							</div>
						</div>
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
