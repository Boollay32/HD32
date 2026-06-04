#!/usr/bin/env python3
# =============================================================================
#  HD32 — Light/Dark theming + bulk status actions for the Queue pages
# =============================================================================
#  Rebrands the queue UI to white / grey / orange / black, adds a dark mode
#  with a toggle, and enables bulk "Set status" on the Tickets and Tasks queues.
#
#  What it changes (all surgical + idempotent — safe to re-run):
#    1. wwwroot/css/Addons/Queue.css      -> appends a CSS variable theme layer
#                                            (light + dark) + toggle + bulk-bar
#                                            styling.
#    2. The four *Page.js queue configs   -> status/priority colour maps now
#                                            reference CSS variables so the pills
#                                            recolour live on theme switch.
#                                            (RFCPage title also relabelled "RFC".)
#    3. TicketPage.js / TasksPage.js       -> add a `bulk` config (Set status)
#                                            that calls a dedicated, field-scoped
#                                            BulkUpdate endpoint. SEE THE NOTE BELOW.
#    4. wwwroot/js/Core/Theme.js           -> new: persists choice, respects OS
#                                            preference, injects the toggle.
#    5. The four queue *Page.cshtml        -> include Theme.js.
#
#  *** BULK REQUIRES A SMALL SERVER ENDPOINT ***
#  The bulk action posts {ids, field, value} to Ticket/BulkUpdate (or
#  Task/BulkUpdate). That endpoint does NOT exist yet — implement it per the
#  accompanying spec (hd32_bulkupdate_endpoint.md). It must whitelist `field`
#  to {status, assignedTech} and re-apply per-record auth scoping. Do NOT route
#  bulk through SaveTicket/SaveTask: those are full-object saves driven by the
#  detail form and would blank unrelated fields across every selected record.
#  Until the endpoint exists, a bulk apply fails gracefully (the engine catches
#  and reloads — no data is touched).
#
#  Run from the repo root:  python3 hd32_theme_bulk_apply.py
# =============================================================================
import os, re, sys, io

MARKER = "/* HD32-THEME-LAYER v1 */"

