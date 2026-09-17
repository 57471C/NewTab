const darkTabs = new Set();

function paintIcon(size, on) {
	const canvas = new OffscreenCanvas(size, size);
	const ctx = canvas.getContext("2d");
	const bg = on ? "#F4F4F5" : "#18181B";
	const fg = on ? "#1D4ED8" : "#22D3EE";
	const radius = Math.max(3, Math.round(size * 0.22));
	ctx.fillStyle = bg;
	if (typeof ctx.roundRect === "function") {
		ctx.beginPath();
		ctx.roundRect(0, 0, size, size, radius);
		ctx.fill();
	} else {
		ctx.fillRect(0, 0, size, size);
	}
	ctx.strokeStyle = fg;
	ctx.lineWidth = Math.max(3, Math.round(size * 0.16));
	ctx.lineCap = "round";
	const left = size * 0.28;
	const right = size * 0.72;
	const top = size * 0.22;
	const bot = size * 0.78;
	ctx.beginPath();
	ctx.moveTo(left, top);
	ctx.lineTo(left, bot);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(left, top);
	ctx.lineTo(right, bot);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(right, top);
	ctx.lineTo(right, bot);
	ctx.stroke();
	return ctx.getImageData(0, 0, size, size);
}

function iconData(on) {
	return {
		16: paintIcon(16, on),
		32: paintIcon(32, on),
	};
}

function applyTabIcon(tabId, on) {
	chrome.action.setIcon({ tabId, imageData: iconData(on) });
	chrome.action.setBadgeText({ tabId, text: on ? "D" : "" });
	chrome.action.setBadgeBackgroundColor({
		tabId,
		color: on ? "#22D3EE" : "#27272A",
	});
}

if (typeof chrome !== "undefined" && chrome.action && chrome.scripting) {
	chrome.action.onClicked.addListener((tab) => {
		if (
			!tab.url ||
			tab.url.startsWith("chrome://") ||
			tab.url.startsWith("comet://") ||
			tab.url.startsWith("brave://") ||
			tab.url.startsWith("chrome-extension://")
		) {
			return;
		}

		const tabId = tab.id;
		const nextStateDark = !darkTabs.has(tabId);

		if (nextStateDark) darkTabs.add(tabId);
		else darkTabs.delete(tabId);

		applyTabIcon(tabId, nextStateDark);

		chrome.scripting.executeScript({
			target: { tabId },
			func: () => {
				const STYLE_ID = "comet-smart-dark-matrix";
				const existingStyle = document.getElementById(STYLE_ID);

				if (existingStyle) {
					existingStyle.remove();
				} else {
					const style = document.createElement("style");
					style.id = STYLE_ID;
					style.textContent = `
            html {
              filter: invert(0.92) hue-rotate(180deg) !important;
              background-color: #09090b !important;
            }
            img, video, canvas, svg, iframe, [style*="background-image"] {
              filter: invert(1) hue-rotate(180deg) !important;
            }
            html, body {
              text-rendering: optimizeLegibility !important;
              -webkit-font-smoothing: antialiased !important;
            }
          `;
					document.head.appendChild(style);
				}
			},
		});
	});

	chrome.tabs.onRemoved.addListener((tabId) => {
		darkTabs.delete(tabId);
	});

	chrome.runtime.onConnect.addListener((port) => {
		if (port.name !== "anthropic-proxy") return;

		port.onMessage.addListener(async (msg) => {
			if (msg.action === "stream") {
				try {
					if (!msg.endpoint.startsWith("https://api.anthropic.com/")) {
						throw new Error("Invalid endpoint");
					}

					const response = await fetch(msg.endpoint, {
						method: "POST",
						headers: msg.headers,
						body: msg.body,
					});

					if (!response.ok) {
						const errorTxt = await response.text();
						port.postMessage({
							type: "error",
							error: `API Error: ${response.status} - ${errorTxt}`,
						});
						port.disconnect();
						return;
					}

					const reader = response.body?.getReader();
					if (!reader) {
						port.postMessage({ type: "error", error: "No response body" });
						port.disconnect();
						return;
					}

					const decoder = new TextDecoder("utf-8");
					while (true) {
						const { done, value } = await reader.read();
						if (done) {
							port.postMessage({ type: "done" });
							port.disconnect();
							break;
						}
						port.postMessage({
							type: "chunk",
							value: decoder.decode(value, { stream: true }),
						});
					}
				} catch (error) {
					port.postMessage({
						type: "error",
						error: error instanceof Error ? error.message : "Unknown failure",
					});
					port.disconnect();
				}
			}
		});
	});
} else {
	console.warn(
		"Extension action components not yet initialized in current runtime context.",
	);
}
