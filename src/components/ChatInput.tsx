import { ArrowUp, Globe, Mic, Paperclip } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import chatgptLogo from "../assets/ChatGPT.svg";
import claudeLogo from "../assets/claude.svg";
import geminiLogo from "../assets/gemini.svg";
import grokLogo from "../assets/grok.svg";

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

export default function ChatInput({
	onSubmit,
}: {
	onSubmit: (
		query: string,
		searchEngine: string,
		aiModel: string,
		forceChat?: boolean,
	) => void;
}) {
	const [inputValue, setInputValue] = useState("");
	const [searchEngine, setSearchEngine] = useState("Google");
	const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
	const [aiModel, setAiModel] = useState("gemini-3.8-flash");
	const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
	const chassisRef = useRef<HTMLDivElement>(null);

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

	const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	const handleSubmitInternal = (forceChat = false) => {
		if (!inputValue.trim()) return;
		const query = inputValue;
		setInputValue("");

		if (chassisRef.current) {
			const textarea = chassisRef.current.querySelector("textarea");
			if (textarea) {
				textarea.style.height = "auto";
			}
		}

		onSubmit(query, searchEngine, aiModel, forceChat);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmitInternal(e.metaKey || e.ctrlKey);
		}
	};

	const selectedModel =
		AI_MODELS.find((m) => m.value === aiModel) || AI_MODELS[0];

	return (
		<div className="mx-auto w-full max-w-3xl px-4 pb-8">
			<div
				ref={chassisRef}
				className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl transition-all focus-within:border-zinc-700"
			>
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

				<div className="flex w-full items-center justify-between border-zinc-800/40 border-t pt-1.5">
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
								<div className="absolute right-0 bottom-full mb-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
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