# ----------------------------------------------------------------------------- #
#  1. Theme layer appended to Queue.css
# ----------------------------------------------------------------------------- #
THEME_CSS = MARKER + r"""
/* =============================================================================
   Theme layer: white / grey / orange / black, light + dark.
   Every queue surface colour routes through a variable; [data-theme] flips them.
   ============================================================================= */
:root, html[data-theme="light"]{
  --bg:#F3F3F1; --panel:#FFFFFF; --text:#1A1A19; --muted:#6B6B66;
  --border:#E4E3DF; --row-border:#EDECE8; --row-hover:#FAFAF8;
  --header-bg:#ECEBE7; --scrim:rgba(26,26,25,.28);
  --accent:#E8722A; --accent-strong:#C85F1E; --accent-soft:#FBE7D6; --on-accent:#FFFFFF;
  --badge-fg:#5A554D; --badge-bg:#F0EEE9;
  --info-fg:#1E51C0; --info-bg:#E8EFFD;
  --warn-fg:#9A4D0C; --warn-bg:#FBE7D2;
  --ok-fg:#1F7A43;   --ok-bg:#E4F2E8;
  --bad-fg:#B23121;  --bad-bg:#FAE7E4;
  --neutral-fg:#5F5A52; --neutral-bg:#E9E7E2;
  --pri-urgent:#C0392B; --pri-high:#C85F1E; --pri-normal:#6B6B66; --pri-low:#9A958C;
}
html[data-theme="dark"]{
  /* inspired by GitHub "Dim": softer than pure black, layered surfaces
     (page dark, cards lifted lighter so rows stand out), high-contrast text */
  --bg:#1C2128; --panel:#2D333B; --text:#DBE2EA; --muted:#909DAB;
  --border:#444C56; --row-border:#373E47; --row-hover:#323941;
  --header-bg:#22272E; --scrim:rgba(1,4,9,.6);
  --accent:#F0843A; --accent-strong:#FF9A55; --accent-soft:#3A2C1C; --on-accent:#1C2128;
  --badge-fg:#ADBAC7; --badge-bg:#373E47;
  --info-fg:#6CB6FF; --info-bg:#143049;
  --warn-fg:#F0A868; --warn-bg:#3A2A14;
  --ok-fg:#6BC46D;   --ok-bg:#14331E;
  --bad-fg:#FF938A;  --bad-bg:#3D211E;
  --neutral-fg:#ADBAC7; --neutral-bg:#373E47;
  --pri-urgent:#FF938A; --pri-high:#F0A868; --pri-normal:#ADBAC7; --pri-low:#768390;
}

/* re-point the queue's surfaces at the variables (later source order wins) */
.qv{ background:var(--bg); color:var(--text); }
.qv-table tbody td, .qv-title, .qv-prio, .qv-assignee, .qv-vc{ color:var(--text); }
.qv-search{ background:var(--panel); border-color:var(--border); }
.qv-search:focus-within{ border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); }
.qv-search svg, .qv-count, .qv-vl, .qv-filt label, .qv-subj .s2,
.qv-updated, .qv-pv-h, .qv-pv-tid, .qv-pv-close{ color:var(--muted); }
.qv-search-input, .qv-filt select, .qv-subj .s1{ color:var(--text); }
.qv-view, .qv-filt{ background:var(--panel); border-color:var(--border); }
.qv-view:hover{ border-color:var(--accent); }
.qv-view[aria-pressed="true"]{ background:var(--accent); border-color:var(--accent); }
.qv-view[aria-pressed="true"] .qv-vc, .qv-view[aria-pressed="true"] .qv-vl{ color:var(--on-accent); }
.qv-view.warn .qv-vc{ color:var(--bad-fg); }
.qv-view[aria-pressed="true"].warn .qv-vc{ color:var(--on-accent); }
.qv-table tbody tr{ background:var(--panel); }
.qv-table tbody td{ border-top-color:var(--row-border); border-bottom-color:var(--row-border); }
.qv-table tbody tr:hover td{ background:var(--row-hover); }
.qv-table tbody tr[aria-selected="true"] td{ background:var(--accent-soft); }
.qv-table tbody tr:focus-visible{ outline-color:var(--accent); }
.qv-empty td{ color:var(--muted); background:var(--panel); }
.qv-badge{ color:var(--badge-fg); background:var(--badge-bg); }
.qv-unread{ background:var(--info-fg); }
.qv-unassigned{ color:var(--accent-strong); }
.qv-overlay{ background:var(--scrim); }
.qv-preview{ background:var(--panel); color:var(--text); }
.qv-pv-head, .qv-pv-foot{ border-color:var(--border); }
.qv-pv-close:hover{ background:var(--row-hover); color:var(--text); }
.qv-pv-title{ color:var(--text); }
.qv-pv-open{ background:var(--accent); color:var(--on-accent); }
.qv-pv-open:hover{ background:var(--accent-strong); }
.qv-rowcb, .qv-select-all{ accent-color:var(--accent); }

/* bulk bar (enabled on Tickets + Tasks) */
.qv-bulkbar{ background:var(--accent-soft); border-top-color:var(--border); border-bottom-color:var(--border); }
.qv-bulk-n{ color:var(--accent-strong); }
.qv-bulk-act{ background:var(--panel); border-color:var(--border); color:var(--text); }
.qv-bulk-act select{ color:var(--text); }
.qv-bulk-clear{ color:var(--accent-strong); }
.qv-table thead th.qv-sortable button{ color:var(--muted); }
.qv-table thead th[aria-sort="ascending"] button,
.qv-table thead th[aria-sort="descending"] button{ color:var(--text); }

/* sticky-header hardening: header band stays put, rows pass cleanly under it */
.qv-table-wrap{ padding-top:0; }
.qv-table thead th{
  position:sticky; top:0; z-index:30;
  background:var(--header-bg); color:var(--muted);
  border-bottom-color:var(--border); box-shadow:0 1px 0 var(--border);
}
.qv-table thead th:first-child{ border-radius:0; }
.qv-table tbody tr{ position:relative; z-index:1; }
.qv-table tbody tr:first-child td{ border-top:none; }

/* light/dark toggle (injected into .qv-topbar by Theme.js) */
.qv-theme{ display:inline-flex; align-items:center; gap:8px; margin-left:14px;
  color:var(--muted); font-size:12px; font-weight:600; }
.qv-theme .qv-sw{ position:relative; width:48px; height:26px; border-radius:20px;
  border:1px solid var(--border); background:var(--row-hover); cursor:pointer;
  transition:.18s ease; flex-shrink:0; padding:0; }
.qv-theme .qv-knob{ position:absolute; top:2px; left:2px; width:20px; height:20px;
  border-radius:50%; background:var(--accent); display:grid; place-items:center;
  transition:.18s cubic-bezier(.4,0,.2,1); }
html[data-theme="dark"] .qv-theme .qv-knob{ transform:translateX(22px); }
.qv-theme .qv-knob svg{ width:12px; height:12px; color:var(--on-accent); }
"""

