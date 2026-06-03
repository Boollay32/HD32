// =============================  RFCPage.js  ============================= //

class RFCPage extends PageBase {

    constructor() {
        super();
        this.filterType = 'RFC';
        this.config = {
            tableId: 'Table',
            filterBoxId: 'Filter-Box',
            storageKey: STORAGE_KEYS.LAST_RFC_SEARCH,  // Fix: STORAGE_KEYS
            blacklistedColumns: ['updated', 'createdBy', 'modifiedBy']
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
        } catch {
            this.handleError('Page elements failed to load.');
            return;
        }

        this._initTableManager();
        this._initFilterManager();

        try {
            await this.buildFilterFields();  // Fix: properly awaited
        } catch (err) {
            console.error('Filter build failed:', err);
        }

        const savedFilter = sessionStorage.getItem(this.config.storageKey) ?? '';
        await this.handleSearch(savedFilter);
    }

    // -------------------------  Managers  ------------------------- //

    _initTableManager() {
        this.tableManager = new TableManager(this.config.tableId, {
            blacklist: this.config.blacklistedColumns,
            onRowClick: (data) => this.handleRFCClick(data),
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
            this.showLoading(this.config.tableId, 'Loading RFCs...');

            const rfcs = await this._fetchRFCs(filterString);
            this.tableManager.render(rfcs);
            this.filterManager.updateResultsCount(rfcs.length);

        } catch (error) {
            console.error('Search failed:', error);
            this.handleError('Failed to load RFCs. Please try again.');
            this.tableManager.renderEmptyState();
        }
    }

    async _fetchRFCs(filterString) {
        return API.post('ChangeRequest/GetChangeRequests',
            API.authPayload({ filter: filterString ?? '' })
        );
    }

    // -------------------------  Navigation  ------------------------- //

    handleRFCClick(data) {
        const rfcId = data.rfcID ?? data.rfcId ?? data.id;  // rfcID first — prefer uppercase
        sessionStorage.setItem(STORAGE_KEYS.RFC_ID, rfcId); // Fix: STORAGE_KEYS
        this.navigateToRFCDetails();
    }

    // -------------------------  Utility  ------------------------- //

    async refresh() {
        const currentFilter = this.filterManager.buildFilterParams();
        await this.handleSearch(currentFilter);
    }

    getRFCCount() {
        return this.tableManager.getRowCount();
    }

    destroy() {
        this.filterManager?.destroy();
        this.tableManager?.destroy();
    }
}

// -------------------------  Init  ------------------------- //

const rfcPage = new RFCPage();  // Fix: stored — accessible externally

document.addEventListener('DOMContentLoaded', () => {
    rfcPage.init();
});

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.rfcPage = rfcPage;
}
