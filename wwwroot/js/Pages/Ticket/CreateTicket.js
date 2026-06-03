// =============================  CreateTicket.js  ============================= //

class CreateTicket extends PageBase {
    constructor() {
        super();
        this.customFieldBuilder = new CustomFieldBuilder();
        this.formId = 'create-ticket';
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;

        try {
            sessionStorage.setItem(STORAGE_KEYS.SEARCH_OR_TICKET, '1');

            await Promise.all([
                this.waitForElement(this.formId),
                Dropdowns.load('Ticket')
            ]);

            this._setupPageUI();
            this._setupEventListeners();

        } catch (error) {
            this.handleError('Error initializing create ticket', 'Index');
        }
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        SetActivePage('TicketMenu');
        SetDetailContainerHeight();
        UserPermissions();
        ChooseSeason();
        DisplayScreen();
        ClearAllFormInputs(this.formId);
        SetTargetDateMinToday();
    }

    // -------------------------  Event Listeners  ------------------------- //

    _setupEventListeners() {
        // Fix: submit button wired here — replaces onclick in view
        document.getElementById('SubmitCreatedTicket')
            ?.addEventListener('click', () => this.submitTicket());

        // Fix: requestType change wired here — replaces onchange in view
        document.getElementById(STORAGE_KEYS.REQUEST_TYPE)
            ?.addEventListener('change', () => this._onRequestTypeChange());

        // Fix: textarea auto-grow wired here — replaces onkeydown in view
        document.getElementById('requestDetail')
            ?.addEventListener('keydown', (e) => auto_grow(e.target));

        // Fix: attachment drop wired here — replaces ondrop in view
        document.getElementById('AttachBin')
            ?.addEventListener('drop', (e) => dropIt(e));

        // Fix: file upload change wired here — replaces onchange in view
        document.getElementById('fileupload1')
            ?.addEventListener('change', (e) => GetByteArray('1', e.target));

        window.addEventListener('resize', () => SetDetailContainerHeight());
    }

    async _onRequestTypeChange() {
        const requestId = document.getElementById(STORAGE_KEYS.REQUEST_TYPE)?.value;
        if (!requestId) return;

        await this.customFieldBuilder.changeCustomFields(requestId);
        await Dropdowns.load('Ticket');
    }

    // -------------------------  Submit  ------------------------- //

    async submitTicket() {
        if (!validateForm(this.formId)) return;

        // Fix: correct button ID — was 'Submit-Button' — not found in view
        const submitButton = document.getElementById('SubmitCreatedTicket');
        if (submitButton) submitButton.disabled = true;
        ToggleWaiting();

        try {
            const { formData, note, contactClient } = this._collectFormData();
            const response = await this._submitTicket(formData, contactClient);
            if (!response) return;

            await this._handleCreateSuccess(response, note, contactClient);

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't create ticket", 'Index');
            }
        } finally {
            ToggleWaiting();
            if (submitButton) submitButton.disabled = false;
        }
    }

    // -------------------------  Data Collection  ------------------------- //

    _collectFormData() {
        const elements = document.getElementsByClassName('Value');
        const formData = Form.getValues(elements);
        const note = document.getElementById('requestDetail')?.value ?? '';
        const contactClient = this._getContactClient(elements);

        return { formData, note, contactClient };
    }

    _getContactClient(elements) {
        const requestType = elements[STORAGE_KEYS.REQUEST_TYPE]?.value;
        if (requestType !== '12') return '';

        const authority = elements['Authority']?.value ?? '';
        const clientId = elements['assignedClientID']?.value ?? '';
        return `${authority}|${clientId}`;
    }

    async _submitTicket(formData, contactClient) {
        return API.post('Ticket/SaveTicket', API.authPayload({
            ...formData,
            contactClient,
            emailSent: 0
        }));
    }

    // -------------------------  Create Success  ------------------------- //

    async _handleCreateSuccess(data, note, contactClient) {
        // Fix: named property — replaces magic array index data[1]
        const newTicketId = data.id ?? data.ticketId;

        SaveOriginalNote(null, false, note, newTicketId);

        if (contactClient) {
            this._sendNotificationEmail('Ticket', 'CreatedFor', newTicketId);
        }

        BuildMessageBox(`Created Ticket ${newTicketId}`, 'TicketPage');
    }
}

// -------------------------  Init  ------------------------- //

// Fix: page hoisted to module scope — legacy wrappers can access it
const page = new CreateTicket();
document.addEventListener('DOMContentLoaded', () => page.init());

// -------------------------  Legacy Wrappers  ------------------------- //

function SubmitCreatedTicket() { page.submitTicket(); }
function selector1DropDown() { page._onRequestTypeChange(); }
