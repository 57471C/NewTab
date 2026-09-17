import { useState } from "react";

function safeHref(href: string) {
	try {
		const url = new URL(href);
		if (url.protocol === "https:" || url.protocol === "http:") return url.href;
	} catch {
		return null;
	}
	return null;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
	const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
	return parts.map((part, index) => {
		const key = `${keyPrefix}-${index}`;
		const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
		if (link) {
			const href = safeHref(link[2]);
			if (!href) return <span key={key}>{link[1]}</span>;
			return (
				<a
					key={key}
					href={href}
					target="_blank"
					rel="noreferrer"
					className="text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/40"
				>
					{link[1]}
				</a>
			);
		}
		if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
			return (
				<code
					key={key}
					className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.8em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
				>
					{part.slice(1, -1)}
				</code>
			);
		}
		if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
			return (
				<strong key={key} className="font-semibold text-zinc-950 dark:text-zinc-50">
					{part.slice(2, -2)}
				</strong>
			);
		}
		if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
			return (
				<em key={key} className="italic">
					{part.slice(1, -1)}
				</em>
			);
		}
		return <span key={key}>{part}</span>;
	});
}

function CodeBlock({ code, language }: { code: string; language: string }) {
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1200);
		} catch {
			setCopied(false);
		}
	};

	return (
		<div className="my-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
			<div className="flex items-center justify-between border-zinc-200 border-b px-3 py-1.5 dark:border-zinc-800">
				<span className="font-mono text-[10px] text-zinc-500 uppercase">
					{language || "code"}
				</span>
				<button
					type="button"
					onClick={() => void copy()}
					className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
				>
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
			<pre className="overflow-x-auto p-4 font-mono text-xs text-zinc-800 dark:text-zinc-300">
				<code>{code}</code>
			</pre>
		</div>
	);
}

function renderBlock(block: string, key: string): React.ReactNode {
	const trimmed = block.trim();
	if (!trimmed) return null;

	const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
	if (heading) {
		const level = heading[1].length;
		const className =
			level === 1
				? "mt-3 mb-2 font-semibold text-lg text-zinc-950 dark:text-zinc-50"
				: level === 2
					? "mt-3 mb-1.5 font-semibold text-base text-zinc-950 dark:text-zinc-50"
					: "mt-2 mb-1 font-semibold text-sm text-zinc-900 dark:text-zinc-100";
		return (
			<p key={key} className={className}>
				{renderInline(heading[2], key)}
			</p>
		);
	}

	if (trimmed.startsWith("> ")) {
		const quote = trimmed
			.split("\n")
			.map((line) => line.replace(/^>\s?/, ""))
			.join("\n");
		return (
			<blockquote
				key={key}
				className="my-2 border-zinc-300 border-l-2 pl-3 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
			>
				{renderInline(quote, key)}
			</blockquote>
		);
	}

	const lines = trimmed.split("\n");
	const isList = lines.every((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line));
	if (isList) {
		const ordered = /^\d+\.\s+/.test(lines[0]);
		const List = ordered ? "ol" : "ul";
		return (
			<List
				key={key}
				className={`my-2 space-y-1 pl-5 text-sm ${ordered ? "list-decimal" : "list-disc"}`}
			>
				{lines.map((line, index) => (
					<li key={`${key}-li-${index}`}>
						{renderInline(line.replace(/^([-*]|\d+\.)\s+/, ""), `${key}-li-${index}`)}
					</li>
				))}
			</List>
		);
	}

	return (
		<p key={key} className="my-2 whitespace-pre-wrap">
			{renderInline(trimmed, key)}
		</p>
	);
}

export default function Markdown({ content }: { content: string }) {
	const chunks = content.split(/(```[\s\S]*?```)/g);

	return (
		<div className="text-sm text-zinc-800 leading-relaxed dark:text-zinc-200">
			{chunks.map((chunk, index) => {
				if (chunk.startsWith("```")) {
					const match = chunk.match(/^```(\w*)\n?([\s\S]*?)```$/);
					const language = match?.[1] ?? "";
					const code = (match?.[2] ?? chunk.replace(/^```\w*\n?/, "").replace(/```$/, "")).replace(
						/\n$/, "",
					);
					return <CodeBlock key={`code-${index}`} code={code} language={language} />;
				}

				return chunk
					.split(/\n{2,}/)
					.map((block, blockIndex) => renderBlock(block, `p-${index}-${blockIndex}`));
			})}
		</div>
	);
}
