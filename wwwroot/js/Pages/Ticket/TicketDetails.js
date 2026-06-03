// =====================  TicketDetails.js  ===================== //

'use strict';

// -------------------------  Constants  ------------------------- //

const INTERNAL_REQUEST_TYPES = [4, 8, 10, 11, 14];

const TDLAYOUT = {
    BOTH: 'both',
    LEFT_ONLY: 'left-only',
    RIGHT_ONLY: 'right-only',
};

const TAB = {
    NOTES: 'notes',
    TASKS: 'tasks',
    DETAILS: 'details',
    ACTIVITY: 'activity',
};

// -------------------------  Session  ------------------------- //

const Session = {
    get adminLevel() { return parseInt(sessionStorage.getItem(STORAGE_KEYS.ADMIN) ?? '0', 10); },
    get userId() { return sessionStorage.getItem(STORAGE_KEYS.USER_ID); },
    get ticketId() { return sessionStorage.getItem(STORAGE_KEYS.TICKET_ID); },
    get requestTypeId() { return parseInt(sessionStorage.getItem(STORAGE_KEYS.REQUEST_TYPE) ?? '0', 10); },
    get token() { return sessionStorage.getItem(STORAGE_KEYS.TOKEN); },
    get isAdmin() { return Session.adminLevel >= 1; },
    get isInternal() { return INTERNAL_REQUEST_TYPES.includes(Session.requestTypeId); },
};

// -------------------------  State  ------------------------- //

const State = {
    layout: TDLAYOUT.BOTH,
    activeTab: TAB.NOTES,
    collapsed: { left: false, right: false },
    ticketData: null,
    isDirty: false,
};

// -------------------------  DOM refs  ------------------------- //

const Dom = {
    app: () => document.getElementById('TicketDetails-App'),
    shell: () => document.getElementById('TD-Shell'),
    saveBtn: () => document.getElementById('Save-Button'),
    backBtn: () => document.getElementById('Back-Button'),
    falseReplyBtn: () => document.getElementById('FalseReply'),

    // Topbar
    ticketId: () => document.getElementById('TicketID'),
    subject: () => document.getElementById('subject'),
    metaStatus: () => document.getElementById('meta-status'),
    metaPriority: () => document.getElementById('meta-priority'),
    metaSla: () => document.getElementById('meta-sla'),

    // Panes
    paneLeft: () => document.getElementById('pane-left'),
    paneRight: () => document.getElementById('pane-right'),
    collapseLeft: () => document.getElementById('collapse-left'),
    collapseRight: () => document.getElementById('collapse-right'),
    railLeft: () => document.getElementById('rail-left'),
    railRight: () => document.getElementById('rail-right'),
    railLeftPip: () => document.getElementById('rail-left-pip'),

    // Tabs
    tabs: () => document.querySelectorAll('[role="tab"]'),
    tabPanels: () => document.querySelectorAll('[role="tabpanel"]'),
    tab: (name) => document.getElementById(`tab-${name}`),
    panel: (name) => document.getElementById(`tabpanel-${name}`),

    // Messages
    thread: () => document.getElementById('Messages-Thread'),
    msgTextarea: () => document.getElementById('msg-textarea'),
    msgSendBtn: () => document.getElementById('msg-send-btn'),
    msgCharcount: () => document.getElementById('msg-charcount'),
    msgUnreadBadge: () => document.getElementById('msg-unread-badge'),

    // Notes
    noteThread: () => document.getElementById('Notes-Thread'),
    noteTextarea: () => document.getElementById('note-textarea'),
    noteSendBtn: () => document.getElementById('note-send-btn'),
    noteCharcount: () => document.getElementById('note-charcount'),
    noteVisBtn: () => document.getElementById('note-visibility-btn'),
};

// -------------------------  Layout init  ------------------------- //

