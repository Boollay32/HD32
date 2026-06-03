// =============================  TablePage.js  ============================= //

class TablePage extends PageBase {
    constructor() {
        super();
        this.tableName = sessionStorage.getItem(STORAGE_KEYS.TABLE_PAGE_NAME) ?? '';

        const storageKeyMap = {
            'Ticket': STORAGE_KEYS.LAST_TICKET_SEARCH,
            'ChangeRequest': STORAGE_KEYS.LAST_RFC_SEARCH,
            'User': STORAGE_KEYS.LAST_TICKET_SEARCH  // no dedicated user search key
        };

        this.config = {
            tableId: 'Table',
            filterBoxId: 'Filter-Box',
            storageKey: storageKeyMap[this.tableName] ?? STORAGE_KEYS.LAST_TICKET_SEARCH,
            blacklistedColumns: ['updated', STORAGE_KEYS.USER_NAME, 'priority', 'statusDesc'],
            statusFilter: 'status/Resolved'
        };

        this.filterManager = null;
        this.tableManager = null;
    }


    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;

        sessionStorage.removeItem(STORAGE_KEYS.LOGIN_PAGE);
        sessionStorage.setItem(STORAGE_KEYS.SEARCH_OR_TICKET, '0');

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

        await this.buildFilterFields(this.tableName);

        const savedFilter = sessionStorage.getItem(this.config.storageKey) ?? '';
        await this.handleSearch(savedFilter);
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        SetActivePage(`${this.tableName}Menu`);
        PaneLayout.setTableDimensions();
        Auth.checkPermissions();
        PaneLayout.chooseSeason();
        PaneLayout.displayScreen();

        // Fix: event listeners — replaces inline onclick/onmouseover in view
        document.getElementById('FilterTab')
            ?.addEventListener('mouseover', () => ExpandFilter(true));
        document.getElementById('Table-Div-Outer')
            ?.addEventListener('mouseover', () => ExpandFilter(false));
        document.getElementById('Search-Button-Filter')
            ?.addEventListener('click', () => this.handleSearch(
                this.filterManager.buildFilterParams()));
        document.getElementById('Clear-Button-Filter')
            ?.addEventListener('click', () => this.handleSearch(''));

        window.addEventListener('resize', () => {
            PaneLayout.setTableDimensions();
            PaneLayout.setHeaderWidths();
        });
    }

    // -------------------------  Managers  ------------------------- //

    _initTableManager() {
        this.tableManager = new TableManager(this.config.tableId, {
            blacklist: this.config.blacklistedColumns,
            statusFilter: this.config.statusFilter,
            onRowClick: (data) => this.handleRowClick(data),
            onRowRender: (row, data) => this._addNotification(row, data),
            sortable: true,
            striped: true,
            hover: true
        });
    }

    _initFilterManager() {
        this.filterManager = new FilterManager(this.config.filterBoxId, {
            searchType: this.tableName,
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
            UI.toggleWaiting();
            this.showLoading(this.config.tableId, `Loading ${this.tableName}s...`);

            const data = await this._fetchData(filterString);
            this.tableManager.render(data);
            this.filterManager.updateResultsCount(data.length);

            PaneLayout.setTableDimensions();
            setTimeout(() => PaneLayout.setHeaderWidths(), 100);

        } catch (error) {
            console.error('Search failed:', error);
            this.handleError(`Failed to load ${this.tableName}s. Please try again.`);
            this.tableManager.renderEmptyState();
        } finally {
            UI.toggleWaiting();
        }
    }

    async _fetchData(filterString) {
        // Fix: guard against empty tableName — prevents 'Ticket/Gets' invalid endpoint
        if (!this.tableName) {
            this.handleError('Page type not set. Please navigate from the menu.');
            return [];
        }

        const myTickets = sessionStorage.getItem(STORAGE_KEYS.MY_TICKETS) ?? '1';
        return API.post(`Ticket/Get${this.tableName}s`,
            API.authPayload({
                filter: filterString ?? '',
                myTicket: myTickets,
                personalSearch: myTickets
            })
        );
    }

    // -------------------------  Row Click  ------------------------- //

    handleRowClick(data) {
        const id = data.ticketID ?? data.userID ?? data.changeRequestId;
        const key = this._getStorageKey();
        if (key) sessionStorage.setItem(key, id);
        this._navigate();
    }

    _getStorageKey() {
        const keyMap = {
            'Ticket': STORAGE_KEYS.TICKET_ID,
            'User': STORAGE_KEYS.USER_ID,
            'ChangeRequest': STORAGE_KEYS.CHANGE_REQUEST_ID
        };
        return keyMap[this.tableName] ?? null;
    }

    _navigate() {
        const routeMap = {
            'Ticket': () => Nav.toTicketDetails(),
            'User': () => Nav.toUserDetails(),
            'ChangeRequest': () => Nav.toRFCDetails()
        };
        routeMap[this.tableName]?.();
    }

    // -------------------------  Notifications  ------------------------- //

    _addNotification(row, data) {
        const notifyValue = String(data.notifyValue ?? data.notify ?? '2');
        const ticketId = data.ticketID ?? data.id ?? '';

        if (notifyValue === '2') return;

        const admin = sessionStorage.getItem(STORAGE_KEYS.ADMIN);
        if (!admin) return;

        const isGovtechUser = ['1', '2', '4', '5'].includes(admin);
        const shouldNotify = isGovtechUser
            ? notifyValue === '0'
            : notifyValue === '1';

        if (shouldNotify && row.firstChild) {
            row.firstChild.innerText = `⦿ ${ticketId}`;
            row.firstChild.style.color = 'orange';
        }
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

const tablePage = new TablePage();
document.addEventListener('DOMContentLoaded', () => tablePage.init());

// -------------------------  Legacy Wrappers  ------------------------- //

function GetTable(filter, name, personal) { tablePage.handleSearch(filter); }
function GetTickets(filter) { tablePage.handleSearch(filter); }
function AddNotificationToRow(row, id, val) {
    tablePage._addNotification(row, { notifyValue: val, ticketID: id });
}
