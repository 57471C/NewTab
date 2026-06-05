import { Bot, Check, Link2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ShortcutLink } from "../lib/types";

function ShortcutRow({
	link,
	onSave,
}: {
	link: ShortcutLink;
	onSave: (index: number, title: string, url: string) => void;
}) {
	const [title, setTitle] = useState(link.title);
	const [url, setUrl] = useState(link.url);

	useEffect(() => {
		setTitle(link.title);
		setUrl(link.url);
	}, [link.title, link.url]);

	const handleAction = () => {
		if (title !== link.title || url !== link.url) {
			onSave(link.index, title, url);
		}
	};

	return (
		<div className="flex gap-2">
			<input
				type="text"
				placeholder="Title"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				onBlur={handleAction}
				onKeyDown={(e) => e.key === "Enter" && handleAction()}
				className="w-1/3 rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100 transition-all duration-200 ease-in-out focus:border-zinc-600 focus:outline-none"
			/>
			<input
				type="text"
				placeholder="Target URL"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
				onBlur={handleAction}
				onKeyDown={(e) => e.key === "Enter" && handleAction()}
				className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100 transition-all duration-200 ease-in-out focus:border-zinc-600 focus:outline-none"
			/>
			<button
				type="button"
				onClick={handleAction}
				className="flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-3 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-100"
			>
				<Check size={16} />
			</button>
		</div>
	);
}

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
	onUpdateShortcut: (index: number, title: string, url: string) => void;
	showToast: (type: "success" | "error", message: string) => void;
}) {
	const [activeTab, setActiveTab] = useState<"links" | "models">("links");

	if (!isOpen) return null;

	const handleSaveLink = (index: number, title: string, url: string) => {
		if (!url && !title) {
			onUpdateShortcut(index, title, url);
			return;
		}
		try {
			const parsedUrl = new URL(
				url.startsWith("http") ? url : `https://${url}`,
			);
			onUpdateShortcut(index, title, parsedUrl.href);
		} catch {
			showToast(
				"error",
				"Invalid URL string. Please verify protocol and format (e.g., https://google.com).",
			);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
			{/* Modal Chassis */}
			<div className="flex h-[450px] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
				{/* Left Split - Navigation Column */}
				<div className="flex w-48 flex-col gap-1 border-r border-zinc-800 bg-zinc-900 p-4">
					<h2 className="mb-4 px-2 text-sm font-semibold text-zinc-400">
						Settings
					</h2>
					<button
						type="button"
						onClick={() => setActiveTab("links")}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
							activeTab === "links"
								? "bg-zinc-800 text-zinc-100"
								: "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
						}`}
					>
						<Link2 size={16} />
						Links
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("models")}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
							activeTab === "models"
								? "bg-zinc-800 text-zinc-100"
								: "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
						}`}
					>
						<Bot size={16} />
						AI Models
					</button>
				</div>

				{/* Right Split - Details Content Panel */}
				<div className="relative flex-1 overflow-y-auto bg-zinc-950 p-6">
					<button
						type="button"
						onClick={onClose}
						className="absolute right-4 top-4 text-zinc-400 transition-colors duration-200 ease-in-out hover:text-zinc-100"
					>
						<X size={20} />
					</button>

					{activeTab === "links" && (
						<div className="flex animate-in flex-col gap-6 fade-in duration-200">
							<div>
								<h3 className="mb-1 text-lg font-medium text-zinc-100">
									Shortcut Links
								</h3>
								<p className="text-sm text-zinc-400">
									Manage your 4x2 bookmark grid schema.
								</p>
							</div>
							<div className="flex flex-col gap-3">
								{links.map((link) => (
									<ShortcutRow
										key={link.id}
										link={link}
										onSave={handleSaveLink}
									/>
								))}
							</div>
						</div>
					)}

					{activeTab === "models" && (
						<div className="flex animate-in flex-col gap-6 fade-in duration-200">
							<div>
								<h3 className="mb-1 text-lg font-medium text-zinc-100">
									AI Models
								</h3>
								<p className="text-sm text-zinc-400">
									Configure LLM providers and secure API keys.
								</p>
							</div>
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<label
										htmlFor="provider"
										className="text-sm font-medium text-zinc-300"
									>
										Provider
									</label>
									<select
										id="provider"
										className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100 outline-none transition-all duration-200 ease-in-out focus:border-zinc-600"
									>
										<option value="openai">OpenAI</option>
										<option value="anthropic">Anthropic</option>
										<option value="gemini">Gemini</option>
										<option value="grok">Grok</option>
									</select>
								</div>
								<div className="flex flex-col gap-2">
									<label
										htmlFor="apikey"
										className="text-sm font-medium text-zinc-300"
									>
										API Key
									</label>
									<input
										id="apikey"
										type="password"
										placeholder="sk-..."
										className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 font-mono text-sm text-zinc-100 outline-none transition-all duration-200 ease-in-out focus:border-zinc-600"
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
