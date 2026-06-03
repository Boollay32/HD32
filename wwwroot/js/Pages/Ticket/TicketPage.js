// =============================  TicketPage.js  ============================= //

class TicketPage extends PageBase {

    constructor() {
        super();
        this.filterType = 'Ticket';
        this.config = {
            tableId: 'Table',
            filterBoxId: 'Filter-Box',
            storageKey: STORAGE_KEYS.LAST_TICKET_SEARCH,  // filter state
            blacklistedColumns: [
                STORAGE_KEYS.USER_ID,
                'updated',
                'userName',
                'statusDesc',
                'priority',
                'notify'
            ]

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
            await this.buildFilterFields();
        } catch (err) {
            console.error('Filter build failed:', err);
        }

        await this.handleSearch('');
    }

    // -------------------------  Managers  ------------------------- //

    _initTableManager() {
        this.tableManager = new TableManager(this.config.tableId, {
            blacklist: this.config.blacklistedColumns,
            onRowClick: (data) => this.handleTicketClick(data),
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
            this.showLoading(this.config.tableId, 'Loading tickets...');

            const tickets = await this._fetchTickets(filterString);
            this.tableManager.render(tickets);
            this.filterManager.updateResultsCount(tickets.length);

        } catch (error) {
            console.error('Search failed:', error);
            this.handleError('Failed to load tickets. Please try again.');
            this.tableManager.renderEmptyState();
        }
    }

    async _fetchTickets(filterString) {
        const filters = this._parseFilterString(filterString);
        console.log('filterString:', filterString);
        console.log('filters dict:', filters);

        return API.post('Ticket/GetTickets', API.authPayload({
            myTicket: parseInt(sessionStorage.getItem(STORAGE_KEYS.MY_TICKETS) ?? '1'),
            filters: filters
        }));
    }

    _parseFilterString(filterString) {
        if (!filterString) return {};

        const filters = {};
        for (const part of filterString.split('|')) {
            const [key, value] = part.split('`');
            if (key && value !== undefined && value !== '')
                filters[key] = value;
        }
        return filters;
    }

    // -------------------------  Navigation  ------------------------- //

    handleTicketClick(data) {
        console.log('handleTicketClick data:', data); // check ticketID value
        const ticketId = data.linkedTicketID ?? data.ticketID;
        console.log('resolved ticketId:', ticketId);  // check what's being saved

        this.saveTicketId(ticketId);

        if (data.linkedTicketID) {
            this.saveTaskId(data.ticketID);  // Fix: ticketID not ticketId
        }

        this.navigateToTicketDetails();
    }

    // -------------------------  Utility  ------------------------- //

    async refresh() {
        const currentFilter = this.filterManager.buildFilterParams();
        await this.handleSearch(currentFilter);
    }

    getTicketCount() {
        return this.tableManager.getRowCount();
    }

    destroy() {
        this.filterManager?.destroy();
        this.tableManager?.destroy();
    }
}

// -------------------------  Init  ------------------------- //

const ticketPage = new TicketPage();  // stored — accessible externally

document.addEventListener('DOMContentLoaded', () => {
    ticketPage.init();
});

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.ticketPage = ticketPage;
}
