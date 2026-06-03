// =============================  RFCPopulator.js  ============================= //

class RFCPopulator extends TicketDetailPopulator {
    constructor(data) {
        super(data);
        this.formFields = document.getElementById('UpdateRFC')
            ?.getElementsByClassName('Value') ?? [];
    }

    // -------------------------  Public  ------------------------- //

    populate() {
        this._saveAssignedTechInfo();
        for (const field of this.formFields) {
            this._populateField(field);
        }
    }

    // -------------------------  Overrides  ------------------------- //

    _normalizeFieldName(fieldId) {
        // RFC fields are prefixed with 'changeRequest'
        const prefixed = `changeRequest${fieldId}`;
        if (this.data[prefixed]) return prefixed;

        // Fall back to camelCase
        if (this.data[fieldId]) return fieldId;

        // Fall back to lowercase first char
        const camel = fieldId.charAt(0).toLowerCase() + fieldId.slice(1);
        if (this.data[camel]) return camel;

        // Final fallback — return prefixed anyway
        return prefixed;
    }

    _handleSelectField(field, value) {
        if (!value || value.toString() === '0') return;
        // RFC uses name-based selection instead of value-based
        SetSelectedIndexUsingName(field, value);
    }

    _handleInputField(field, value) {
        if (field.type === 'date') {
            this._setDateField(field, value);
        } else {
            field.value = value;
        }
    }

    _setDateField(field, value) {
        const parts = value.split('/');
        if (parts.length !== 3) return;

        const [day, month, year] = parts;
        field.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
}

// -------------------------  Legacy Wrapper  ------------------------- //

function FillRFCDetails(data) {
    const populator = new RFCPopulator(data);
    populator.populate();
}
