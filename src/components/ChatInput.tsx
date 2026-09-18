import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import bingLogo from "../assets/bing.svg";
import duckduckgoLogo from "../assets/duckduckgo.svg";
import googleLogo from "../assets/google.svg";
import {
	type ProviderId,
	isProviderReady,
	resolveProvider,
} from "../lib/api-providers";
import {
	type ChatAttachment,
	MAX_ATTACHMENTS,
	readImageFile,
} from "../lib/attachments";
import { AI_MODELS } from "../lib/models";
import { prefs } from "../lib/prefs";
import { PROVIDER_IDS, vault } from "../lib/vault";

const SEARCH_ENGINES = [
	{ label: "Google", icon: googleLogo },
	{ label: "DuckDuckGo", icon: duckduckgoLogo },
	{ label: "Bing", icon: bingLogo },
] as const;

function firstReadyModel(
	ready: Set<ProviderId>,
	hidden: string[],
	preferred?: string | null,
) {
	const visible = AI_MODELS.filter((model) => !hidden.includes(model.value));
	const pool = visible.length ? visible : AI_MODELS;
	if (preferred) {
		const match = pool.find((model) => model.value === preferred);
		if (match && isProviderReady(resolveProvider(match.value), ready)) {
			return match.value;
		}
	}
	const available = pool.find((model) =>
		isProviderReady(resolveProvider(model.value), ready),
	);
	return available?.value ?? pool[0].value;
}

function modelIconTone(model: { invert?: boolean; invertLight?: boolean }) {
	if (model.invertLight) return "invert dark:invert-0";
	if (model.invert) return "dark:invert";
	return "";
}

const chipClass =
	"flex cursor-pointer items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 font-medium text-xs text-zinc-700 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600";
const menuClass =
	"absolute bottom-full mb-2 rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900";

