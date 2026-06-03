// =============================  NavBar.js  ============================= //

const NavBar = {

    // -------------------------  Button Controllers  ------------------------- //

    adminPage(subPage) {
        UI.toggleWaiting();
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SUB_PAGE, subPage);
        Auth.checkLimitedGovtechUserPerms();
        Nav.toAdminPage();
    },

    rfcPage() {
        Nav.toRFCPage();
    },

    myTickets() {
        sessionStorage.removeItem(STORAGE_KEYS.LAST_TICKET_SEARCH);
        sessionStorage.setItem(STORAGE_KEYS.MY_TICKETS, '1');
        Nav.toTicketPage();
    },

    allTickets() {
        sessionStorage.setItem(STORAGE_KEYS.MY_TICKETS, '0');
        Nav.toTicketPage();
    },

    allTasks() {
        sessionStorage.setItem(STORAGE_KEYS.MY_TICKETS, '0');
        Nav.toTasksPage();
    },

    myTasks() {
        sessionStorage.setItem(STORAGE_KEYS.MY_TICKETS, '1');
        Nav.toTasksPage();
    },

    // -------------------------  Display  ------------------------- //

    displayMenu() {
        const navLeft = document.getElementById('navbar-left');
        if (navLeft) navLeft.style.display = 'block';
        if (document.body) document.body.style.display = 'block';
    },

    setActivePage(pageName) {
        document.getElementById(pageName)?.classList.add('active');
    },

    // -------------------------  Logout  ------------------------- //

    startLogout() {
        BuildMessageBox('Are you sure you want to logout?', '');

        const buttonBox = document.getElementById('Button-Div');
        if (!buttonBox) return;

        buttonBox.innerHTML = '';
        buttonBox.style.width = '140px';

        const yesBtn = document.createElement('button');
        yesBtn.className = 'accept OkayButton';
        yesBtn.innerText = 'Yes';
        yesBtn.addEventListener('click', () => OkayButtonPress('Index'));

        const noBtn = document.createElement('button');
        noBtn.className = 'cancel OkayButton';
        noBtn.innerText = 'No';
        noBtn.addEventListener('click', () => OkayButtonPress(''));

        buttonBox.appendChild(yesBtn);
        buttonBox.appendChild(noBtn);
    },

    // -------------------------  Z-Index  ------------------------- //

    bringForward() {
        const nav = document.getElementById('nav');
        if (nav) nav.style.zIndex = '1001';
    },

    pushBack() {
        const nav = document.getElementById('nav');
        if (nav) nav.style.zIndex = '101';
    }
};

// -------------------------  Legacy Wrappers  ------------------------- //

function AdminButtonController(subPage) { NavBar.adminPage(subPage); }
function RFCButtonController() { NavBar.rfcPage(); }
function MyTicketsButtonController() { NavBar.myTickets(); }
function AllTicketsButtonController() { NavBar.allTickets(); }
function AllTasksButtonController() { NavBar.allTasks(); }
function MyTasksButtonController() { NavBar.myTasks(); }
function DisplayMenu() { NavBar.displayMenu(); }
function SetActivePage(pageName) { NavBar.setActivePage(pageName); }
function StartLogout() { NavBar.startLogout(); }
function BringForwardNav() { NavBar.bringForward(); }
function PushBackNav() { NavBar.pushBack(); }