const PaneLayout = {

    resolve() {
        const { isAdmin, isInternal } = Session;

        if (!isAdmin) {
            // Client — messages only
            return TDLAYOUT.LEFT_ONLY;
        }

        if (isInternal) {
            // Tech/Admin + internal ticket — workspace only
            return TDLAYOUT.RIGHT_ONLY;
        }

        // Tech/Admin + external ticket — both panes
        return TDLAYOUT.BOTH;
    },

    apply(layout) {
        State.layout = layout;
        const shell = Dom.shell();
        if (!shell) return;

        shell.dataset.layout = layout;

        // Default active tab based on layout
        if (layout === TDLAYOUT.RIGHT_ONLY) {
            PaneLayout._defaultTab(TAB.NOTES);
        } else if (layout === TDLAYOUT.LEFT_ONLY) {
            // No tabs visible — hide workspace entirely
            const paneRight = Dom.paneRight();
            if (paneRight) paneRight.setAttribute('hidden', '');
        } else {
            PaneLayout._defaultTab(TAB.NOTES);
        }
    },

    _defaultTab(tabName) {
        Tabs.activate(tabName);
    },

    init() {
        const layout = PaneLayout.resolve();
        PaneLayout.apply(layout);
    },
};

// -------------------------  Boot  ------------------------- //

document.addEventListener('DOMContentLoaded', () => {
    PaneLayout.init();
    Events.bind();
    NotifyBanner.check();
    TicketDetails.load();
});

// -------------------------  Topbar helpers  ------------------------- //

const Topbar = {

    statusClass(statusId) {
        const map = {
            1: 'status-open',
            2: 'status-pending',
            3: 'status-resolved',
            4: 'status-closed',
        };
        return map[statusId] ?? 'status-open';
    },

    statusLabel(statusId) {
        const map = {
            1: 'Open',
            2: 'Pending',
            3: 'Resolved',
            4: 'Closed',
        };
        return map[statusId] ?? 'Unknown';
    },

    priorityClass(priorityId) {
        const map = {
            1: 'priority-low',
            2: 'priority-medium',
            3: 'priority-high',
        };
        return map[priorityId] ?? 'priority-low';
    },

    priorityLabel(priorityId) {
        const map = {
            1: 'Low',
            2: 'Medium',
            3: 'High',
        };
        return map[priorityId] ?? 'Low';
    },

    slaClass(slaDate) {
        if (!slaDate) return '';
        const now = new Date();
        const due = new Date(slaDate);
        const diff = (due - now) / 1000 / 60 / 60; // hours remaining

        if (diff < 0) return 'sla-breach';
        if (diff < 4) return 'sla-warning';
        return 'sla-ok';
    },

    slaLabel(slaDate) {
        if (!slaDate) return '';
        const now = new Date();
        const due = new Date(slaDate);
        const diff = Math.round((due - now) / 1000 / 60 / 60);

        if (diff < 0) return `Breached ${Math.abs(diff)}h ago`;
        if (diff < 24) return `${diff}h remaining`;
        return `${Math.round(diff / 24)}d remaining`;
    },

    renderPill(el, cssClass, label, led = true) {
        if (!el) return;
        el.className = `td-meta-pill ${cssClass}`;
        el.innerHTML = led
            ? `<span class="td-led" aria-hidden="true"></span>${label}`
            : label;
    },

    populate(data) {
        // Ticket ID
        const tidEl = Dom.ticketId();
        if (tidEl) tidEl.textContent = `#${data.TicketID}`;

        // Subject
        const subEl = Dom.subject();
        if (subEl) subEl.textContent = data.Subject ?? '';

        // Status pill
        Topbar.renderPill(
            Dom.metaStatus(),
            Topbar.statusClass(data.StatusID),
            Topbar.statusLabel(data.StatusID),
        );

        // Priority pill
        Topbar.renderPill(
            Dom.metaPriority(),
            Topbar.priorityClass(data.PriorityID),
            Topbar.priorityLabel(data.PriorityID),
            false,
        );

        // SLA pill — only show if SLA date exists
        if (data.SLADate) {
            Topbar.renderPill(
                Dom.metaSla(),
                Topbar.slaClass(data.SLADate),
                Topbar.slaLabel(data.SLADate),
                false,
            );
        }

        // Page title
        document.title = `#${data.TicketID} — ${data.Subject ?? 'Ticket'}`;
    },
};

// -------------------------  Details population  ------------------------- //

const Fields = {

    populate(data) {
        // People
        Fields._setText('raisedby', data.RaisedBy);
        Fields._setText('authority', data.Authority);
        Fields._setText('requesttype', data.RequestType);

        // Dates
        Fields._setText('created', Fields._formatDate(data.CreatedDate));
        Fields._setText('closed', Fields._formatDate(data.ClosedDate));

        // Target date input
        const targetEl = document.getElementById('targetdate');
        if (targetEl && data.TargetDate) {
            targetEl.value = data.TargetDate.split('T')[0];
        }

        // Selects — populated by existing helpers
        // assignedtech, category, subcategory, priority
        // these are already handled by existing JS — no change needed
    },

    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '—';
    },

    _formatDate(raw) {
        if (!raw) return '—';
        const d = new Date(raw);
        if (isNaN(d)) return '—';
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    },
};

