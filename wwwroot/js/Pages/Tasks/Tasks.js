// =====================  Tasks.js  ===================== //
// In-ticket task list with inline-expand editing.
//
// Reads the real TaskStub fields (camelCase wire): taskID, title,
// description, progressLog, assignedTech (name), status (int),
// important (bool), requiredDate, completed, attachments[].
//
// Saves the full field set through TicketDetails/SaveTask using the
// objectInfo keys TaskMapper accepts. Existing attachments are echoed
// back on every save so they are never silently dropped.
//
// Status legend: 1 New, 2 In Progress, 3 Complete, 4 Withdrawn, 5 Draft.
// "Done" == Complete (3).
// ===================================================== //

'use strict';

const Tasks = (() => {

    // -------------------------  Constants  ------------------------- //

    const DONE = 3;        // Complete
    const REOPEN = 2;      // In Progress (when un-ticking done)
    const WITHDRAWN = 4;

    const STATUS = [
        { v: 1, label: 'New' },
        { v: 2, label: 'In Progress' },
        { v: 3, label: 'Complete' },
        { v: 4, label: 'Withdrawn' },
        { v: 5, label: 'Draft' },
    ];
    const STATUS_LABEL = STATUS.reduce((m, s) => (m[s.v] = s.label, m), {});
    const STATUS_CLASS = {
        1: 'st-new', 2: 'st-progress', 3: 'st-done', 4: 'st-withdrawn', 5: 'st-draft',
    };

    const NEW_ID = '__new__';

    // -------------------------  State  ------------------------- //

    const State = {
        ticketId: null,
        tasks: [],
        techs: [],          // [{ id, name }]
        isLoading: false,
        isSaving: false,
        openId: null,       // taskID currently expanded, or NEW_ID, or null
        dirty: false,
        guardsHooked: false,
    };

    // -------------------------  DOM refs  ------------------------- //

    const Dom = {
        taskList: () => document.getElementById('Task-List'),
        progressFill: () => document.getElementById('task-progress-fill'),
        progressLabel: () => document.getElementById('task-progress-label'),
        progressTrack: () => document.getElementById('task-progress-track'),
        addTaskBtn: () => document.getElementById('add-task-btn'),
    };

    // -------------------------  Helpers  ------------------------- //

    const H = {
        esc(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        },
        formatDate(raw) {
            if (!raw) return '\u2014';
            const d = new Date(raw);
            if (isNaN(d)) return '\u2014';
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        },
        toInputDate(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            if (isNaN(d)) return '';
            const off = d.getTimezoneOffset();
            const local = new Date(d.getTime() - off * 60000);
            return local.toISOString().split('T')[0];
        },
        isOverdue(raw, status) {
            if (!raw || status === DONE || status === WITHDRAWN) return false;
            const due = new Date(raw);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return due < today;
        },
        statusOf(t) { return Number(t.status ?? 1); },
        isDone(t) { return H.statusOf(t) === DONE; },
        nameToId(name) {
            if (!name) return null;
            const hit = State.techs.find(x => x.name === name);
            return hit ? hit.id : null;
        },
    };

    // Builds the pipe-backtick objectInfo string TaskMapper parses.
    // Keeps "0" (e.g. important=0); drops only null / undefined / "".
    function _objectInfo(fields) {
        return Object.entries(fields)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${k}\`${v}`)
            .join('|');
    }

    // Map a task's current attachments to the wire shape SaveTask expects,
    // so they are preserved (not wiped) on save.
    function _echoAttachments(task) {
        const list = Array.isArray(task?.attachments) ? task.attachments : [];
        return list
            .filter(a => a && a.attachmentByteArray)
            .slice(0, 5)
            .map(a => ({
                attachmentByteArray: a.attachmentByteArray,
                attachmentName: a.attachmentName ?? '',
                attachmentImageType: a.attachmentImageType ?? 0,
            }));
    }

    function _attListHtml(atts) {
        return atts.length
            ? atts.map((a, i) => `
                <li class="td-att" data-att="${i}">
                    <span class="td-att-name">${H.esc(a.attachmentName || ('Attachment ' + (i + 1)))}</span>
                    <button type="button" class="td-att-remove" data-att-remove="${i}" aria-label="Remove attachment">&times;</button>
                </li>`).join('')
            : '<li class="td-att-empty">No attachments</li>';
    }

    // -------------------------  Init  ------------------------- //

    function init(ticketId) {
        State.ticketId = parseInt(ticketId, 10);
        State.openId = null;
        State.dirty = false;

        Dom.addTaskBtn()?.addEventListener('click', _onAddClick);
        _hookGuards();

        _loadTechs();
        _getTasks();
    }

    async function _loadTechs() {
        try {
            const data = await API.post(
                'Misc/GetDropDownList',
                API.authPayload({
                    filter: sessionStorage.getItem(STORAGE_KEYS.SEARCH_OR_TICKET) ?? '0',
                    group: 'Task',
                })
            );
            const raw = data?.assignedTech;
            if (Array.isArray(raw)) {
                State.techs = raw
                    .map(it => ({ id: String(it.id ?? it.value ?? ''), name: it.name ?? it.text ?? '' }))
                    .filter(x => x.id && x.name);
            }
        } catch (err) {
            console.error('Tasks._loadTechs:', err);
        }
    }

    // -------------------------  Get tasks  ------------------------- //

    async function _getTasks() {
        if (State.isLoading) return;
        State.isLoading = true;
        try {
            const data = await API.post(
                'TicketDetails/GetTasks',
                API.authPayload({ filters: { TicketID: String(State.ticketId) } })
            );
            State.tasks = Array.isArray(data) ? data : [];
            _render();
        } catch (err) {
            console.error('Tasks._getTasks:', err);
            UI.toast?.('Failed to load tasks', 'error');
        } finally {
            State.isLoading = false;
        }
    }

    // -------------------------  Render  ------------------------- //

    function _render() {
        const list = Dom.taskList();
        if (!list) return;

        State.openId = null;
        State.dirty = false;
        list.innerHTML = '';

        if (!State.tasks.length) {
            list.appendChild(_emptyState());
            _updateProgress();
            _updatePip();
            return;
        }

        const sorted = [...State.tasks].sort((a, b) => {
            const ad = H.isDone(a), bd = H.isDone(b);
            if (ad !== bd) return ad ? 1 : -1;
            const as = H.statusOf(a), bs = H.statusOf(b);
            if (as !== bs) return as - bs;
            if (a.requiredDate && b.requiredDate) return new Date(a.requiredDate) - new Date(b.requiredDate);
            return 0;
        });

        const frag = document.createDocumentFragment();
        sorted.forEach(t => frag.appendChild(_buildItem(t)));
        list.appendChild(frag);

        _updateProgress();
        _updatePip();
    }

    function _emptyState() {
        const div = document.createElement('div');
        div.className = 'td-thread-empty';
        div.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <p>No tasks yet.<br>Add a task below.</p>`;
        return div;
    }

    // -------------------------  Item (collapsed summary)  ------------------------- //

    function _buildItem(task) {
        const item = document.createElement('div');
        item.className = 'td-task-item';
        item.dataset.tid = task.taskID;

        const done = H.isDone(task);
        const status = H.statusOf(task);
        if (done) item.classList.add('is-complete');
        if (H.isOverdue(task.requiredDate, status)) item.classList.add('is-overdue');

        const dueLabel = task.requiredDate ? H.formatDate(task.requiredDate) : '\u2014';

        item.innerHTML = `
            <div class="td-task-summary">
                <div class="td-task-check">
                    <input type="checkbox" id="task-check-${task.taskID}"
                           aria-label="Mark task complete" ${done ? 'checked' : ''}>
                    <label for="task-check-${task.taskID}" aria-hidden="true"></label>
                </div>
                <button type="button" class="td-task-open" aria-expanded="false">
                    <span class="td-task-title">
                        ${task.important ? '<span class="td-task-star" title="Important" aria-label="Important">\u2605</span>' : ''}
                        ${H.esc(task.title || '(untitled task)')}
                    </span>
                    <span class="td-task-meta">
                        <span class="td-task-status ${STATUS_CLASS[status] ?? ''}">${H.esc(STATUS_LABEL[status] ?? 'New')}</span>
                        <span class="td-task-due">${dueLabel}</span>
                        ${task.assignedTech ? `<span class="td-task-assignee">${H.esc(task.assignedTech)}</span>` : ''}
                    </span>
                </button>
                <div class="td-task-actions">
                    <button type="button" class="td-task-delete-btn" aria-label="Delete task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                    </button>
                </div>
            </div>`;

        item.querySelector('input[type="checkbox"]')
            ?.addEventListener('change', (e) => _toggleDone(task.taskID, e.target.checked, e.target));
        item.querySelector('.td-task-open')
            ?.addEventListener('click', () => _requestOpen(task.taskID));
        item.querySelector('.td-task-delete-btn')
            ?.addEventListener('click', () => _deleteTask(task.taskID));

        return item;
    }

    // -------------------------  Open / close editor  ------------------------- //

    async function _requestOpen(taskId) {
        if (String(State.openId) === String(taskId)) { _onCancel(); return; }
        if (!(await _guardLeave())) return;
        _openEditor(taskId);
    }

    async function _onAddClick() {
        if (State.openId === NEW_ID) return;
        if (!(await _guardLeave())) return;
        _openEditor(NEW_ID);
    }

    function _taskById(id) {
        return State.tasks.find(t => String(t.taskID) === String(id)) || null;
    }

    function _openEditor(id) {
        _collapseDom();

        const list = Dom.taskList();
        if (!list) return;

        const isNew = id === NEW_ID;
        const task = isNew ? { taskID: '', title: '', status: 1, important: false } : _taskById(id);
        if (!task) return;

        let host;
        if (isNew) {
            host = document.createElement('div');
            host.className = 'td-task-item is-editing is-new';
            host.dataset.tid = NEW_ID;
            list.querySelector('.td-thread-empty')?.remove();
            list.prepend(host);
        } else {
            host = list.querySelector(`.td-task-item[data-tid="${id}"]`);
            if (!host) return;
            host.classList.add('is-editing');
            host.querySelector('.td-task-open')?.setAttribute('aria-expanded', 'true');
        }

        const editor = document.createElement('div');
        editor.className = 'td-task-editor';
        editor.innerHTML = _editorHtml(task, isNew);
        host.appendChild(editor);

        _bindEditor(editor, task, isNew);
        State.openId = id;
        State.dirty = false;

        setTimeout(() => editor.querySelector('[data-fld="title"]')?.focus(), 40);
        editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function _editorHtml(task, isNew) {
        const status = H.statusOf(task);
        const statusOpts = STATUS
            .map(s => `<option value="${s.v}" ${s.v === status ? 'selected' : ''}>${s.label}</option>`)
            .join('');

        const curName = task.assignedTech || '';
        const matched = State.techs.some(x => x.name === curName);
        const techOpts = State.techs
            .map(x => `<option value="${H.esc(x.id)}" ${x.name === curName ? 'selected' : ''}>${H.esc(x.name)}</option>`)
            .join('');
        const unresolved = curName && !matched
            ? `<option value="" data-keep="1" selected>${H.esc(curName)} (current)</option>`
            : '';
        const blank = `<option value="">Unassigned</option>`;

        const atts = _echoAttachments(task);

        return `
            <div class="td-ed-row">
                <label class="td-ed-label">Title</label>
                <input type="text" class="td-ed-input" data-fld="title" maxlength="200"
                       value="${H.esc(task.title || '')}" placeholder="Task title">
            </div>
            <div class="td-ed-grid">
                <div class="td-ed-row">
                    <label class="td-ed-label">Status</label>
                    <select class="td-ed-input" data-fld="status">${statusOpts}</select>
                </div>
                <div class="td-ed-row">
                    <label class="td-ed-label">Assigned to</label>
                    <select class="td-ed-input" data-fld="assignedTech">${blank}${unresolved}${techOpts}</select>
                </div>
                <div class="td-ed-row">
                    <label class="td-ed-label">Due date</label>
                    <input type="date" class="td-ed-input" data-fld="requiredDate"
                           value="${H.toInputDate(task.requiredDate)}">
                </div>
                <div class="td-ed-row td-ed-important">
                    <label class="td-ed-check">
                        <input type="checkbox" data-fld="important" ${task.important ? 'checked' : ''}>
                        <span>Mark as important</span>
                    </label>
                </div>
            </div>
            <div class="td-ed-row">
                <label class="td-ed-label">Description</label>
                <textarea class="td-ed-input td-ed-area" data-fld="description" rows="3"
                          placeholder="What needs doing?">${H.esc(task.description || '')}</textarea>
            </div>
            <div class="td-ed-row">
                <label class="td-ed-label">Progress log</label>
                <textarea class="td-ed-input td-ed-area" data-fld="progressLog" rows="3"
                          placeholder="Notes on progress\u2026">${H.esc(task.progressLog || '')}</textarea>
            </div>
            <div class="td-ed-row">
                <label class="td-ed-label">Attachments</label>
                <ul class="td-att-list" data-fld="attachments">${_attListHtml(atts)}</ul>
            </div>
            <div class="td-ed-foot">
                <span class="td-ed-dirty" hidden>Unsaved changes</span>
                <div class="td-ed-foot-btns">
                    <button type="button" class="td-btn-ghost" data-act="cancel">Cancel</button>
                    <button type="button" class="td-btn-primary" data-act="save">${isNew ? 'Add task' : 'Save'}</button>
                </div>
            </div>`;
    }

    function _bindEditor(editor, task, isNew) {
        editor._kept = _echoAttachments(task);

        const markDirty = () => {
            if (State.dirty) return;
            State.dirty = true;
            editor.querySelector('.td-ed-dirty')?.removeAttribute('hidden');
        };

        editor.querySelectorAll('input[data-fld], select[data-fld], textarea[data-fld]').forEach(el => {
            el.addEventListener('input', markDirty);
            el.addEventListener('change', markDirty);
        });

        const wireAttRemoves = () => {
            editor.querySelectorAll('[data-att-remove]').forEach(btn => {
                btn.addEventListener('click', () => {
                    editor._kept.splice(parseInt(btn.dataset.attRemove, 10), 1);
                    markDirty();
                    const ul = editor.querySelector('[data-fld="attachments"]');
                    if (ul) { ul.innerHTML = _attListHtml(editor._kept); wireAttRemoves(); }
                });
            });
        };
        wireAttRemoves();

        editor.querySelector('[data-act="cancel"]')?.addEventListener('click', _onCancel);
        editor.querySelector('[data-act="save"]')?.addEventListener('click', () => _saveEditor(editor, task, isNew));
    }

    async function _onCancel() {
        if (State.dirty) {
            const ok = await Confirm.ask({
                title: 'Discard changes?',
                message: 'Your edits to this task will be lost.',
                confirmText: 'Discard',
                cancelText: 'Keep editing',
                danger: true,
            });
            if (!ok) return;
        }
        _closeEditor();
    }

    function _closeEditor() {
        _collapseDom();
        State.openId = null;
        State.dirty = false;
    }

    function _collapseDom() {
        const list = Dom.taskList();
        if (!list) return;
        list.querySelector(`.td-task-item.is-new[data-tid="${NEW_ID}"]`)?.remove();
        list.querySelectorAll('.td-task-item.is-editing').forEach(item => {
            item.classList.remove('is-editing');
            item.querySelector('.td-task-open')?.setAttribute('aria-expanded', 'false');
            item.querySelector('.td-task-editor')?.remove();
        });
    }

    // -------------------------  Save (editor)  ------------------------- //

    async function _saveEditor(editor, task, isNew) {
        if (State.isSaving) return;

        const get = (f) => editor.querySelector(`[data-fld="${f}"]`);
        const title = (get('title')?.value || '').trim();
        if (!title) {
            get('title')?.focus();
            UI.toast?.('Please enter a task title', 'warning');
            return;
        }

        const status = parseInt(get('status')?.value ?? '1', 10);
        const important = get('important')?.checked ? '1' : '0';
        const requiredDate = get('requiredDate')?.value || '';

        const assignSel = get('assignedTech');
        const selOpt = assignSel?.options[assignSel.selectedIndex];
        const assignKeep = selOpt?.dataset?.keep === '1';
        const assignedTech = assignKeep ? '' : (assignSel?.value || '');

        let completed = '';
        if (status === DONE) completed = task.completed || new Date().toISOString();

        const fields = {
            TaskID: isNew ? '' : task.taskID,
            TicketID: State.ticketId,
            title,
            description: get('description')?.value ?? '',
            progressLog: get('progressLog')?.value ?? '',
            status,
            important,
            requiredDate,
            completed,
        };
        if (!assignKeep) fields.assignedTech = assignedTech;

        await _commit(_objectInfo(fields), editor._kept, isNew ? 'Task added' : 'Task updated', editor);
    }

    async function _commit(objectInfo, attachments, successMsg, editor) {
        State.isSaving = true;
        const saveBtn = editor?.querySelector('[data-act="save"]');
        const origLabel = saveBtn?.textContent;
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving\u2026'; }

        try {
            const data = await API.post(
                'TicketDetails/SaveTask',
                API.authPayload({ objectInfo, attachments: attachments ?? [] })
            );
            if (!data) throw new Error('SaveTask returned null');

            State.tasks = Array.isArray(data) ? data : State.tasks;
            _render();
            UI.toast?.(successMsg, 'success');
        } catch (err) {
            console.error('Tasks._commit:', err);
            UI.toast?.('Failed to save task', 'error');
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = origLabel || 'Save'; }
        } finally {
            State.isSaving = false;
        }
    }

    // -------------------------  Toggle done (quick)  ------------------------- //

    async function _toggleDone(taskId, checked, checkboxEl) {
        const task = _taskById(taskId);
        if (!task) return;

        // protect unsaved edits open elsewhere (a re-render would discard them)
        if (State.dirty && State.openId !== null) {
            const safe = await _guardLeave();
            if (!safe) { if (checkboxEl) checkboxEl.checked = !checked; return; }
        }

        const status = checked ? DONE : REOPEN;
        const completed = checked ? (task.completed || new Date().toISOString()) : '';

        const fields = {
            TaskID: task.taskID,
            TicketID: State.ticketId,
            title: task.title || '',
            description: task.description || '',
            progressLog: task.progressLog || '',
            status,
            important: task.important ? '1' : '0',
            requiredDate: task.requiredDate ? H.toInputDate(task.requiredDate) : '',
            completed,
        };
        const techId = H.nameToId(task.assignedTech);
        if (techId) fields.assignedTech = techId; // omit when unresolved (don't clear)

        task.status = status; // optimistic
        _updateProgress();
        _updatePip();

        try {
            const data = await API.post(
                'TicketDetails/SaveTask',
                API.authPayload({ objectInfo: _objectInfo(fields), attachments: _echoAttachments(task) })
            );
            if (!data) throw new Error('SaveTask returned null');
            State.tasks = Array.isArray(data) ? data : State.tasks;
            _render();
        } catch (err) {
            console.error('Tasks._toggleDone:', err);
            task.status = checked ? REOPEN : DONE; // revert model
            if (checkboxEl) checkboxEl.checked = !checked;
            _updateProgress();
            _updatePip();
            UI.toast?.('Failed to update task', 'error');
        }
    }

    // -------------------------  Delete  ------------------------- //

    async function _deleteTask(taskId) {
        const task = _taskById(taskId);
        if (!task) return;

        if (State.dirty && State.openId !== null) {
            const safe = await _guardLeave();
            if (!safe) return;
        }

        const ok = await Confirm.ask({
            title: 'Delete task?',
            message: `\u201C${task.title || 'This task'}\u201D will be removed. This can\u2019t be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            danger: true,
        });
        if (!ok) return;

        const snapshot = [...State.tasks];
        State.tasks = State.tasks.filter(t => String(t.taskID) !== String(taskId));
        _render();

        try {
            // Preserve the existing delete write exactly (status 3).
            const objectInfo = _objectInfo({
                TaskID: taskId,
                TicketID: State.ticketId,
                title: task.title || '',
                status: 3,
            });
            const data = await API.post(
                'TicketDetails/SaveTask',
                API.authPayload({ objectInfo, attachments: [] })
            );
            if (!data) throw new Error('Delete returned null');
            if (Array.isArray(data)) { State.tasks = data; _render(); }
        } catch (err) {
            console.error('Tasks._deleteTask:', err);
            State.tasks = snapshot;
            _render();
            UI.toast?.('Failed to delete task', 'error');
        }
    }

    // -------------------------  Progress + pip  ------------------------- //

    function _updateProgress() {
        const relevant = State.tasks.filter(t => H.statusOf(t) !== WITHDRAWN);
        const done = relevant.filter(H.isDone).length;
        const total = relevant.length;
        const pct = total ? Math.round((done / total) * 100) : 0;

        const fill = Dom.progressFill();
        if (fill) { fill.style.width = `${pct}%`; fill.setAttribute('aria-valuenow', pct); }

        const label = Dom.progressLabel();
        if (label) label.textContent = total === 0 ? 'No tasks' : `${done} of ${total} complete`;

        Dom.progressTrack()?.classList.toggle('is-complete', total > 0 && pct === 100);
    }

    function _updatePip() {
        if (typeof Tabs === 'undefined') return;
        const open = State.tasks.filter(t => {
            const s = H.statusOf(t);
            return s !== DONE && s !== WITHDRAWN;
        }).length;
        Tabs.setPip('tasks', open);
    }

    // -------------------------  Unsaved-changes guards  ------------------------- //

    async function _guardLeave() {
        if (!State.dirty || State.openId === null) return true;
        const choice = await Confirm.guard();
        if (choice === 'cancel') return false;
        if (choice === 'discard') { _closeEditor(); return true; }
        if (choice === 'save') {
            const editor = Dom.taskList()?.querySelector('.td-task-item.is-editing .td-task-editor');
            const isNew = State.openId === NEW_ID;
            const task = isNew ? { taskID: '' } : _taskById(State.openId);
            if (editor) await _saveEditor(editor, task || { taskID: '' }, isNew);
            return !State.dirty; // proceed only if the save cleared the dirty flag
        }
        return false;
    }

    function _hookGuards() {
        if (State.guardsHooked) return;
        State.guardsHooked = true;

        window.addEventListener('beforeunload', (e) => {
            if (State.dirty) { e.preventDefault(); e.returnValue = ''; }
        });

        document.addEventListener('click', async (e) => {
            const tab = e.target.closest?.('[role="tab"]');
            if (!tab || tab.id === 'tab-tasks') return;
            if (!State.dirty || State.openId === null) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            const safe = await _guardLeave();
            if (safe) tab.click();
        }, true);
    }

    // -------------------------  Public API  ------------------------- //

    return {
        init,
        refresh: _getTasks,
    };

})();
