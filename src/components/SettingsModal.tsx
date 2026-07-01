import type React from "react";
import type { ShortcutLink } from "../lib/types";

export default function SettingsModal({
	isOpen,
	onClose,
	links: _links,
	onUpdateShortcut: _onUpdateShortcut,
	showToast: _showToast,
	children,
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
	if (!isOpen) return null;

	return (
		<div
			className="overflow-y-auto scrollbar-custom bg-zinc-950 text-zinc-200 h-full w-full fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			style={{ colorScheme: "dark" }}
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div
				className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative max-w-2xl w-full mx-4"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
					onClick={onClose}
				>
					Close
				</button>
				{/* Modal configurations and settings layout injected here */}
				{children}
			</div>
		</div>
	);
}