// -------------------------  Ticket loader  ------------------------- //

const TicketDetails = {

    async load() {
        console.log('TicketDetails init firing');

        const ticketId = Session.ticketId;
        if (!ticketId) {
            console.warn('TicketDetails: no ticket ID in session');
            return;
        }

        try {
            const data = await TicketDetails._fetch(ticketId);
            console.log('ticket data:', data); 

            if (!data) return;

            State.ticketData = data;

            // Store request type for layout decisions
            sessionStorage.setItem(
                STORAGE_KEYS.REQUEST_TYPE,
                data.RequestTypeID ?? 0,
            );

            // Re-resolve layout now we have request type
            PaneLayout.init();

            // Populate UI
            Topbar.populate(data);
            Fields.populate(data);

            // Delegate to existing module calls
            TicketDetails._delegateModules(data);

        } catch (err) {
            console.error('TicketDetails.load:', err);
            UI.toast?.('Failed to load ticket', 'error');
        }
    },

    async _fetch(ticketId) {
        const data = await API.post(
            'TicketDetails/GetTicketDetail',
            API.authPayload({ ticketId: parseInt(ticketId, 10) })
        );

        if (!data) throw new Error('GetTicketDetail returned null');
        return data;
    },

    _delegateModules(data) {
        const ticketId = parseInt(data.ticketID, 10);

        console.log('delegating with ticketId:', ticketId);

        if (isNaN(ticketId)) {
            console.error('ticketId is NaN — check API response');
            return;
        }

        if (typeof Notes !== 'undefined') Notes.init(ticketId);
        if (typeof Tasks !== 'undefined') Tasks.init(ticketId);
        if (typeof Activity !== 'undefined') Activity.init(ticketId);

        if (typeof CustomFieldBuilder !== 'undefined') {
            const builder = new CustomFieldBuilder();
            builder.changeCustomFields(data.requestTypeID ?? data.RequestTypeID);
        }
    }

};

// -------------------------  Tabs  ------------------------- //

const Tabs = {

    activate(name) {
        State.activeTab = name;

        Dom.tabs().forEach(tab => {
            const isActive = tab.id === `tab-${name}`;
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.tabIndex = isActive ? 0 : -1;
        });

        Dom.tabPanels().forEach(panel => {
            const isActive = panel.id === `tabpanel-${name}`;
            if (isActive) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        });

        // Persist active tab in session
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SUB_PAGE, name);
    },

    restore() {
        const saved = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SUB_PAGE);
        const valid = Object.values(TAB).includes(saved);
        Tabs.activate(valid ? saved : TAB.NOTES);
    },

    // Returns ordered list of visible tab names
    _visibleTabs() {
        return [...Dom.tabs()]
            .filter(t => !t.closest('[hidden]') && t.offsetParent !== null)
            .map(t => t.id.replace('tab-', ''));
    },

    _focusTab(name) {
        const el = Dom.tab(name);
        if (el) el.focus();
    },

    // Arrow key navigation — ARIA tabs pattern
    _onKeydown(e) {
        const visible = Tabs._visibleTabs();
        const current = State.activeTab;
        const idx = visible.indexOf(current);

        let next = null;

        switch (e.key) {
            case 'ArrowRight':
                next = visible[(idx + 1) % visible.length];
                break;
            case 'ArrowLeft':
                next = visible[(idx - 1 + visible.length) % visible.length];
                break;
            case 'Home':
                next = visible[0];
                break;
            case 'End':
                next = visible[visible.length - 1];
                break;
            case 'Enter':
            case ' ':
                Tabs.activate(current);
                return;
            default:
                return;
        }

        e.preventDefault();

        if (next) {
            Tabs.activate(next);
            Tabs._focusTab(next);
        }
    },

    bindKeys() {
        const tablist = document.querySelector('[role="tablist"]');
        if (!tablist) return;
        tablist.addEventListener('keydown', Tabs._onKeydown);
    },

    bindClicks() {
        Dom.tabs().forEach(tab => {
            tab.addEventListener('click', () => {
                const name = tab.id.replace('tab-', '');
                Tabs.activate(name);
            });
        });
    },

    // Pip (badge) helpers
    setPip(tabName, count) {
        const pip = document.getElementById(`${tabName}-pip`);
        if (!pip) return;

        if (count > 0) {
            pip.textContent = count > 99 ? '99+' : count;
            pip.classList.remove('hidden');
        } else {
            pip.classList.add('hidden');
        }
    },

    clearPip(tabName) {
        Tabs.setPip(tabName, 0);
    },

    init() {
        Tabs.bindClicks();
        Tabs.bindKeys();
        Tabs.restore();
    },
};

