// =============================  Theme.js  ============================= //
// Light/dark theming for the queue pages. Sets data-theme on <html>, persists
// the choice, respects the OS preference on first visit, and injects a toggle
// into the QueueView top bar. Status/priority pills recolour live because their
// inline colours are CSS variables.

const Theme = {
    KEY: 'hd32-theme',
    SUN:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    MOON: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',

    _get() { try { return localStorage.getItem(this.KEY); } catch (e) { return null; } },
    _set(t) { try { localStorage.setItem(this.KEY, t); } catch (e) {} },

    initial() {
        const saved = this._get();
        if (saved === 'light' || saved === 'dark') return saved;
        try { return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; }
        catch (e) { return 'light'; }
    },

    apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        this._set(t);
        document.querySelectorAll('.qv-knob').forEach(k => { k.innerHTML = (t === 'dark') ? this.MOON : this.SUN; });
        document.querySelectorAll('.qv-sw').forEach(s => s.setAttribute('aria-checked', String(t === 'dark')));
        document.querySelectorAll('.qv-theme-lbl').forEach(l => { l.textContent = (t === 'dark') ? 'Dark' : 'Light'; });
    },

    toggle() {
        this.apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    },

    mount() {
        const bar = document.querySelector('.qv-topbar');
        if (!bar || bar.querySelector('.qv-theme')) return !!bar;   // done (or nothing to mount into)
        const wrap = document.createElement('label');
        wrap.className = 'qv-theme';
        wrap.innerHTML = '<span class="qv-theme-lbl"></span>' +
            '<button type="button" class="qv-sw" role="switch" aria-label="Toggle dark mode"><span class="qv-knob"></span></button>';
        bar.appendChild(wrap);
        wrap.querySelector('.qv-sw').addEventListener('click', () => Theme.toggle());
        this.apply(document.documentElement.getAttribute('data-theme') || this.initial());
        return true;
    },

    boot() {
        this.apply(this.initial());                 // set the theme as early as possible
        let tries = 0;                              // QueueView builds the top bar asynchronously
        const timer = setInterval(() => { if (this.mount() && document.querySelector('.qv-theme')) clearInterval(timer); if (++tries > 60) clearInterval(timer); }, 50);
    }
};

document.addEventListener('DOMContentLoaded', () => Theme.boot());
if (typeof window !== 'undefined') window.Theme = Theme;
