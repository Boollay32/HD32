// =============================  AdminPage.js  ============================= //

class AdminPage extends PageBase {

    constructor() {
        super();
        this.config = {
            formId: 'NewUserForm',
            lockedTableId: 'LockedUsers-table'
            // Fix: bugsTableId removed — bugs feature removed
        };

        // -------------------------  Tab Navigation  ------------------------- //
        let adminPanels = {
            'AdminNav-AddUser': 'AddUser-Panel',
            'AdminNav-ResetUser': 'ResetUser-Panel',
            'AdminNav-UnlockUser': 'UnlockUser-Panel',
            'AdminNav-LoginMessage': 'UpdateMessage-Panel',
            'AdminNav-Stats': null   // navigates away
        };

        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {

                // Stats navigates away
                if (btn.id === 'AdminNav-Stats') {
                    StatsPageView();
                    return;
                }

                // Update active tab
                document.querySelectorAll('.admin-nav-btn')
                    .forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show correct panel
                document.querySelectorAll('.Admin-Panel')
                    .forEach(p => p.classList.remove('active'));
                let panelId = adminPanels[btn.id];  // Fix: const ? let
                if (panelId) document.getElementById(panelId)
                    ?.classList.add('active');
            });
        });
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;
        try {
            this._setupPageUI();
            await this._loadDropdowns();
            this._setupEventListeners();
            this._openInitialSubPage();
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError('Error initializing admin page', 'Index');
            }
        }
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        PaneLayout.setDetailContainerHeight();
        PaneLayout.setHeaderWidths();
        Form.clearAllInputs(this.config.formId);
        Auth.checkPermissions();
        PaneLayout.chooseSeason();
        PaneLayout.displayScreen();
        // Fix: ADMIN_BUGS_ONLY check removed — bugs feature removed
    }

    async _loadDropdowns() {
        await Dropdowns.load('Ticket');
    }

    // -------------------------  Event Listeners  ------------------------- //

    _setupEventListeners() {
        window.addEventListener('resize', () => {
            PaneLayout.setDetailContainerHeight();
            PaneLayout.setHeaderWidths();
        });
    }

    // -------------------------  Sub Page Routing  ------------------------- //

    _openInitialSubPage() {
        let subPage = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SUB_PAGE);  // Fix: const ? let
        this.openSubPage(subPage);
    }

    openSubPage(page) {
        switch (page) {
            case 'Message':
                this.displayUpdateMessage();
                SetActivePage('AdminMenu');
                break;
            case 'AddUser':
                this.displayAddUser();
                SetActivePage('UserMenu');
                break;
            // Fix: 'Bugs' case removed — bugs feature removed
            default:
                SetActivePage('AdminMenu');
                break;
        }
    }

    // -------------------------  Panel Display  ------------------------- //

    displayAddUser() {
        UI.showById('CreateUser-Button,AddUser-Panel');
        // Fix: Back-Button removed — replaced by tab nav

        let form = document.getElementById(this.config.formId);  // Fix: const ? let
        let authority = form?.elements['Authority'];
        if (authority) authority.innerHTML = '';

        Form.clearAllInputs(this.config.formId);
    }

    displayResetUser() {
        UI.showById('ResetUser-Button,ResetUser-Panel');
        // Fix: Back-Button removed — replaced by tab nav
    }

    displayUnlockUser() {
        UI.showById('UnlockUser-Button,UnlockUser-Panel');
        // Fix: Back-Button removed — replaced by tab nav
        this._loadLockedUsers();
    }

    displayStats() {
        StatsPageView();
        // Fix: Stats-Panel removed — navigates away
    }

    displayUpdateMessage() {
        UI.showById('HideLoginMessage-Button,UpdateLoginMessage-Button,UpdateMessage-Panel');
        // Fix: Back-Button removed — replaced by tab nav
    }


    // -------------------------  Locked Users  ------------------------- //

    async _loadLockedUsers() {
        try {
            let data = await API.post('User/GetUsers',   // Fix: const ? let
                API.authPayload({ filter: 'Locked`1' })
            );
            this._renderLockedTable(data);
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError('Failed to load locked users.');
            }
        } finally {
            PaneLayout.setHeaderWidths(this.config.lockedTableId);
        }
    }

    _renderLockedTable(data) {
        let table = document.getElementById(this.config.lockedTableId);  // Fix: const ? let
        if (!table) return;

        let tbody = table.getElementsByTagName('tbody')[0];  // Fix: const ? let
        tbody.innerHTML = '';

        let allowedKeys = [STORAGE_KEYS.USER_ID, STORAGE_KEYS.USER_NAME, 'authority', 'locked'];  // Fix: const ? let

        if (!data?.length) {
            table.style.display = 'none';
            return;
        }

        table.style.display = 'block';

        for (let item of data) {   // Fix: const ? let
            let row = document.createElement('tr');  // Fix: const ? let
            row.addEventListener('click', () => {
                sessionStorage.setItem(STORAGE_KEYS.LOCKED_USER_ID, item.userID);
                document.querySelectorAll(`#${this.config.lockedTableId} tr`)
                    .forEach(r => r.classList.remove('highlight'));
                row.classList.add('highlight');
            });

            for (let key of allowedKeys) {   // Fix: const ? let
                if (key in item) {
                    let cell = document.createElement('td');  // Fix: const ? let
                    cell.innerText = item[key] ?? '';
                    row.appendChild(cell);
                }
            }

            tbody.appendChild(row);
        }
    }

    // Fix: govtechLogoEasterEgg() removed — CircleHolder gone
}

// -------------------------  Init  ------------------------- //

// Fix: const ? let — avoids linter warning in plain .js files
let adminPage = new AdminPage();

document.addEventListener('DOMContentLoaded', () => {
    adminPage.init();
});

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.adminPage = adminPage;
}

// -------------------------  Legacy Wrappers  ------------------------- //

function OpenSubPage(page) { adminPage.openSubPage(page); }
function DisplayAddUser() { adminPage.displayAddUser(); }
function DisplayResetUser() { adminPage.displayResetUser(); }
function DisplayUnlockUser() { adminPage.displayUnlockUser(); }
function DisplayStats() { adminPage.displayStats(); }
function UpdateMessage() { adminPage.displayUpdateMessage(); }
