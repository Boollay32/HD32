// =============================  RFCPage.js  ============================= //
// The change-request (RFC) queue, on the shared QueueView engine. Server scopes
// the list by the caller, so this is purely the RFC configuration: fetch,
// columns, saved-views, and open-behaviour (→ RFCDetails).

// -------------------------  Presentation helpers  ------------------------- //

const RQ_PRIORITY_COLOR = { Urgent: '#C0392B', High: '#A25A06', Normal: '#5F5A52', Low: '#8E897F' };
const RQ_PRIORITY_ORDER = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
const RQ_STATUS_COLOR = {
    Submitted:     ['#1E51C0', '#E8EFFD'],
    'In Progress': ['#A25A06', '#FAEFDB'],
    'On Hold':     ['#5F5A52', '#E6E3DC'],
    Approved:      ['#0E6E80', '#E1EFEA'],
    Completed:     ['#1F7A43', '#E4F2E8'],
    Rejected:      ['#B23121', '#FAE7E4'],
};
const RQ_DONE = ['Completed', 'Rejected', 'Closed', 'Cancelled'];
const RQ_AV_PALETTE = ['#15695A', '#1E51C0', '#A25A06', '#6D28C9', '#B23121', '#0E6E80'];

const RQesc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const RQinitials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const RQavColor = n => { let h = 0; for (const c of (n || '')) h = c.charCodeAt(0) + ((h << 5) - h); return RQ_AV_PALETTE[Math.abs(h) % RQ_AV_PALETTE.length]; };
const RQisOpen = r => !RQ_DONE.includes(r.status);
const RQstatusColor = s => RQ_STATUS_COLOR[s] || ['#5F5A52', '#E6E3DC'];
const RQdate = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

// -------------------------  Page  ------------------------- //

class RFCPage extends PageBase {
    constructor() {
        super('RFC');
        this.queue = null;
    }

    async init() {
        if (!await this.checkAuth()) return;
        if (typeof SetActivePage === 'function') SetActivePage('RFCMenu');

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
        const data = await API.post('ChangeRequest/GetChangeRequests', API.authPayload({ filters: {} }));
        return Array.isArray(data) ? data : [];
    }

    _open(row) {
        sessionStorage.setItem(STORAGE_KEYS.RFC_ID, row.rfcID);
        this.navigateToRFCDetails();
    }

    _config() {
        const me = this.username;   // compared to assignedTech for the "My open" view
        return {
            title: 'Change Requests',
            fetch: () => this._fetch(),
            rowKey: r => r.rfcID,
            search: ['title', 'createdBy', 'rfcID'],

            views: [
                { id: 'mine',  label: 'My open',     filter: r => r.assignedTech === me && RQisOpen(r) },
                { id: 'unass', label: 'Unassigned',  filter: r => !r.assignedTech && RQisOpen(r) },
                { id: 'all',   label: 'All open',    filter: r => RQisOpen(r) },
            ],

            filters: [
                { id: 'prio', label: 'Priority', field: 'priority' },
                { id: 'stat', label: 'Status',   field: 'status' },
                { id: 'asg',  label: 'Assignee', field: 'assignedTech' },
            ],

            columns: [
                {
                    key: 'title', label: 'Change request', sortable: true,
                    sortValue: r => (r.title || '').toLowerCase(),
                    render: r => `<div class="qv-subj"><div><div class="s1">${RQesc(r.title)}</div><div class="s2"><span class="qv-ref">#${r.rfcID}</span> · ${RQesc(r.createdBy)}</div></div></div>`
                },
                {
                    key: 'priority', label: 'Priority', sortable: true,
                    sortValue: r => RQ_PRIORITY_ORDER[r.priority] ?? 9,
                    render: r => `<span class="qv-prio"><span class="qv-led" style="background:${RQ_PRIORITY_COLOR[r.priority] || '#999'}"></span>${RQesc(r.priority)}</span>`
                },
                {
                    key: 'status', label: 'Status',
                    render: r => { const c = RQstatusColor(r.status); return `<span class="qv-status" style="color:${c[0]};background:${c[1]}">${RQesc(r.status)}</span>`; }
                },
                {
                    key: 'assignedTech', label: 'Assignee',
                    render: r => r.assignedTech
                        ? `<span class="qv-assignee"><span class="qv-av" style="background:${RQavColor(r.assignedTech)}">${RQinitials(r.assignedTech)}</span>${RQesc(r.assignedTech.split(' ')[0])}</span>`
                        : '<span class="qv-unassigned">Unassigned</span>'
                },
                {
                    key: 'targetDate', label: 'Target', sortable: true,
                    sortValue: r => new Date(r.targetDate).getTime() || Infinity,
                    render: r => `<span class="qv-updated">${RQdate(r.targetDate)}</span>`
                },
            ],

            defaultSort: { key: 'targetDate', dir: 1 },

            previewHeader: r => `<div class="qv-pv-tid">#${r.rfcID}</div><div class="qv-pv-title">${RQesc(r.title)}</div>
                <div class="qv-pv-meta"><span class="qv-prio"><span class="qv-led" style="background:${RQ_PRIORITY_COLOR[r.priority] || '#999'}"></span>${RQesc(r.priority)}</span></div>`,
            preview: r => {
                const c = RQstatusColor(r.status);
                return `<h3 class="qv-pv-h">Raised by</h3>
                    <div style="font-size:12.5px;line-height:1.9;margin-bottom:6px">${RQesc(r.createdBy)}</div>
                    <h3 class="qv-pv-h">At a glance</h3>
                    <div style="font-size:12.5px;line-height:1.9">
                      <div>Status&nbsp; <span class="qv-status" style="color:${c[0]};background:${c[1]}">${RQesc(r.status)}</span></div>
                      <div>Assignee&nbsp; ${r.assignedTech ? RQesc(r.assignedTech) : '<span class="qv-unassigned">Unassigned</span>'}</div>
                      <div>Target&nbsp; ${RQdate(r.targetDate)}</div>
                    </div>`;
            },
            onOpen: r => this._open(r),
        };
    }
}

// -------------------------  Init  ------------------------- //

const rfcPage = new RFCPage();
document.addEventListener('DOMContentLoaded', () => rfcPage.init());
if (typeof window !== 'undefined') window.rfcPage = rfcPage;
