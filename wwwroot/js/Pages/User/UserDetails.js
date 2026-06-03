// =============================  UserDetails.js  ============================= //

class UserManager extends PageBase {

    constructor() {
        super();
        this.userLogin = sessionStorage.getItem(STORAGE_KEYS.VIEW_USER_LOGIN);  // Fix: STORAGE_KEYS
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;

        try {
            this._setupPageUI();
            this._setupEventListeners();
            await this._loadUserData();
            this._setupExtraControls();
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError('Error initializing user details', 'Index');
            }
        }
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        SetActivePage('UserMenu');
        PaneLayout.setDetailContainerHeight();  // Fix: Layout module
        Auth.checkPermissions();            // Fix: Auth module
        PaneLayout.chooseSeason();              // Fix: Layout module
        PaneLayout.displayScreen();             // Fix: Layout module
    }

    // -------------------------  Event Listeners  ------------------------- //

    _setupEventListeners() {
        // Fix: consolidated — removed duplicate at bottom of file
        window.addEventListener('resize', () => PaneLayout.setDetailContainerHeight());
    }

    // -------------------------  Load Data  ------------------------- //

    async _loadUserData() {
        const data = await API.post('User/GetUserDetail',
            API.authPayload({ userId: this.userLogin })
        );
        if (data) this._fillUserDetail(data);
    }

    // -------------------------  Populate  ------------------------- //

    _fillUserDetail(details) {
        const userNameEl = document.getElementById(STORAGE_KEYS.USER_NAME);
        if (userNameEl) userNameEl.innerText = details.userName ?? '';

        for (const [key, value] of Object.entries(details)) {
            if (!value && value !== 0) continue;

            const elementId = key.charAt(0).toUpperCase() + key.slice(1);
            const el = document.getElementById(elementId);
            if (!el) continue;

            this._fillElement(el, value);
        }
    }

    _fillElement(el, value) {
        const strValue = String(value);

        switch (el.nodeName) {
            case 'INPUT':
                el.value = strValue;
                break;
            case 'SELECT':
                Form.setSelectedByName(el, strValue);  // Fix: Form module
                break;
            case 'LABEL':
                el.innerText = strValue;
                break;
            default:
                el.innerText = strValue;
                break;
        }
    }

    // -------------------------  Admin Controls  ------------------------- //

    _setupExtraControls() {
        const isAdmin = sessionStorage.getItem(STORAGE_KEYS.ADMIN_ID) === '2';  // Fix: STORAGE_KEYS

        if (isAdmin) {
            UI.showById('ResetUser-Button,DeleteUser-Button');    // Fix: UI module
            UI.enableById('UserPhone,AdminLevel,Locked');         // Fix: UI module
            this._setDeleteButtonLabel();
        } else {
            UI.hideById('ResetUser-Button,DeleteUser-Button,UpdateUser-Button');  // Fix: UI module
            UI.disableById('UserPhone,AdminLevel,Locked');        // Fix: UI module
        }
    }

    _setDeleteButtonLabel() {
        const lockedEl = document.getElementById('Locked');
        const deleteBtn = document.getElementById('DeleteUser-Button');
        if (!lockedEl || !deleteBtn) return;

        deleteBtn.innerText = lockedEl.value === 'No'
            ? 'Disable User'
            : 'Activate User';
    }

    // -------------------------  Update  ------------------------- //

    async updateUser() {
        try {
            const phone = document.getElementById('UserPhone')?.value;

            await API.post('User/UpdateUser', API.authPayload({
                userLogin: this.userLogin,
                phone
            }));

            MessageBox.show('User has been updated', 'UserPage');  // Fix: MessageBox module

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't update user.");
            }
        }
    }

    async manageUser() {
        try {
            const phone = document.getElementById('UserPhone')?.value;
            const userLogin = document.getElementById('UserEmail')?.innerText;
            const unlockUser = parseInt(document.getElementById('Locked')?.value) || 0;
            const adminLevelId = parseInt(document.getElementById('AdminLevel')?.value) || 0;

            await API.post('User/ManageUser', API.authPayload({
                userLogin,
                unlockUser,
                adminLevelId,
                phone
            }));

            MessageBox.show('User has been updated', 'UserPage');  // Fix: MessageBox module

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't manage user.");
            }
        }
    }

    // -------------------------  Reset  ------------------------- //

    confirmReset() {
        MessageBox.confirm(                                        // Fix: MessageBox module
            'Are you sure you want to reset the password and pin for this user?',
            'userManager.resetUser()'
        );
    }

    async resetUser() {
        UI.toggleWaiting();                                        // Fix: UI module
        try {
            const userLogin = document.getElementById('UserEmail')?.innerText;

            const data = await API.post('User/ResetUser',
                API.authPayload({ userLogin })
            );

            MessageBox.show(`Reset ${data}`, 'UserPage');         // Fix: MessageBox module

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't reset user.");
            }
        } finally {
            UI.toggleWaiting();
        }
    }

    // -------------------------  Delete  ------------------------- //

    confirmDelete() {
        MessageBox.confirm(                                        // Fix: MessageBox module
            'Are you sure you want to delete this user?',
            'userManager.deleteUser()'
        );
    }

    async deleteUser() {
        UI.toggleWaiting();                                        // Fix: UI module
        try {
            const userLogin = document.getElementById('UserEmail')?.innerText;

            const data = await API.post('User/DeleteUser',
                API.authPayload({ userLogin })
            );

            MessageBox.show(data, 'UserPage');                    // Fix: MessageBox module

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't delete user.");
            }
        } finally {
            UI.toggleWaiting();
        }
    }
}

// -------------------------  Init  ------------------------- //

const userManager = new UserManager();

document.addEventListener('DOMContentLoaded', async () => {
    await userManager.init();
});

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.userManager = userManager;
}

// -------------------------  Legacy Wrappers  ------------------------- //

function UpdateUser() { userManager.updateUser(); }
function ManageUser() { userManager.manageUser(); }
function ResetUserQuestion() { userManager.confirmReset(); }
function ResetUser() { userManager.resetUser(); }
function DeleteUserQuestion() { userManager.confirmDelete(); }
function DeleteUser() { userManager.deleteUser(); }
