(function () {
    const grid = document.getElementById("font-grid");
    const statusRegion = document.getElementById("status-region");
    const searchInput = document.getElementById("font-search");
    const previewInput = document.getElementById("preview-text");
    const fontCountEl = document.getElementById("font-count");
    
    let allFonts = [];
    let initialized = false;
    
    async function init() {
        if (initialized) return;
        initialized = true;
        
        setStatus("loading", "Reading the repo's file tree…");
        try {
            allFonts = await window.DCF.getFonts();
            setStatus("done", "");
            renderGrid(allFonts);
            wireToolbar();
        } catch (err) {
            console.error(err);
            initialized = false;
            setStatus(
                "error",
                "Couldn't load the font list. GitHub's API may be rate-limiting this browser — wait a minute and retry."
            );
        }
    }
    
    function renderGrid(fonts) {
        grid.innerHTML = "";
        fonts.forEach((font, i) => grid.appendChild(buildCard(font, i)));
        updateCount(fonts.length, fonts.length);
    }
    
    function buildCard(font, index) {
        const card = document.createElement("article");
        card.className = "font-card";
        card.style.animationDelay = `${Math.min(index * 40, 400)}ms`;
        card.dataset.name = font.name.toLowerCase();
        
        const top = document.createElement("div");
        top.className = "card-top";
        
        const name = document.createElement("span");
        name.className = "card-name";
        name.textContent = font.name;
        
        const meta = document.createElement("span");
        meta.className = "card-meta";
        meta.textContent = `${font.weights.length} weight${font.weights.length === 1 ? "" : "s"}`;
        
        top.append(name, meta);
        
        const specimen = document.createElement("p");
        specimen.className = "specimen is-loading";
        specimen.textContent = "Loading specimen…";
        
        const bottom = document.createElement("div");
        bottom.className = "card-bottom";
        
        const select = document.createElement("select");
        select.className = "weight-select";
        select.setAttribute("aria-label", `${font.name} weight`);
        font.weights.forEach((w) => {
            const opt = document.createElement("option");
            opt.value = w.file;
            opt.textContent = w.label;
            select.appendChild(opt);
        });
        
        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-btn";
        copyBtn.type = "button";
        copyBtn.innerHTML = `<span class="copy-label">Copy font.json</span>`;
        
        bottom.append(select, copyBtn);
        card.append(top, specimen, bottom);
        
        const applyWeight = (file) => loadSpecimenFont(font.name, file, specimen);
        applyWeight(font.weights[0].file);
        
        select.addEventListener("change", () => applyWeight(select.value));
        copyBtn.addEventListener("click", () => copyLink(font.jsonUrl, copyBtn));
        
        return card;
    }
    
    async function loadSpecimenFont(fontName, file, specimenEl) {
        specimenEl.classList.add("is-loading");
        specimenEl.textContent = "Loading specimen…";
        try {
            const family = await window.DCF.loadFace(fontName, file);
            specimenEl.style.fontFamily = `"${family}"`;
            specimenEl.classList.remove("is-loading");
            specimenEl.textContent = previewInput.value || previewInput.placeholder;
        } catch (err) {
            console.error("Font load failed", fontName, file, err);
            specimenEl.classList.remove("is-loading");
            specimenEl.textContent = "Couldn't load this file.";
        }
    }
    
    function refreshAllSpecimens() {
        document.querySelectorAll("#font-grid .specimen:not(.is-loading)").forEach((el) => {
            el.textContent = previewInput.value || previewInput.placeholder;
        });
    }
    
    function wireToolbar() {
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            const cards = grid.querySelectorAll(".font-card");
            let visible = 0;
            
            cards.forEach((card) => {
                const match = card.dataset.name.includes(query);
                card.classList.toggle("is-hidden", !match);
                if (match) visible++;
            });
            
            toggleEmptyState(visible === 0, query);
            updateCount(visible, allFonts.length);
        });
        
        previewInput.addEventListener("input", refreshAllSpecimens);
    }
    
    function toggleEmptyState(show, query) {
        let empty = grid.querySelector(".empty-state");
        if (show) {
            if (!empty) {
                empty = document.createElement("div");
                empty.className = "empty-state";
                grid.appendChild(empty);
            }
            empty.textContent = `No fonts match "${query}". Try a different search.`;
        } else if (empty) {
            empty.remove();
        }
    }
    
    function updateCount(visible, total) {
        fontCountEl.textContent =
            visible === total ? `${total} font${total === 1 ? "" : "s"}` : `${visible} of ${total}`;
    }
    
    async function copyLink(url, button) {
        try {
            await copyText(url);
            flashCopied(button);
            window.DCFToast.show("font.json link copied");
        } catch (err) {
            console.error("Copy failed", err);
            window.DCFToast.show("Couldn't copy — copy the link manually");
        }
    }
    
    function flashCopied(button) {
        const label = button.querySelector(".copy-label");
        const original = label.textContent;
        button.classList.add("is-copied");
        label.textContent = "Copied ✓";
        setTimeout(() => {
            button.classList.remove("is-copied");
            label.textContent = original;
        }, 1500);
    }
    
    async function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
    }
    
    function setStatus(state, message) {
        if (state === "done") {
            statusRegion.innerHTML = "";
            return;
        }
        statusRegion.innerHTML = "";
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
            retry.addEventListener("click", () => {
                setStatus("loading", "Reading the repo's file tree…");
                init();
            });
            wrap.appendChild(retry);
        }
        
        statusRegion.appendChild(wrap);
    }
    
    window.DCFBrowser = { init, copyText };
})();