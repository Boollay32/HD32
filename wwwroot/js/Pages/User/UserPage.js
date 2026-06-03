// =============================  UserPage.js  ============================= //

class UserPage extends PageBase {
    constructor() {
        super();
        this.filterType = 'User';
        this.config = {
            tableId: 'Table',
            filterBoxId: 'Filter-Box',
            storageKey: 'LastUserSearch',
            blacklistedColumns: ['password', 'token', 'salt']
        };

        this.filterManager = null;
        this.tableManager = null;
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;

        if (typeof TableManager === 'undefined' || typeof FilterManager === 'undefined') {
            this.handleError('Required managers not loaded.');
            return;
        }

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

        // Filter fields handled by _FilterBox partial in cshtml — no dynamic fetch needed
        const savedFilter = sessionStorage.getItem(this.config.storageKey) ?? '';
        await this.handleSearch(savedFilter);
    }

    _initTableManager() {
        this.tableManager = new TableManager(this.config.tableId, {
            blacklist: this.config.blacklistedColumns,
            onRowClick: (data) => this.handleUserClick(data),
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
            this.showLoading(this.config.tableId, 'Loading users...');
            const users = await this._fetchUsers(filterString);
            this.tableManager.render(users);
            this.filterManager.updateResultsCount(users.length);
        } catch (error) {
            console.error('Search failed:', error);
            this.handleError('Failed to load users. Please try again.');
            this.tableManager.renderEmptyState();
        }
    }

    async _fetchUsers(filterString) {
        return API.post('User/GetUsers',
            API.authPayload({ filter: filterString ?? '' })
        );
    }

    // -------------------------  Navigation  ------------------------- //

    handleUserClick(data) {
        const userId = data.userId ?? data.userID;
        sessionStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        this.navigateToUserDetails();
    }

    // -------------------------  Utility  ------------------------- //

    async refresh() {
        const currentFilter = this.filterManager.buildFilterParams();
        await this.handleSearch(currentFilter);
    }

    getUserCount() {
        return this.tableManager.getRowCount();
    }

    destroy() {
        this.filterManager?.destroy();
        this.tableManager?.destroy();
    }
}

// -------------------------  Init  ------------------------- //

document.addEventListener('DOMContentLoaded', () => {
    const page = new UserPage();
    page.init();
});
