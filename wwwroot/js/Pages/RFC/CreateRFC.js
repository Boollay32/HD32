// =============================  CreateRFC.js  ============================= //

class CreateRFC extends PageBase {
    constructor() {
        super();
        this.formId = 'create-rfc';
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;
        try {
            await Promise.all([
                this.waitForElement(this.formId),
                Dropdowns.load('RFC')
            ]);

            this._setupPageUI();
            this._setupEventListeners();

        } catch (error) {
            this.handleError('Error initializing create RFC', 'Index');
        }
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        SetActivePage('RFCMenu');
        SetDetailContainerHeight();
        UserPermissions();
        ChooseSeason();
        DisplayScreen();
        ClearAllFormInputs(this.formId);
        SetTargetDateMinToday();
    }

    // -------------------------  Event Listeners  ------------------------- //

    _setupEventListeners() {
        // Fix: submit button — replaces onclick in view
        document.getElementById('SubmitCreatedRFC')
            ?.addEventListener('click', () => this.submitRFC());

        // Fix: attachment drop — replaces ondrop in view
        document.getElementById('AttachBin')
            ?.addEventListener('drop', (e) => dropIt(e));

        // Fix: file upload — replaces onchange in view
        document.getElementById('fileupload1')
            ?.addEventListener('change', (e) => GetByteArray('1', e.target));

        // Fix: tooltip events — replaces onmouseover/onmouseout in view
        document.querySelectorAll('[data-tooltip]')
            .forEach(el => {
                el.addEventListener('mouseover', () => DisplayToolTip(el));
                el.addEventListener('mouseout', () => HideToolTip());
            });

        window.addEventListener('resize', () => SetDetailContainerHeight());
    }

    // -------------------------  Submit  ------------------------- //

    async submitRFC() {
        if (!validateForm(this.formId)) return;

        // Fix: correct button ID — was 'Submit-Button' — not found in view
        const submitButton = document.getElementById('SubmitCreatedRFC');
        if (submitButton) submitButton.disabled = true;
        ToggleWaiting();

        try {
            const { formData, note } = this._collectFormData();
            const response = await this._submitRFC(formData);
            if (!response) return;

            await this._handleCreateSuccess(response, note);

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't create RFC", 'Index');
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
        const note = document.getElementById('Description')?.value ?? '';

        return { formData, note };
    }

    async _submitRFC(formData) {
        return API.post('ChangeRequest/SaveChangeRequest',
            API.authPayload({
                ...formData,
                emailSent: 0
            })
        );
    }

    // -------------------------  Create Success  ------------------------- //

    async _handleCreateSuccess(data, note) {
        // Fix: named properties — replaces magic array indexes data[0], data[1]
        const newRfcId = data.id ?? data.rfcId;
        const message = data.message ?? 'Created';

        SaveOriginalNote(null, true, note, newRfcId);

        const assignedTech = document.getElementById('assignedTechName');
        if (assignedTech?.selectedIndex >= 0) {
            const techId = assignedTech.options[assignedTech.selectedIndex].value;
            const techEmail = GetUserEmailAddress(techId);
            CreateAndSendEmail(newRfcId, 'Assigned', 'RFC', techEmail, '', '', '', '');
        }

        BuildMessageBox(`${message} RFC ${newRfcId}`, 'RFC');
    }
}

// -------------------------  Init  ------------------------- //

// Fix: page hoisted to module scope — legacy wrapper can access it
const page = new CreateRFC();
document.addEventListener('DOMContentLoaded', () => page.init());

// -------------------------  Legacy Wrappers  ------------------------- //

function SubmitCreatedRFC() { page.submitRFC(); }
