// Active session tracking state per individual browser tab ID
const darkTabs = new Set();

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
		const isDarkActive = darkTabs.has(tabId);
		const nextStateDark = !isDarkActive;

		if (nextStateDark) {
			darkTabs.add(tabId);
			chrome.action.setIcon({
				tabId: tabId,
				path: { 32: "icon-32-on.png" },
			});
		} else {
			darkTabs.delete(tabId);
			chrome.action.setIcon({
				tabId: tabId,
				path: { 32: "icon-32-off.png" },
			});
		}

		chrome.action.setBadgeText({ tabId: tabId, text: "" });

		chrome.scripting.executeScript({
			target: { tabId: tabId },
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
