// =============================  TicketOperations.js  ============================= //

class TicketOperations extends PageBase {
    constructor() {
        super();
    }

    // -------------------------  Save  ------------------------- //

    async saveTicket(options = {}) {
        const {
            autoSave = false,
            falseReply = false,
            visibility = true
        } = options;

        const saveButton = document.getElementById('Save-Button');
        if (!saveButton) return;

        saveButton.disabled = true;
        if (!autoSave) ToggleWaiting();

        try {
            const ticketData = this._collectTicketData();
            const response = await this._submitTicket(ticketData, falseReply);
            if (!response) return;

            await this._handleSaveSuccess(response, ticketData.ticketId, {
                visibility,
                autoSave,
                falseReply
            });

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't Save Ticket", 'TicketDetails');
            }
        } finally {
            if (!autoSave) ToggleWaiting();
            saveButton.disabled = false;
        }
    }

    // -------------------------  Data Collection  ------------------------- //

    _collectTicketData() {
        const ticketId = document.getElementById('TicketID')?.innerText;
        if (!ticketId) throw new Error('Ticket ID element not found');

        const formElements = document.getElementsByClassName('Value');
        const formData = Form.getValues(formElements, { ticketId });

        return { ticketId, formData };
    }

    async _submitTicket({ ticketId, formData }, falseReply) {
        return API.post('Ticket/SaveTicket', API.authPayload({
            ...formData,
            falseReply,
            emailSent: 0,
            contactClient: ''
        }));
    }

    // -------------------------  Save Success  ------------------------- //

    async _handleSaveSuccess(data, ticketId, options) {
        const { visibility, autoSave, falseReply } = options;

        this._updateAssignedTechSession();
        await this._saveOriginalNoteIfChanged(ticketId);

        if (visibility && !autoSave) {
            // _sendNotificationEmail inherited from TicketBase
            this._sendNotificationEmail('Ticket', data[0], ticketId ?? data[1]);
        }

        if (falseReply) {
            this._updateHeaderForFalseReply();
        }
    }

    _updateAssignedTechSession() {
        const select = document.getElementById('assignedTechName');
        const value = select?.selectedIndex !== -1
            ? select.options[select.selectedIndex].value
            : '';
        sessionStorage.setItem(STORAGE_KEYS.NEW_ASSIGNED_TECH, value);
    }

    async _saveOriginalNoteIfChanged(ticketId) {
        const requestDetail = document.getElementById('requestDetail');
        if (!requestDetail?.name) return;

        const initial = sessionStorage.getItem(STORAGE_KEYS.INITIAL_NOTE_TEXT);
        if (requestDetail.value !== initial) {
            SaveOriginalNote(
                requestDetail.getAttribute('name'),
                false,
                requestDetail.value,
                ticketId
            );
        }
    }

    // -------------------------  False Reply  ------------------------- //

    hideTicketNotification() {
        const btn = document.getElementById('FalseReply');
        if (!btn) return;

        btn.value = true;
        btn.style.cssText = 'background:#424141; color:orange; border:none;';
        btn.disabled = true;

        sessionStorage.setItem(STORAGE_KEYS.CURRENT_TICKET_NTFY, 'false');
        this.saveTicket({ autoSave: true, falseReply: true });
    }

    _updateHeaderForFalseReply() {
        const header = document.getElementById('Detail-Header');
        if (header?.children[0]) {
            header.children[0].innerText =
                header.children[0].innerText.replace('? ', '');
        }
    }

    // -------------------------  Navigation  ------------------------- //

    openSpecificTicket(ticketId) {
        this.saveTicketId(ticketId);
        this.navigateToTicketDetails();
    }
}

// -------------------------  Legacy Wrappers  ------------------------- //

const ticketOperations = new TicketOperations();

function SaveTicket(autoSave, falseReply, visibility) {
    ticketOperations.saveTicket({ autoSave, falseReply, visibility });
}

function HideTicketNotification() {
    ticketOperations.hideTicketNotification();
}

function OpenSpecificTicket(ticketId) {
    ticketOperations.openSpecificTicket(ticketId);
}
