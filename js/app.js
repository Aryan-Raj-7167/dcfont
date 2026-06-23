(function () {
    const toastEl = document.getElementById("toast");
    let toastTimer;
    
    window.DCFToast = {
        show(message) {
            clearTimeout(toastTimer);
            toastEl.textContent = message;
            toastEl.classList.add("is-visible");
            toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 1800);
        },
    };
    
    const browseView = document.getElementById("browse-view");
    const builderView = document.getElementById("builder-view");
    
    function showView(name) {
        const isBuilder = name === "builder";
        browseView.classList.toggle("is-hidden", isBuilder);
        builderView.classList.toggle("is-hidden", !isBuilder);
        
        if (isBuilder) {
            window.DCFBuilder.initOnce();
            builderView.querySelector("h2")?.focus();
        } else {
            window.DCFBrowser.init();
        }
    }
    
    function viewFromHash() {
        return location.hash === "#create" ? "builder" : "browse";
    }
    
    document.getElementById("open-builder-btn").addEventListener("click", () => {
        location.hash = "#create";
    });
    
    document.getElementById("back-to-browse-btn").addEventListener("click", () => {
        location.hash = "";
    });
    
    window.addEventListener("hashchange", () => showView(viewFromHash()));
    
    showView(viewFromHash());
})();