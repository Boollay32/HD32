// =============================  StatsPage.js  ============================= //

class StatsPage extends PageBase {
    constructor() {
        super();
    }

    // -------------------------  Init  ------------------------- //

    async init() {
        if (!await this.checkAuth()) return;
        try {
            this._setupPageUI();
            this._setupEventListeners();
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError('Error initializing stats page', 'Index');
            }
        }
    }

    // -------------------------  Page UI  ------------------------- //

    _setupPageUI() {
        SetActivePage('AdminMenu');
        SetTableDimensionsAuto();  // Fix: typo — Dimentions ? Dimensions
        UserPermissions();
        ChooseSeason();
        DisplayScreen();
    }

    // -------------------------  Event Listeners  ------------------------- //

    _setupEventListeners() {
        // Fix: replaces inline onmouseover in view
        document.getElementById('FilterTab')
            ?.addEventListener('mouseover', () => ExpandFilter(true));
        document.getElementById('Table-Div-Outer')
            ?.addEventListener('mouseover', () => ExpandFilter(false));

        // Fix: single listener for all stat buttons via data attributes
        document.querySelectorAll('.Filter-Div .Search[data-stat-type]')
            .forEach(btn => btn.addEventListener('click', () => {
                const type = parseInt(btn.dataset.statType);
                const label = btn.dataset.statLabel;
                this.getStats(type, label);
            }));

        // Fix: download button wired here — not onclick=""
        document.getElementById('Download-Table-Button')
            ?.addEventListener('click', () => this._triggerDownload());

        window.addEventListener('resize', () => {
            SetTableDimensionsAuto();
            SetHeaderWidths();
        });
    }

    // -------------------------  Stats  ------------------------- //

    async getStats(statsId, reportName) {
        try {
            const data = await API.post('Reports/GetStats',
                API.authPayload({ statsId })
            );

            if (!data?.length) return;

            CreateDynamicTable(data, 'Stats', null, null);
            this._createCSV(data, reportName);
            SetHeaderWidths();

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't load stats.");
            }
        }
    }

    // -------------------------  CSV  ------------------------- //

    _createCSV(data, reportName) {
        const { headers, rows } = this._buildCSVContent(data);
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const blobURL = URL.createObjectURL(blob);

        this._renderDownloadLink(blobURL, reportName);
    }

    _buildCSVContent(data) {
        // Fix: CSV escaping — values with commas/quotes/newlines wrapped in quotes
        const escapeCSV = val => {
            const str = String(val ?? '');
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        };

        let headers = '';
        let rows = '';

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const keys = Object.keys(row);

            if (i === 0) headers = keys.join(',');

            rows += keys.map(key => escapeCSV(row[key])).join(',') + '\n';
        }

        return { headers, rows };
    }

    _renderDownloadLink(blobURL, reportName) {
        // Fix: id selector — name selector removed from view
        // Fix: blob URL revoked after download — prevents memory leak
        const btn = document.getElementById('Download-Table-Button');
        if (!btn) return;

        btn.onclick = () => {
            const link = document.createElement('a');
            link.href = blobURL;
            link.download = `${reportName}HelpdeskReport.csv`;
            link.click();
            URL.revokeObjectURL(blobURL);  // Fix: memory leak prevented
        };
    }
}

// -------------------------  Init  ------------------------- //

const statsPage = new StatsPage();
document.addEventListener('DOMContentLoaded', () => statsPage.init());

// -------------------------  Legacy Wrappers  ------------------------- //

function GetStats(statsId, reportName) { statsPage.getStats(statsId, reportName); }
function CreateCSVFromTable(data, reportName) { statsPage._createCSV(data, reportName); }
