// =============================  FilterManager.js  ============================= //

class FilterManager {

    constructor(filterBoxId, options = {}) {
        this.filterBox = document.getElementById(filterBoxId);

        if (!this.filterBox) {
            console.error(`FilterManager: element '${filterBoxId}' not found`);
            return;
        }

        this.filterBody = this.filterBox.querySelector('#Filter-Box-Body');
        this.filterHeader = this.filterBox.querySelector('#Filter-Box-Header');
        this.searchButton = this.filterBox.querySelector('#Search-Button-Filter');
        this.clearButton = this.filterBox.querySelector('#Clear-Button-Filter');
        this.resultsDisplay = this.filterBox.querySelector('#Filter-Results-Count');

        this.options = {
            onSearch: options.onSearch ?? null,
            onClear: options.onClear ?? null,
            searchType: options.searchType ?? 'Ticket',
            autoSave: options.autoSave ?? true,
            storageKey: options.storageKey ?? SEARCH_STORAGE_KEYS[options.searchType ?? 'Ticket'],
            collapsible: options.collapsible ?? true
        };

        this.currentFilters = new Map();
        this.ui = null;

        this.init();
    }

    // -------------------------  Init  ------------------------- //

    init() {
        this._attachEventListeners();
        this._initKeyboardSupport();

        if (this.options.collapsible) {
            this.ui = new FilterUI(this.filterBox, this.filterBody, {
                onToggle: () => this.toggleFilter(),
                onClear: (name) => name ? this.removeFilter(name) : this.clear()
            });
        }

        if (this.options.autoSave) {
            this.loadSavedFilters();
        }
    }

    // -------------------------  Toggle  ------------------------- //

    toggleFilter() {
        this.ui?.isExpanded ? this.collapse() : this.expand();
    }

    expand() {
        this.ui?.expand();
    }

    collapse() {
        this.ui?.collapse();
    }

    // -------------------------  Events  ------------------------- //

    _attachEventListeners() {
        this.searchButton?.addEventListener('click', () => this.search());
        this.clearButton?.addEventListener('click', () => this.clear());
    }

