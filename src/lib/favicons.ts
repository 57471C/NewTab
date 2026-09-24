const privateCache = new Map<string, boolean>();

function isPrivateHost(hostname: string) {
	if (!hostname) return true;
	const cached = privateCache.get(hostname);
	if (cached !== undefined) return cached;

	const host = hostname.toLowerCase();
	if (
		host === "localhost" ||
		host.endsWith(".local") ||
		host.endsWith(".lan") ||
		host.endsWith(".internal") ||
		host.endsWith(".corp")
	) {
		privateCache.set(hostname, true);
		return true;
	}

	const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (ipv4) {
		const parts = ipv4.slice(1).map(Number);
		const privateV4 =
			parts[0] === 10 ||
			(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
			(parts[0] === 192 && parts[1] === 168) ||
			parts[0] === 127 ||
			(parts[0] === 169 && parts[1] === 254);
		privateCache.set(hostname, privateV4);
		return privateV4;
	}

	if (host.includes(":")) {
		const ipv6 = host.replace(/^\[|\]$/g, "");
		const privateV6 =
			ipv6 === "::1" ||
			ipv6.startsWith("fc") ||
			ipv6.startsWith("fd") ||
			ipv6.startsWith("fe8") ||
			ipv6.startsWith("fe9") ||
			ipv6.startsWith("fea") ||
			ipv6.startsWith("feb");
		privateCache.set(hostname, privateV6);
		return privateV6;
	}

	privateCache.set(hostname, false);
	return false;
}

function parsePageUrl(raw?: string) {
	if (!raw) return null;
	try {
		return new URL(raw.includes("://") ? raw : `https://${raw}`);
	} catch {
		return null;
	}
}

function hostVariants(hostname: string) {
	const hosts = [hostname];
	if (hostname.startsWith("www.")) hosts.push(hostname.slice(4));
	else hosts.push(`www.${hostname}`);
	return [...new Set(hosts)];
}

function pathPrefixes(pathname: string) {
	const parts = pathname.split("/").filter(Boolean);
	const prefixes: string[] = [];
	for (let i = parts.length; i >= 0; i--) {
		prefixes.push(i === 0 ? "/" : `/${parts.slice(0, i).join("/")}/`);
	}
	return prefixes;
}

function chromeFavicon(pageUrl: string, size = 64) {
	if (typeof chrome === "undefined" || !chrome.runtime?.id) return null;
	return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`;
}

export function faviconCandidates(rawUrl?: string, size = 64) {
	const page = parsePageUrl(rawUrl);
	if (!page) return [];

	const privateHost = isPrivateHost(page.hostname);
	const origins = hostVariants(page.hostname).map(
		(host) => `${page.protocol}//${host}`,
	);
	const urls: string[] = [];
	const push = (value?: string | null) => {
		if (value && !urls.includes(value)) urls.push(value);
	};

	push(chromeFavicon(page.href, size));
	for (const origin of origins) {
		push(chromeFavicon(`${origin}${page.pathname || "/"}`, size));
		push(chromeFavicon(`${origin}/`, size));
	}

	for (const origin of origins) {
		for (const prefix of pathPrefixes(page.pathname || "/")) {
			push(`${origin}${prefix}favicon.ico`);
			push(`${origin}${prefix}favicon.png`);
			push(`${origin}${prefix}apple-touch-icon.png`);
		}
	}

	if (!privateHost) {
		for (const origin of origins) {
			const host = new URL(origin).hostname;
			push(`https://icons.duckduckgo.com/ip3/${host}.ico`);
			push(`https://www.google.com/s2/favicons?domain=${host}&sz=${size}`);
		}
	}

	return urls;
}

export function isLikelyGenericIcon(img: HTMLImageElement, src: string) {
	if (src.includes("google.com/s2/favicons") && img.naturalWidth <= 16) {
		return true;
	}
	return img.naturalWidth < 8 || img.naturalHeight < 8;
}