// -------------------------  Dirty tracking  ------------------------- //

const Dirty = {

    set(isDirty) {
        State.isDirty = isDirty;
        const saveBtn = Dom.saveBtn();
        if (!saveBtn) return;

        if (isDirty) {
            saveBtn.classList.add('is-dirty');
            saveBtn.textContent = 'Save Changes';
        } else {
            saveBtn.classList.remove('is-dirty');
            saveBtn.textContent = 'Save';
        }
    },

    guard() {
        if (!State.isDirty) return true;
        return window.confirm('You have unsaved changes. Leave anyway?');
    },
};

// -------------------------  Field change handlers  ------------------------- //

const FieldHandlers = {

    _onChange() {
        Dirty.set(true);
    },

    _onAssignedTechChange(e) {
        const newTech = e.target.value;
        const oldTech = sessionStorage.getItem(STORAGE_KEYS.OLD_ASSIGNED_TECH);

        sessionStorage.setItem(STORAGE_KEYS.NEW_ASSIGNED_TECH, newTech);

        if (!oldTech) {
            sessionStorage.setItem(STORAGE_KEYS.OLD_ASSIGNED_TECH, newTech);
        }

        Dirty.set(true);
    },

    _onCategoryChange() {
        const categoryId = document.getElementById('category')?.value;
        if (!categoryId) return;

        // Delegate to existing subcategory loader
        if (typeof LoadSubCategories !== 'undefined') {
            LoadSubCategories(categoryId);
        }

        Dirty.set(true);
    },

    _onTargetDateChange(e) {
        const val = e.target.value;
        if (!val) return;

        // Validate not in the past
        const selected = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selected < today) {
            UI.toast?.('Target date cannot be in the past', 'warning');
            e.target.value = State.ticketData?.TargetDate?.split('T')[0] ?? '';
            return;
        }

        Dirty.set(true);
    },

    bind() {
        // Assigned tech
        const techEl = document.getElementById('assignedtech');
        techEl?.addEventListener('change', FieldHandlers._onAssignedTechChange);

        // Category
        const catEl = document.getElementById('category');
        catEl?.addEventListener('change', FieldHandlers._onCategoryChange);

        // Sub category
        const subCatEl = document.getElementById('subcategory');
        subCatEl?.addEventListener('change', FieldHandlers._onChange);

        // Priority
        const priorityEl = document.getElementById('priority');
        priorityEl?.addEventListener('change', FieldHandlers._onChange);

        // Target date
        const targetEl = document.getElementById('targetdate');
        targetEl?.addEventListener('change', FieldHandlers._onTargetDateChange);
    },
};

// -------------------------  Save  ------------------------- //

