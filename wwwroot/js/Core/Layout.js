// =============================  Layout.js  ============================= //

const Layout = {

    // -------------------------  Screen Display  ------------------------- //

    displayScreen() {
        const mainBody = document.getElementById('Main-Body');
        if (mainBody) mainBody.style.display = 'block';
    },

    // -------------------------  Container Height  ------------------------- //

    setDetailContainerHeight() {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const isNarrow = windowWidth < 1240;

        const heights = isNarrow
            ? { container: windowHeight - 140, main: windowHeight - 80 }
            : { container: windowHeight - 180, main: windowHeight - 130 };

        const detailContainer = document.getElementById('Detail-Container');
        const detailBody = document.getElementById('Detail-Body');
        const mainDiv = document.getElementById('Main-Div');

        if (detailContainer) detailContainer.style.height = `${heights.container}px`;
        if (detailBody) detailBody.style.height = `${heights.container}px`;
        if (mainDiv) mainDiv.style.height = `${heights.main}px`;
    },

    // -------------------------  UTC  ------------------------- //

    getUTCOffset() {
        const local = new Date();
        const utc = new Date(
            local.getUTCFullYear(),
            local.getUTCMonth(),
            local.getUTCDate(),
            local.getUTCHours(),
            local.getUTCMinutes(),
            local.getUTCSeconds()
        );

        const localTime = `${local.getHours()}:${local.getMinutes()}:${local.getSeconds()}`;
        const utcTime = `${utc.getHours()}:${utc.getMinutes()}:${utc.getSeconds()}`;

        return localTime !== utcTime ? 1 : 0;
    },

    // -------------------------  Season  ------------------------- //

    chooseSeason() {
        const month = new Date().getMonth();

        // December — month index 11
        if (month === 11) {
            const nav = document.getElementById('DisplayLayerNav');
            if (!nav) return;
            nav.style.backgroundImage = 'url(images/snowFlake.jpg)';
            nav.style.animationPlayState = 'running';
        }
    },

    // -------------------------  Dropdowns  ------------------------- //

    makeDropdownsEditable() {
        const statusEl = document.getElementById('status');
        const statusValue = statusEl?.options[statusEl.selectedIndex]?.innerText ?? '';

        if (statusValue === 'Resolved') return;

        const editableIds = [
            'assignedTechName',
            'ticketTypeID',
            'priority',
            'category',
            'subject',
            'requestDetail'
        ];

        for (const id of editableIds) {
            document.getElementById(id)?.removeAttribute('disabled');
        }
    },

    // -------------------------  Assigned Tech  ------------------------- //

    setCurrentAssignedTech(fieldId) {
        const el = document.getElementById(fieldId);

        if (el && el.selectedIndex !== -1) {
            sessionStorage.setItem(
                STORAGE_KEYS.OLD_ASSIGNED_TECH,
                el.options[el.selectedIndex].value
            );
        } else {
            sessionStorage.setItem(STORAGE_KEYS.OLD_ASSIGNED_TECH, '');
        }
    },

    // -------------------------  Table Dimensions  ------------------------- //

    setTableDimensions() {
        const table = document.getElementById('Table');
        if (!table) return;

        const windowHeight = window.innerHeight;
        table.style.maxHeight = `${windowHeight - 200}px`;
        table.style.overflowY = 'auto';
    },

    setHeaderWidths(tableId = 'Table') {
        const table = document.getElementById(tableId);
        if (!table) return;

        const headers = table.getElementsByTagName('th');
        const cells = table.getElementsByTagName('td');

        for (let i = 0; i < headers.length; i++) {
            if (cells[i]) {
                headers[i].style.width = `${cells[i].offsetWidth}px`;
            }
        }
    },

    // -------------------------  Init  ------------------------- //

    init() {
        this.setDetailContainerHeight();
        this.chooseSeason();

        window.addEventListener('resize', () => {
            this.setDetailContainerHeight();
            this.setHeaderWidths();
        });
    }
};

// -------------------------  Legacy Wrappers  ------------------------- //

function DisplayScreen() { Layout.displayScreen(); }
function SetDetailContainerHeight() { Layout.setDetailContainerHeight(); }
function UTCWorkAround() { return Layout.getUTCOffset(); }
function ChooseSeason() { Layout.chooseSeason(); }
function MakeDropDownsEditable() { Layout.makeDropdownsEditable(); }
function SetCurrentAssignedTech(fieldId) { Layout.setCurrentAssignedTech(fieldId); }
function SetTableDimentionsAuto() { Layout.setTableDimensions(); }
function SetHeaderWidths(tableId = 'Table') { Layout.setHeaderWidths(tableId); }
