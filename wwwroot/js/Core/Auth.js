// =============================  Auth.js  ============================= //

const Auth = {

    // -------------------------  Keep Alive  ------------------------- //

    _isMessageBoxVisible() {
        const el = document.getElementById('MessageBox-ScreenCover-Div');
        return el?.classList.contains('BackgroundTint') ?? false;
    },

    _onUserActivity() {
        if (window.location.pathname === '/') return;
        if (this._isMessageBoxVisible()) return;
        this.keepAlive();
    },

    keepAlive() {
        if (!sessionStorage.getItem(STORAGE_KEYS.TOKEN)) return;

        const lastMove = sessionStorage.getItem('LastMouseMove');
        const now = Date.now();

        if (lastMove) {
            const next = +lastMove + 30000;
            if (next < now) {
                sessionStorage.setItem('LastMouseMove', now);
                this.authenticateUser();
            }
        } else {
            sessionStorage.setItem('LastMouseMove', now);
            this.authenticateUser();
        }
    },

    // -------------------------  Authenticate  ------------------------- //


    async authenticateUser() {
        const userName = sessionStorage.getItem(STORAGE_KEYS.USER_NAME);
        const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);

        if (!userName || !token) return;

        try {
            const data = await API.post('Authenticator/Authenticate', {
                userName,
                token,
                utc: UTCWorkAround()
            });

            if (!data?.userID) {
                BuildMessageBox('Your session has timed out.', 'Index');
            } else {
                UI.showByTag('body');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            BuildMessageBox('Your Session has timed out.', 'Index');
        }
    },

    // -------------------------  User Permissions  ------------------------- //

    async checkPermissions() {
        try {
            const adminId = await API.post('Authenticator/CheckAdmin', {
                userName: sessionStorage.getItem(STORAGE_KEYS.USER_NAME),
                token: sessionStorage.getItem(STORAGE_KEYS.TOKEN),
                utc: UTCWorkAround()
            });

            if (adminId == null) return;

            sessionStorage.setItem('AdminID', adminId);
            this.setAdminAbilities(adminId);
            this.checkLimitedUserPerms();

        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    },

    // -------------------------  Admin Abilities  ------------------------- //

    setAdminAbilities(adminId) {
        const ADMIN_CONFIG = {
            1: { restrict: 'subnav-users-content,subnav-admin', extra: true },
            2: { restrict: 'subnav-bugs', extra: true },
            3: { restrict: 'subnav-users-content,subnav-tasks,subnav-rfc,subnav-bugs,subnav-admin', extra: false },
            4: { restrict: 'subnav-tickets,subnav-users,subnav-tasks,subnav-admin', extra: false },
            5: { restrict: 'subnav-users-content,subnav-admin', extra: true }
        };

        const config = ADMIN_CONFIG[adminId] ?? {
            restrict: 'subnav-users-content,subnav-tasks,subnav-rfc,subnav-bugs,subnav-admin',
            extra: false
        };

        sessionStorage.setItem('Admin', adminId);
        UI.hideAll(config.restrict);

        if (config.extra) {
            this._applyExtraFunctionality();
            MakeDropDownsEditable();
        }
    },

    _applyExtraFunctionality() {
        const authority = document.getElementById('Authority');
        if (authority) UI.showObject(authority.parentElement);

        UI.show('Visible-Button');

        const assignedTechName = document.getElementById('assignedTechName');
        if (assignedTechName) {
            const myTickets = sessionStorage.getItem(STORAGE_KEYS.MY_TICKETS);
            const authorityId = sessionStorage.getItem(STORAGE_KEYS.AUTHORITY_ID);
            if (myTickets === '0' && authorityId === '151') {
                UI.showObject(assignedTechName.parentElement);
            }
        }
    },

    // -------------------------  Limited User Perms  ------------------------- //

    checkLimitedUserPerms() {
        const admin = sessionStorage.getItem('Admin');
        const loginPage = sessionStorage.getItem('LoginPage');
        const page = window.location.pathname;

        const rfcOnlyPages = ['/RFC', '/RFCDetails', '/CreateRFC', '/AdminPage'];

        if (admin === '4' && !rfcOnlyPages.includes(page)) {
            if (loginPage !== '1') RFCView();
        } else {
            DisplayMenu();
        }
    },

    // -------------------------  Account Name  ------------------------- //

    getAccountName(userName) {
        if (!userName) return '';

        const [localPart] = userName.split('@');
        const parts = localPart.split('.');

        const firstName = parts[0]
            ? parts[0][0].toUpperCase() + parts[0].slice(1)
            : '';

        const surname = parts[1]
            ? parts[1][0].toUpperCase() + parts[1].slice(1)
            : '';

        this._checkEnvironment();

        return `${firstName} ${surname}`.trim();
    },

    // -------------------------  Environment  ------------------------- //

    _checkEnvironment() {
        const hostname = window.location.hostname;
        const nameEl = document.getElementById('Account-Name');
        if (!nameEl) return;

        if (hostname === 'testgovtechhelpdesk.azurewebsites.net') {
            nameEl.innerText = 'TEST Server';
            nameEl.style.marginRight = '10px';
        }
    },

    // -------------------------  Activity Listeners  ------------------------- //

    initActivityListeners() {
        document.addEventListener('mousemove', () => this._onUserActivity());
        document.addEventListener('keydown', () => this._onUserActivity());
    }
};

// -------------------------  Legacy Wrappers  ------------------------- //

function UserPermissions() { return Auth.checkPermissions(); }
function AuthenticateUser(user, token) { return Auth.authenticateUser(); }
function KeepThePageAlive() { Auth.keepAlive(); }
function SetUserAdminAbilities(adminId) { Auth.setAdminAbilities(adminId); }
function CheckLimitedGovtechUserPerms() { Auth.checkLimitedUserPerms(); }
function GetAccountName(userName) { return Auth.getAccountName(userName); }
function DisplayExtraGovtechFunctionality() { Auth._applyExtraFunctionality(); }

// -------------------------  Init Activity Listeners  ------------------------- //

Auth.initActivityListeners();
