import { Menu, MessageSquare, Plus, Settings, X } from "lucide-react";
import { useState } from "react";
import { useChatSessions } from "./useChatSessions";

interface SidebarProps {
	activeChatId: string | null;
	onSelectChat: (id: string) => void;
	onNewChat: () => void;
	onOpenSettings: () => void;
}

export default function Sidebar({
	activeChatId,
	onSelectChat,
	onNewChat,
	onOpenSettings,
}: SidebarProps) {
	const [isOpen, setIsOpen] = useState(false);

	const chatSessions = useChatSessions();

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="fixed left-4 top-4 z-50 cursor-pointer rounded-md border border-zinc-800/50 bg-zinc-950/50 p-2 text-zinc-400 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-900 hover:text-zinc-200"
			>
				{isOpen ? <X size={20} /> : <Menu size={20} />}
			</button>

			<div
				className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col justify-between border-r border-zinc-900 bg-zinc-950 px-4 pb-4 pt-16 transition-transform duration-300 ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex h-full flex-col overflow-hidden">
					<button
						type="button"
						onClick={() => {
							onNewChat();
							setIsOpen(false);
						}}
						className="mb-4 flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-800 py-2 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:text-zinc-100"
					>
						<Plus size={14} />
						New Chat
					</button>

					<div className="flex flex-1 flex-col gap-1 overflow-y-auto pr-2">
						{chatSessions?.map((session) => (
							<button
								key={session.id}
								type="button"
								onClick={() => {
									onSelectChat(session.id);
									setIsOpen(false);
								}}
								className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors ${
									activeChatId === session.id
										? "bg-zinc-900 font-medium text-zinc-100"
										: "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
								}`}
							>
								<MessageSquare size={14} className="flex-shrink-0" />
								<span className="truncate">{session.title}</span>
							</button>
						))}
					</div>
				</div>

				<div className="mt-2 flex-shrink-0 border-t border-zinc-900 pt-4">
					<button
						type="button"
						onClick={() => {
							onOpenSettings();
							setIsOpen(false);
						}}
						className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
					>
						<Settings size={14} />
						Settings
					</button>
				</div>
			</div>
		</>
	);
}
