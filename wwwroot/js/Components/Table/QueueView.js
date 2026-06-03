// =============================  QueueView.js  ============================= //
// Reusable, data-agnostic list/queue. Each page supplies a config object;
// the engine renders saved-view chips, filters, search, sortable columns,
// selection + bulk bar, a slide-in preview, and keyboard grid navigation.
//
// config = {
//   title,                                  // header label
//   fetch:   async () => [ row, ... ],       // returns the row array
//   rowKey:  row => string,                  // stable unique id per row
//   search:  [ 'fieldA', 'fieldB' ],         // row fields matched by the search box
//   views:   [ { id, label, warn?, filter: row => bool } ],
//   filters: [ { id, label, field, options? } ], // options auto-derived from data if omitted
//   columns: [ { key, label, sortable?, render: row => html, sortValue?: row => any } ],
//   defaultSort: { key, dir },               // dir: 1 asc, -1 desc
//   preview: row => html,                    // optional drawer body
//   onOpen:  row => void,                    // row click / "open full"
//   bulk:    [ { id, label, options, apply: async (value, rows) => void } ], // optional
// }

class QueueView {
    constructor(mount, config) {
        this.root = typeof mount === 'string' ? document.querySelector(mount) : mount;
        this.cfg = config;
        this.rows = [];
        this.current = [];
        this.view = config.views?.[0]?.id ?? null;
        this.sortKey = config.defaultSort?.key ?? null;
        this.sortDir = config.defaultSort?.dir ?? 1;
        this.selected = new Set();
        this.focusIdx = 0;
        this.search = '';
        this.filterValues = {};
        this._lastFocused = null;
    }

    // -------------------------  Lifecycle  ------------------------- //

    async load() {
        this._scaffold();
        this._renderLoading();
        try {
            const data = await this.cfg.fetch();
            this.rows = Array.isArray(data) ? data : [];
            this.render();
        } catch (err) {
            console.error('QueueView.load:', err);
            this._renderError();
        }
    }

    setRows(rows) { this.rows = rows ?? []; this.render(); }

    // -------------------------  Scaffold (static chrome, built once)  ------------------------- //

    _scaffold() {
        const c = this.cfg;
        this.root.classList.add('qv');
        this.root.innerHTML = `
          <header class="qv-topbar">
            <h1 class="qv-title">${this._esc(c.title ?? 'List')}</h1>
            <div class="qv-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input type="search" class="qv-search-input" placeholder="Search…" aria-label="Search ${this._esc(c.title ?? '')}">
            </div>
            <div class="qv-spacer"></div>
            <span class="qv-count" aria-live="polite"></span>
          </header>
          ${c.views?.length ? `<div class="qv-views" role="group" aria-label="Saved views"></div>` : ''}
          ${c.filters?.length ? `<div class="qv-filters"></div>` : ''}
          ${c.bulk?.length ? `<div class="qv-bulkbar" role="region" aria-label="Bulk actions" hidden></div>` : ''}
          <div class="qv-table-wrap">
            <table class="qv-table"><thead></thead><tbody tabindex="-1"></tbody></table>
          </div>
          <div class="qv-overlay" hidden></div>
          <aside class="qv-preview" aria-label="Preview" aria-hidden="true" hidden></aside>`;

        this.$ = {
            search:   this.root.querySelector('.qv-search-input'),
            count:    this.root.querySelector('.qv-count'),
            views:    this.root.querySelector('.qv-views'),
            filters:  this.root.querySelector('.qv-filters'),
            bulkbar:  this.root.querySelector('.qv-bulkbar'),
            thead:    this.root.querySelector('thead'),
            tbody:    this.root.querySelector('tbody'),
            overlay:  this.root.querySelector('.qv-overlay'),
            preview:  this.root.querySelector('.qv-preview'),
        };

        this._buildHead();
        this._buildViews();
        this._bindStaticEvents();
    }

