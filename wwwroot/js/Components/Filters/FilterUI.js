// =============================  FilterUI.js  ============================= //

class FilterUI {

    constructor(filterBox, filterBody, callbacks = {}) {
        this.filterBox = filterBox;
        this.filterBody = filterBody;
        this.onToggle = callbacks.onToggle ?? (() => { });
        this.onClear = callbacks.onClear ?? (() => { });
        this.isExpanded = false;

        this._setup();
    }

    // -------------------------  Setup  ------------------------- //

    _setup() {
        const header = document.createElement('div');
        header.className = 'filter-compact-header';

        this._toggleBtn = document.createElement('button');
        this._toggleBtn.className = 'filter-toggle';
        this._toggleBtn.innerHTML = `
            <span class="toggle-icon">🔍</span>
            <span class="toggle-text">Filters</span>
            <span class="toggle-chevron">▼</span>`;

        this._chipsContainer = document.createElement('div');
        this._chipsContainer.className = 'filter-chips-preview';

        this._clearAllBtn = document.createElement('button');
        this._clearAllBtn.className = 'filter-clear-all';
        this._clearAllBtn.style.display = 'none';
        this._clearAllBtn.innerText = 'Clear All';

        header.appendChild(this._toggleBtn);
        header.appendChild(this._chipsContainer);
        header.appendChild(this._clearAllBtn);

        this.filterBox.insertBefore(header, this.filterBody);

        this.filterBody.style.display = 'none';
        this.filterBox.classList.add('collapsed');

        this._toggleBtn.addEventListener('click', () => this.onToggle());
        this._clearAllBtn.addEventListener('click', () => this.onClear());

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.onToggle();
            }
        });
    }

    // -------------------------  Expand / Collapse  ------------------------- //

    expand() {
        this.isExpanded = true;
        this.filterBody.style.display = 'flex';
        this.filterBox.classList.replace('collapsed', 'expanded');
        this._setChevron('▲');

        const firstInput = this.filterBody.querySelector('input, select');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }

    collapse() {
        this.isExpanded = false;
        this.filterBody.style.display = 'none';
        this.filterBox.classList.replace('expanded', 'collapsed');
        this._setChevron('▼');
    }

    _setChevron(symbol) {
        const chevron = this.filterBox.querySelector('.toggle-chevron');
        if (chevron) chevron.textContent = symbol;
    }

    // -------------------------  Chips  ------------------------- //

    updateChips(currentFilters) {
        if (!this._chipsContainer) return;

        this._chipsContainer.innerHTML = '';
        let chipCount = 0;

        const HIDDEN_FILTERS = ['MySearch', 'UserID'];

        for (const [name, value] of currentFilters) {
            if (!value || value === '' || value === 'false') continue;
            if (HIDDEN_FILTERS.includes(name)) continue;

            this._chipsContainer.appendChild(
                this._createChip(name, value)
            );
            chipCount++;
        }

        this._clearAllBtn.style.display = chipCount > 0 ? 'block' : 'none';
    }

    _createChip(name, value) {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';

        const labelEl = document.createElement('span');
        labelEl.className = 'chip-label';
        labelEl.innerText = `${this._getFriendlyLabel(name)}:`;

        const valueEl = document.createElement('span');
        valueEl.className = 'chip-value';
        valueEl.innerText = this._getFriendlyValue(name, value);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'chip-remove';
        removeBtn.dataset.filter = name;
        removeBtn.innerText = '×';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onClear(name);
        });

        chip.appendChild(labelEl);
        chip.appendChild(valueEl);
        chip.appendChild(removeBtn);

        return chip;
    }

    _getFriendlyLabel(fieldName) {
        const LABELS = {
            'TicketID': 'ID',
            'Subject': 'Subject',
            [STORAGE_KEYS.REQUEST_TYPE]: 'Type',
            'Status': 'Status',
            'AssignedTech': 'Tech',
            'Authority': 'Authority',
            'Category': 'Category',
            'Priority': 'Priority',
            'DateFrom': 'From',
            'DateTo': 'To'
        };
        return LABELS[fieldName] ?? fieldName;
    }

    _getFriendlyValue(fieldName, value) {
        const input = this.filterBox.querySelector(`[name="${fieldName}"]`);

        if (input?.tagName === 'SELECT') {
            return input.options[input.selectedIndex]?.textContent ?? value;
        }

        if (typeof value === 'string' && value.length > 20) {
            return `${value.substring(0, 20)}...`;
        }

        return value;
    }
}

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.FilterUI = FilterUI;
}
