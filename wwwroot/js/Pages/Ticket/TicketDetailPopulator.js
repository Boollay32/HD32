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
        document.querySelectorAll('.CustomDiv #Detail-Div')
            .forEach(el => el.remove());

        for (const fieldConfig of data) {
            this._buildCustomField(fieldConfig);
        }
    }

    _buildCustomField(fieldConfig) {
        const customDiv = document.querySelector('.CustomDiv');
        if (!customDiv) return;

        customDiv.insertAdjacentHTML('beforeend',
            this._generateCustomFieldHTML(fieldConfig)
        );

        if (fieldConfig.customFilterObjectType === 'checkbox') {
            document.getElementById(fieldConfig.customFilterItem)
                ?.setAttribute('CheckBox', 'true');
        }
    }

    // -------------------------  HTML Generation  ------------------------- //

    _generateCustomFieldHTML(fieldConfig) {
        const content = this._generateFieldContent(fieldConfig);
        return `
            <div id="Detail-Div" class="full">
                <div id="left">
                    <label class="Name">${this._escapeHtml(fieldConfig.customFilterName)}</label>
                </div>
                <div id="right">
                    ${content}
                </div>
            </div>`.trim();
    }

    _generateFieldContent(fieldConfig) {
        const handler = this.fieldTypeHandlers[fieldConfig.customFilterObjectType]
            ?? (config => this._createDefaultField(config));
        return handler(fieldConfig);
    }

    // -------------------------  Field Creators  ------------------------- //

    _createSelectField(config) {
        const onChange = config.customFilterItem === 'authorityName'
            ? 'onchange="FindClients(this)"'
            : '';
        return `<select class="Value" id="${config.customFilterItem}" ${onChange}></select>`;
    }

    _createCheckboxField(config) {
        return `<div class="Value" id="${config.customFilterItem}"></div>`;
    }

    _createInputField(config) {
        const type = config.customFilterDataType === 'date' ? 'type="date"' : '';
        return `<input class="Value" ${type} id="${config.customFilterItem}">`;
    }

    _createTextareaField(config) {
        return `<textarea onkeydown="auto_grow(this)" class="Value" id="${config.customFilterItem}"></textarea>`;
    }

    _createDefaultField(config) {
        return `<${config.customFilterObjectType} class="Value" id="${config.customFilterItem}"></${config.customFilterObjectType}>`;
    }

    // -------------------------  Helpers  ------------------------- //

    _extractRequestIdFromDOM() {
        return document.getElementById('RequestDescription')
            ?.getAttribute(STORAGE_KEYS.REQUEST_TYPE) ?? null;
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }
}

// -------------------------  Legacy Wrapper  ------------------------- //

function ChangeCustomFields(requestId) {
    const builder = new CustomFieldBuilder();
    builder.changeCustomFields(requestId);
}