# ----------------------------------------------------------------------------- #
#  2. Colour-map edits applied to the queue configs (idempotent string swaps)
# ----------------------------------------------------------------------------- #
JS_REPL = {
 "wwwroot/js/Pages/Ticket/TicketPage.js": [
  ("const TQ_PRIORITY_COLOR = { Urgent: '#C0392B', High: '#A25A06', Normal: '#5F5A52', Low: '#8E897F' };",
   "const TQ_PRIORITY_COLOR = { Urgent: 'var(--pri-urgent)', High: 'var(--pri-high)', Normal: 'var(--pri-normal)', Low: 'var(--pri-low)' };"),
  ("""const TQ_STATUS_COLOR = {
    Open:      ['#1E51C0', '#E8EFFD'],
    Pending:   ['#A25A06', '#FAEFDB'],
    'On Hold': ['#5F5A52', '#E6E3DC'],
    Closed:    ['#1F7A43', '#E4F2E8'],
    Solved:    ['#1F7A43', '#E4F2E8'],
};""",
   """const TQ_STATUS_COLOR = {
    Open:      ['var(--info-fg)', 'var(--info-bg)'],
    Pending:   ['var(--warn-fg)', 'var(--warn-bg)'],
    'On Hold': ['var(--neutral-fg)', 'var(--neutral-bg)'],
    Closed:    ['var(--ok-fg)', 'var(--ok-bg)'],
    Solved:    ['var(--ok-fg)', 'var(--ok-bg)'],
};"""),
  ("const c = TQ_STATUS_COLOR[r.status] || ['#5F5A52', '#E6E3DC'];",
   "const c = TQ_STATUS_COLOR[r.status] || ['var(--neutral-fg)', 'var(--neutral-bg)'];"),
  ("|| '#999'", "|| 'var(--pri-normal)'"),
  ("'#15695A', '#1E51C0'", "'#5A6470', '#1E51C0'"),
 ],
 "wwwroot/js/Pages/Tasks/TasksPage.js": [
  ("""const KQ_STATUS_COLOR = {
    'New':         ['#1E51C0', '#E8EFFD'],
    'In Progress': ['#A25A06', '#FAEFDB'],
    'Complete':    ['#1F7A43', '#E4F2E8'],
    'Withdrawn':   ['#B23121', '#FAE7E4'],
    'Draft':       ['#5F5A52', '#E6E3DC'],
};""",
   """const KQ_STATUS_COLOR = {
    'New':         ['var(--info-fg)', 'var(--info-bg)'],
    'In Progress': ['var(--warn-fg)', 'var(--warn-bg)'],
    'Complete':    ['var(--ok-fg)', 'var(--ok-bg)'],
    'Withdrawn':   ['var(--bad-fg)', 'var(--bad-bg)'],
    'Draft':       ['var(--neutral-fg)', 'var(--neutral-bg)'],
};"""),
  ("const KQstatusColor = label => KQ_STATUS_COLOR[label] || ['#5F5A52', '#E6E3DC'];",
   "const KQstatusColor = label => KQ_STATUS_COLOR[label] || ['var(--neutral-fg)', 'var(--neutral-bg)'];"),
  ("color:#A25A06", "color:var(--accent)"),
  ("'#15695A', '#1E51C0'", "'#5A6470', '#1E51C0'"),
 ],
 "wwwroot/js/Pages/RFC/RFCPage.js": [
  ("title: 'Change Requests'", "title: 'RFC'"),
  ("const RQ_PRIORITY_COLOR = { Urgent: '#C0392B', High: '#A25A06', Normal: '#5F5A52', Low: '#8E897F' };",
   "const RQ_PRIORITY_COLOR = { Urgent: 'var(--pri-urgent)', High: 'var(--pri-high)', Normal: 'var(--pri-normal)', Low: 'var(--pri-low)' };"),
  ("""const RQ_STATUS_COLOR = {
    Submitted:     ['#1E51C0', '#E8EFFD'],
    'In Progress': ['#A25A06', '#FAEFDB'],
    'On Hold':     ['#5F5A52', '#E6E3DC'],
    Approved:      ['#0E6E80', '#E1EFEA'],
    Completed:     ['#1F7A43', '#E4F2E8'],
    Rejected:      ['#B23121', '#FAE7E4'],
};""",
   """const RQ_STATUS_COLOR = {
    Submitted:     ['var(--info-fg)', 'var(--info-bg)'],
    'In Progress': ['var(--warn-fg)', 'var(--warn-bg)'],
    'On Hold':     ['var(--neutral-fg)', 'var(--neutral-bg)'],
    Approved:      ['var(--ok-fg)', 'var(--ok-bg)'],
    Completed:     ['var(--ok-fg)', 'var(--ok-bg)'],
    Rejected:      ['var(--bad-fg)', 'var(--bad-bg)'],
};"""),
  ("const RQstatusColor = s => RQ_STATUS_COLOR[s] || ['#5F5A52', '#E6E3DC'];",
   "const RQstatusColor = s => RQ_STATUS_COLOR[s] || ['var(--neutral-fg)', 'var(--neutral-bg)'];"),
  ("|| '#999'", "|| 'var(--pri-normal)'"),
  ("'#15695A', '#1E51C0'", "'#5A6470', '#1E51C0'"),
 ],
 "wwwroot/js/Pages/User/UserPage.js": [
  ("if (l === 99) return { label: 'Deactivated', color: '#5F5A52', bg: '#E6E3DC' };",
   "if (l === 99) return { label: 'Deactivated', color: 'var(--neutral-fg)', bg: 'var(--neutral-bg)' };"),
  ("if (l) return { label: 'Locked', color: '#B23121', bg: '#FAE7E4' };",
   "if (l) return { label: 'Locked', color: 'var(--bad-fg)', bg: 'var(--bad-bg)' };"),
  ("return { label: 'Active', color: '#1F7A43', bg: '#E4F2E8' };",
   "return { label: 'Active', color: 'var(--ok-fg)', bg: 'var(--ok-bg)' };"),
  ("'#15695A', '#1E51C0'", "'#5A6470', '#1E51C0'"),
 ],
}

