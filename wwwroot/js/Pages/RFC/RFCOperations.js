// =============================  RFCOperations.js  ============================= //

class RFCOperations extends PageBase {
    constructor() {
        super();
        this.rfcId = sessionStorage.getItem(RFC_STORAGE_KEYS.RFC_ID)
            ?? sessionStorage.getItem(STORAGE_KEYS.TICKET_ID);
    }

    // -------------------------  Save  ------------------------- //

    async saveRFC(options = {}) {
        const {
            autoSave = false,
            visibility = true
        } = options;

        const saveButton = document.getElementById('Save-Button');
        if (!saveButton) return;

        if (!this._validateForm()) return;

        saveButton.disabled = true;
        if (!autoSave) ToggleWaiting();

        try {
            const rfcData = this._collectRFCData();
            const response = await this._submitRFC(rfcData);
            if (!response) return;

            await this._handleSaveSuccess(response, rfcData.rfcId, {
                visibility,
                autoSave
            });

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't Save RFC", 'RFCDetails');
            }
        } finally {
            if (!autoSave) ToggleWaiting();
            saveButton.disabled = false;
        }
    }

    // -------------------------  Validation  ------------------------- //

    _validateForm() {
        const completedDate = document.getElementById('CompletedDate');
        if (!completedDate) return true;

        if (completedDate.required && !completedDate.value) {
            BuildMessageBox('Please fill in completion date');
            return false;
        }

        return true;
    }

    // -------------------------  Data Collection  ------------------------- //

    _collectRFCData() {
        const rfcId = document.getElementById('RFCID')?.innerHTML;
        if (!rfcId) throw new Error('RFC ID element not found');

        const formElements = document.getElementsByClassName('Value');
        const formData = Form.getValues(formElements, { rfcId });

        return { rfcId, formData };
    }

    async _submitRFC({ rfcId, formData }) {
        return API.post('ChangeRequest/SaveChangeRequest',
            API.authPayload({
                ...formData,
                rfcId,
                emailSent: 0
            })
        );
    }

    // -------------------------  Save Success  ------------------------- //

    async _handleSaveSuccess(data, rfcId, options) {
        const { visibility, autoSave } = options;

        this._updateAssignedTechSession();
        this._saveOriginalNote(rfcId);

        if (visibility && !autoSave) {
            // _sendNotificationEmail inherited from TicketBase
            this._sendNotificationEmail('RFC', data[0], rfcId ?? data[1]);
        }
    }

    _updateAssignedTechSession() {
        const select = document.getElementById('assignedTechName');
        const value = select?.selectedIndex !== -1
            ? select.options[select.selectedIndex].value
            : '';
        sessionStorage.setItem(STORAGE_KEYS.NEW_ASSIGNED_TECH, value);
    }

    _saveOriginalNote(rfcId) {
        const description = document.getElementById('Description');
        if (!description?.name) return;

        SaveOriginalNote(
            description.getAttribute('name'),
            true,
            description.value,
            rfcId
        );
    }
}

// -------------------------  Legacy Wrapper  ------------------------- //

const rfcOperations = new RFCOperations();

function SaveRFC(autoSave, visibility) {
    rfcOperations.saveRFC({ autoSave, visibility });
}
