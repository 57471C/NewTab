import { Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	catalogFromSlots,
	type ModelSlot,
	slotsForProvider,
} from "../lib/models";
import {
	DEFAULT_OLLAMA_HOST,
	DEFAULT_OLLAMA_MODEL,
	type OpenLinksMode,
	prefs,
} from "../lib/prefs";
import type { ShortcutLink } from "../lib/types";
import { vault } from "../lib/vault";

const PROVIDERS = [
	{ id: "Gemini", label: "Gemini", hint: "Google AI Studio key" },
	{ id: "Claude", label: "Claude", hint: "Anthropic API key" },
	{ id: "GPT-4", label: "OpenAI", hint: "OpenAI API key" },
	{ id: "Grok", label: "Grok", hint: "xAI API key" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];
type Tab = "shortcuts" | "keys";

const fieldClass =
	"rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600";

const tabClass = (active: boolean) =>
	`rounded-md px-3 py-1.5 text-xs transition-colors ${
		active
			? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
			: "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
	}`;

export default function SettingsModal({
	isOpen,
	onClose,
	links,
	onUpdateShortcut,
	showToast,
	focusSlot = null,
}: {
	isOpen: boolean;
	onClose: () => void;
	links: ShortcutLink[];
	onUpdateShortcut: (
		slotIndex: number,
		title: string,
		url: string,
	) => Promise<void>;
	showToast: (type: "success" | "error", message: string) => void;
	focusSlot?: number | null;
	children?: React.ReactNode;
}) {
	const [tab, setTab] = useState<Tab>("shortcuts");
	const [openLinks, setOpenLinks] = useState<OpenLinksMode>("same");
	const [focusBox, setFocusBox] = useState(true);
	const [hiddenModels, setHiddenModels] = useState<string[]>(["ollama"]);
	const [slots, setSlots] = useState<ModelSlot[]>([]);
	const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
	const [slotDraft, setSlotDraft] = useState("");
	const slotInputRef = useRef<HTMLInputElement>(null);
	const [ollamaHost, setOllamaHost] = useState(DEFAULT_OLLAMA_HOST);
	const [ollamaModel, setOllamaModel] = useState(DEFAULT_OLLAMA_MODEL);
	const [drafts, setDrafts] = useState<Record<ProviderId, string>>({
		Gemini: "",
		Claude: "",
		"GPT-4": "",
		Grok: "",
	});
	const [saved, setSaved] = useState<Record<ProviderId, boolean>>({
		Gemini: false,
		Claude: false,
		"GPT-4": false,
		Grok: false,
	});
	const [shortcutDrafts, setShortcutDrafts] = useState<ShortcutLink[]>([]);
	const focusUrlRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		const load = async () => {
			const nextSaved: Record<ProviderId, boolean> = {
				Gemini: false,
				Claude: false,
				"GPT-4": false,
				Grok: false,
			};
			const nextDrafts: Record<ProviderId, string> = {
				Gemini: "",
				Claude: "",
				"GPT-4": "",
				Grok: "",
			};
			for (const provider of PROVIDERS) {
				const existing = await vault.get(provider.id);
				nextSaved[provider.id] = Boolean(existing);
				nextDrafts[provider.id] = "";
			}
			setSaved(nextSaved);
			setDrafts(nextDrafts);
			setOpenLinks(await prefs.getOpenLinks());
			setFocusBox(await prefs.getFocusBox());
			setHiddenModels(await prefs.getHiddenModels());
			setSlots(await prefs.getModelSlots());
			setEditingSlotId(null);
			setOllamaHost(await prefs.getOllamaHost());
			setOllamaModel(await prefs.getOllamaModel());
		};

		void load();
		setShortcutDrafts(links);
		setTab("shortcuts");
	}, [isOpen, links]);

	useEffect(() => {
		if (!editingSlotId) return;
		slotInputRef.current?.focus();
		slotInputRef.current?.select();
	}, [editingSlotId]);

	useEffect(() => {
		if (!isOpen || focusSlot === null) return;
		const id = window.setTimeout(() => focusUrlRef.current?.focus(), 30);
		return () => window.clearTimeout(id);
	}, [isOpen, focusSlot]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (editingSlotId) {
				event.preventDefault();
				setEditingSlotId(null);
				return;
			}
			onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose, editingSlotId]);

	if (!isOpen) return null;

	const saveKey = async (provider: ProviderId) => {
		const value = drafts[provider].trim();
		try {
			if (!value) {
				await vault.remove(provider);
				setSaved((current) => ({ ...current, [provider]: false }));
				showToast("success", `${provider} key cleared.`);
				return;
			}
			await vault.set(provider, value);
			setDrafts((current) => ({ ...current, [provider]: "" }));
			setSaved((current) => ({ ...current, [provider]: true }));
			showToast("success", `${provider} key saved locally.`);
		} catch (error) {
			console.error("Failed to save API key:", error);
			showToast("error", `Failed to save ${provider} key.`);
		}
	};

	const saveOllama = async () => {
		const host = ollamaHost.trim() || DEFAULT_OLLAMA_HOST;
		const model = ollamaModel.trim() || DEFAULT_OLLAMA_MODEL;
		setOllamaHost(host);
		setOllamaModel(model);
		await prefs.setOllamaHost(host);
		await prefs.setOllamaModel(model);
		const nextHidden = hiddenModels.filter((item) => item !== "ollama");
		setHiddenModels(nextHidden);
		await prefs.setHiddenModels(nextHidden);
		showToast("success", "Ollama saved. It is now in the model list.");
	};

	const saveShortcut = async (link: ShortcutLink) => {
		await onUpdateShortcut(link.index, link.title, link.url);
	};

	const saveOpenLinks = async (mode: OpenLinksMode) => {
		setOpenLinks(mode);
		await prefs.setOpenLinks(mode);
		showToast(
			"success",
			mode === "same"
				? "Grid links will replace this tab."
				: "Grid links will open in a new tab.",
		);
	};

	const saveFocusBox = async (on: boolean) => {
		setFocusBox(on);
		await prefs.setFocusBox(on);
		showToast(
			"success",
			on
				? "New tabs will focus the chat box. Esc blurs it for 1-8."
				: "New tabs will not steal focus.",
		);
	};

	const toggleModelHidden = async (slotId: string) => {
		const next = hiddenModels.includes(slotId)
			? hiddenModels.filter((item) => item !== slotId)
			: [...hiddenModels, slotId];
		setHiddenModels(next);
		await prefs.setHiddenModels(next);
	};

	const startEditSlot = (slot: ModelSlot) => {
		if (slot.provider === "Ollama") return;
		setEditingSlotId(slot.id);
		setSlotDraft(slot.value);
	};

	const commitSlot = async (slotId: string) => {
		const nextValue = slotDraft.trim();
		setEditingSlotId(null);
		const current = slots.find((slot) => slot.id === slotId);
		if (!current || current.provider === "Ollama") return;
		if (!nextValue || nextValue === current.value) return;
		const nextSlots = slots.map((slot) =>
			slot.id === slotId ? { ...slot, value: nextValue } : slot,
		);
		setSlots(nextSlots);
		await prefs.setModelSlots(nextSlots);
		const selected = await prefs.getModel();
		if (selected === current.value) {
			await prefs.setModel(nextValue);
		}
		showToast("success", `Using ${nextValue} in the picker.`);
	};

	const catalog = catalogFromSlots(slots);

	return (
		<div
			className="fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-black/40 text-zinc-800 dark:text-zinc-200"
			onClick={onClose}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
		>
			<div
				className="relative mx-4 w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
					onClick={onClose}
					aria-label="Close settings"
				>
					<X size={18} />
				</button>

				<h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
					Settings
				</h2>
				<p className="mt-1 text-xs text-zinc-500">
					Keys stay in this browser profile via chrome.storage.local. Nothing is
					sent to a backend of ours.
				</p>

				<div className="mt-4 flex gap-2 border-zinc-200 border-b pb-3 dark:border-zinc-800">
					<button
						type="button"
						onClick={() => setTab("shortcuts")}
						className={tabClass(tab === "shortcuts")}
					>
						Grid
					</button>
					<button
						type="button"
						onClick={() => setTab("keys")}
						className={tabClass(tab === "keys")}
					>
						API keys
					</button>
				</div>

				{tab === "shortcuts" && (
					<div className="mt-4 flex flex-col gap-3">
						<div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
							<div>
								<p className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
									Open grid links
								</p>
								<p className="text-[11px] text-zinc-500">
									Replace this new tab, or spawn another one.
								</p>
							</div>
							<div className="flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
								<button
									type="button"
									onClick={() => void saveOpenLinks("same")}
									className={tabClass(openLinks === "same")}
								>
									This tab
								</button>
								<button
									type="button"
									onClick={() => void saveOpenLinks("new")}
									className={tabClass(openLinks === "new")}
								>
									New tab
								</button>
							</div>
						</div>

						<div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
							<div>
								<p className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
									Focus chat box
								</p>
								<p className="text-[11px] text-zinc-500">
									On every new tab. Esc blurs so keys 1-8 still work.
								</p>
							</div>
							<div className="flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
								<button
									type="button"
									onClick={() => void saveFocusBox(true)}
									className={tabClass(focusBox)}
								>
									On
								</button>
								<button
									type="button"
									onClick={() => void saveFocusBox(false)}
									className={tabClass(!focusBox)}
								>
									Off
								</button>
							</div>
						</div>

						{shortcutDrafts.map((link, index) => {
							const focused = focusSlot === link.index;
							return (
								<div
									key={link.id}
									className={`grid grid-cols-[1fr_2fr_auto] gap-2 rounded-lg p-1 ${
										focused ? "ring-2 ring-zinc-400 dark:ring-zinc-500" : ""
									}`}
								>
									<input
										type="text"
										value={link.title}
										onChange={(event) => {
											const title = event.target.value;
											setShortcutDrafts((current) =>
												current.map((item, itemIndex) =>
													itemIndex === index ? { ...item, title } : item,
												),
											);
										}}
										placeholder="Title"
										className={fieldClass}
									/>
									<input
										ref={focused ? focusUrlRef : undefined}
										type="text"
										value={link.url}
										onChange={(event) => {
											const url = event.target.value;
											setShortcutDrafts((current) =>
												current.map((item, itemIndex) =>
													itemIndex === index ? { ...item, url } : item,
												),
											);
										}}
										placeholder="https://example.com.au"
										className={fieldClass}
									/>
									<button
										type="button"
										onClick={() => void saveShortcut(shortcutDrafts[index])}
										className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-xs text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
									>
										Save
									</button>
								</div>
							);
						})}
					</div>
				)}

				{tab === "keys" && (
					<div className="mt-4 flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
						<p className="text-[11px] text-zinc-500">
							Three slugs per key. Pencil or double-click the id to point at
							whatever the provider is selling this week.
						</p>
						{PROVIDERS.map((provider) => (
							<div key={provider.id} className="flex flex-col gap-1.5">
								<span className="flex items-center justify-between text-xs">
									<span className="font-medium text-zinc-800 dark:text-zinc-200">
										{provider.label}
									</span>
									<span className="text-zinc-500">
										{saved[provider.id] ? "Saved on this device" : "Not set"}
									</span>
								</span>
								<div className="flex gap-2">
									<input
										type="password"
										autoComplete="off"
										value={drafts[provider.id]}
										onChange={(event) =>
											setDrafts((current) => ({
												...current,
												[provider.id]: event.target.value,
											}))
										}
										placeholder={
											saved[provider.id]
												? "Enter a new key to replace, or save empty to clear"
												: provider.hint
										}
										className={`flex-1 ${fieldClass}`}
									/>
									<button
										type="button"
										onClick={() => void saveKey(provider.id)}
										className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-xs text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
									>
										Save
									</button>
								</div>
								<div className="mt-1 flex flex-col gap-0.5">
									{slotsForProvider(slots, provider.id).map((slot) => {
										const model = catalog.find(
											(item) => item.slotId === slot.id,
										);
										const visible = !hiddenModels.includes(slot.id);
										const editing = editingSlotId === slot.id;
										return (
											<div
												key={slot.id}
												className="group flex items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
											>
												<input
													type="checkbox"
													checked={visible}
													onChange={() => void toggleModelHidden(slot.id)}
													className="rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
													aria-label={`Show ${model?.label ?? slot.value} in picker`}
												/>
												<span
													className={`min-w-0 flex-1 truncate ${visible ? "" : "text-zinc-400 dark:text-zinc-600"}`}
												>
													{model?.label ?? slot.value}
												</span>
												{editing ? (
													<input
														ref={slotInputRef}
														value={slotDraft}
														onChange={(event) =>
															setSlotDraft(event.target.value)
														}
														onBlur={() => void commitSlot(slot.id)}
														onKeyDown={(event) => {
															if (event.key === "Enter") {
																event.preventDefault();
																void commitSlot(slot.id);
															}
															if (event.key === "Escape") {
																event.preventDefault();
																event.stopPropagation();
																setEditingSlotId(null);
															}
														}}
														spellCheck={false}
														className="w-44 rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-800 outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
													/>
												) : (
													<button
														type="button"
														onDoubleClick={() => startEditSlot(slot)}
														onClick={() => startEditSlot(slot)}
														className="truncate font-mono text-[11px] text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
														title="Edit API model id"
													>
														{slot.value}
													</button>
												)}
												<button
													type="button"
													onClick={() => startEditSlot(slot)}
													className="rounded p-0.5 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-800 group-hover:opacity-100 dark:hover:text-zinc-100"
													aria-label={`Edit ${slot.value}`}
												>
													<Pencil size={12} />
												</button>
											</div>
										);
									})}
								</div>
							</div>
						))}

						<div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
							<div className="flex items-center justify-between gap-2">
								<p className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
									Ollama
								</p>
								<label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-500">
									<input
										type="checkbox"
										checked={!hiddenModels.includes("ollama")}
										onChange={() => void toggleModelHidden("ollama")}
										className="rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
									/>
									Show in picker
								</label>
							</div>
							<p className="mt-1 text-[11px] text-zinc-500">
								No API key. Host defaults to localhost:11434. Model name must
								match `ollama list`.
							</p>
							<div className="mt-3 grid grid-cols-[1.4fr_1fr_auto] gap-2">
								<input
									type="text"
									value={ollamaHost}
									onChange={(event) => setOllamaHost(event.target.value)}
									placeholder={DEFAULT_OLLAMA_HOST}
									className={fieldClass}
								/>
								<input
									type="text"
									value={ollamaModel}
									onChange={(event) => setOllamaModel(event.target.value)}
									placeholder={DEFAULT_OLLAMA_MODEL}
									className={fieldClass}
								/>
								<button
									type="button"
									onClick={() => void saveOllama()}
									className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-xs text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
								>
									Save
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
