(function () {
    const KEY_SPECS = [
        { key: "ggsans-Normal", group: "gg sans", weight: "regular", italic: false },
        { key: "ggsans-Medium", group: "gg sans", weight: "medium", italic: false },
        { key: "ggsans-Semibold", group: "gg sans", weight: "semibold", italic: false },
        { key: "ggsans-Bold", group: "gg sans", weight: "bold", italic: false },
        { key: "ggsans-ExtraBold", group: "gg sans", weight: "extrabold", italic: false },
        { key: "ggsans-NormalItalic", group: "gg sans", weight: "regular", italic: true },
        { key: "ggsans-MediumItalic", group: "gg sans", weight: "medium", italic: true },
        { key: "ggsans-SemiboldItalic", group: "gg sans", weight: "semibold", italic: true },
        { key: "ggsans-BoldItalic", group: "gg sans", weight: "bold", italic: true },
        { key: "ggsans-ExtraBoldItalic", group: "gg sans", weight: "extrabold", italic: true },
        { key: "NotoSans-Normal", group: "Noto Sans", weight: "regular", italic: false },
        { key: "NotoSans-Medium", group: "Noto Sans", weight: "medium", italic: false },
        { key: "NotoSans-Semibold", group: "Noto Sans", weight: "semibold", italic: false },
        { key: "NotoSans-Bold", group: "Noto Sans", weight: "bold", italic: false },
        { key: "NotoSans-ExtraBold", group: "Noto Sans", weight: "extrabold", italic: false },
        { key: "SourceCodePro-Semibold", group: "Other roles", weight: "semibold", italic: false },
        { key: "ABCGintoNord-ExtraBold", group: "Other roles", weight: "extrabold", italic: false },
    ];
    
    const DEFAULT_FONT = "Poppins";
    const DEFAULT_CODE_FONT = "SourceCodePro";
    
    let fonts = [];
    let initialized = false;
    
    const builderState = {
        rows: {},
        configName: "My Custom Mix",
    };
    
    const els = {};
    
    function cacheEls() {
        els.status = document.getElementById("builder-status");
        els.rows = document.getElementById("builder-rows");
        els.configName = document.getElementById("config-name");
        els.fillSelect = document.getElementById("fill-all-select");
        els.fillBtn = document.getElementById("fill-all-btn");
        els.jsonPreview = document.getElementById("json-preview");
        els.copyLinkBtn = document.getElementById("copy-link-btn");
        els.downloadBtn = document.getElementById("download-json-btn");
        els.copyRawBtn = document.getElementById("copy-raw-btn");
    }
    
    async function initOnce() {
        if (initialized) return;
        initialized = true;
        cacheEls();
        setStatus("loading", "Loading available fonts…");
        
        try {
            fonts = await window.DCF.getFonts();
            setStatus("done", "");
            initRowState();
            populateFillSelect();
            renderAllRows();
            updateOutput();
            wireControls();
        } catch (err) {
            console.error(err);
            initialized = false;
            setStatus(
                "error",
                "Couldn't load the font list. GitHub's API may be rate-limiting this browser — wait a minute and retry."
            );
        }
    }
    
    function initRowState() {
        KEY_SPECS.forEach((spec) => {
            const preferred =
                spec.key === "SourceCodePro-Semibold" && window.DCF.findFont(fonts, DEFAULT_CODE_FONT)
                    ? DEFAULT_CODE_FONT
                    : DEFAULT_FONT;
            assignFont(spec.key, preferred);
        });
    }
    
    function assignFont(key, fontName) {
        const spec = KEY_SPECS.find((s) => s.key === key);
        const font = window.DCF.findFont(fonts, fontName);
        if (!font) return;
        const { weight } = window.DCF.matchWeight(font, spec.weight, spec.italic);
        builderState.rows[key] = { fontName, weightFile: weight.file };
    }
    
    function populateFillSelect() {
        els.fillSelect.innerHTML = "";
        fonts.forEach((f) => {
            const opt = document.createElement("option");
            opt.value = f.name;
            opt.textContent = f.name;
            els.fillSelect.appendChild(opt);
        });
        els.fillSelect.value = DEFAULT_FONT;
    }
    
    function renderAllRows() {
        els.rows.innerHTML = "";
        let lastGroup = null;
        
        KEY_SPECS.forEach((spec) => {
            if (spec.group !== lastGroup) {
                const heading = document.createElement("h3");
                heading.className = "row-group-heading";
                heading.textContent = spec.group;
                els.rows.appendChild(heading);
                lastGroup = spec.group;
            }
            els.rows.appendChild(buildRow(spec));
        });
    }
    
    function buildRow(spec) {
        const row = builderState.rows[spec.key];
        const font = window.DCF.findFont(fonts, row.fontName);
        const weight = font.weights.find((w) => w.file === row.weightFile) || font.weights[0];
        const exact = isExact(spec, row.weightFile);
        const synthetic = isSynthetic(spec, row.weightFile);
        
        const el = document.createElement("div");
        el.className = "key-row";
        el.dataset.key = spec.key;
        
        const head = document.createElement("div");
        head.className = "key-row-head";
        const keyName = document.createElement("span");
        keyName.className = "key-name";
        keyName.textContent = spec.key;
        head.appendChild(keyName);
        
        if (!exact) {
            const note = document.createElement("span");
            note.className = "key-note";
            note.textContent = synthetic
                ? "No italic in this family — will render upright"
                : `No exact match — using ${weight.label}`;
            head.appendChild(note);
        }
        
        const controls = document.createElement("div");
        controls.className = "key-row-controls";
        controls.appendChild(buildCombobox(spec, row));
        controls.appendChild(buildWeightSelect(spec, row, font));
        
        const specimen = document.createElement("p");
        specimen.className = "key-specimen";
        specimen.textContent = currentPreviewText();
        specimen.style.fontStyle = "normal";
        
        el.append(head, controls, specimen);
        
        window.DCF.loadFace(font.name, weight.file).then((family) => {
            specimen.style.fontFamily = `"${family}"`;
        });
        
        return el;
    }
    
    function buildWeightSelect(spec, row, font) {
        const select = document.createElement("select");
        select.className = "weight-select";
        select.setAttribute("aria-label", `${spec.key} weight override`);
        font.weights.forEach((w) => {
            const opt = document.createElement("option");
            opt.value = w.file;
            opt.textContent = w.label;
            if (w.file === row.weightFile) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener("change", () => {
            builderState.rows[spec.key].weightFile = select.value;
            renderAllRows();
            updateOutput();
        });
        return select;
    }
    
    function buildCombobox(spec, row) {
        const wrap = document.createElement("div");
        wrap.className = "font-combobox";
        
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "combobox-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        trigger.innerHTML = `<span class="trigger-label">${row.fontName}</span><span class="trigger-chevron" aria-hidden="true">▾</span>`;
        
        const panel = document.createElement("div");
        panel.className = "combobox-panel is-hidden";
        panel.setAttribute("role", "listbox");
        
        const filter = document.createElement("input");
        filter.type = "text";
        filter.className = "combobox-filter";
        filter.placeholder = "Filter fonts…";
        filter.spellcheck = false;
        filter.autocomplete = "off";
        
        const optionsWrap = document.createElement("div");
        optionsWrap.className = "combobox-options";
        
        panel.append(filter, optionsWrap);
        wrap.append(trigger, panel);
        
        let populated = false;
        
        function populateOptions() {
            if (populated) return;
            populated = true;
            fonts.forEach((font) => {
                const { weight } = window.DCF.matchWeight(font, spec.weight, spec.italic);
                const opt = document.createElement("button");
                opt.type = "button";
                opt.className = "combobox-option";
                opt.setAttribute("role", "option");
                opt.dataset.name = font.name.toLowerCase();
                if (font.name === row.fontName) opt.setAttribute("aria-selected", "true");
                opt.textContent = font.name;
                opt.style.fontStyle = "normal";
                
                opt.addEventListener("click", () => {
                    assignFont(spec.key, font.name);
                    closeThisCombobox();
                    renderAllRows();
                    updateOutput();
                });
                
                optionsWrap.appendChild(opt);
                
                window.DCF.loadFace(font.name, weight.file).then((family) => {
                    opt.style.fontFamily = `"${family}"`;
                });
            });
        }
        
        function openThisCombobox() {
            closeActiveCombobox();
            populateOptions();
            panel.classList.remove("is-hidden");
            trigger.setAttribute("aria-expanded", "true");
            activeCombobox = { panel, trigger };
            filter.value = "";
            filterOptions("");
            filter.focus();
        }
        
        function closeThisCombobox() {
            panel.classList.add("is-hidden");
            trigger.setAttribute("aria-expanded", "false");
            if (activeCombobox && activeCombobox.panel === panel) activeCombobox = null;
        }
        
        function filterOptions(query) {
            const q = query.trim().toLowerCase();
            optionsWrap.querySelectorAll(".combobox-option").forEach((opt) => {
                opt.classList.toggle("is-hidden", !opt.dataset.name.includes(q));
            });
        }
        
        trigger.addEventListener("click", () => {
            const isOpen = !panel.classList.contains("is-hidden");
            isOpen ? closeThisCombobox() : openThisCombobox();
        });
        
        filter.addEventListener("input", () => filterOptions(filter.value));
        filter.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                closeThisCombobox();
                trigger.focus();
            }
        });
        
        return wrap;
    }
    
    let activeCombobox = null;
    
    function closeActiveCombobox() {
        if (!activeCombobox) return;
        activeCombobox.panel.classList.add("is-hidden");
        activeCombobox.trigger.setAttribute("aria-expanded", "false");
        activeCombobox = null;
    }
    
    document.addEventListener("click", (e) => {
        if (activeCombobox && !activeCombobox.panel.parentElement.contains(e.target)) {
            closeActiveCombobox();
        }
    });
    
    function isExact(spec, weightFile) {
        const base = weightFile.replace(/\.ttf$/i, "").toLowerCase();
        const desired = spec.italic
            ? spec.weight === "regular"
                ? "italic"
                : spec.weight + "italic"
            : spec.weight;
        return base === desired;
    }
    
    function isSynthetic(spec, weightFile) {
        return spec.italic && !/italic/i.test(weightFile);
    }
    
    function currentPreviewText() {
        const input = document.getElementById("preview-text");
        return (input && input.value) || (input && input.placeholder) || "The quick brown fox jumps over the lazy dog";
    }
    
    function refreshSpecimens() {
        document.querySelectorAll("#builder-rows .key-specimen").forEach((el) => {
            el.textContent = currentPreviewText();
        });
    }
    
    function buildFontJSON() {
        const main = {};
        KEY_SPECS.forEach((spec) => {
            const row = builderState.rows[spec.key];
            const font = window.DCF.findFont(fonts, row.fontName);
            const weight = font.weights.find((w) => w.file === row.weightFile) || font.weights[0];
            main[spec.key] = weight.url;
        });
        return {
            spec: 1,
            name: builderState.configName || "Custom Mix",
            previewText: currentPreviewText(),
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
    
    function slugify(text) {
        return (
            text
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") || "custom"
        );
    }
    
    function updateOutput() {
        const obj = buildFontJSON();
        els.jsonPreview.textContent = JSON.stringify(obj, null, 2);
        els.copyLinkBtn.dataset.uri = buildLink(obj);
        els.downloadBtn.dataset.filename = `${slugify(builderState.configName)}-font.json`;
        els.downloadBtn.dataset.json = JSON.stringify(obj, null, 2);
    }
    
    function wireControls() {
        els.configName.addEventListener("input", () => {
            builderState.configName = els.configName.value;
            updateOutput();
        });
        
        els.fillBtn.addEventListener("click", () => {
            const chosen = els.fillSelect.value;
            KEY_SPECS.forEach((spec) => assignFont(spec.key, chosen));
            renderAllRows();
            updateOutput();
        });
        
        els.copyLinkBtn.addEventListener("click", async () => {
            try {
                await window.DCFBrowser.copyText(els.copyLinkBtn.dataset.uri);
                window.DCFToast.show("Custom font.json link copied");
            } catch (err) {
                console.error(err);
                window.DCFToast.show("Couldn't copy — try the download button");
            }
        });
        
        els.copyRawBtn.addEventListener("click", async () => {
            try {
                await window.DCFBrowser.copyText(els.jsonPreview.textContent);
                window.DCFToast.show("Raw JSON copied");
            } catch (err) {
                console.error(err);
                window.DCFToast.show("Couldn't copy the JSON");
            }
        });
        
        els.downloadBtn.addEventListener("click", () => {
            const blob = new Blob([els.downloadBtn.dataset.json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = els.downloadBtn.dataset.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
        
        document.getElementById("preview-text").addEventListener("input", refreshSpecimens);
    }
    
    function setStatus(state, message) {
        if (state === "done") {
            els.status.innerHTML = "";
            return;
        }
        els.status.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = `status-message${state === "error" ? " is-error" : ""}`;
        
        if (state === "loading") {
            const spinner = document.createElement("span");
            spinner.className = "spinner";
            wrap.appendChild(spinner);
        }
        
        const text = document.createElement("span");
        text.textContent = message;
        wrap.appendChild(text);
        
        if (state === "error") {
            const retry = document.createElement("button");
            retry.className = "retry-btn";
            retry.type = "button";
            retry.textContent = "Retry";
            retry.addEventListener("click", initOnce);
            wrap.appendChild(retry);
        }
        
        els.status.appendChild(wrap);
    }
    
    window.DCFBuilder = { initOnce };
})();