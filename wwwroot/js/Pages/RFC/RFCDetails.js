// =============================  RFCDetails.js  ============================= //

class RFCDetails extends PageBase {

    constructor() {
        super();
        this.rfcId = sessionStorage.getItem(STORAGE_KEYS.RFC_ID)
            ?? sessionStorage.getItem(STORAGE_KEYS.TICKET_ID);
        this.customFieldBuilder = new CustomFieldBuilder();
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;
        try {
            this._initSessionStorage();
            this._setupEventListeners();   // listeners before async ops
            await this._loadRFCData();
            this._setupPageUI();           // UI last — DOM fully ready
        } catch (error) {
            console.error('RFC init failed:', error);
            this.handleError('Error initializing RFC details', 'Index');
        }
    }

    // -------------------------  Session  ------------------------- //

    _initSessionStorage() {
        const rfcIdEl = document.getElementById('RFCID');  // Fix: null guard
        if (rfcIdEl) rfcIdEl.innerText = this.rfcId;
    }

    document.addEventListener('DOMContentLoaded', () => {

    // Header
    document.getElementById('Save-Button')
        ?.addEventListener('click', () => this.saveRFC(false));
    document.getElementById('Back-Button')
        ?.addEventListener('click', () => RFCButtonController());

    // Notes
    document.getElementById('NewNote-Button')
        ?.addEventListener('click', () => this.displayNotePanel());

    // Note panel — wired via _NotePanel partial
    document.getElementById('SaveNote-Button')
        ?.addEventListener('click', () => this.saveNewNote());
    document.getElementById('CancelNote-Button')
        ?.addEventListener('click', () => this.hideNotePanel());
    document.getElementById('Visible-Button')
        ?.addEventListener('click', () => this.setNoteExternalVisibility(
            document.getElementById('Visible-Button')
        ));

    // Status change
    document.getElementById('rfcStatus')
        ?.addEventListener('change', e => this.statusChange(e.target));
});


    // -------------------------  Load Data  ------------------------- //

    async _loadRFCData() {
        await Promise.all([
            Dropdowns.load('RFC'),
            GetNotes(this.rfcId),
            this._getRFCDetails()
        ]);
    }

    async _getRFCDetails() {
        const data = await API.post('ChangeRequest/GetChangeRequestDetail',
            API.authPayload({ rfcId: this.rfcId })
        );
        if (data) {
            FillRFCDetails(data);
            this._saveAssignedTech();
        }
    }

    _saveAssignedTech() {
        const select = document.getElementById('assignedTechName');
        if (!select || select.selectedIndex === -1) return;

        sessionStorage.setItem(
            STORAGE_KEYS.RFC_ASSIGNED_TECH,  // Fix: use STORAGE_KEYS
            select.options[select.selectedIndex].value
        );
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        SetActivePage('RFCMenu');
        PaneLayout.setDetailContainerHeight();  // Fix: Layout module
        PaneLayout.chooseSeason();              // Fix: Layout module
        PaneLayout.displayScreen();             // Fix: Layout module
        UI.adjustTextAreas();              // Fix: UI module
        Auth.checkPermissions();           // Fix: Auth module

        this._setupBackButton();

        const description = document.getElementById('Description');
        sessionStorage.setItem(
            STORAGE_KEYS.INITIAL_NOTE_TEXT,
            description?.value ?? ''
        );

        SetCurrentAssignedTech('assignedTechName');
    }

    _setupBackButton() {
        const rfcMenu = document.getElementById('RFCMenu');
        const backButton = document.getElementById('Back-Button');
        if (rfcMenu?.style.display === 'none' && backButton) {
            backButton.style.display = 'block';
        }
    }

    // -------------------------  Event Listeners  ------------------------- //

    _setupEventListeners() {
        document.getElementById('status')?.addEventListener('change', e => {
            this._handleStatusChange(e.target);
        });

        // Fix: single resize listener — removed duplicate at bottom of file
        window.addEventListener('resize', () => PaneLayout.setDetailContainerHeight());
    }

    // -------------------------  Status Change  ------------------------- //

    _handleStatusChange(statusSelect) {
        const selectedText = statusSelect.options[statusSelect.selectedIndex]?.innerText;
        const completedDate = document.getElementById('CompletedDate');
        const completedDateRow = completedDate?.parentElement?.parentElement;

        if (!completedDate || !completedDateRow) return;

        const isComplete = selectedText === 'Complete';

        completedDateRow.style.display = isComplete ? 'block' : 'none';
        completedDate.disabled = !isComplete;
        completedDate.required = isComplete;

        if (!isComplete) completedDate.value = '';
    }
}

// -------------------------  Init  ------------------------- //

const rfcDetails = new RFCDetails();  // Fix: stored — accessible externally

document.addEventListener('DOMContentLoaded', async () => {
    await rfcDetails.init();
});

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.rfcManager = rfcDetails;
}