export default function ChatInput({
	onSubmit,
	isStreaming = false,
	onStop,
}: {
	onSubmit: (
		query: string,
		searchEngine: string,
		aiModel: string,
		forceChat?: boolean,
		attachments?: ChatAttachment[],
	) => void;
	isStreaming?: boolean;
	onStop?: () => void;
}) {
	const [inputValue, setInputValue] = useState("");
	const [searchEngine, setSearchEngine] = useState("Google");
	const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
	const [aiModel, setAiModel] = useState("gemini-3.8-flash");
	const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
	const [readyProviders, setReadyProviders] = useState<Set<ProviderId>>(
		new Set(),
	);
	const [hiddenModels, setHiddenModels] = useState<string[]>([]);
	const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
	const [attachError, setAttachError] = useState<string | null>(null);
	const chassisRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	useEffect(() => {
		let cancelled = false;

		const hydrate = async () => {
			const [savedModel, savedEngine, configured, hidden] = await Promise.all([
				prefs.getModel(),
				prefs.getEngine(),
				vault.configured(),
				prefs.getHiddenModels(),
			]);
			if (cancelled) return;
			setReadyProviders(configured);
			setHiddenModels(hidden);
			if (savedEngine) setSearchEngine(savedEngine);
			setAiModel(firstReadyModel(configured, hidden, savedModel));
		};

		void hydrate();

		if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
			return () => {
				cancelled = true;
			};
		}

		const onChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: string,
		) => {
			if (area !== "local") return;
			if (PROVIDER_IDS.some((provider) => provider in changes)) {
				void vault.configured().then((configured) => {
					if (cancelled) return;
					setReadyProviders(configured);
					setAiModel((current) => firstReadyModel(configured, hiddenModels, current));
				});
			}
			if (changes["prefs.aiModel"]?.newValue) {
				setAiModel(String(changes["prefs.aiModel"].newValue));
			}
			if (changes["prefs.searchEngine"]?.newValue) {
				setSearchEngine(String(changes["prefs.searchEngine"].newValue));
			}
			if (changes["prefs.hiddenModels"]) {
				void prefs.getHiddenModels().then((hidden) => {
					if (cancelled) return;
					setHiddenModels(hidden);
					setAiModel((current) => firstReadyModel(readyProviders, hidden, current));
				});
			}
		};

		chrome.storage.onChanged.addListener(onChange);
		return () => {
			cancelled = true;
			chrome.storage.onChanged.removeListener(onChange);
		};
	}, []);

	const addFiles = async (files: File[]) => {
		setAttachError(null);
		const next: ChatAttachment[] = [];
		for (const file of files) {
			if (attachments.length + next.length >= MAX_ATTACHMENTS) {
				setAttachError(`Maximum ${MAX_ATTACHMENTS} images.`);
				break;
			}
			try {
				next.push(await readImageFile(file));
			} catch (error) {
				setAttachError(
					error instanceof Error ? error.message : "Could not attach file.",
				);
			}
		}
		if (next.length) {
			setAttachments((current) => [...current, ...next]);
		}
	};

	const selectModel = (model: string) => {
		setAiModel(model);
		setIsModelMenuOpen(false);
		void prefs.setModel(model);
	};

	const selectEngine = (engine: string) => {
		setSearchEngine(engine);
		setIsSearchMenuOpen(false);
		void prefs.setEngine(engine);
	};

	const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	const handleSubmitInternal = (forceChat = false) => {
		if (isStreaming) return;
		if (!inputValue.trim() && attachments.length === 0) return;
		const query = inputValue;
		const pending = attachments;
		setInputValue("");
		setAttachments([]);
		setAttachError(null);

		if (chassisRef.current) {
			const textarea = chassisRef.current.querySelector("textarea");
			if (textarea) {
				textarea.style.height = "auto";
			}
		}

		onSubmit(query, searchEngine, aiModel, forceChat || pending.length > 0, pending);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (isStreaming) {
				onStop?.();
				return;
			}
			handleSubmitInternal(e.metaKey || e.ctrlKey);
		}
	};

	const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const files = [...e.clipboardData.files].filter((file) =>
			file.type.startsWith("image/"),
		);
		if (!files.length) return;
		e.preventDefault();
		void addFiles(files);
	};

	const visibleModels = AI_MODELS.filter((model) => !hiddenModels.includes(model.value));
	const pickerModels = visibleModels.length ? visibleModels : AI_MODELS;
	const selectedModel =
		pickerModels.find((m) => m.value === aiModel) || pickerModels[0];
	const selectedEngine =
		SEARCH_ENGINES.find((engine) => engine.label === searchEngine) ||
		SEARCH_ENGINES[0];
	const selectedReady = isProviderReady(
		resolveProvider(selectedModel.value),
		readyProviders,
	);

	return (
		<div className="mx-auto w-full max-w-3xl px-4 pb-8">
			<div
				ref={chassisRef}
				onDragOver={(e) => {
					e.preventDefault();
				}}
				onDrop={(e) => {
					e.preventDefault();
					void addFiles([...e.dataTransfer.files]);
				}}
				className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl transition-all focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-zinc-700"
			>
				{attachments.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{attachments.map((attachment) => (
							<div
								key={attachment.id}
								className="relative h-14 w-14 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
							>
								<img
									src={attachment.dataUrl}
									alt={attachment.name}
									className="h-full w-full object-cover"
								/>
								<button
									type="button"
									onClick={() =>
										setAttachments((current) =>
											current.filter((item) => item.id !== attachment.id),
										)
									}
									className="absolute top-0.5 right-0.5 rounded-full bg-zinc-950/80 p-0.5 text-zinc-200"
									title={`Remove ${attachment.name}`}
								>
									<X size={10} />
								</button>
							</div>
						))}
					</div>
				)}
				{attachError && (
					<p className="px-1 text-[11px] text-red-500 dark:text-red-400">{attachError}</p>
				)}
				<textarea
					name="chat-input"
					value={inputValue}
					onChange={handleInputResize}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					className="w-full resize-none border-0 bg-transparent p-1 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder-zinc-500"
					placeholder="Ask anything or type a web address..."
					rows={1}
					style={{ maxHeight: "200px" }}
				/>

				<div className="flex w-full items-center justify-between border-zinc-200 border-t pt-1.5 dark:border-zinc-800/40">
					<div className="flex items-center gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif"
							multiple
							className="hidden"
							onChange={(e) => {
								void addFiles([...(e.target.files ?? [])]);
								e.target.value = "";
							}}
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
							title="Attach images"
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
								className={chipClass}
							>
								<img
									src={selectedEngine.icon}
									alt={`${selectedEngine.label} logo`}
									className="h-[14px] w-[14px] object-contain"
								/>
								<span>{selectedEngine.label}</span>
							</button>
							{isSearchMenuOpen && (
								<div className={`${menuClass} left-0 w-44 overflow-hidden`}>
									{SEARCH_ENGINES.map((engine) => (
										<button
											key={engine.label}
											type="button"
											onClick={() => selectEngine(engine.label)}
											className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
										>
											<img
												src={engine.icon}
												alt={`${engine.label} logo`}
												className="h-[14px] w-[14px] object-contain"
											/>
											<span>{engine.label}</span>
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="relative">
							<button
								type="button"
								onClick={() => {
									setIsModelMenuOpen(!isModelMenuOpen);
									setIsSearchMenuOpen(false);
								}}
								className={`${chipClass} ${selectedReady ? "" : "text-zinc-400 dark:text-zinc-500"}`}
							>
								<img
									src={selectedModel.icon}
									alt={`${selectedModel.label} logo`}
									className={`h-[14px] w-[14px] object-contain ${modelIconTone(selectedModel)} ${selectedReady ? "" : "opacity-40"}`}
								/>
								<span>{selectedModel.label}</span>
							</button>
							{isModelMenuOpen && (
								<div className={`${menuClass} right-0 max-h-56 w-56 overflow-y-auto`}>
									{pickerModels.map((model) => {
										const ready = isProviderReady(
											resolveProvider(model.value),
											readyProviders,
										);
										return (
											<button
												key={model.value}
												type="button"
												disabled={!ready}
												title={ready ? undefined : "Add an API key in Settings"}
												onClick={() => {
													if (!ready) return;
													selectModel(model.value);
												}}
												className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
													ready
														? "cursor-pointer text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
														: "cursor-default text-zinc-400 dark:text-zinc-600"
												}`}
											>
												<img
													src={model.icon}
													alt={`${model.label} logo`}
													className={`h-[14px] w-[14px] object-contain ${modelIconTone(model)} ${ready ? "" : "opacity-30"}`}
												/>
												<span className="flex-1 truncate">{model.label}</span>
												{!ready && (
													<span className="text-[10px] text-zinc-400 dark:text-zinc-600">No key</span>
												)}
											</button>
										);
									})}
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={() => {
								if (isStreaming) onStop?.();
								else handleSubmitInternal(false);
							}}
							title={isStreaming ? "Stop generating" : "Send"}
							className="rounded-full bg-zinc-900 p-1.5 text-zinc-50 shadow-md transition-all hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
						>
							{isStreaming ? (
								<Square size={14} strokeWidth={3} className="fill-current" />
							) : (
								<ArrowUp size={16} strokeWidth={3} />
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