    _initKeyboardSupport() {
        if (!this.filterBox) return;

        this.filterBox.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.matches('input, select')) {
                e.preventDefault();
                this.search();
            }
        });
    }

    // -------------------------  Filter Params  ------------------------- //

    buildFilterParams() {
        const filterParts = [];
        const SKIP_NAMES = ['Day', 'Month', 'Year'];

        for (const input of this.filterBox.querySelectorAll(
            '#Filter-Fields-Container select, #Filter-Fields-Container input'
        )) {
            if (!this._hasValue(input)) continue;
            if (SKIP_NAMES.includes(input.name)) continue;

            const value = this._getValue(input);
            this.currentFilters.set(input.name, value);
            filterParts.push(`${input.name}\`${this._escapeValue(value)}`);
        }

        const myTickets = sessionStorage.getItem(STORAGE_KEYS.MY_TICKETS);
        if (myTickets) filterParts.push(`MySearch\`${myTickets}`);

        const filterString = filterParts.join('|');

        if (this.options.autoSave) {
            sessionStorage.setItem(this.options.storageKey, filterString);
        }

        return filterString;
    }

    _hasValue(input) {
        if (input.type === 'checkbox') return input.checked;
        return !!input.value?.trim();
    }

    _getValue(input) {
        if (input.type === 'checkbox') return input.checked;
        if (input.tagName === 'SELECT') {
            const selected = Array.from(input.selectedOptions).map(o => o.value);
            return selected.length === 1 ? selected[0] : selected.join(',');
        }
        return input.value;
    }

    _escapeValue(value) {
        const div = document.createElement('div');
        div.textContent = String(value);
        return div.innerHTML;
    }

    // -------------------------  Remove Filter  ------------------------- //
    removeFilter(fieldName) {
        const input = this.filterBox.querySelector(`[name="${fieldName}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        }

        this.currentFilters.delete(fieldName);
        this.search();
    }

    // -------------------------  Search  ------------------------- //

    async search() {
        if (!this.searchButton) return;

        this.searchButton.disabled = true;
        const originalText = this.searchButton.textContent;
        this.searchButton.textContent = 'Searching...';

        try {
            const filterString = this.buildFilterParams();
            await this.options.onSearch?.(filterString);

            if (this.options.collapsible) {
                this.ui?.updateChips(this.currentFilters);
                this.collapse();
            }
        } catch (error) {
            console.error('Search error:', error);
            this._showError('Search failed. Please try again.');
        } finally {
            this.searchButton.disabled = false;
            this.searchButton.textContent = originalText;
        }
    }

    // -------------------------  Clear  ------------------------- //

    clear() {
        for (const input of this.filterBox.querySelectorAll(
            '#Filter-Fields-Container select, #Filter-Fields-Container input'
        )) {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        }

        this.currentFilters.clear();

        if (this.resultsDisplay) this.resultsDisplay.textContent = '';
        if (this.options.autoSave) sessionStorage.removeItem(this.options.storageKey);

        this.ui?.updateChips(this.currentFilters);
        this.options.onClear?.();
    }

    // -------------------------  Load Saved  ------------------------- //

    loadSavedFilters() {
        const savedFilter = sessionStorage.getItem(this.options.storageKey);
        if (!savedFilter) return;

        for (const pair of savedFilter.split('|')) {
            const [name, value] = pair.split('`');
            if (!name || value === undefined) continue;

            const input = this.filterBox.querySelector(
                `#Filter-Fields-Container [name="${name}"]`
            );            if (!input) continue;

            if (input.type === 'checkbox') {
                input.checked = value === 'true';
            } else if (input.tagName === 'SELECT') {
                const values = value.split(',');
                Array.from(input.options).forEach(o => o.selected = values.includes(o.value));
            } else {
                input.value = value;
            }

            this.currentFilters.set(name, value);
        }

        this.ui?.updateChips(this.currentFilters);
    }

    // -------------------------  Results  ------------------------- //

    updateResultsCount(count) {
        if (!this.resultsDisplay) return;
        const type = this.options.searchType.toLowerCase();
        const plural = count !== 1 ? 's' : '';
        this.resultsDisplay.textContent = `${count} ${type}${plural} found`;
    }

    // -------------------------  Header  ------------------------- //

    updateHeaderText(text) {
        const headerEl = this.filterHeader?.querySelector('a, h2');
        if (headerEl) headerEl.textContent = text;
    }

    setSearchType(type) {
        this.options.searchType = type;

        const HEADER_TEXTS = {
            'Ticket': 'Search Tickets',
            'Task': 'Search Tasks',
            'RFC': 'Search RFCs',
            'User': 'Search Users'
        };

        this.updateHeaderText(HEADER_TEXTS[type] ?? 'Search');
    }

    // -------------------------  Get / Set  ------------------------- //

    getFilterValue(name) { return this.currentFilters.get(name); }

    setFilterValue(name, value) {
        const input = this.filterBox.querySelector(
            `#Filter-Fields-Container [name="${name}"]`
        );        if (!input) return;

        if (input.type === 'checkbox') {
            input.checked = Boolean(value);
        } else if (input.tagName === 'SELECT') {
            const option = [...input.options].find(o => o.value === value);
            if (option) input.selectedIndex = option.index;
        } else {
            input.value = value;
        }

        this.currentFilters.set(name, value);
    }

    // -------------------------  Error  ------------------------- //

    _showError(message) {
        typeof BuildMessageBox === 'function'
            ? BuildMessageBox(message)
            : alert(message);
    }

    // -------------------------  Destroy  ------------------------- //

    destroy() {
        this.searchButton?.replaceWith(this.searchButton.cloneNode(true));
        this.clearButton?.replaceWith(this.clearButton.cloneNode(true));
        this.currentFilters.clear();
        this.ui = null;
    }
}

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.FilterManager = FilterManager;
}
