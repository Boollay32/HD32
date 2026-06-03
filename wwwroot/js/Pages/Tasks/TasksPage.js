// =============================  TasksPage.js  ============================= //
// The "all tasks" queue, on the shared QueueView engine. There is no separate
// task detail screen: opening a task lands on its parent ticket, on the Tasks
// tab, so tasks always live in the context of their ticket.

// -------------------------  Presentation helpers  ------------------------- //

// Status legend matches the editor dropdown: 1 New, 2 In Progress, 3 Complete,
// 4 Withdrawn, 5 Draft. "Open" work is New or In Progress.
const KQ_STATUS = { 1: 'New', 2: 'In Progress', 3: 'Complete', 4: 'Withdrawn', 5: 'Draft' };
const KQ_STATUS_COLOR = {
    'New':         ['#1E51C0', '#E8EFFD'],
    'In Progress': ['#A25A06', '#FAEFDB'],
    'Complete':    ['#1F7A43', '#E4F2E8'],
    'Withdrawn':   ['#B23121', '#FAE7E4'],
    'Draft':       ['#5F5A52', '#E6E3DC'],
};
const KQ_OPEN = new Set([1, 2]);
const KQ_AV_PALETTE = ['#15695A', '#1E51C0', '#A25A06', '#6D28C9', '#B23121', '#0E6E80'];

const KQesc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KQinitials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const KQavColor = n => { let h = 0; for (const c of (n || '')) h = c.charCodeAt(0) + ((h << 5) - h); return KQ_AV_PALETTE[Math.abs(h) % KQ_AV_PALETTE.length]; };
const KQlabel = s => KQ_STATUS[s] ?? 'Other';
const KQstatusColor = label => KQ_STATUS_COLOR[label] || ['#5F5A52', '#E6E3DC'];
const KQisOpen = r => KQ_OPEN.has(r.status);
const KQdate = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

// -------------------------  Page  ------------------------- //

class TaskPage extends PageBase {
    constructor() {
        super('Task');
        this.queue = null;
    }

    async init() {
        if (!await this.checkAuth()) return;
        if (typeof SetActivePage === 'function') SetActivePage('TaskMenu');

        try {
            await this.waitForElement('queue-mount');
        } catch {
            this.handleError('Page elements failed to load.');
            return;
        }

        this.queue = new QueueView('#queue-mount', this._config());
        // "My Tasks" vs "View Tasks": the nav sets MY_TICKETS to pick the default view.
        this.queue.view = sessionStorage.getItem(STORAGE_KEYS.MY_TICKETS) === '1' ? 'mine' : 'all';
        await this.queue.load();
    }

    async _fetch() {
        const data = await API.post('Task/GetTasks', API.authPayload({ filters: {} }));
        const rows = Array.isArray(data) ? data : [];
        rows.forEach(r => { r._status = KQlabel(r.status); });   // friendly label for column + filter
        return rows;
    }

    // No task detail screen — open the task inside its parent ticket's Tasks tab.
    _open(task) {
        if (task.ticketID) {
            this.saveTicketId(task.ticketID);
            this.saveTaskId(task.taskID);
            sessionStorage.setItem(STORAGE_KEYS.TD_ACTIVE_TAB, 'tasks');
            this.navigateToTicketDetails();
        } else {
            // Orphan task with no ticket — fall back to the standalone editor.
            this.saveTaskId(task.taskID);
            window.location.href = '/Page/TaskDetails';
        }
    }

    _config() {
        const me = this.username;   // compared to assignedTech for the "My open" view
        return {
            title: 'Tasks',
            fetch: () => this._fetch(),
            rowKey: r => r.taskID,
            search: ['title', 'assignedTech', 'taskID', 'ticketID'],

            views: [
                { id: 'mine',  label: 'My open',     filter: r => r.assignedTech === me && KQisOpen(r) },
                { id: 'unass', label: 'Unassigned',  filter: r => !r.assignedTech && KQisOpen(r) },
                { id: 'imp',   label: 'Important',   warn: true, filter: r => r.important && KQisOpen(r) },
                { id: 'all',   label: 'All open',    filter: r => KQisOpen(r) },
            ],

            filters: [
                { id: 'stat', label: 'Status',   field: '_status' },
                { id: 'asg',  label: 'Assignee', field: 'assignedTech' },
            ],

            columns: [
                {
                    key: 'title', label: 'Task', sortable: true,
                    sortValue: r => (r.title || '').toLowerCase(),
                    render: r => `<div class="qv-subj">${r.important ? '<span title="Important" style="color:#A25A06">\u2605</span>' : ''}<div><div class="s1">${KQesc(r.title)}</div><div class="s2"><span class="qv-ref">#${r.taskID}</span></div></div></div>`
                },
                {
                    key: 'ticketID', label: 'Ticket', sortable: true,
                    sortValue: r => r.ticketID ?? 0,
                    render: r => r.ticketID ? `<span class="qv-badge qv-ref">#${r.ticketID}</span>` : '<span class="qv-unassigned">—</span>'
                },
                {
                    key: 'assignedTech', label: 'Assignee',
                    render: r => r.assignedTech
                        ? `<span class="qv-assignee"><span class="qv-av" style="background:${KQavColor(r.assignedTech)}">${KQinitials(r.assignedTech)}</span>${KQesc(r.assignedTech.split(' ')[0])}</span>`
                        : '<span class="qv-unassigned">Unassigned</span>'
                },
                {
                    key: '_status', label: 'Status',
                    render: r => { const c = KQstatusColor(r._status); return `<span class="qv-status" style="color:${c[0]};background:${c[1]}">${KQesc(r._status)}</span>`; }
                },
                {
                    key: 'requiredDate', label: 'Required by', sortable: true,
                    sortValue: r => new Date(r.requiredDate).getTime() || Infinity,
                    render: r => `<span class="qv-updated">${KQdate(r.requiredDate)}</span>`
                },
            ],

            defaultSort: { key: 'requiredDate', dir: 1 },

            previewHeader: r => `<div class="qv-pv-tid">#${r.taskID}${r.ticketID ? ` · Ticket #${r.ticketID}` : ''}</div><div class="qv-pv-title">${KQesc(r.title)}</div>
                <div class="qv-pv-meta"><span class="qv-status" style="color:${KQstatusColor(r._status)[0]};background:${KQstatusColor(r._status)[1]}">${KQesc(r._status)}</span></div>`,
            preview: r => `<h3 class="qv-pv-h">Detail</h3>
                <div style="font-size:12.5px;line-height:1.6;margin-bottom:10px">${KQesc(r.description) || '—'}</div>
                <h3 class="qv-pv-h">At a glance</h3>
                <div style="font-size:12.5px;line-height:1.9">
                  <div>Assignee&nbsp; ${r.assignedTech ? KQesc(r.assignedTech) : '<span class="qv-unassigned">Unassigned</span>'}</div>
                  <div>Required by&nbsp; ${KQdate(r.requiredDate)}</div>
                  <div>Parent&nbsp; ${r.ticketID ? `Ticket #${r.ticketID}` : '—'}</div>
                </div>`,
            onOpen: r => this._open(r),
        };
    }
}

// -------------------------  Init  ------------------------- //

const taskPage = new TaskPage();
document.addEventListener('DOMContentLoaded', () => taskPage.init());
if (typeof window !== 'undefined') window.taskPage = taskPage;
