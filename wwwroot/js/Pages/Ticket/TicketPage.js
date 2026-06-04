// =============================  TicketPage.js  ============================= //
// The ticket queue. All list behaviour lives in QueueView; this file is just
// the Tickets configuration: how to fetch, which columns/views, and what
// happens when a row is opened.

// -------------------------  Presentation helpers  ------------------------- //

const TQ_PRIORITY_COLOR = { Urgent: 'var(--pri-urgent)', High: 'var(--pri-high)', Normal: 'var(--pri-normal)', Low: 'var(--pri-low)' };
const TQ_PRIORITY_ORDER = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
const TQ_STATUS_COLOR = {
    Open:      ['var(--info-fg)', 'var(--info-bg)'],
    Pending:   ['var(--warn-fg)', 'var(--warn-bg)'],
    'On Hold': ['var(--neutral-fg)', 'var(--neutral-bg)'],
    Closed:    ['var(--ok-fg)', 'var(--ok-bg)'],
    Solved:    ['var(--ok-fg)', 'var(--ok-bg)'],
};
const TQ_AV_PALETTE = ['#5A6470', '#1E51C0', '#A25A06', '#6D28C9', '#B23121', '#0E6E80'];

const TQesc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TQinitials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const TQavColor = n => { let h = 0; for (const c of (n || '')) h = c.charCodeAt(0) + ((h << 5) - h); return TQ_AV_PALETTE[Math.abs(h) % TQ_AV_PALETTE.length]; };
const TQisOpen = r => !['Closed', 'Solved'].includes(r.status);
const TQago = iso => {
    if (!iso) return '—';
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (isNaN(m)) return '—';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

// -------------------------  Page  ------------------------- //

class TicketPage extends PageBase {
    constructor() {
        super('Ticket');
        this.queue = null;
    }

    async init() {
        if (!await this.checkAuth()) return;
        if (typeof SetActivePage === 'function') SetActivePage('TicketMenu');

        try {
            await this.waitForElement('queue-mount');
        } catch {
            this.handleError('Page elements failed to load.');
            return;
        }

        this.queue = new QueueView('#queue-mount', this._config());
        await this.queue.load();
    }

    // ---- Data: fetch the full permitted set; saved-views slice it client-side ----
    async _fetch() {
        const data = await API.post('Ticket/GetTickets', API.authPayload({
            myTicket: 0,          // 0 = all the user may see; "My open" is a client-side view
            filters: {}
        }));
        return Array.isArray(data) ? data : [];
    }

    // ---- Open a ticket: reuse the existing session + navigation flow ----
    _open(row) {
        this.saveTicketId(row.ticketID);
        this.navigateToTicketDetails();
    }

    // ---- Config consumed by QueueView ----
    _config() {
        const me = this.username;   // compared to assignedTech for the "My open" view
        return {
            title: 'Tickets',
            fetch: () => this._fetch(),
            rowKey: r => r.ticketID,
            search: ['subject', 'userName', 'ticketID'],

            views: [
                { id: 'mine',  label: 'My open',     filter: r => r.assignedTech === me && TQisOpen(r) },
                { id: 'unass', label: 'Unassigned',  filter: r => !r.assignedTech && TQisOpen(r) },
                { id: 'reply', label: 'Needs reply', filter: r => r.notify && TQisOpen(r) },
                { id: 'all',   label: 'All open',     filter: r => TQisOpen(r) },
            ],

            filters: [
                { id: 'type', label: 'Type',     field: 'requestType' },
                { id: 'prio', label: 'Priority', field: 'priority' },
                { id: 'stat', label: 'Status',   field: 'status' },
                { id: 'asg',  label: 'Assignee', field: 'assignedTech' },
            ],

            columns: [
                {
                    key: 'subject', label: 'Ticket', sortable: true,
                    sortValue: r => (r.subject || '').toLowerCase(),
                    render: r => `<div class="qv-subj">${r.notify ? '<span class="qv-unread" title="Awaiting reply"></span>' : ''}<div><div class="s1">${TQesc(r.subject)}</div><div class="s2"><span class="qv-ref">#${r.ticketID}</span> · ${TQesc(r.userName)}</div></div></div>`
                },
                {
                    key: 'requestType', label: 'Type',
                    render: r => `<span class="qv-badge">${TQesc(r.requestType)}</span>`
                },
                {
                    key: 'priority', label: 'Priority', sortable: true,
                    sortValue: r => TQ_PRIORITY_ORDER[r.priority] ?? 9,
                    render: r => `<span class="qv-prio"><span class="qv-led" style="background:${TQ_PRIORITY_COLOR[r.priority] || 'var(--pri-normal)'}"></span>${TQesc(r.priority)}</span>`
                },
                {
                    key: 'status', label: 'Status',
                    render: r => {
                        const c = TQ_STATUS_COLOR[r.status] || ['var(--neutral-fg)', 'var(--neutral-bg)'];
                        return `<span class="qv-status" style="color:${c[0]};background:${c[1]}">${TQesc(r.status)}</span>`;
                    }
                },
                {
                    key: 'assignedTech', label: 'Assignee',
                    render: r => r.assignedTech
                        ? `<span class="qv-assignee"><span class="qv-av" style="background:${TQavColor(r.assignedTech)}">${TQinitials(r.assignedTech)}</span>${TQesc(r.assignedTech.split(' ')[0])}</span>`
                        : '<span class="qv-unassigned">Unassigned</span>'
                },
                {
                    key: 'updated', label: 'Updated', sortable: true,
                    sortValue: r => new Date(r.updated).getTime() || 0,
                    render: r => `<span class="qv-updated">${TQago(r.updated)}</span>`
                },
            ],

            defaultSort: { key: 'updated', dir: -1 },
            bulk: [
                {
                    id: 'status', label: 'Set status',
                    options: ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'],
                    apply: async (value, rows) => {
                        const code = { Open: 1, 'In Progress': 2, Pending: 3, Resolved: 4, Closed: 5 }[value];
                        await API.post('Ticket/BulkUpdate', API.authPayload({
                            ids: rows.map(r => r.ticketID), field: 'status', value: code
                        }));
                    }
                },
            ],

            previewHeader: r => `<div class="qv-pv-tid">#${r.ticketID}</div><div class="qv-pv-title">${TQesc(r.subject)}</div>
                <div class="qv-pv-meta"><span class="qv-badge">${TQesc(r.requestType)}</span>
                <span class="qv-prio"><span class="qv-led" style="background:${TQ_PRIORITY_COLOR[r.priority] || 'var(--pri-normal)'}"></span>${TQesc(r.priority)}</span></div>`,
            preview: r => `<h3 class="qv-pv-h">Requester</h3>
                <div class="qv-assignee" style="margin-bottom:14px"><span class="qv-av" style="background:${TQavColor(r.userName)};width:28px;height:28px;font-size:10px">${TQinitials(r.userName)}</span><div><div style="font-weight:600;font-size:13px">${TQesc(r.userName)}</div><div style="font-size:11.5px;color:var(--muted, #6A655C)">${TQesc(r.authority)} · updated ${TQago(r.updated)}</div></div></div>
                <h3 class="qv-pv-h">At a glance</h3>
                <div style="font-size:12.5px;line-height:1.9"><div>Status&nbsp; ${TQesc(r.status)}</div><div>Assignee&nbsp; ${r.assignedTech ? TQesc(r.assignedTech) : '<span class="qv-unassigned">Unassigned</span>'}</div></div>`,
            onOpen: r => this._open(r),
        };
    }
}

// -------------------------  Init  ------------------------- //

const ticketPage = new TicketPage();
document.addEventListener('DOMContentLoaded', () => ticketPage.init());
if (typeof window !== 'undefined') window.ticketPage = ticketPage;
