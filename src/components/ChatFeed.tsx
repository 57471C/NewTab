import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { type ChatMessage, db } from "../lib/db";

interface ChatFeedProps {
	activeChatId: string;
	isStreaming?: boolean;
}

function MessageFormatter({ content }: { content: string }) {
	// Split string at code block boundaries safely
	const blocks = content.split(/(```[\s\S]*?```)/g);

	return (
		<div className="text-sm leading-relaxed text-zinc-200">
			{blocks.map((block, i) => {
				if (block.startsWith("```") && block.endsWith("```")) {
					const match = block.match(/^```(\w*)\n?([\s\S]*?)```$/);
					const code = match ? match[2] : block.slice(3, -3);
					return (
						<div
							key={`code-${i}`}
							className="my-3 overflow-x-auto select-all rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300"
						>
							<pre>
								<code>{code}</code>
							</pre>
						</div>
					);
				}

				// Parse inline bold
				const inlineParts = block.split(/(\*\*[\s\S]*?\*\*)/g);
				return (
					<span key={`text-${i}`} className="whitespace-pre-wrap">
						{inlineParts.map((ip, j) => {
							if (ip.startsWith("**") && ip.endsWith("**")) {
								return (
									<strong
										key={`bold-${j}`}
										className="font-semibold text-zinc-50"
									>
										{ip.slice(2, -2)}
									</strong>
								);
							}
							return ip;
						})}
					</span>
				);
			})}
		</div>
	);
}

export default function ChatFeed({ activeChatId, isStreaming }: ChatFeedProps) {
	const messages = useLiveQuery(
		() => db.messages.where("chatId").equals(activeChatId).sortBy("timestamp"),
		[activeChatId],
	) as ChatMessage[] | undefined;

	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const anchorRef = useRef<HTMLDivElement>(null);
	const [isAutoScroll, setIsAutoScroll] = useState(true);

	const handleScroll = () => {
		if (!scrollContainerRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } =
			scrollContainerRef.current;
		const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
		setIsAutoScroll(isAtBottom);
	};

	useEffect(() => {
		if (isAutoScroll && anchorRef.current) {
			anchorRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages, isStreaming, isAutoScroll]);

	if (!messages || messages.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
				<p className="font-medium text-sm text-zinc-500">
					Start a conversation.
					<br />
					Ask anything.
				</p>
			</div>
		);
	}

	return (
		<div
			ref={scrollContainerRef}
			onScroll={handleScroll}
			className="flex-1 overflow-y-auto p-6"
		>
			<div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 pb-32">
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
					>
						{msg.role === "user" ? (
							<div className="max-w-xl rounded-2xl border border-zinc-800/40 bg-zinc-850 px-4 py-2 text-sm text-zinc-100">
								<p className="whitespace-pre-wrap leading-relaxed">
									{msg.content}
								</p>
							</div>
						) : (
							<div className="w-full bg-transparent py-4 text-sm text-zinc-200">
								<MessageFormatter content={msg.content} />
							</div>
						)}
					</div>
				))}
				{isStreaming && (
					<div className="flex items-start">
						<div className="rounded-xl bg-transparent py-4 text-sm">
							<span className="flex gap-1">
								<span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.2s]" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.4s]" />
							</span>
						</div>
					</div>
				)}
				<div ref={anchorRef} className="h-4 w-full flex-shrink-0" />
			</div>
		</div>
	);
}
