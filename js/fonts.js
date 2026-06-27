(function () {
    const CONFIG = {
        owner: "aryan-raj-7167",
        repo: "dcfont",
        fontsDir: "fonts",
    };
    
    const WEIGHT_ORDER = [
        "regular",
        "medium",
        "semibold",
        "bold",
        "extrabold",
    ];
    
    let fontsPromise = null;
    const loadedFaces = new Map();
    
    function assetUrl(fontName, file) {
        return new URL(`/${CONFIG.fontsDir}/${fontName}/${file}`, location.origin).href;
    }
    
    function getFonts(forceRetry) {
        if (!fontsPromise || forceRetry) {
            fontsPromise = discoverFonts();
        }
        return fontsPromise;
    }
    
    async function discoverFonts() {
        const branch = await getDefaultBranch();
        const tree = await getTree(branch);
        const fonts = buildFontList(tree);
        if (fonts.length === 0) {
            throw new Error(`No fonts with .ttf files were found under /${CONFIG.fontsDir}.`);
        }
        return fonts;
    }
    
    async function getDefaultBranch() {
        const res = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}`);
        if (!res.ok) throw new Error(`Repo lookup failed: ${res.status}`);
        const data = await res.json();
        return data.default_branch || "main";
    }
    
    async function getTree(branch) {
        const res = await fetch(
            `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${branch}?recursive=1`
        );
        if (!res.ok) throw new Error(`Tree lookup failed: ${res.status}`);
        const data = await res.json();
        return data.tree || [];
    }
    
    function buildFontList(tree) {
        const folders = new Map();
        
        for (const entry of tree) {
            if (entry.type !== "blob") continue;
            const parts = entry.path.split("/");
            if (parts.length !== 3 || parts[0] !== CONFIG.fontsDir) continue;
            
            const [, folder, filename] = parts;
            if (!/\.(ttf|otf)$/i.test(filename)) continue; // skip LICENSE.txt etc.
            
            if (!folders.has(folder)) folders.set(folder, []);
            folders.get(folder).push(filename);
        }
        
        const fonts = [];
        for (const [name, files] of folders) {
            if (files.length === 0) continue;
            fonts.push({
                name,
                weights: sortWeights(files).map((file) => ({
                    file,
                    label: fileToLabel(file),
                    url: assetUrl(name, file),
                })),
            });
        }
        
        fonts.sort((a, b) => a.name.localeCompare(b.name));
        return fonts;
    }
    
    function sortWeights(files) {
        return [...files].sort((a, b) => {
            const ai = WEIGHT_ORDER.indexOf(a.replace(/\.(ttf|otf)$/i, "").toLowerCase());
            const bi = WEIGHT_ORDER.indexOf(b.replace(/\.(ttf|otf)$/i, "").toLowerCase());
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
    }
    
    function fileToLabel(filename) {
        return filename.replace(/\.(ttf|otf)$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    }
    
    function findFont(fonts, name) {
        return fonts.find((f) => f.name === name) || null;
    }
    
    function matchWeight(font, weightBasename, italic) {
        const desired = weightBasename.toLowerCase();
        const norm = new Map();
        for (const w of font.weights) {
            norm.set(w.file.replace(/\.(ttf|otf)$/i, "").toLowerCase(), w);
        }
        const italicKey = (base) => (base === "regular" ? "italic" : base + "italic");
    
        // 1. Exact style match.
        if (italic && norm.has(italicKey(desired))) {
            return { weight: norm.get(italicKey(desired)), exact: true, synthetic: false };
        }
        if (!italic && norm.has(desired)) {
            return { weight: norm.get(desired), exact: true, synthetic: false };
        }
        // 2. Same weight, missing italic — fake the slant.
        if (italic && norm.has(desired)) {
            return { weight: norm.get(desired), exact: false, synthetic: true };
        }
        // 3. Widen outward through neighboring weights.
        const idx = WEIGHT_ORDER.indexOf(desired);
        if (idx !== -1) {
            for (let d = 1; d < WEIGHT_ORDER.length; d++) {
                for (const dir of [-1, 1]) {
                    const ni = idx + dir * d;
                    if (ni < 0 || ni >= WEIGHT_ORDER.length) continue;
                    const base = WEIGHT_ORDER[ni];
                    if (italic && norm.has(italicKey(base))) {
                        return { weight: norm.get(italicKey(base)), exact: false, synthetic: false };
                    }
                }
            }
            for (let d = 1; d < WEIGHT_ORDER.length; d++) {
                for (const dir of [-1, 1]) {
                    const ni = idx + dir * d;
                    if (ni < 0 || ni >= WEIGHT_ORDER.length) continue;
                    const base = WEIGHT_ORDER[ni];
                    if (norm.has(base)) {
                        return { weight: norm.get(base), exact: false, synthetic: italic };
                    }
                }
            }
        }
        // 4. Last resort: whatever this font has.
        return { weight: font.weights[0], exact: false, synthetic: italic };
    }
    
    async function loadFace(fontName, file) {
        const key = `${fontName}::${file}`;
        if (loadedFaces.has(key)) return loadedFaces.get(key);
        
        const promise = (async () => {
            const family = `dcf-${fontName.replace(/\s+/g, "-")}-${file.replace(/\.(ttf|otf)$/i, "")}`;
            const format = /\.otf$/i.test(file) ? "opentype" : "truetype";
            const face = new FontFace(family, `url("${assetUrl(fontName, file)}") format("${format}")`);
            await face.load();
            document.fonts.add(face);
            return family;
        })();
        
        loadedFaces.set(key, promise);
        try {
            return await promise;
        } catch (err) {
            loadedFaces.delete(key);
            throw err;
        }
    }
    
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
    
    function buildMainForFont(font) {
        const main = {};
        KEY_SPECS.forEach((spec) => {
            const { weight } = matchWeight(font, spec.weight, spec.italic);
            main[spec.key] = weight.url;
        });
        return main;
    }
    
    function buildFontJson(name, main, previewText) {
        return {
            spec: 1,
            name,
            previewText: previewText || "The quick brown fox jumps over the lazy dog",
            main,
        };
    }
    
    function toBase64Url(obj) {
        const json = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    
    function buildLink(obj) {
        return new URL(`/font/${toBase64Url(obj)}.json`, location.origin).href;
    }
    
    window.DCF = {
        CONFIG,
        WEIGHT_ORDER,
        KEY_SPECS,
        getFonts,
        findFont,
        matchWeight,
        loadFace,
        fileToLabel,
        assetUrl,
        buildMainForFont,
        buildFontJson,
        toBase64Url,
        buildLink,
    };
})();