// =============================  CustomFieldBuilder.js  ============================= //

class CustomFieldBuilder {

    constructor() {
        this.fieldTypeHandlers = {
            'Select': config => this._createSelectField(config),
            'checkbox': config => this._createCheckboxField(config),
            'Input': config => this._createInputField(config),
            'textarea': config => this._createTextareaField(config)
        };
    }

    // -------------------------  Public  ------------------------- //

    async changeCustomFields(requestId) {
        const id = requestId ?? this._extractRequestIdFromDOM();
        if (!id) return;

        const data = await API.post('Ticket/ChangeCustomFields',
            API.authPayload({ requestId: parseInt(id) })
        );

        if (data) this._buildCustomFields(data);
    }

    // -------------------------  Build  ------------------------- //

    _buildCustomFields(data) {
        for (const el of document.querySelectorAll('.CustomDiv #Detail-Div')) {
            el.remove();
        }

        const customDiv = document.querySelector('.CustomDiv');
        if (!customDiv) return;

        for (const fieldConfig of data) {
            this._buildCustomField(fieldConfig, customDiv);
        }
    }

    _buildCustomField(fieldConfig, customDiv) {
        const detailDiv = this._createDetailDiv(fieldConfig);
        customDiv.appendChild(detailDiv);

        if (fieldConfig.customFilterObjectType === 'checkbox') {
            document.getElementById(fieldConfig.customFilterItem)
                ?.setAttribute('CheckBox', 'true');
        }
    }

    // -------------------------  DOM Creation  ------------------------- //

    _createDetailDiv(fieldConfig) {
        const outer = document.createElement('div');
        outer.id = 'Detail-Div';
        outer.className = 'full';

        const leftDiv = document.createElement('div');
        leftDiv.id = 'left';

        const label = document.createElement('label');
        label.className = 'Name';
        label.innerText = fieldConfig.customFilterName ?? '';  // innerText — XSS safe

        leftDiv.appendChild(label);

        const rightDiv = document.createElement('div');
        rightDiv.id = 'right';
        rightDiv.appendChild(this._createFieldElement(fieldConfig));

        outer.appendChild(leftDiv);
        outer.appendChild(rightDiv);

        return outer;
    }

    _createFieldElement(fieldConfig) {
        const handler = this.fieldTypeHandlers[fieldConfig.customFilterObjectType]
            ?? (config => this._createDefaultField(config));
        return handler(fieldConfig);
    }

    // -------------------------  Field Creators  ------------------------- //

    _createSelectField(config) {
        const select = document.createElement('select');
        select.className = 'Value';
        select.id = config.customFilterItem;

        if (config.customFilterItem === 'authorityName') {
            select.addEventListener('change', function () {
                FindClients(this);
            });
        }

        return select;
    }

    _createCheckboxField(config) {
        const div = document.createElement('div');
        div.className = 'Value';
        div.id = config.customFilterItem;
        return div;
    }

    _createInputField(config) {
        const input = document.createElement('input');
        input.className = 'Value';
        input.id = config.customFilterItem;

        if (config.customFilterDataType === 'date') {
            input.type = 'date';
        }

        return input;
    }

    _createTextareaField(config) {
        const textarea = document.createElement('textarea');
        textarea.className = 'Value';
        textarea.id = config.customFilterItem;
        textarea.addEventListener('keydown', function () {
            auto_grow(this);
        });
        return textarea;
    }

    _createDefaultField(config) {
        // Whitelist safe element types — prevents XSS via customFilterObjectType
        const SAFE_TYPES = ['input', 'select', 'textarea', 'div', 'span'];
        const type = SAFE_TYPES.includes(config.customFilterObjectType?.toLowerCase())
            ? config.customFilterObjectType
            : 'div';

        const el = document.createElement(type);
        el.className = 'Value';
        el.id = config.customFilterItem;
        return el;
    }

    // -------------------------  Helpers  ------------------------- //

    _extractRequestIdFromDOM() {
        return document.getElementById('RequestDescription')
            ?.getAttribute(STORAGE_KEYS.REQUEST_TYPE) ?? null;
    }
}

// -------------------------  Singleton  ------------------------- //

const customFieldBuilder = new CustomFieldBuilder();

// -------------------------  Legacy Wrapper  ------------------------- //

function ChangeCustomFields(requestId) {
    customFieldBuilder.changeCustomFields(requestId);
}

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.customFieldBuilder = customFieldBuilder;
    window.ChangeCustomFields = ChangeCustomFields;
}
