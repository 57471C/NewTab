import { ArrowUp, Globe, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import chatgptLogo from "../assets/ChatGPT.svg";
import claudeLogo from "../assets/claude.svg";
import geminiLogo from "../assets/gemini.svg";
import grokLogo from "../assets/grok.svg";
import { type ProviderId, resolveProvider } from "../lib/api-providers";
import {
	type ChatAttachment,
	MAX_ATTACHMENTS,
	readImageFile,
} from "../lib/attachments";
import { prefs } from "../lib/prefs";
import { PROVIDER_IDS, vault } from "../lib/vault";

const AI_MODELS = [
	{
		label: "Gemini 3.8 Flash",
		value: "gemini-3.8-flash",
		icon: geminiLogo,
	},
	{
		label: "Gemini 3.5 Flash",
		value: "gemini-3.5-flash",
		icon: geminiLogo,
	},
	{
		label: "Gemini 2.5 Pro",
		value: "gemini-2.5-pro",
		icon: geminiLogo,
	},
	{
		label: "Claude Sonnet 5",
		value: "claude-sonnet-5",
		icon: claudeLogo,
	},
	{
		label: "Claude Haiku 4.5",
		value: "claude-haiku-4-5",
		icon: claudeLogo,
	},
	{
		label: "GPT-5.5",
		value: "gpt-5.5",
		icon: chatgptLogo,
		invert: true,
	},
	{
		label: "GPT-4o",
		value: "gpt-4o",
		icon: chatgptLogo,
		invert: true,
	},
	{ label: "Grok 4.6", value: "grok-4.6", icon: grokLogo },
	{ label: "Grok 4.3", value: "grok-4.3", icon: grokLogo },
	{
		label: "Grok 4.20 Fast",
		value: "grok-4.20-0309-non-reasoning",
		icon: grokLogo,
	},
	{
		label: "Grok 4.20 Reasoning",
		value: "grok-4.20-0309-reasoning",
		icon: grokLogo,
	},
	{ label: "Grok Build", value: "grok-build-0.1", icon: grokLogo },
];

function firstReadyModel(ready: Set<ProviderId>, preferred?: string | null) {
	if (preferred) {
		const match = AI_MODELS.find((model) => model.value === preferred);
		if (match && ready.has(resolveProvider(match.value))) return match.value;
	}
	const available = AI_MODELS.find((model) =>
		ready.has(resolveProvider(model.value)),
	);
	return available?.value ?? AI_MODELS[0].value;
}

export default function ChatInput({
	onSubmit,
}: {
	onSubmit: (
		query: string,
		searchEngine: string,
		aiModel: string,
		forceChat?: boolean,
		attachments?: ChatAttachment[],
	) => void;
}) {
	const [inputValue, setInputValue] = useState("");
	const [searchEngine, setSearchEngine] = useState("Google");
	const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
	const [aiModel, setAiModel] = useState("gemini-3.8-flash");
	const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
	const [readyProviders, setReadyProviders] = useState<Set<ProviderId>>(
		new Set(),
	);
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
			const [savedModel, savedEngine, configured] = await Promise.all([
				prefs.getModel(),
				prefs.getEngine(),
				vault.configured(),
			]);
			if (cancelled) return;
			setReadyProviders(configured);
			if (savedEngine) setSearchEngine(savedEngine);
			setAiModel(firstReadyModel(configured, savedModel));
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
					setAiModel((current) => firstReadyModel(configured, current));
				});
			}
			if (changes["prefs.aiModel"]?.newValue) {
				setAiModel(String(changes["prefs.aiModel"].newValue));
			}
			if (changes["prefs.searchEngine"]?.newValue) {
				setSearchEngine(String(changes["prefs.searchEngine"].newValue));
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

	const selectedModel =
		AI_MODELS.find((m) => m.value === aiModel) || AI_MODELS[0];
	const selectedReady = readyProviders.has(resolveProvider(selectedModel.value));

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
				className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl transition-all focus-within:border-zinc-700"
			>
				{attachments.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{attachments.map((attachment) => (
							<div
								key={attachment.id}
								className="relative h-14 w-14 overflow-hidden rounded-lg border border-zinc-700"
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
					<p className="px-1 text-[11px] text-red-400">{attachError}</p>
				)}
				<textarea
					name="chat-input"
					value={inputValue}
					onChange={handleInputResize}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					className="w-full resize-none border-0 bg-transparent p-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-0"
					placeholder="Ask anything or type a web address..."
					rows={1}
					style={{ maxHeight: "200px" }}
				/>

				<div className="flex w-full items-center justify-between border-zinc-800/40 border-t pt-1.5">
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
							className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
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
											onClick={() => selectEngine(engine)}
											className="block w-full px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
										>
											{engine}
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
								className={`flex cursor-pointer items-center gap-1 rounded-full border border-zinc-800 bg-zinc-850 px-2.5 py-1 font-medium text-xs transition-colors hover:border-zinc-700 ${
									selectedReady ? "text-zinc-300" : "text-zinc-500"
								}`}
							>
								<img
									src={selectedModel.icon}
									alt={`${selectedModel.label} logo`}
									className={`h-[14px] w-[14px] object-contain ${
										selectedModel.invert ? "invert dark:invert" : ""
									} ${selectedReady ? "" : "opacity-40"}`}
								/>
								<span>{selectedModel.label}</span>
							</button>
							{isModelMenuOpen && (
								<div className="absolute right-0 bottom-full mb-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
									{AI_MODELS.map((model) => {
										const ready = readyProviders.has(
											resolveProvider(model.value),
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
														? "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
														: "cursor-not-allowed text-zinc-600"
												}`}
											>
												<img
													src={model.icon}
													alt={`${model.label} logo`}
													className={`h-[14px] w-[14px] object-contain ${
														model.invert ? "invert dark:invert" : ""
													} ${ready ? "" : "opacity-30"}`}
												/>
												<span className="flex-1 truncate">{model.label}</span>
												{!ready && (
													<span className="text-[10px] text-zinc-600">No key</span>
												)}
											</button>
										);
									})}
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={() => handleSubmitInternal(false)}
							className="rounded-full bg-zinc-100 p-1.5 text-zinc-950 shadow-md transition-all hover:bg-white active:scale-95"
						>
							<ArrowUp size={16} strokeWidth={3} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