# ----------------------------------------------------------------------------- #
#  3. New file: wwwroot/js/Core/Theme.js
# ----------------------------------------------------------------------------- #
THEME_JS = r"""// =============================  Theme.js  ============================= //
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
"""

# ----------------------------------------------------------------------------- #
#  4. Queue page views that should include Theme.js
# ----------------------------------------------------------------------------- #
CSHTML = [
    "Views/Page/Ticket/TicketPage.cshtml",
    "Views/Page/Tasks/TasksPage.cshtml",
    "Views/Page/RFC/RFCPage.cshtml",
    "Views/Page/User/UserPage.cshtml",
]
THEME_SCRIPT_TAG = '<script src="~/js/Core/Theme.js" asp-append-version="true"></script>'

# ----------------------------------------------------------------------------- #
#  5. Bulk "Set status" config, inserted into the Ticket and Task page configs.
#     Anchored after `defaultSort: …`. apply() posts {ids, field, value} to a
#     dedicated, field-scoped BulkUpdate endpoint (see hd32_bulkupdate_endpoint.md).
#     The engine reloads the queue after apply(), so the table reflects the change.
# ----------------------------------------------------------------------------- #
BULK = {
 "wwwroot/js/Pages/Ticket/TicketPage.js": (
   "defaultSort: { key: 'updated', dir: -1 },",
   """
            bulk: [
                {
                    id: 'status', label: 'Set status',
                    options: ['Open', 'Pending', 'On Hold', 'Closed', 'Solved'],
                    apply: async (value, rows) => {
                        await API.post('Ticket/BulkUpdate', API.authPayload({
                            ids: rows.map(r => r.ticketID), field: 'status', value
                        }));
                    }
                },
            ],"""
 ),
 "wwwroot/js/Pages/Tasks/TasksPage.js": (
   "defaultSort: { key: 'requiredDate', dir: 1 },",
   """
            bulk: [
                {
                    id: 'status', label: 'Set status',
                    options: ['New', 'In Progress', 'Complete', 'Withdrawn', 'Draft'],
                    apply: async (value, rows) => {
                        const code = { New: 1, 'In Progress': 2, Complete: 3, Withdrawn: 4, Draft: 5 }[value];
                        await API.post('Task/BulkUpdate', API.authPayload({
                            ids: rows.map(r => r.taskID), field: 'status', value: code
                        }));
                    }
                },
            ],"""
 ),
}

