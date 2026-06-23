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
            throw new Error(`No fonts with a font.json were found under /${CONFIG.fontsDir}.`);
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
            const lower = filename.toLowerCase();
            
            if (lower === "font.json") {
                if (!folders.has(folder)) folders.set(folder, { weights: [] });
                folders.get(folder).hasJson = true;
            } else if (lower.endsWith(".ttf")) {
                if (!folders.has(folder)) folders.set(folder, { weights: [] });
                folders.get(folder).weights.push(filename);
            }
        }
        
        const fonts = [];
        for (const [name, info] of folders) {
            if (!info.hasJson || info.weights.length === 0) continue;
            fonts.push({
                name,
                jsonUrl: assetUrl(name, "font.json"),
                weights: sortWeights(info.weights).map((file) => ({
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
            const ai = WEIGHT_ORDER.indexOf(a.replace(/\.ttf$/i, "").toLowerCase());
            const bi = WEIGHT_ORDER.indexOf(b.replace(/\.ttf$/i, "").toLowerCase());
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
    }
    
    function fileToLabel(filename) {
        return filename.replace(/\.ttf$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    }
    
    function findFont(fonts, name) {
        return fonts.find((f) => f.name === name) || null;
    }
    
    function matchWeight(font, weightBasename, italic) {
        const desired = weightBasename.toLowerCase();
        const norm = new Map();
        for (const w of font.weights) {
            norm.set(w.file.replace(/\.ttf$/i, "").toLowerCase(), w);
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
            const family = `dcf-${fontName.replace(/\s+/g, "-")}-${file.replace(/\.ttf$/i, "")}`;
            const face = new FontFace(family, `url(${assetUrl(fontName, file)})`);
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
    
    window.DCF = {
        CONFIG,
        WEIGHT_ORDER,
        getFonts,
        findFont,
        matchWeight,
        loadFace,
        fileToLabel,
        assetUrl,
    };
})();