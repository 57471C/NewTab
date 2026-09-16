export interface ChatAttachment {
	id: string;
	name: string;
	mime: string;
	dataUrl: string;
}

export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
]);

export function splitDataUrl(dataUrl: string): { mime: string; data: string } {
	const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
	if (!match) return { mime: "image/png", data: dataUrl };
	return { mime: match[1], data: match[2] };
}

export function readImageFile(file: File): Promise<ChatAttachment> {
	return new Promise((resolve, reject) => {
		if (!ALLOWED_TYPES.has(file.type)) {
			reject(new Error("Only PNG, JPEG, WebP and GIF images are supported."));
			return;
		}
		if (file.size > MAX_ATTACHMENT_BYTES) {
			reject(new Error(`"${file.name}" is larger than 8 MB.`));
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			resolve({
				id: crypto.randomUUID(),
				name: file.name,
				mime: file.type,
				dataUrl: String(reader.result),
			});
		};
		reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
		reader.readAsDataURL(file);
	});
}

export function attachmentNote(attachments: ChatAttachment[]): string {
	if (!attachments.length) return "";
	return `\n\n[attached: ${attachments.map((item) => item.name).join(", ")}]`;
}
