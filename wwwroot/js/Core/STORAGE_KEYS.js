// =============================  STORAGE_KEYS.js  ============================= //

const STORAGE_KEYS = {

    // -------------------------  Auth  ------------------------- //

    USER_NAME: 'UserName',
    USER_ID: 'UserID',
    AUTHORITY_ID: 'AuthorityID',
    TOKEN: 'Token',
    STATUS: 'Status',
    ADMIN: 'Admin',
    ADMIN_ID: 'AdminID',

    // -------------------------  Login  ------------------------- //

    LOGIN_PAGE: 'LoginPage',

    // -------------------------  Tickets  ------------------------- //

    TICKET_OR_TASK: 'TicketOrTask',
    MY_TICKETS: 'MyTickets',
    SEARCH_OR_TICKET: 'SearchOrTicket',
    REQUEST_TYPE: 'RequestType',
    TASK_ID: 'TaskID',
    TICKET_ID: 'TicketID',
    INITIAL_NOTE_TEXT: 'InitialNoteText',

    // -------------------------  RFC  ------------------------- //

    RFC_ID: 'RFCID',
    RFC_ASSIGNED_TECH: 'RFCAssignedTech',
    CHANGE_REQUEST_ID: 'ChangeRequestID',

    // -------------------------  Search  ------------------------- //

    LAST_TICKET_SEARCH: 'LastTicketSearch',
    LAST_RFC_SEARCH: 'LastRFCSearch',

    // -------------------------  Notifications  ------------------------- //

    CURRENT_TICKET_NTFY: 'CurrentTicketNtfy',
    CURRENT_TICKET_NTFY_TECH: 'CurrentTicketNtfyTech',  // ← NEW: client has replied
    NEW_ASSIGNED_TECH: 'NewAssignedTech',
    OLD_ASSIGNED_TECH: 'OldAssignedTech',

    // -------------------------  Table  ------------------------- //

    TABLE_PAGE_NAME: 'TablePageName',

    // -------------------------  Ticket Details  ------------------------- //

    TD_ACTIVE_TAB: 'TDActiveTab',
    TD_PANES_COLLAPSED: 'TDPanesCollapsed',

    // -------------------------  Admin  ------------------------- //

    ADMIN_SUB_PAGE: 'AdminSubPage',
    ADMIN_BUGS_ONLY: 'AdminBugsOnly',
    LOCKED_USER_ID: 'LockedUserID',

    // -------------------------  User  ------------------------- //

    VIEW_USER_LOGIN: 'ViewUserLogin',
};

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.STORAGE_KEYS = STORAGE_KEYS;
}
