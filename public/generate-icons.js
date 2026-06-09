/**
 * Helper Node Asset Script
 * Generates the static fallback extension icons.
 * Requires the 'canvas' package: npm install canvas
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "canvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateIcon(backgroundColor, filename) {
	const canvas = createCanvas(32, 32);
	const ctx = canvas.getContext("2d");

	// Background square frame with rounded corners
	ctx.fillStyle = backgroundColor;
	ctx.beginPath();
	const r = 6;
	ctx.moveTo(r, 0);
	ctx.lineTo(32 - r, 0);
	ctx.quadraticCurveTo(32, 0, 32, r);
	ctx.lineTo(32, 32 - r);
	ctx.quadraticCurveTo(32, 32, 32 - r, 32);
	ctx.lineTo(r, 32);
	ctx.quadraticCurveTo(0, 32, 0, 32 - r);
	ctx.lineTo(0, r);
	ctx.quadraticCurveTo(0, 0, r, 0);
	ctx.closePath();
	ctx.fill();

	// Overlay typography mark
	ctx.fillStyle = "#FFFFFF";
	ctx.font = "bold 24px Arial, sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("N", 16, 16);

	const outPath = path.join(__dirname, filename);
	fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
	console.log(`Successfully generated static asset: ${outPath}`);
}

generateIcon("#52525b", "icon-default.png");
generateIcon("#000000", "icon-dark.png");
