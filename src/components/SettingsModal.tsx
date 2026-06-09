import React from "react";

export function SettingsModal({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="overflow-y-auto scrollbar-custom bg-zinc-950 text-zinc-200 h-full w-full"
			style={{ colorScheme: "dark" }}
		>
			{/* Modal configurations and settings layout injected here */}
			{children}
		</div>
	);
}
