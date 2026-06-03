// =============================  AdminPopulator.js  ============================= //

class AdminPopulator extends PageBase {
    constructor() {
        super();
    }
      

    // -------------------------  Date Detection  ------------------------- //

    _isDate(value) {
        if (!value || typeof value !== 'string') return false;

        // ISO datetime format — e.g. "2026-05-27T09:00:00"
        const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
        if (isoPattern.test(value)) return true;

        // Short date format — e.g. "2026-05-27"
        const shortPattern = /^\d{4}-\d{2}-\d{2}$/;
        return shortPattern.test(value);
    }
}

// -------------------------  Init  ------------------------- //

const adminPopulator = new AdminPopulator();
