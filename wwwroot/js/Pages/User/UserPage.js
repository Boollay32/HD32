// =============================  UserPage.js  ============================= //
// The users list, on the shared QueueView engine. Read-only navigation:
// opening a row goes to UserDetails (where editing happens, behind the
// server-side Govtech-admin guard). Authority scoping is enforced server-side,
// so this config simply renders whatever GetUsers returns for the caller.

// -------------------------  Presentation helpers  ------------------------- //

const UQ_ROLE_LABELS = { '0': 'Authority', '1': 'Govtech', '2': 'Admin', '4': 'RFC only' };
const UQ_AV_PALETTE = ['#15695A', '#1E51C0', '#A25A06', '#6D28C9', '#B23121', '#0E6E80'];

const UQesc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const UQinitials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const UQavColor = n => { let h = 0; for (const c of (n || '')) h = c.charCodeAt(0) + ((h << 5) - h); return UQ_AV_PALETTE[Math.abs(h) % UQ_AV_PALETTE.length]; };
const UQrole = v => UQ_ROLE_LABELS[String(v ?? '').trim()] ?? (v || '—');
// locked: 0/empty = active, 99 = deactivated, anything else = locked
const UQstatus = r => {
    const l = r.locked;
    if (l === 99) return { label: 'Deactivated', color: '#5F5A52', bg: '#E6E3DC' };
    if (l) return { label: 'Locked', color: '#B23121', bg: '#FAE7E4' };
    return { label: 'Active', color: '#1F7A43', bg: '#E4F2E8' };
};
const UQdate = iso => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

// -------------------------  Page  ------------------------- //

class UserPage extends PageBase {
    constructor() {
        super('User');
        this.queue = null;
    }

    async init() {
        if (!await this.checkAuth()) return;
        if (typeof SetActivePage === 'function') SetActivePage('UserMenu');

        try {
            await this.waitForElement('queue-mount');
        } catch {
            this.handleError('Page elements failed to load.');
            return;
        }

        this.queue = new QueueView('#queue-mount', this._config());
        await this.queue.load();
    }

    async _fetch() {
        const data = await API.post('User/GetUsers', API.authPayload({ filters: {} }));
        return Array.isArray(data) ? data : [];
    }

    _open(row) {
        sessionStorage.setItem(STORAGE_KEYS.USER_ID, row.userID);
        this.navigateToUserDetails();
    }

    _config() {
        return {
            title: 'Users',
            fetch: () => this._fetch(),
            rowKey: r => r.userID,
            search: ['userName', 'email', 'authority'],

            views: [
                { id: 'all',    label: 'All',     filter: () => true },
                { id: 'active', label: 'Active',  filter: r => !r.locked },
                { id: 'locked', label: 'Locked',  warn: true, filter: r => !!r.locked && r.locked !== 99 },
            ],

            filters: [
                { id: 'auth', label: 'Authority', field: 'authority' },
                { id: 'role', label: 'Role',      field: 'adminLevel' },
            ],

            columns: [
                {
                    key: 'userName', label: 'Name', sortable: true,
                    sortValue: r => (r.userName || '').toLowerCase(),
                    render: r => `<div class="qv-assignee"><span class="qv-av" style="background:${UQavColor(r.userName)}">${UQinitials(r.userName)}</span><div><div class="s1">${UQesc(r.userName)}</div>${r.email ? `<div class="s2">${UQesc(r.email)}</div>` : ''}</div></div>`
                },
                {
                    key: 'authority', label: 'Authority', sortable: true,
                    sortValue: r => (r.authority || '').toLowerCase(),
                    render: r => `<span class="qv-badge">${UQesc(r.authority)}</span>`
                },
                {
                    key: 'adminLevel', label: 'Role',
                    render: r => `<span class="qv-prio">${UQesc(UQrole(r.adminLevel))}</span>`
                },
                {
                    key: 'lastLoginDate', label: 'Last login', sortable: true,
                    sortValue: r => new Date(r.lastLoginDate).getTime() || 0,
                    render: r => `<span class="qv-updated">${UQdate(r.lastLoginDate)}</span>`
                },
                {
                    key: 'locked', label: 'Status',
                    render: r => { const s = UQstatus(r); return `<span class="qv-status" style="color:${s.color};background:${s.bg}">${s.label}</span>`; }
                },
            ],

            defaultSort: { key: 'userName', dir: 1 },

            previewHeader: r => `<div class="qv-pv-tid">${UQesc(r.authority)}</div><div class="qv-pv-title">${UQesc(r.userName)}</div>
                <div class="qv-pv-meta"><span class="qv-badge">${UQesc(UQrole(r.adminLevel))}</span></div>`,
            preview: r => {
                const s = UQstatus(r);
                return `<h3 class="qv-pv-h">Contact</h3>
                    <div style="font-size:12.5px;line-height:1.9">
                      <div>Email&nbsp; ${r.email ? UQesc(r.email) : '—'}</div>
                      <div>Phone&nbsp; ${r.phone ? UQesc(r.phone) : '—'}</div>
                    </div>
                    <h3 class="qv-pv-h">Account</h3>
                    <div style="font-size:12.5px;line-height:1.9">
                      <div>Status&nbsp; <span class="qv-status" style="color:${s.color};background:${s.bg}">${s.label}</span></div>
                      <div>Last login&nbsp; ${UQdate(r.lastLoginDate)}</div>
                    </div>`;
            },
            onOpen: r => this._open(r),
        };
    }
}

// -------------------------  Init  ------------------------- //

const userPage = new UserPage();
document.addEventListener('DOMContentLoaded', () => userPage.init());
if (typeof window !== 'undefined') window.userPage = userPage;
