import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function Toast({
	toast,
}: {
	toast: { type: "success" | "error"; message: string } | null;
}) {
	if (!toast) return null;

	return (
		<div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 animate-slide-down items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 shadow-xl font-medium text-xs text-zinc-200">
			{toast.type === "success" ? (
				<CheckCircle2 size={16} className="text-zinc-100" />
			) : (
				<AlertCircle size={16} className="text-zinc-100" />
			)}
			<span>{toast.message}</span>
		</div>
	);
}
