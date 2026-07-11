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
			className="scrollbar-custom fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-black/50 bg-zinc-950 text-zinc-200"
			style={{ colorScheme: "dark" }}
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div
				className="relative mx-4 w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
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