const Save = {

    _buildPayload() {
        const data = State.ticketData;
        if (!data) return null;

        return {
            TicketID: data.TicketID,
            AssignedTechID: document.getElementById('assignedtech')?.value ?? data.AssignedTechID,
            CategoryID: document.getElementById('category')?.value ?? data.CategoryID,
            SubCategoryID: document.getElementById('subcategory')?.value ?? data.SubCategoryID,
            PriorityID: document.getElementById('priority')?.value ?? data.PriorityID,
            TargetDate: document.getElementById('targetdate')?.value ?? data.TargetDate,
            NewAssignedTech: sessionStorage.getItem(STORAGE_KEYS.NEW_ASSIGNED_TECH) ?? null,
            OldAssignedTech: sessionStorage.getItem(STORAGE_KEYS.OLD_ASSIGNED_TECH) ?? null,
        };
    },

    _validate(payload) {
        if (!payload.AssignedTechID) {
            UI.toast?.('Please assign a technician', 'warning');
            return false;
        }
        if (!payload.CategoryID) {
            UI.toast?.('Please select a category', 'warning');
            return false;
        }
        return true;
    },

    async _post(payload) {
        const objectInfo = [
            `TicketID\`${payload.TicketID}`,
            `assignedTechName\`${payload.AssignedTechID ?? ''}`,
            `category\`${payload.CategoryID ?? ''}`,
            `subcategory\`${payload.SubCategoryID ?? ''}`,
            `priority\`${payload.PriorityID ?? ''}`,
            `targetDate\`${payload.TargetDate ?? ''}`,
        ].filter(s => !s.endsWith('`')).join('|');

        const data = await API.post(
            'Ticket/SaveTicket',
            API.authPayload({
                objectInfo,
                falseReply: false,
                emailSent: 0,
                newAssignedTech: payload.NewAssignedTech ?? null,
                oldAssignedTech: payload.OldAssignedTech ?? null,
            })
        );

        if (!data) throw new Error('SaveTicket returned null');
        return data;
    },


    async execute() {
        const saveBtn = Dom.saveBtn();
        if (!saveBtn) return;

        const payload = Save._buildPayload();
        if (!payload) return;
        if (!Save._validate(payload)) return;

        // Loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
            await Save._post(payload);

            // Success
            Dirty.set(false);
            UI.toast?.('Ticket saved', 'success');

            // Update topbar pills if status/priority changed
            Topbar.populate({
                ...State.ticketData,
                PriorityID: parseInt(payload.PriorityID, 10),
            });

            // Clear assigned tech session keys
            sessionStorage.removeItem(STORAGE_KEYS.NEW_ASSIGNED_TECH);
            sessionStorage.removeItem(STORAGE_KEYS.OLD_ASSIGNED_TECH);

        } catch (err) {
            console.error('Save.execute:', err);
            UI.toast?.('Failed to save ticket', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = State.isDirty ? 'Save Changes' : 'Save';
        }
    },

    bind() {
        Dom.saveBtn()?.addEventListener('click', Save.execute);
    },
};

// -------------------------  Back button  ------------------------- //

const BackButton = {

    bind() {
        Dom.backBtn()?.addEventListener('click', () => {
            if (!Dirty.guard()) return;

            // Clear ticket session keys
            sessionStorage.removeItem(STORAGE_KEYS.TICKET_ID);
            sessionStorage.removeItem(STORAGE_KEYS.REQUEST_TYPE);
            sessionStorage.removeItem(STORAGE_KEYS.NEW_ASSIGNED_TECH);
            sessionStorage.removeItem(STORAGE_KEYS.OLD_ASSIGNED_TECH);

            // Return to correct list
            const dest = sessionStorage.getItem(STORAGE_KEYS.MY_TICKETS) === 'true'
                ? '/Ticket/MyTickets'
                : '/Ticket/AllTickets';

            window.location.href = dest;
        });
    },
};

// -------------------------  Beforeunload guard  ------------------------- //

const UnloadGuard = {
    bind() {
        window.addEventListener('beforeunload', (e) => {
            if (!State.isDirty) return;
            e.preventDefault();
            e.returnValue = '';
        });
    },
};


// -------------------------  Collapse  ------------------------- //

const Collapse = {

    _applyLeft(collapsed) {
        State.collapsed.left = collapsed;
        const pane = Dom.paneLeft();
        const btn = Dom.collapseLeft();
        const rail = Dom.railLeft();
        if (!pane || !btn) return;

        if (collapsed) {
            pane.classList.add('is-collapsed');
            btn.setAttribute('aria-expanded', 'false');
            rail?.removeAttribute('hidden');
        } else {
            pane.classList.remove('is-collapsed');
            btn.setAttribute('aria-expanded', 'true');
            rail?.setAttribute('hidden', '');
        }
    },

    _applyRight(collapsed) {
        State.collapsed.right = collapsed;
        const pane = Dom.paneRight();
        const btn = Dom.collapseRight();
        const rail = Dom.railRight();
        if (!pane || !btn) return;

        if (collapsed) {
            pane.classList.add('is-collapsed');
            btn.setAttribute('aria-expanded', 'false');
            rail?.removeAttribute('hidden');
        } else {
            pane.classList.remove('is-collapsed');
            btn.setAttribute('aria-expanded', 'true');
            rail?.setAttribute('hidden', '');
        }
    },

    toggleLeft() {
        Collapse._applyLeft(!State.collapsed.left);
        Collapse._persistState();
    },

    toggleRight() {
        Collapse._applyRight(!State.collapsed.right);
        Collapse._persistState();
    },

    _persistState() {
        sessionStorage.setItem(
            STORAGE_KEYS.TABLE_PAGE_NAME,
            JSON.stringify(State.collapsed),
        );
    },

    _restoreState() {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEYS.TABLE_PAGE_NAME);
            if (!saved) return;
            const parsed = JSON.parse(saved);
            if (parsed.left) Collapse._applyLeft(true);
            if (parsed.right) Collapse._applyRight(true);
        } catch {
            // Ignore malformed session data
        }
    },

    bind() {
        Dom.collapseLeft()?.addEventListener('click', Collapse.toggleLeft);
        Dom.collapseRight()?.addEventListener('click', Collapse.toggleRight);

        // Rail click expands pane
        Dom.railLeft()?.addEventListener('click', () => {
            if (State.collapsed.left) Collapse.toggleLeft();
        });

        Dom.railRight()?.addEventListener('click', () => {
            if (State.collapsed.right) Collapse.toggleRight();
        });
    },

    init() {
        Collapse.bind();
        Collapse._restoreState();
    },
};

