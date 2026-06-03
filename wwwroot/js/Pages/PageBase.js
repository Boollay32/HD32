// =============================  PageBase.js  ============================= //

const FILTER_TYPE_MAP = {
    'Input': 'text',
    'Select': 'select',
    'Dropdown': 'select',
    'Date': 'date',
    'DateTime': 'datetime-local',
    'Checkbox': 'checkbox'
};

class PageBase {
    constructor(filterType = 'Ticket') {
        this.ticketId = sessionStorage.getItem(STORAGE_KEYS.TICKET_ID);
        this.username = sessionStorage.getItem(STORAGE_KEYS.USER_NAME);
        this.filterType = filterType;
    }


    // -------------------------  Auth  ------------------------- //

    async checkAuth() {
        if (!API.isAuthenticated()) {
            API.handleSessionTimeout();
            return false;
        }
        return await API.verifySession();
    }

    // -------------------------  Notifications  ------------------------- //

    _determineNotificationType(originalType) {
        const newTech = sessionStorage.getItem(STORAGE_KEYS.NEW_ASSIGNED_TECH);
        const oldTech = sessionStorage.getItem(STORAGE_KEYS.OLD_ASSIGNED_TECH);

        return originalType === 'Update' && newTech !== oldTech
            ? 'Assigned'
            : originalType;
    }

    _sendNotificationEmail(type, notificationType, id) {
        const finalType = this._determineNotificationType(notificationType);
        SendNotificationEmail(
            type,
            finalType,
            id,
            this.username,
            getItemOwner()
        );
    }


    // -------------------------  Navigation  ------------------------- //

    navigateToTicketDetails() {
        if (typeof TicketDetailsView === 'function') {
            TicketDetailsView();
        } else {
            window.location.href = '/Page/TicketDetails';
        }
    }

    navigateToTicketList() {
        if (typeof TicketPageView === 'function') {
            TicketPageView();
        } else {
            window.location.href = '/Page/Tickets';
        }
    }

    navigateToRFCDetails() {
        if (typeof RFCDetailsView === 'function') {
            RFCDetailsView();
        } else {
            window.location.href = '/Page/RFCDetails';
        }
    }

    navigateToRFCList() {
        if (typeof RFCPageView === 'function') {
            RFCPageView();
        } else {
            window.location.href = '/Page/RFC';
        }
    }

    navigateToUserDetails() {
        if (typeof UserDetailsView === 'function') {
            UserDetailsView();
        } else {
            window.location.href = '/Page/UserDetails';
        }
    }

    // -------------------------  Session  ------------------------- //

    saveTicketId(ticketId) {
        sessionStorage.setItem(STORAGE_KEYS.TICKET_ID, ticketId);
        this.ticketId = ticketId;
    }

    saveTaskId(taskId) {
        sessionStorage.setItem(STORAGE_KEYS.TASK_ID, taskId);
    }

    // -------------------------  DOM Helpers  ------------------------- //

    waitForElement(elementId, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const element = document.getElementById(elementId);
            if (element) {
                resolve(element);
                return;
            }

            const interval = 50;
            let elapsed = 0;

            const check = setInterval(() => {
                const el = document.getElementById(elementId);
                if (el) {
                    clearInterval(check);
                    resolve(el);
                } else {
                    elapsed += interval;
                    if (elapsed >= timeout) {
                        clearInterval(check);
                        reject(new Error(`Element '${elementId}' not found after ${timeout}ms`));
                    }
                }
            }, interval);
        });
    }

    // -------------------------  Error Handling  ------------------------- //

    handleError(message, redirectTo = null) {
        console.error(message);
        BuildMessageBox(message, redirectTo ?? 'Index');
    }

    // -------------------------  Filter Building  ------------------------- //

    async buildFilterFields(containerId = 'Filter-Fields-Container') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="filter-loading">Loading filters...</div>';

        try {
            const [filterConfig, allDropdowns] = await Promise.all([
                this.fetchFilterConfiguration(),
                this.fetchAllDropdowns()
            ]);

            if (!filterConfig?.length) {
                container.innerHTML = '<div class="filter-empty">No filters available</div>';
                return;
            }

            container.innerHTML = '';
            for (const field of filterConfig) {
                const el = this.createFilterField(field, allDropdowns);
                if (el) container.appendChild(el);
            }

        } catch (error) {
            console.error('Filter build failed:', error);
            container.innerHTML = '<div class="filter-error">Failed to load filters</div>';
        }
    }

    async fetchFilterConfiguration() {
        const result = await API.post('Misc/GetFilterItems',
            API.authPayload({ group: this.filterType })
        );

        if (!Array.isArray(result)) return [];

        return result.map(item => ({
            name: item.FilterItem ?? item.FilterName,
            label: item.FilterName,
            type: FILTER_TYPE_MAP[item.FilterObjectType] ?? 'text',
            dataType: item.FilterDataType,
            group: item.FilterGroup,
            tableName: item.FilterItem ?? item.FilterName,
            placeholder: item.Placeholder ?? ''
        }));
    }

    async fetchAllDropdowns() {
        const result = await API.post('Misc/GetDropDownList',
            API.authPayload({ filter: '1', group: this.filterType })
        );
        return (result && typeof result === 'object') ? result : {};
    }

    // -------------------------  Filter Field Creation  ------------------------- //

    createFilterField(fieldConfig, dropdownData = {}) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'filter-row';

        const label = document.createElement('label');
        label.setAttribute('for', `filter-${fieldConfig.name.toLowerCase()}`);
        label.textContent = fieldConfig.label ?? fieldConfig.name;
        fieldDiv.appendChild(label);

        const input = this._createInput(fieldConfig, dropdownData);
        if (input) fieldDiv.appendChild(input);

        return fieldDiv;
    }

    _createInput(fieldConfig, dropdownData) {
        switch (fieldConfig.type) {
            case 'select': return this._createSelectInput(fieldConfig, dropdownData);
            case 'date': return this._createDateInput(fieldConfig);
            default: return this._createTextInput(fieldConfig);
        }
    }

    _createSelectInput(fieldConfig, dropdownData) {
        const select = document.createElement('select');
        select.id = `filter-${fieldConfig.name.toLowerCase()}`;
        select.name = fieldConfig.name;
        select.add(new Option(`All ${fieldConfig.label ?? fieldConfig.name}`, ''));

        const options = dropdownData[fieldConfig.tableName];
        if (Array.isArray(options)) {
            for (const item of options) {
                select.add(new Option(
                    item.Descr ?? item.descr ?? item.name ?? '',
                    item.ID ?? item.id ?? ''
                ));
            }
        }
        return select;
    }

    _createDateInput(fieldConfig) {
        const input = document.createElement('input');
        input.type = 'date';
        input.id = `filter-${fieldConfig.name.toLowerCase()}`;
        input.name = fieldConfig.name;
        return input;
    }

    _createTextInput(fieldConfig) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `filter-${fieldConfig.name.toLowerCase()}`;
        input.name = fieldConfig.name;
        if (fieldConfig.placeholder) input.placeholder = fieldConfig.placeholder;
        return input;
    }

    // -------------------------  Loading  ------------------------- //

    showLoading(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <p>${message}</p>
                </div>`;
        }
    }
}
