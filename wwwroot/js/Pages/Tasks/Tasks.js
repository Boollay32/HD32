// =====================  Tasks.js  ===================== //

'use strict';

const Tasks = (() => {

    // -------------------------  Constants  ------------------------- //

    const PRIORITY = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
    };

    const PRIORITY_LABEL = {
        [PRIORITY.LOW]: 'Low',
        [PRIORITY.MEDIUM]: 'Medium',
        [PRIORITY.HIGH]: 'High',
    };

    const PRIORITY_CLASS = {
        [PRIORITY.LOW]: 'priority-low',
        [PRIORITY.MEDIUM]: 'priority-medium',
        [PRIORITY.HIGH]: 'priority-high',
    };

    // -------------------------  State  ------------------------- //

    const State = {
        ticketId: null,
        tasks: [],
        isLoading: false,
        isSaving: false,
        editingId: null,
    };

    // -------------------------  DOM refs  ------------------------- //

    const Dom = {
        taskList: () => document.getElementById('Task-List'),
        progressTrack: () => document.getElementById('task-progress-track'),
        progressFill: () => document.getElementById('task-progress-fill'),
        progressLabel: () => document.getElementById('task-progress-label'),
        addTaskBtn: () => document.getElementById('add-task-btn'),

        overlay: () => document.getElementById('task-overlay'),
        overlayTitle: () => document.getElementById('task-overlay-title'),
        overlayClose: () => document.getElementById('task-overlay-close'),
        overlayForm: () => document.getElementById('task-overlay-form'),
        taskTitleInput: () => document.getElementById('task-title-input'),
        taskAssignee: () => document.getElementById('task-assignee'),
        taskDueDate: () => document.getElementById('task-due-date'),
        taskPriority: () => document.getElementById('task-priority'),
        taskSaveBtn: () => document.getElementById('task-save-btn'),
        taskCancelBtn: () => document.getElementById('task-cancel-btn'),
    };

    // -------------------------  Session  ------------------------- //

    const Session = {
        get token() { return sessionStorage.getItem(STORAGE_KEYS.TOKEN); },
        get userId() { return sessionStorage.getItem(STORAGE_KEYS.USER_ID); },
        get isAdmin() { return parseInt(sessionStorage.getItem(STORAGE_KEYS.ADMIN) ?? '0', 10) >= 1; },
    };

    // -------------------------  Helpers  ------------------------- //

    const Helpers = {

        formatDate(raw) {
            if (!raw) return '—';
            const d = new Date(raw);
            if (isNaN(d)) return '—';
            return d.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
            });
        },

        isOverdue(raw) {
            if (!raw) return false;
            const due = new Date(raw);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return due < today;
        },

        toInputDate(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            if (isNaN(d)) return '';
            return d.toISOString().split('T')[0];
        },

        escapeHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        calcProgress(tasks) {
            if (!tasks.length) return 0;
            const done = tasks.filter(t => t.IsComplete).length;
            return Math.round((done / tasks.length) * 100);
        },
    };

    // -------------------------  ObjectInfo builder  ------------------------- //

    // Builds pipe-backtick string matching SaveTaskRequest.ObjectInfo
    // format: "FieldA`valueA|FieldB`valueB"
    function _buildObjectInfo(fields) {
        return Object.entries(fields)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${k}\`${v}`)
            .join('|');
    }

    // -------------------------  Init  ------------------------- //

    function init(ticketId) {
        State.ticketId = parseInt(ticketId, 10);

        _bindAddTask();
        _bindOverlay();
        _bindDueDateValidation();

        _getTasks();
    }

    // -------------------------  Get tasks  ------------------------- //

    async function _getTasks() {
        if (State.isLoading) return;
        State.isLoading = true;

        try {
            const data = await API.post(
                'TicketDetails/GetTasks',
                API.authPayload({
                    filters: { TicketID: String(State.ticketId) },
                })
            );

            if (!Array.isArray(data)) return;

            State.tasks = data;
            _renderTaskList(data);
            _updateProgress();
            _updatePip();

        } catch (err) {
            console.error('Tasks._getTasks:', err);
            UI.toast?.('Failed to load tasks', 'error');
        } finally {
            State.isLoading = false;
        }
    }

    // -------------------------  Render task list  ------------------------- //

    function _renderTaskList(tasks) {
        const list = Dom.taskList();
        if (!list) return;

        list.innerHTML = '';

        if (tasks.length === 0) {
            list.appendChild(_buildEmptyState());
            return;
        }

        // Sort — incomplete first, then priority desc, then due date asc
        const sorted = [...tasks].sort((a, b) => {
            if (a.IsComplete !== b.IsComplete) return a.IsComplete ? 1 : -1;
            if (b.PriorityID !== a.PriorityID) return b.PriorityID - a.PriorityID;
            if (a.DueDate && b.DueDate) return new Date(a.DueDate) - new Date(b.DueDate);
            return 0;
        });

        const fragment = document.createDocumentFragment();
        sorted.forEach(task => fragment.appendChild(_buildTaskItem(task)));
        list.appendChild(fragment);
    }

    // -------------------------  Append / replace / remove  ------------------------- //

    function _appendTask(task) {
        const list = Dom.taskList();
        if (!list) return;
        list.querySelector('.td-thread-empty')?.remove();
        list.appendChild(_buildTaskItem(task));
    }

    function _replaceTaskItem(taskId, updatedTask) {
        const list = Dom.taskList();
        const item = list?.querySelector(`[data-tid="${taskId}"]`);
        if (!item) return;
        item.replaceWith(_buildTaskItem(updatedTask));
    }

    function _removeTaskItem(taskId) {
        const list = Dom.taskList();
        const item = list?.querySelector(`[data-tid="${taskId}"]`);
        if (!item) return;
        item.remove();
        if (list.children.length === 0) list.appendChild(_buildEmptyState());
    }

    // -------------------------  Empty state  ------------------------- //

    function _buildEmptyState() {
        const div = document.createElement('div');
        div.className = 'td-thread-empty';
        div.setAttribute('aria-label', 'No tasks yet');
        div.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <p>No tasks yet.<br>Add a task below.</p>
        `;
        return div;
    }

    // -------------------------  Task item builder  ------------------------- //

    function _buildTaskItem(task) {
        const item = document.createElement('div');
        item.className = 'td-task-item';
        item.dataset.tid = task.TaskID;

        if (task.IsComplete) item.classList.add('is-complete');
        if (Helpers.isOverdue(task.DueDate) && !task.IsComplete) item.classList.add('is-overdue');

        const priorityClass = PRIORITY_CLASS[task.PriorityID] ?? 'priority-low';
        const priorityLabel = PRIORITY_LABEL[task.PriorityID] ?? 'Low';
        const dueDateLabel = task.DueDate ? Helpers.formatDate(task.DueDate) : '—';

        item.innerHTML = `
            <div class="td-task-check">
                <input type="checkbox"
                       id="task-check-${task.TaskID}"
                       aria-label="Mark task complete"
                       ${task.IsComplete ? 'checked' : ''}>
                <label for="task-check-${task.TaskID}" aria-hidden="true"></label>
            </div>
            <div class="td-task-body">
                <span class="td-task-title">${Helpers.escapeHtml(task.Title ?? '')}</span>
                <span class="td-task-meta">
                    <span class="td-task-priority ${priorityClass}">${priorityLabel}</span>
                    <span class="td-task-due ${Helpers.isOverdue(task.DueDate) && !task.IsComplete ? 'is-overdue' : ''}">
                        ${dueDateLabel}
                    </span>
                    ${task.AssignedTech
                ? `<span class="td-task-assignee">${Helpers.escapeHtml(task.AssignedTech)}</span>`
                : ''}
                </span>
            </div>
            <div class="td-task-actions">
                <button type="button" class="td-task-edit-btn" aria-label="Edit task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.2"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button type="button" class="td-task-delete-btn" aria-label="Delete task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.2"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                </button>
            </div>
        `;

        // Checkbox — toggle complete
        item.querySelector('input[type="checkbox"]')
            ?.addEventListener('change', (e) => {
                _toggleComplete(task.TaskID, e.target.checked);
            });

        // Edit button
        item.querySelector('.td-task-edit-btn')
            ?.addEventListener('click', () => _openOverlay(task));

        // Delete button
        item.querySelector('.td-task-delete-btn')
            ?.addEventListener('click', () => _deleteTask(task.TaskID));

        return item;
    }

    // -------------------------  Toggle complete  ------------------------- //

    async function _toggleComplete(taskId, isComplete) {
        const task = State.tasks.find(t => t.TaskID === taskId);
        if (!task) return;

        // Optimistic update
        task.IsComplete = isComplete;
        _updateProgress();
        _updatePip();

        const objectInfo = _buildObjectInfo({
            TaskID: taskId,
            TicketID: State.ticketId,
            title: task.Title,
            completed: isComplete ? new Date().toISOString() : '',
            status: isComplete ? 2 : 1,
        });

        try {
            const data = await API.post(
                'TicketDetails/SaveTask',
                API.authPayload({ objectInfo, attachments: [] })
            );

            if (!data) throw new Error('SaveTask returned null');

            // Server returns updated task list
            const tasks = Array.isArray(data) ? data : State.tasks;
            State.tasks = tasks;
            _renderTaskList(tasks);
            _updateProgress();
            _updatePip();

        } catch (err) {
            console.error('Tasks._toggleComplete:', err);

            // Revert optimistic
            task.IsComplete = !isComplete;
            _updateProgress();
            _updatePip();

            // Revert checkbox
            const checkbox = Dom.taskList()
                ?.querySelector(`[data-tid="${taskId}"] input[type="checkbox"]`);
            if (checkbox) checkbox.checked = !isComplete;

            UI.toast?.('Failed to update task', 'error');
        }
    }

    // -------------------------  Progress bar  ------------------------- //

    function _updateProgress() {
        const pct = Helpers.calcProgress(State.tasks);
        const fill = Dom.progressFill();
        const label = Dom.progressLabel();

        if (fill) {
            fill.style.width = `${pct}%`;
            fill.setAttribute('aria-valuenow', pct);
        }

        if (label) {
            const done = State.tasks.filter(t => t.IsComplete).length;
            const total = State.tasks.length;
            label.textContent = total === 0 ? 'No tasks' : `${done} of ${total} complete`;
        }

        Dom.progressTrack()?.classList.toggle('is-complete', pct === 100);
    }

    // -------------------------  Tab pip  ------------------------- //

    function _updatePip() {
        if (typeof Tabs === 'undefined') return;
        const incomplete = State.tasks.filter(t => !t.IsComplete).length;
        Tabs.setPip('tasks', incomplete);
    }

    // -------------------------  Overlay binding  ------------------------- //

    function _bindOverlay() {
        Dom.overlayClose()?.addEventListener('click', _closeOverlay);
        Dom.taskCancelBtn()?.addEventListener('click', _closeOverlay);
        Dom.taskSaveBtn()?.addEventListener('click', _saveTask);

        Dom.overlay()?.addEventListener('click', (e) => {
            if (e.target === Dom.overlay()) _closeOverlay();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !Dom.overlay()?.hasAttribute('hidden')) {
                _closeOverlay();
            }
        });

        Dom.overlayForm()?.addEventListener('submit', (e) => {
            e.preventDefault();
            _saveTask();
        });
    }

    function _bindAddTask() {
        Dom.addTaskBtn()?.addEventListener('click', () => _openOverlay(null));
    }

    // -------------------------  Open / close overlay  ------------------------- //

    function _openOverlay(task = null) {
        State.editingId = task?.TaskID ?? null;

        const overlay = Dom.overlay();
        const title = Dom.overlayTitle();
        if (!overlay || !title) return;

        title.textContent = task ? 'Edit Task' : 'Add Task';

        Dom.taskTitleInput().value = task?.Title ?? '';
        Dom.taskAssignee().value = task?.AssignedTech ?? '';
        Dom.taskDueDate().value = Helpers.toInputDate(task?.DueDate);
        Dom.taskPriority().value = task?.PriorityID ?? PRIORITY.MEDIUM;

        overlay.removeAttribute('hidden');
        setTimeout(() => Dom.taskTitleInput()?.focus(), 50);
    }

    function _closeOverlay() {
        Dom.overlay()?.setAttribute('hidden', '');
        State.editingId = null;
        Dom.overlayForm()?.reset();
    }

    // -------------------------  Save task  ------------------------- //

    async function _saveTask() {
        if (State.isSaving) return;

        const titleInput = Dom.taskTitleInput();
        const title = titleInput?.value.trim();

        if (!title) {
            titleInput?.focus();
            UI.toast?.('Please enter a task title', 'warning');
            return;
        }

        const isEdit = !!State.editingId;

        const objectInfo = _buildObjectInfo({
            TaskID: State.editingId ?? '',
            TicketID: State.ticketId,
            title,
            assignedTech: Dom.taskAssignee()?.value || '',
            requiredDate: Dom.taskDueDate()?.value || '',
            status: parseInt(Dom.taskPriority()?.value ?? PRIORITY.MEDIUM, 10),
        });

        State.isSaving = true;
        _setOverlayLoading(true);

        try {
            const data = await API.post(
                'TicketDetails/SaveTask',
                API.authPayload({ objectInfo, attachments: [] })
            );

            if (!data) throw new Error('SaveTask returned null');

            // Server returns updated task list
            const tasks = Array.isArray(data) ? data : State.tasks;
            State.tasks = tasks;
            _renderTaskList(tasks);
            _updateProgress();
            _updatePip();
            _closeOverlay();

            UI.toast?.(isEdit ? 'Task updated' : 'Task added', 'success');

        } catch (err) {
            console.error('Tasks._saveTask:', err);
            UI.toast?.('Failed to save task', 'error');

        } finally {
            State.isSaving = false;
            _setOverlayLoading(false);
        }
    }

    // -------------------------  Delete task  ------------------------- //

    async function _deleteTask(taskId) {
        const task = State.tasks.find(t => t.TaskID === taskId);
        if (!task) return;

        const confirmed = window.confirm(`Delete task "${task.Title}"? This cannot be undone.`);
        if (!confirmed) return;

        // Optimistic remove
        State.tasks = State.tasks.filter(t => t.TaskID !== taskId);
        _removeTaskItem(taskId);
        _updateProgress();
        _updatePip();

        try {
            const objectInfo = _buildObjectInfo({
                TaskID: taskId,
                TicketID: State.ticketId,
                title: task.Title,
                status: 3, // deleted/cancelled status
            });

            const data = await API.post(
                'TicketDetails/SaveTask',
                API.authPayload({ objectInfo, attachments: [] })
            );

            if (!data) throw new Error('DeleteTask returned null');

        } catch (err) {
            console.error('Tasks._deleteTask:', err);

            // Revert
            State.tasks.push(task);
            _renderTaskList(State.tasks);
            _updateProgress();
            _updatePip();

            UI.toast?.('Failed to delete task', 'error');
        }
    }

    // -------------------------  Overlay loading state  ------------------------- //

    function _setOverlayLoading(loading) {
        const saveBtn = Dom.taskSaveBtn();
        const cancelBtn = Dom.taskCancelBtn();
        const titleInput = Dom.taskTitleInput();

        if (!saveBtn) return;

        saveBtn.disabled = loading;
        saveBtn.textContent = loading ? 'Saving…' : 'Save Task';

        if (cancelBtn) cancelBtn.disabled = loading;
        if (titleInput) titleInput.disabled = loading;
    }

    // -------------------------  Due date validation  ------------------------- //

    function _bindDueDateValidation() {
        Dom.taskDueDate()?.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) return;

            const selected = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selected < today) {
                UI.toast?.('Due date cannot be in the past', 'warning');
                e.target.value = '';
            }
        });
    }

    // -------------------------  Public API  ------------------------- //

    return {
        init,
        refresh: _getTasks,
    };

})();
