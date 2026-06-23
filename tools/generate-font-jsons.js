#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SITE_ORIGIN = "https://dcfont.pages.dev";
const FONTS_DIR = path.join(__dirname, "..", "fonts");

const WEIGHT_ORDER = ["regular", "medium", "semibold", "bold", "extrabold", "black"];

const KEY_SPECS = [
    { key: "ggsans-Normal", weight: "regular", italic: false },
    { key: "ggsans-Medium", weight: "medium", italic: false },
    { key: "ggsans-Semibold", weight: "semibold", italic: false },
    { key: "ggsans-Bold", weight: "bold", italic: false },
    { key: "ggsans-ExtraBold", weight: "extrabold", italic: false },
    { key: "ggsans-NormalItalic", weight: "regular", italic: true },
    { key: "ggsans-MediumItalic", weight: "medium", italic: true },
    { key: "ggsans-SemiboldItalic", weight: "semibold", italic: true },
    { key: "ggsans-BoldItalic", weight: "bold", italic: true },
    { key: "ggsans-ExtraBoldItalic", weight: "extrabold", italic: true },
    { key: "NotoSans-Normal", weight: "regular", italic: false },
    { key: "NotoSans-Medium", weight: "medium", italic: false },
    { key: "NotoSans-Semibold", weight: "semibold", italic: false },
    { key: "NotoSans-Bold", weight: "bold", italic: false },
    { key: "NotoSans-ExtraBold", weight: "extrabold", italic: false },
    { key: "SourceCodePro-Semibold", weight: "semibold", italic: false },
    { key: "ABCGintoNord-ExtraBold", weight: "extrabold", italic: false },
];

function matchWeight(files, weightBasename, italic) {
    const desired = weightBasename.toLowerCase();
    const norm = new Map();
    for (const f of files) norm.set(f.replace(/\.ttf$/i, "").toLowerCase(), f);
    const italicKey = (b) => (b === "regular" ? "italic" : b + "italic");
    
    if (italic && norm.has(italicKey(desired))) return norm.get(italicKey(desired));
    if (!italic && norm.has(desired)) return norm.get(desired);
    if (italic && norm.has(desired)) return norm.get(desired);
    
    const idx = WEIGHT_ORDER.indexOf(desired);
    if (idx !== -1) {
        for (let d = 1; d < WEIGHT_ORDER.length; d++) {
            for (const dir of [-1, 1]) {
                const ni = idx + dir * d;
                if (ni < 0 || ni >= WEIGHT_ORDER.length) continue;
                const base = WEIGHT_ORDER[ni];
                if (italic && norm.has(italicKey(base))) return norm.get(italicKey(base));
            }
        }
        for (let d = 1; d < WEIGHT_ORDER.length; d++) {
            for (const dir of [-1, 1]) {
                const ni = idx + dir * d;
                if (ni < 0 || ni >= WEIGHT_ORDER.length) continue;
                const base = WEIGHT_ORDER[ni];
                if (norm.has(base)) return norm.get(base);
            }
        }
    }
    return files[0];
}

function main() {
    if (!fs.existsSync(FONTS_DIR)) {
        console.error(`Couldn't find a fonts/ folder at ${FONTS_DIR}`);
        process.exit(1);
    }
    
    const folders = fs
        .readdirSync(FONTS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    
    let written = 0;
    
    for (const name of folders) {
        const dir = path.join(FONTS_DIR, name);
        const ttfs = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".ttf"));
        if (ttfs.length === 0) {
            console.log(`Skipping ${name} — no .ttf files found`);
            continue;
        }
        
        const main = {};
        for (const spec of KEY_SPECS) {
            const file = matchWeight(ttfs, spec.weight, spec.italic);
            main[spec.key] = `${SITE_ORIGIN}/fonts/${name}/${file}`;
        }
        
        const fontJson = {
            spec: 1,
            name,
            previewText: "The quick brown fox jumps over the lazy dog",
            main,
        };
        
        fs.writeFileSync(path.join(dir, "font.json"), JSON.stringify(fontJson, null, 2) + "\n");
        written++;
        console.log(`Wrote ${name}/font.json`);
    }
    
    console.log(`\nDone — ${written} font.json file(s) written.`);
}

main();