// =============================  TaskPage.js  ============================= //

class TaskPage extends PageBase {
    constructor() {
        super();
        this.filterType = 'Task';
        this.config = {
            tableId: 'Table',
            filterBoxId: 'Filter-Box',
            storageKey: 'LastTaskSearch',
            blacklistedColumns: [STORAGE_KEYS.USER_ID, 'progressLog', 'description', 'created']
        };

        this.filterManager = null;
        this.tableManager = null;
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;

        try {
            await Promise.all([
                this.waitForElement(this.config.tableId),
                this.waitForElement(this.config.filterBoxId)
            ]);
        } catch (error) {
            this.handleError('Page elements failed to load.');
            return;
        }

        this._initTableManager();
        this._initFilterManager();
        this._setupPageUI();

        const savedFilter = sessionStorage.getItem(this.config.storageKey) ?? '';
        await this.handleSearch(savedFilter);
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        SetActivePage('TaskMenu');
        SetDetailContainerHeight();
        UserPermissions();
        ChooseSeason();
        DisplayScreen();

        window.addEventListener('resize', () => SetDetailContainerHeight());
    }

    // -------------------------  Managers  ------------------------- //

    _initTableManager() {
        this.tableManager = new TableManager(this.config.tableId, {
            blacklist: this.config.blacklistedColumns,
            onRowClick: (data) => this.handleTaskClick(data),
            sortable: true,
            striped: true,
            hover: true
        });
    }

    _initFilterManager() {
        this.filterManager = new FilterManager(this.config.filterBoxId, {
            searchType: this.filterType,
            storageKey: this.config.storageKey,
            onSearch: (filterString) => this.handleSearch(filterString),
            onClear: () => this.handleSearch(''),
            autoSave: true,
            collapsible: true
        });
    }

    // -------------------------  Search  ------------------------- //

    async handleSearch(filterString) {
        try {
            this.showLoading(this.config.tableId, 'Loading tasks...');
            const data = await this._fetchTasks(filterString);
            this.tableManager.render(data);
            this.filterManager.updateResultsCount(data.length);
        } catch (error) {
            console.error('Search failed:', error);
            this.handleError('Failed to load tasks. Please try again.');
            this.tableManager.renderEmptyState();
        }
    }

    async _fetchTasks(filterString) {
        return API.post('Task/GetTasks',
            API.authPayload({ filter: filterString ?? '' })
        );
    }

    // -------------------------  Navigation  ------------------------- //

    handleTaskClick(data) {
        const taskId = data.taskID ?? data.taskId;
        sessionStorage.setItem(STORAGE_KEYS.TASK_ID, taskId);
        window.location.href = '/Page/TaskDetails';
    }

    // -------------------------  Utility  ------------------------- //

    async refresh() {
        const currentFilter = this.filterManager.buildFilterParams();
        await this.handleSearch(currentFilter);
    }

    destroy() {
        this.filterManager?.destroy();
        this.tableManager?.destroy();
    }
}

// -------------------------  Init  ------------------------- //

document.addEventListener('DOMContentLoaded', () => {
    const page = new TaskPage();
    page.init();
});