// -------------------------  Notification banner  ------------------------- //

const NotifyBanner = {

    _el: null,

    show(message) {
        NotifyBanner._remove();

        const banner = document.createElement('div');
        banner.className = 'td-notify-banner';
        banner.id = 'notify-banner';
        banner.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>${message}</span>
            <button type="button" aria-label="Dismiss notification">Dismiss</button>
        `;

        banner.querySelector('button')
            ?.addEventListener('click', NotifyBanner.dismiss);

        // Insert above thread
        const thread = Dom.thread();
        thread?.parentElement?.insertBefore(banner, thread);

        NotifyBanner._el = banner;

        // Also show FalseReply button
        Dom.falseReplyBtn()?.classList.remove('hidden');
    },

    dismiss() {
        NotifyBanner._remove();
        Dom.falseReplyBtn()?.classList.add('hidden');

        // Clear notification session keys
        sessionStorage.removeItem(STORAGE_KEYS.CURRENT_TICKET_NTFY);
        sessionStorage.removeItem(STORAGE_KEYS.CURRENT_TICKET_NTFY_TECH);
    },

    _remove() {
        NotifyBanner._el?.remove();
        NotifyBanner._el = null;
    },

    check() {
        const ntfy = sessionStorage.getItem(STORAGE_KEYS.CURRENT_TICKET_NTFY);
        const ntfyTech = sessionStorage.getItem(STORAGE_KEYS.CURRENT_TICKET_NTFY_TECH);

        if (ntfy === Session.ticketId) {
            NotifyBanner.show('The client has replied to this ticket.');
            return;
        }

        if (ntfyTech === Session.ticketId) {
            NotifyBanner.show('A technician has replied to this ticket.');
        }
    },

    bind() {
        Dom.falseReplyBtn()?.addEventListener('click', NotifyBanner.dismiss);
    },
};

// -------------------------  Composer helpers  ------------------------- //

const Composer = {

    _bindTextarea(textareaEl, charcountEl, sendBtnEl, limit = 2000) {
        if (!textareaEl) return;

        textareaEl.addEventListener('input', () => {
            const len = textareaEl.value.length;

            // Charcount
            if (charcountEl) {
                charcountEl.textContent = `${len} / ${limit}`;
                charcountEl.classList.toggle('is-near-limit', len >= limit * 0.85);
                charcountEl.classList.toggle('is-at-limit', len >= limit);
            }

            // Send button
            if (sendBtnEl) {
                sendBtnEl.disabled = len === 0;
            }

            // Auto-grow
            textareaEl.style.height = 'auto';
            textareaEl.style.height = `${textareaEl.scrollHeight}px`;
        });

        // Enter to send — Shift+Enter for newline
        textareaEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtnEl?.disabled) {
                    sendBtnEl?.click();
                }
            }
        });
    },

    init() {
        Composer._bindTextarea(
            Dom.msgTextarea(),
            Dom.msgCharcount(),
            Dom.msgSendBtn(),
        );

        Composer._bindTextarea(
            Dom.noteTextarea(),
            Dom.noteCharcount(),
            Dom.noteSendBtn(),
        );
    },
};

// -------------------------  Events (master bind)  ------------------------- //

const Events = {
    bind() {
        Save.bind();
        BackButton.bind();
        UnloadGuard.bind();
        Tabs.init();
        Collapse.init();
        NotifyBanner.bind();
        Composer.init();
    },
};