    _buildHead() {
        const cells = this.cfg.columns.map(col => {
            if (col.sortable) {
                return `<th data-key="${col.key}" aria-sort="none" class="qv-sortable">
                          <button type="button">${this._esc(col.label)}<span class="qv-arw">▲</span></button>
                        </th>`;
            }
            return `<th>${this._esc(col.label)}</th>`;
        }).join('');
        const sel = this.cfg.bulk?.length
            ? `<th class="qv-cell-select"><input type="checkbox" class="qv-select-all" aria-label="Select all"></th>` : '';
        this.$.thead.innerHTML = `<tr>${sel}${cells}</tr>`;
    }

    _buildViews() {
        if (!this.$.views) return;
        this.$.views.innerHTML = this.cfg.views.map(v => `
            <button type="button" class="qv-view${v.warn ? ' warn' : ''}" data-view="${v.id}"
                    aria-pressed="${v.id === this.view}">
              <span class="qv-vc" data-count="${v.id}">0</span>
              <span class="qv-vl">${this._esc(v.label)}</span>
            </button>`).join('');
    }

    // -------------------------  Events  ------------------------- //

    _bindStaticEvents() {
        this.$.search?.addEventListener('input', e => { this.search = e.target.value.trim().toLowerCase(); this.render(); });

        this.$.views?.addEventListener('click', e => {
            const btn = e.target.closest('.qv-view'); if (!btn) return;
            this.view = btn.dataset.view;
            this.$.views.querySelectorAll('.qv-view').forEach(b =>
                b.setAttribute('aria-pressed', String(b.dataset.view === this.view)));
            this.selected.clear(); this.render();
        });

        this.$.thead.addEventListener('click', e => {
            const th = e.target.closest('th.qv-sortable'); if (!th) return;
            const key = th.dataset.key;
            if (this.sortKey === key) this.sortDir *= -1; else { this.sortKey = key; this.sortDir = 1; }
            this.render();
        });

        const selectAll = this.$.thead.querySelector('.qv-select-all');
        selectAll?.addEventListener('change', e => {
            this.current.forEach(r => e.target.checked ? this.selected.add(this.cfg.rowKey(r)) : this.selected.delete(this.cfg.rowKey(r)));
            this.render();
        });

        this.$.tbody.addEventListener('click', e => {
            if (e.target.closest('.qv-cell-select')) return;       // checkbox handled below
            const tr = e.target.closest('tr[data-id]'); if (!tr) return;
            this._open(tr.dataset.id);
        });
        this.$.tbody.addEventListener('change', e => {
            const cb = e.target.closest('.qv-rowcb'); if (!cb) return;
            const id = cb.closest('tr').dataset.id;
            cb.checked ? this.selected.add(id) : this.selected.delete(id);
            this._syncSelection();
        });
        this.$.tbody.addEventListener('keydown', e => this._onKeyNav(e));

        this.$.overlay?.addEventListener('click', () => this._closePreview());
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this._closePreview(); });

        if (this.$.filters) this._buildFilters();
        if (this.$.bulkbar) this._buildBulkBar();
    }

    // -------------------------  Filters (options auto-derived from data)  ------------------------- //

    _buildFilters() {
        this.$.filters.innerHTML = this.cfg.filters.map(f => `
            <span class="qv-filt">
              <label for="qv-f-${f.id}">${this._esc(f.label)}</label>
              <select id="qv-f-${f.id}" data-filter="${f.id}"><option value="">All</option></select>
            </span>`).join('');
        this.$.filters.addEventListener('change', e => {
            const sel = e.target.closest('select[data-filter]'); if (!sel) return;
            this.filterValues[sel.dataset.filter] = sel.value; this.render();
        });
    }

    _refreshFilterOptions() {
        for (const f of this.cfg.filters ?? []) {
            const sel = this.$.filters.querySelector(`select[data-filter="${f.id}"]`);
            if (!sel) continue;
            const opts = f.options ?? [...new Set(this.rows.map(r => r[f.field]).filter(Boolean))].sort();
            const cur = this.filterValues[f.id] ?? '';
            sel.innerHTML = `<option value="">All</option>` +
                opts.map(o => `<option value="${this._esc(o)}"${o === cur ? ' selected' : ''}>${this._esc(o)}</option>`).join('');
        }
    }

    // -------------------------  Bulk bar  ------------------------- //

    _buildBulkBar() {
        this.$.bulkbar.innerHTML = `
            <span class="qv-bulk-n">0 selected</span>
            ${this.cfg.bulk.map(b => `
              <span class="qv-bulk-act">${this._esc(b.label)} ▾
                <select data-bulk="${b.id}"><option value="">…</option>
                  ${b.options.map(o => `<option value="${this._esc(o)}">${this._esc(o)}</option>`).join('')}
                </select>
              </span>`).join('')}
            <button type="button" class="qv-bulk-clear">Clear</button>`;
        this.$.bulkbar.addEventListener('change', async e => {
            const sel = e.target.closest('select[data-bulk]'); if (!sel || !sel.value) return;
            const action = this.cfg.bulk.find(b => b.id === sel.dataset.bulk);
            const chosen = this.rows.filter(r => this.selected.has(String(this.cfg.rowKey(r))));
            const value = sel.value; sel.value = '';
            try { await action.apply(value, chosen); } catch (err) { console.error('bulk apply:', err); }
            this.load();   // refetch so the table reflects persisted changes
        });
        this.$.bulkbar.querySelector('.qv-bulk-clear').addEventListener('click', () => { this.selected.clear(); this.render(); });
    }

    // -------------------------  Render  ------------------------- //

    render() {
        const c = this.cfg;
        const viewDef = c.views?.find(v => v.id === this.view);
        let list = this.rows.slice();
        if (viewDef?.filter) list = list.filter(viewDef.filter);

        for (const f of c.filters ?? []) {
            const val = this.filterValues[f.id];
            if (val) list = list.filter(r => String(r[f.field] ?? '') === val);
        }
        if (this.search) {
            list = list.filter(r => (c.search ?? []).some(k =>
                String(r[k] ?? '').toLowerCase().includes(this.search)));
        }
        if (this.sortKey) {
            const col = c.columns.find(x => x.key === this.sortKey);
            const val = col?.sortValue ?? (r => r[this.sortKey]);
            const d = this.sortDir;
            list.sort((a, b) => { const x = val(a), y = val(b); return x < y ? -d : x > y ? d : 0; });
        }
        this.current = list;

        // view counts
        if (this.$.views) for (const v of c.views) {
            const n = v.filter ? this.rows.filter(v.filter).length : this.rows.length;
            const el = this.$.views.querySelector(`[data-count="${v.id}"]`); if (el) el.textContent = n;
        }
        if (this.$.filters) this._refreshFilterOptions();

        // rows
        const colCount = c.columns.length + (c.bulk?.length ? 1 : 0);
        if (!list.length) {
            this.$.tbody.innerHTML = `<tr class="qv-empty"><td colspan="${colCount}">No matches. Try a different view or clear the filters.</td></tr>`;
        } else {
            this.$.tbody.innerHTML = list.map((r, i) => this._rowHTML(r, i)).join('');
        }

        // sort indicators
        this.$.thead.querySelectorAll('th.qv-sortable').forEach(th =>
            th.setAttribute('aria-sort', th.dataset.key === this.sortKey ? (this.sortDir > 0 ? 'ascending' : 'descending') : 'none'));

        if (this.$.count) this.$.count.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;
        if (this.focusIdx >= list.length) this.focusIdx = Math.max(0, list.length - 1);
        this._syncSelection();
    }

    _rowHTML(r, i) {
        const c = this.cfg;
        const id = String(c.rowKey(r));
        const sel = this.selected.has(id);
        const cb = c.bulk?.length ? `
            <td class="qv-cell-select">
              <input type="checkbox" class="qv-rowcb" ${sel ? 'checked' : ''} aria-label="Select row">
            </td>` : '';
        const cells = c.columns.map(col => `<td>${col.render(r)}</td>`).join('');
        return `<tr data-id="${this._esc(id)}" data-i="${i}" tabindex="${i === this.focusIdx ? 0 : -1}" aria-selected="${sel}">${cb}${cells}</tr>`;
    }

    // -------------------------  Selection  ------------------------- //

    _syncSelection() {
        if (!this.cfg.bulk?.length) return;
        const all = this.current.length && this.current.every(r => this.selected.has(String(this.cfg.rowKey(r))));
        const some = this.current.some(r => this.selected.has(String(this.cfg.rowKey(r))));
        const sa = this.$.thead.querySelector('.qv-select-all');
        if (sa) { sa.checked = all; sa.indeterminate = !all && some; }
        const n = this.selected.size;
        if (this.$.bulkbar) {
            this.$.bulkbar.hidden = n === 0;
            const lbl = this.$.bulkbar.querySelector('.qv-bulk-n'); if (lbl) lbl.textContent = `${n} selected`;
        }
    }

    // -------------------------  Keyboard grid nav  ------------------------- //

    _onKeyNav(e) {
        const rows = [...this.$.tbody.querySelectorAll('tr[data-i]')];
        if (!rows.length) return;
        const cur = rows.findIndex(r => r === document.activeElement || r.contains(document.activeElement));
        const focus = i => { this.focusIdx = Math.max(0, Math.min(i, rows.length - 1)); rows.forEach((r, idx) => r.tabIndex = idx === this.focusIdx ? 0 : -1); rows[this.focusIdx].focus(); };
        const at = cur < 0 ? this.focusIdx : cur;
        switch (e.key) {
            case 'ArrowDown': case 'j': e.preventDefault(); focus(at + 1); break;
            case 'ArrowUp':   case 'k': e.preventDefault(); focus(at - 1); break;
            case 'Home': e.preventDefault(); focus(0); break;
            case 'End':  e.preventDefault(); focus(rows.length - 1); break;
            case 'Enter': e.preventDefault(); this._open(rows[at].dataset.id); break;
            case ' ': {
                if (!this.cfg.bulk?.length) return;
                e.preventDefault(); const id = rows[at].dataset.id;
                this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id);
                this.render(); focus(at); break;
            }
        }
    }

    // -------------------------  Preview drawer  ------------------------- //

    _open(id) {
        const row = this.rows.find(r => String(this.cfg.rowKey(r)) === String(id));
        if (!row) return;
        if (this.cfg.preview) this._openPreview(row);
        else if (this.cfg.onOpen) this.cfg.onOpen(row);
    }

    _openPreview(row) {
        this._lastFocused = document.activeElement;
        this.$.preview.innerHTML = `
            <div class="qv-pv-head">
              <button type="button" class="qv-pv-close" aria-label="Close">✕</button>
              ${this.cfg.previewHeader ? this.cfg.previewHeader(row) : ''}
            </div>
            <div class="qv-pv-body">${this.cfg.preview(row)}</div>
            <div class="qv-pv-foot">
              <button type="button" class="qv-pv-open">Open full</button>
            </div>`;
        this.$.preview.hidden = false; this.$.overlay.hidden = false;
        requestAnimationFrame(() => { this.$.preview.classList.add('open'); this.$.overlay.classList.add('open'); });
        this.$.preview.setAttribute('aria-hidden', 'false');
        this.$.preview.querySelector('.qv-pv-close').addEventListener('click', () => this._closePreview());
        this.$.preview.querySelector('.qv-pv-open').addEventListener('click', () => this.cfg.onOpen?.(row));
        this.$.preview.querySelector('.qv-pv-open').focus();
    }

    _closePreview() {
        if (!this.$?.preview || this.$.preview.hidden) return;
        this.$.preview.classList.remove('open'); this.$.overlay.classList.remove('open');
        this.$.preview.setAttribute('aria-hidden', 'true');
        setTimeout(() => { this.$.preview.hidden = true; this.$.overlay.hidden = true; }, 280);
        this._lastFocused?.focus?.();
    }

    // -------------------------  States / utils  ------------------------- //

    _renderLoading() { this.$.tbody.innerHTML = `<tr class="qv-empty"><td colspan="99">Loading…</td></tr>`; }
    _renderError()   { this.$.tbody.innerHTML = `<tr class="qv-empty"><td colspan="99">Couldn't load. Please try again.</td></tr>`; }
    _esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
}

if (typeof window !== 'undefined') window.QueueView = QueueView;
