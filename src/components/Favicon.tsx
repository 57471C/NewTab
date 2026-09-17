import { Globe } from "lucide-react";
import { useState } from "react";
import { faviconCandidates, isLikelyGenericIcon } from "../lib/favicons";

export default function Favicon({
	url,
	alt,
	size = 24,
}: {
	url?: string;
	alt: string;
	size?: number;
}) {
	const candidates = faviconCandidates(url);
	const [index, setIndex] = useState(0);

	if (!url || candidates.length === 0 || index >= candidates.length) {
		return <Globe size={size} className="text-zinc-500" />;
	}

	const src = candidates[index];

	return (
		<img
			src={src}
			alt={alt}
			width={size}
			height={size}
			className="rounded-sm object-contain"
			style={{ width: size, height: size }}
			onError={() => setIndex((current) => current + 1)}
			onLoad={(event) => {
				if (isLikelyGenericIcon(event.currentTarget, src)) {
					setIndex((current) => current + 1);
				}
			}}
		/>
	);
}
