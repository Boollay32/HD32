// =====================  Activity.js  ===================== //

'use strict';

const Activity = (() => {

    // -------------------------  Constants  ------------------------- //

    const PAGE_SIZE = 20;

    const ACTIVITY_TYPE = {
        STATUS_CHANGE: 1,
        PRIORITY_CHANGE: 2,
        ASSIGNEE_CHANGE: 3,
        NOTE_ADDED: 4,
        MESSAGE_SENT: 5,
        TASK_ADDED: 6,
        TASK_COMPLETE: 7,
        TASK_DELETED: 8,
        ATTACHMENT_ADDED: 9,
        TICKET_CREATED: 10,
        TICKET_CLOSED: 11,
        CATEGORY_CHANGE: 12,
        DUE_DATE_CHANGE: 13,
    };

    const FILTER_ALL = 'all';

    const FILTERS = [
        { value: FILTER_ALL, label: 'All activity' },
        { value: String(ACTIVITY_TYPE.STATUS_CHANGE), label: 'Status' },
        { value: String(ACTIVITY_TYPE.MESSAGE_SENT), label: 'Messages' },
        { value: String(ACTIVITY_TYPE.NOTE_ADDED), label: 'Notes' },
        { value: String(ACTIVITY_TYPE.TASK_ADDED), label: 'Tasks' },
        { value: String(ACTIVITY_TYPE.ASSIGNEE_CHANGE), label: 'Assignee' },
    ];

    // -------------------------  State  ------------------------- //

    const State = {
        ticketId: null,
        items: [],
        filtered: [],
        activeFilter: FILTER_ALL,
        page: 1,
        isLoading: false,
        hasMore: false,
    };

    // -------------------------  DOM refs  ------------------------- //

    const Dom = {
        feed: () => document.getElementById('Activity-Feed'),
        filterBar: () => document.getElementById('activity-filter-bar'),
        loadMoreBtn: () => document.getElementById('activity-load-more'),
        loadMoreWrap: () => document.getElementById('activity-load-more-wrap'),
        skeleton: () => document.getElementById('activity-skeleton'),
    };

    // -------------------------  Session  ------------------------- //

    const Session = {
        get token() { return sessionStorage.getItem(STORAGE_KEYS.TOKEN); },
        get userId() { return sessionStorage.getItem(STORAGE_KEYS.USER_ID); },
    };

    // -------------------------  Helpers  ------------------------- //

    const Helpers = {

        formatDateTime(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            if (isNaN(d)) return '';
            return d.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        },

        timeAgo(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            const diff = Math.round((Date.now() - d) / 1000);
            if (diff < 60) return 'just now';
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
            return Helpers.formatDateTime(raw);
        },

        escapeHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        paginate(items, page, size) {
            return items.slice(0, page * size);
        },
    };

    // -------------------------  Icon map  ------------------------- //

    const ACTIVITY_ICON = {
        [ACTIVITY_TYPE.STATUS_CHANGE]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>`,
        [ACTIVITY_TYPE.PRIORITY_CHANGE]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="16"/>
            </svg>`,
        [ACTIVITY_TYPE.ASSIGNEE_CHANGE]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>`,
        [ACTIVITY_TYPE.NOTE_ADDED]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
            </svg>`,
        [ACTIVITY_TYPE.MESSAGE_SENT]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>`,
        [ACTIVITY_TYPE.TASK_ADDED]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5"  y1="12" x2="19" y2="12"/>
            </svg>`,
        [ACTIVITY_TYPE.TASK_COMPLETE]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
            </svg>`,
        [ACTIVITY_TYPE.TASK_DELETED]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>`,
        [ACTIVITY_TYPE.ATTACHMENT_ADDED]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>`,
        [ACTIVITY_TYPE.TICKET_CREATED]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9"  y1="15" x2="15" y2="15"/>
            </svg>`,
        [ACTIVITY_TYPE.TICKET_CLOSED]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
        [ACTIVITY_TYPE.CATEGORY_CHANGE]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h7"/>
            </svg>`,
        [ACTIVITY_TYPE.DUE_DATE_CHANGE]: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2"  x2="16" y2="6"/>
                <line x1="8"  y1="2"  x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
            </svg>`,
    };

    // -------------------------  Default icon  ------------------------- //

    function _defaultIcon() {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8"  x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>`;
    }

    // -------------------------  Init  ------------------------- //

    function init(ticketId) {
    State.ticketId = parseInt(ticketId, 10);
        _buildFilterBar();
        _bindLoadMore();
        _getActivity();
    }

    // -------------------------  Get activity  ------------------------- //

    async function _getActivity() {
        if (State.isLoading) return;
        State.isLoading = true;

        _showSkeleton(true);

        try {
            const data = await API.post(
                'TicketDetails/GetActivity',
                API.authPayload({ ticketId: State.ticketId })
            );

            if (!Array.isArray(data)) return;

            State.items = data.sort(
                (a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate)
            );
            State.page = 1;

            _applyFilter();
            _renderFeed();

        } catch (err) {
            console.error('Activity._getActivity:', err);
            _renderError();
        } finally {
            State.isLoading = false;
            _showSkeleton(false);
        }
    }

    // -------------------------  Apply filter  ------------------------- //

    function _applyFilter() {
        if (State.activeFilter === FILTER_ALL) {
            State.filtered = [...State.items];
            return;
        }
        const typeId = parseInt(State.activeFilter, 10);
        State.filtered = State.items.filter(i => i.ActivityTypeID === typeId);
    }

    // -------------------------  Render feed  ------------------------- //

    function _renderFeed() {
        const feed = Dom.feed();
        if (!feed) return;

        feed.innerHTML = '';

        if (State.filtered.length === 0) {
            feed.appendChild(_buildEmptyState());
            _showLoadMore(false);
            return;
        }

        const visible = Helpers.paginate(State.filtered, State.page, PAGE_SIZE);
        State.hasMore = State.filtered.length > visible.length;

        const fragment = document.createDocumentFragment();
        let lastDay = null;

        visible.forEach(item => {
            const day = _dayKey(item.CreatedDate);
            if (day !== lastDay) {
                fragment.appendChild(_buildDayDivider(item.CreatedDate));
                lastDay = day;
            }
            fragment.appendChild(_buildActivityItem(item));
        });

        feed.appendChild(fragment);
        _showLoadMore(State.hasMore);
    }

    // -------------------------  Append page  ------------------------- //

    function _appendPage() {
        const feed = Dom.feed();
        if (!feed) return;

        const prev = Helpers.paginate(State.filtered, State.page - 1, PAGE_SIZE);
        const next = Helpers.paginate(State.filtered, State.page, PAGE_SIZE);
        const newItems = next.slice(prev.length);

        State.hasMore = State.filtered.length > next.length;

        const fragment = document.createDocumentFragment();
        const last = prev[prev.length - 1];
        let lastDay = last ? _dayKey(last.CreatedDate) : null;

        newItems.forEach(item => {
            const day = _dayKey(item.CreatedDate);
            if (day !== lastDay) {
                fragment.appendChild(_buildDayDivider(item.CreatedDate));
                lastDay = day;
            }
            fragment.appendChild(_buildActivityItem(item));
        });

        feed.appendChild(fragment);
        _showLoadMore(State.hasMore);
    }

    // -------------------------  Day key + divider  ------------------------- //

    function _dayKey(raw) {
        const d = new Date(raw);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }

    function _buildDayDivider(raw) {
        const d = new Date(raw);
        const today = new Date();
        const yest = new Date();
        yest.setDate(today.getDate() - 1);

        const sameDay = (a, b) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();

        let label;
        if (sameDay(d, today)) label = 'Today';
        else if (sameDay(d, yest)) label = 'Yesterday';
        else label = d.toLocaleDateString('en-GB', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        });

        const div = document.createElement('div');
        div.className = 'td-activity-day';
        div.setAttribute('role', 'separator');
        div.setAttribute('aria-label', label);

        const span = document.createElement('span');
        span.textContent = label;
        div.appendChild(span);

        return div;
    }

    // -------------------------  Empty state  ------------------------- //

    function _buildEmptyState() {
        const div = document.createElement('div');
        div.className = 'td-thread-empty';
        div.setAttribute('aria-label', 'No activity yet');
        div.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>
            <p>No activity recorded yet.</p>
        `;
        return div;
    }

    // -------------------------  Error state  ------------------------- //

    function _renderError() {
        const feed = Dom.feed();
        if (!feed) return;

        feed.innerHTML = '';

        const div = document.createElement('div');
        div.className = 'td-thread-empty';
        div.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8"  x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Failed to load activity.<br>
               <button type="button" id="activity-retry">Try again</button>
            </p>
        `;

        div.querySelector('#activity-retry')
            ?.addEventListener('click', _getActivity);

        feed.appendChild(div);
    }

    // -------------------------  Skeleton  ------------------------- //

    function _showSkeleton(show) {
        const skeleton = Dom.skeleton();
        if (!skeleton) return;
        show
            ? skeleton.removeAttribute('hidden')
            : skeleton.setAttribute('hidden', '');
    }

    // -------------------------  Load more  ------------------------- //

    function _showLoadMore(show) {
        const wrap = Dom.loadMoreWrap();
        if (!wrap) return;
        show
            ? wrap.removeAttribute('hidden')
            : wrap.setAttribute('hidden', '');
    }

    function _bindLoadMore() {
        Dom.loadMoreBtn()?.addEventListener('click', () => {
            if (State.isLoading) return;

            const btn = Dom.loadMoreBtn();
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Loading…';
            }

            State.page += 1;
            _appendPage();

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Load more';
            }
        });
    }

    // -------------------------  Activity item builder  ------------------------- //

    function _buildActivityItem(item) {
        const row = document.createElement('div');
        row.className = 'td-activity-item';
        row.dataset.type = item.ActivityTypeID;

        // Icon
        const iconWrap = document.createElement('div');
        iconWrap.className = `td-activity-icon type-${item.ActivityTypeID}`;
        iconWrap.innerHTML = ACTIVITY_ICON[item.ActivityTypeID] ?? _defaultIcon();
        row.appendChild(iconWrap);

        // Content
        const content = document.createElement('div');
        content.className = 'td-activity-content';

        const desc = document.createElement('p');
        desc.className = 'td-activity-desc';
        desc.innerHTML = _buildDescription(item);
        content.appendChild(desc);

        const meta = document.createElement('div');
        meta.className = 'td-activity-meta';

        const actor = document.createElement('span');
        actor.className = 'td-activity-actor';
        actor.textContent = Helpers.escapeHtml(item.ActorName ?? 'System');
        meta.appendChild(actor);

        const time = document.createElement('time');
        time.className = 'td-activity-time';
        time.dateTime = item.CreatedDate ?? '';
        time.textContent = Helpers.timeAgo(item.CreatedDate);
        time.setAttribute('title', Helpers.formatDateTime(item.CreatedDate));
        meta.appendChild(time);

        content.appendChild(meta);
        row.appendChild(content);

        return row;
    }

    // -------------------------  Description builder  ------------------------- //

    function _buildDescription(item) {
        const e = Helpers.escapeHtml;

        switch (item.ActivityTypeID) {
            case ACTIVITY_TYPE.STATUS_CHANGE:
                return `Status changed from <strong>${e(item.OldValue)}</strong> to <strong>${e(item.NewValue)}</strong>`;
            case ACTIVITY_TYPE.PRIORITY_CHANGE:
                return `Priority changed from <strong>${e(item.OldValue)}</strong> to <strong>${e(item.NewValue)}</strong>`;
            case ACTIVITY_TYPE.ASSIGNEE_CHANGE:
                return `Assigned to <strong>${e(item.NewValue)}</strong>${item.OldValue ? ` (was ${e(item.OldValue)})` : ''}`;
            case ACTIVITY_TYPE.NOTE_ADDED:
                return `Added an internal note`;
            case ACTIVITY_TYPE.MESSAGE_SENT:
                return `Sent a message`;
            case ACTIVITY_TYPE.TASK_ADDED:
                return `Added task <strong>${e(item.NewValue)}</strong>`;
            case ACTIVITY_TYPE.TASK_COMPLETE:
                return `Completed task <strong>${e(item.NewValue)}</strong>`;
            case ACTIVITY_TYPE.TASK_DELETED:
                return `Deleted task <strong>${e(item.NewValue)}</strong>`;
            case ACTIVITY_TYPE.ATTACHMENT_ADDED:
                return `Attached <strong>${e(item.NewValue)}</strong>`;
            case ACTIVITY_TYPE.TICKET_CREATED:
                return `Ticket created`;
            case ACTIVITY_TYPE.TICKET_CLOSED:
                return `Ticket closed`;
            case ACTIVITY_TYPE.CATEGORY_CHANGE:
                return `Category changed to <strong>${e(item.NewValue)}</strong>`;
            case ACTIVITY_TYPE.DUE_DATE_CHANGE:
                return `Due date set to <strong>${e(item.NewValue)}</strong>`;
            default:
                return `Activity recorded`;
        }
    }

    // -------------------------  Filter bar  ------------------------- //

    function _buildFilterBar() {
        const bar = Dom.filterBar();
        if (!bar) return;

        bar.innerHTML = '';

        const fragment = document.createDocumentFragment();

        FILTERS.forEach(filter => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'td-activity-filter-btn';
            btn.dataset.value = filter.value;
            btn.textContent = filter.label;

            const isActive = filter.value === State.activeFilter;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

            btn.addEventListener('click', () => _setFilter(filter.value));
            fragment.appendChild(btn);
        });

        bar.appendChild(fragment);
    }

    function _setFilter(value) {
        if (value === State.activeFilter) return;

        State.activeFilter = value;
        State.page = 1;

        Dom.filterBar()
            ?.querySelectorAll('.td-activity-filter-btn')
            .forEach(btn => {
                const isActive = btn.dataset.value === value;
                btn.classList.toggle('is-active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

        _applyFilter();
        _renderFeed();
    }

    // -------------------------  Public API  ------------------------- //

    return {
        init,
        refresh: _getActivity,
        push(item) {
            State.items.unshift(item);
            _applyFilter();
            _renderFeed();
        },
    };

})();

