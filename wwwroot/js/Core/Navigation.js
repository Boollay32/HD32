// =============================  Navigation.js  ============================= //

const Nav = {

    _navigate(path) {
        UI.toggleWaiting();
        window.location.href = path;
    },

    toAdminPage() { Nav._navigate('/AdminPage'); },
    toTicketPage() { Nav._navigate('/TicketPage'); },
    toCreateRFC() { Nav._navigate('/CreateRFC'); },
    toCreateTicket() { Nav._navigate('/CreateTicket'); },
    toRFC() { Nav._navigate('/RFC'); },
    toRFCDetails() { Nav._navigate('/RFCDetails'); },
    toStats() { Nav._navigate('/Stats'); },
    toTicketDetails() { Nav._navigate('/TicketDetails'); },
    toUserPage() { Nav._navigate('/UserPage'); },
    toStatsPage() { Nav._navigate('/StatsPage'); },
    toTaskDetails() { Nav._navigate('/TaskDetails'); },

    toUserDetails(username) {
        sessionStorage.setItem('ViewUserLogin', username);
        Nav._navigate('/UserDetails');
    }
};

// -------------------------  Legacy Wrappers  ------------------------- //

function AdminPageView() { Nav.toAdminPage(); }
function TicketPageView() { Nav.toTicketPage(); }
function CreateRFCView() { Nav.toCreateRFC(); }
function CreateTicketView() { Nav.toCreateTicket(); }
function RFCView() { Nav.toRFC(); }
function RFCDetailsView() { Nav.toRFCDetails(); }
function StatsView() { Nav.toStats(); }
function TicketDetailsView() { Nav.toTicketDetails(); }
function UserPageView() { Nav.toUserPage(); }
function StatsPageView() { Nav.toStatsPage(); }
function TaskDetailsView() { Nav.toTaskDetails(); }
function UserDetailsView(username) { Nav.toUserDetails(username); }