# ----------------------------------------------------------------------------- #
#  helpers
# ----------------------------------------------------------------------------- #
def read(p):  return io.open(p, encoding="utf-8-sig").read()
def write(p, s):
    with io.open(p, "w", encoding="utf-8", newline="") as f: f.write(s)

def main():
    if not (os.path.isdir("wwwroot") and os.path.isdir("Views")):
        sys.exit("Run this from the HD32 repo root (the folder containing wwwroot/ and Views/).")

    changed, skipped = [], []

    # 1. Queue.css theme layer
    css_path = "wwwroot/css/Addons/Queue.css"
    css = read(css_path)
    if MARKER in css:
        skipped.append(css_path + " (theme layer already present)")
    else:
        write(css_path, css.rstrip() + "\n\n" + THEME_CSS)
        changed.append(css_path)

    # 2. JS colour-map swaps
    for path, repls in JS_REPL.items():
        if not os.path.exists(path):
            skipped.append(path + " (missing — skipped)"); continue
        src = read(path); orig = src; applied = 0
        for old, new in repls:
            if old in src:
                src = src.replace(old, new); applied += 1
        if src != orig:
            write(path, src); changed.append("%s (%d edit(s))" % (path, applied))
        else:
            skipped.append(path + " (already themed)")

    # 2b. bulk "Set status" config on Tickets + Tasks
    for path, (anchor, block) in BULK.items():
        if not os.path.exists(path):
            skipped.append(path + " (missing — no bulk)"); continue
        src = read(path)
        if "BulkUpdate" in src:
            skipped.append(path + " (bulk already present)"); continue
        if anchor not in src:
            skipped.append(path + " (no defaultSort anchor — add bulk manually)"); continue
        write(path, src.replace(anchor, anchor + block, 1))
        changed.append(path + " (bulk Set status)")

    # 3. Theme.js
    theme_path = "wwwroot/js/Core/Theme.js"
    if os.path.exists(theme_path) and read(theme_path).strip() == THEME_JS.strip():
        skipped.append(theme_path + " (up to date)")
    else:
        os.makedirs(os.path.dirname(theme_path), exist_ok=True)
        write(theme_path, THEME_JS); changed.append(theme_path)

    # 4. include Theme.js in each queue view (after the page-script, inside AddJSToBody)
    for path in CSHTML:
        if not os.path.exists(path):
            skipped.append(path + " (missing — skipped)"); continue
        s = read(path)
        if "js/Core/Theme.js" in s:
            skipped.append(path + " (Theme.js already included)"); continue
        new_s, n = re.subn(r"(@section\s+AddJSToBody\s*\{[^}]*?</script>)",
                           r"\1\n    " + THEME_SCRIPT_TAG,
                           s, count=1, flags=re.S)
        if n:
            write(path, new_s); changed.append(path)
        else:
            skipped.append(path + " (no AddJSToBody/script anchor — add Theme.js manually)")

    print("Changed:")
    for c in changed: print("   +", c)
    print("Skipped / already done:")
    for s in skipped: print("   -", s)
    print("\nDone. Rebuild/refresh: queue pages get light/dark (toggle in the top bar)")
    print("and bulk 'Set status' on Tickets + Tasks. Bulk needs the BulkUpdate endpoint")
    print("(see hd32_bulkupdate_endpoint.md) — until then a bulk apply safely no-ops.")

if __name__ == "__main__":
    main()
