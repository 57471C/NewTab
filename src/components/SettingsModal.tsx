import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ShortcutLink } from "../lib/types";
import { vault } from "../lib/vault";

const PROVIDERS = [
	{ id: "Gemini", label: "Gemini", hint: "Google AI Studio key" },
	{ id: "Claude", label: "Claude", hint: "Anthropic API key" },
	{ id: "GPT-4", label: "OpenAI", hint: "OpenAI API key (GPT-4o)" },
	{ id: "Grok", label: "Grok", hint: "xAI API key" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];
type Tab = "keys" | "shortcuts";

export default function SettingsModal({
	isOpen,
	onClose,
	links,
	onUpdateShortcut,
	showToast,
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
	children?: React.ReactNode;
}) {
	const [tab, setTab] = useState<Tab>("keys");
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

	useEffect(() => {
		if (!isOpen) return;

		const load = async () => {
			const nextSaved = { ...saved };
			const nextDrafts = { ...drafts };
			for (const provider of PROVIDERS) {
				const existing = await vault.get(provider.id);
				nextSaved[provider.id] = Boolean(existing);
				nextDrafts[provider.id] = "";
			}
			setSaved(nextSaved);
			setDrafts(nextDrafts);
		};

		void load();
		setShortcutDrafts(links);
		setTab("keys");
	}, [isOpen, links]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

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

	const saveShortcut = async (link: ShortcutLink) => {
		await onUpdateShortcut(link.index, link.title, link.url);
	};

	return (
		<div
			className="scrollbar-custom fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-black/50 text-zinc-200"
			style={{ colorScheme: "dark" }}
			onClick={onClose}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
		>
			<div
				className="relative mx-4 w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
					onClick={onClose}
					aria-label="Close settings"
				>
					<X size={18} />
				</button>

				<h2 className="font-semibold text-lg text-zinc-50">Settings</h2>
				<p className="mt-1 text-xs text-zinc-500">
					Keys stay in this browser profile via chrome.storage.local. Nothing is
					sent to a backend of ours.
				</p>

				<div className="mt-4 flex gap-2 border-zinc-800 border-b pb-3">
					<button
						type="button"
						onClick={() => setTab("keys")}
						className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
							tab === "keys"
								? "bg-zinc-800 text-zinc-50"
								: "text-zinc-400 hover:text-zinc-100"
						}`}
					>
						API keys
					</button>
					<button
						type="button"
						onClick={() => setTab("shortcuts")}
						className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
							tab === "shortcuts"
								? "bg-zinc-800 text-zinc-50"
								: "text-zinc-400 hover:text-zinc-100"
						}`}
					>
						Shortcuts
					</button>
				</div>

				{tab === "keys" && (
					<div className="mt-4 flex flex-col gap-4">
						{PROVIDERS.map((provider) => (
							<label key={provider.id} className="flex flex-col gap-1.5">
								<span className="flex items-center justify-between text-xs">
									<span className="font-medium text-zinc-200">
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
										className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
									/>
									<button
										type="button"
										onClick={() => void saveKey(provider.id)}
										className="rounded-md bg-zinc-100 px-3 py-2 font-medium text-xs text-zinc-950 transition-colors hover:bg-white"
									>
										Save
									</button>
								</div>
							</label>
						))}
					</div>
				)}

				{tab === "shortcuts" && (
					<div className="mt-4 flex flex-col gap-3">
						{shortcutDrafts.map((link, index) => (
							<div
								key={link.id}
								className="grid grid-cols-[1fr_2fr_auto] gap-2"
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
									className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
								/>
								<input
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
									className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
								/>
								<button
									type="button"
									onClick={() => void saveShortcut(shortcutDrafts[index])}
									className="rounded-md bg-zinc-100 px-3 py-2 font-medium text-xs text-zinc-950 transition-colors hover:bg-white"
								>
									Save
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
