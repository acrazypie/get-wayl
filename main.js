// WAYL site. Nav + drawer, theme toggle (circle reveal, as on egenesio.com), the hero's
// "now playing" line, copy buttons, the .env builder, tabs and the guide's step index.
(() => {
    "use strict";
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

    // --- nav: background once scrolled -------------------------------------------
    const nav = $("#nav");
    if (nav && !nav.classList.contains("solid")) {
        const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
    }

    // --- mobile drawer --------------------------------------------------------------
    const burger = $("#burger");
    const drawer = $("#drawer");
    const setDrawer = (open) => {
        if (!burger || !drawer) return;
        drawer.classList.toggle("open", open);
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open ? "Close menu" : "Menu");
        document.body.style.overflow = open ? "hidden" : "";
        if (nav) nav.classList.toggle("solid", open || nav.dataset.solid === "1");
    };
    if (nav && nav.classList.contains("solid")) nav.dataset.solid = "1";
    if (burger && drawer) {
        burger.addEventListener("click", () => setDrawer(!drawer.classList.contains("open")));
        $$("a", drawer).forEach((a) => a.addEventListener("click", () => setDrawer(false)));
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && drawer.classList.contains("open")) { setDrawer(false); burger.focus(); }
        });
        window.matchMedia("(min-width: 768px)").addEventListener("change", (e) => e.matches && setDrawer(false));
    }

    // --- theme toggle -------------------------------------------------------------------
    const applyTheme = (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        try { localStorage.setItem("theme", theme); } catch { /* private mode: just don't remember */ }
    };
    function toggleTheme(event) {
        const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        if (!document.startViewTransition || reduceMotion()) return applyTheme(next);
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX || rect.left + rect.width / 2;
        const y = event.clientY || rect.top + rect.height / 2;
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.startViewTransition(() => applyTheme(next)).ready.then(() => {
            document.documentElement.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
                { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
            );
        }).catch(() => {});
    }
    $$("[data-theme-toggle]").forEach((btn) => btn.addEventListener("click", toggleTheme));

    // --- hero: what WAYL just logged ----------------------------------------------------
    const answer = $("#answer");
    if (answer) {
        const plays = [
            ["Midnight Drive · Neon Harbor", "logged from Navidrome", "in your library"],
            ["Paper Suns · The Lowlights", "logged from Plex", "in your library"],
            ["Green Room Echo · Mara Vale", "scrobbled from your phone", ""],
            ["Static Bloom · Kites at Dusk", "playing in WAYL", "in your library"],
        ];
        const track = $("#answer-track");
        const meta = $("#answer-meta");
        let i = 0;
        let timer = null;
        const show = () => {
            i = (i + 1) % plays.length;
            const [t, m, owned] = plays[i];
            answer.classList.remove("swap");
            void answer.offsetWidth; // restart the animation
            track.textContent = t;
            meta.textContent = m;
            if (owned) {
                const b = document.createElement("b");
                b.textContent = owned;
                meta.append(" · ", b);
            }
            answer.classList.add("swap");
        };
        const start = () => { if (!timer && !reduceMotion()) timer = setInterval(show, 3800); };
        const stop = () => { clearInterval(timer); timer = null; };
        document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
        setTimeout(start, 1600);
    }

    // --- copy buttons ------------------------------------------------------------------------
    async function copyText(text) {
        try { await navigator.clipboard.writeText(text); return true; } catch {
            const ta = Object.assign(document.createElement("textarea"), { value: text });
            ta.setAttribute("readonly", "");
            ta.style.cssText = "position:fixed;opacity:0";
            document.body.append(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand("copy"); } catch { /* ignore */ }
            ta.remove();
            return ok;
        }
    }
    $$(".code").forEach((block) => {
        const btn = Object.assign(document.createElement("button"), { type: "button", className: "copy", textContent: "copy" });
        btn.setAttribute("aria-label", "Copy to clipboard");
        btn.addEventListener("click", async () => {
            const ok = await copyText($("code", block).textContent);
            btn.textContent = ok ? "copied" : "press ctrl+c";
            btn.classList.toggle("done", ok);
            setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("done"); }, 1600);
        });
        block.append(btn);
    });

    // --- .env builder (setup guide) ----------------------------------------------------------
    const form = $("#env-form");
    if (form) {
        const f = {
            url: $("#f-url"), port: $("#f-port"), proxy: $("#f-proxy"), priv: $("#f-private"),
            mail: $("#f-mail"), smtp: $("#f-smtp"), smtpPort: $("#f-smtp-port"), from: $("#f-from"),
        };
        const clean = (v) => String(v || "").trim().replace(/[\s"'`$\\]/g, "");
        const port = () => { const n = parseInt(f.port.value, 10); return n >= 1 && n <= 65535 ? n : 8000; };
        const appUrl = () => {
            let u = clean(f.url.value).replace(/\/+$/, "");
            if (u && !/^https?:\/\//i.test(u)) u = "http://" + u;
            return u || `http://localhost:${port()}`;
        };

        function render() {
            const url = appUrl();
            const lines = [
                "# WAYL settings",
                `APP_URL=${url}`,
                `WAYL_PORT=${port()}`,
                `TRUST_PROXY_HOPS=${f.proxy.checked ? 1 : 0}`,
                `ALLOW_PRIVATE_SERVER_URLS=${f.priv.checked ? 1 : 0}`,
            ];
            $("#mail-fields").hidden = !f.mail.checked;
            if (f.mail.checked) {
                const from = clean(f.from.value) || "you@example.com";
                lines.push("", "# password-reset email",
                    `MAIL_SERVER=${clean(f.smtp.value)}`, `MAIL_PORT=${parseInt(f.smtpPort.value, 10) || 587}`,
                    "MAIL_USE_TLS=1", `MAIL_USERNAME=${from}`, "MAIL_PASSWORD=", `MAIL_FROM=${from}`);
            }
            $("#env-out").textContent = lines.join("\n");

            let msg = "";
            if (/\/\/(localhost|127\.0\.0\.1)\b/.test(url)) msg = "Only this machine can open localhost. Use the server's network IP or your domain so your phone can reach it.";
            else if (f.proxy.checked && url.startsWith("http://")) msg = "Behind a reverse proxy with HTTPS, start the address with https://.";
            const warn = $("#url-warn");
            warn.hidden = !msg;
            warn.textContent = msg;

            $("#health-cmd").textContent = `curl http://localhost:${port()}/healthz`;
            $("#nd-env").textContent = `ND_LISTENBRAINZ_BASEURL=${url}/listenbrainz/1/`;
            const open = $("#open-link");
            open.href = url;
            open.textContent = url;
        }
        f.url.addEventListener("input", () => {
            const m = clean(f.url.value).match(/:(\d{2,5})(?:\/|$)/);
            if (m) f.port.value = m[1];
        });
        form.addEventListener("input", render);
        form.addEventListener("change", render);
        form.addEventListener("submit", (e) => e.preventDefault());
        render();
    }

    // --- tabs (ARIA pattern, arrow keys) ----------------------------------------------------
    $$("[data-tabs]").forEach((wrap) => {
        const tabs = $$('[role="tab"]', wrap);
        const select = (tab, focus) => {
            tabs.forEach((t) => {
                const on = t === tab;
                t.setAttribute("aria-selected", String(on));
                t.tabIndex = on ? 0 : -1;
                document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
            });
            if (focus) tab.focus();
        };
        tabs.forEach((tab, i) => {
            tab.addEventListener("click", () => select(tab));
            tab.addEventListener("keydown", (e) => {
                const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
                if (n === undefined) return;
                e.preventDefault();
                select(tabs[(n + tabs.length) % tabs.length], true);
            });
        });
    });

    // --- guide: highlight the step you're reading --------------------------------------------
    const toc = $(".toc");
    if (toc && "IntersectionObserver" in window) {
        const links = new Map($$("a", toc).map((a) => [a.hash.slice(1), a]));
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                links.forEach((a) => a.classList.remove("active"));
                const a = links.get(entry.target.id);
                if (!a) return;
                a.classList.add("active");
                // on phones the index is a horizontal strip: keep the active step in view
                if (toc.scrollWidth > toc.clientWidth) {
                    toc.scrollTo({ left: a.offsetLeft - 24, behavior: reduceMotion() ? "auto" : "smooth" });
                }
            });
        }, { rootMargin: "-35% 0px -55% 0px" });
        links.forEach((_, id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    }
})();
