/**
 * TableManager.js
 * Handles table rendering, sorting, and row interactions
 * Version: 2.0
 */

class TableManager {
    constructor(tableId, options = {}) {
        this.tableId = tableId;
        this.options = {
            blacklist: options.blacklist || [],
            onRowClick: options.onRowClick || null,
            sortable: options.sortable || false,
            striped: options.striped || true,
            hover: options.hover || true
        };

        this.data = [];
        this.currentSort = {
            column: null,
            ascending: true
        };
    }

    /**
     * Get table element dynamically (not cached)
     */
    getTableElement() {
        return document.getElementById(this.tableId);
    }

    /**
     * Render table with data
     */
    render(data) {
        const tableElement = this.getTableElement();

        if (!tableElement) {
            console.error(`Table with id '${this.tableId}' not found`);
            return;
        }

        if (!data || data.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Store data
        this.data = data;

        // Get columns (excluding blacklisted ones)
        const columns = this.getColumns(data[0]);

        // Build table HTML
        let html = '<table><thead><tr>';

        columns.forEach(col => {
            html += `<th>${this.formatColumnName(col)}</th>`;
        });

        html += '</tr></thead><tbody>';

        // Add rows
        data.forEach(row => {
            html += '<tr>';

            columns.forEach(col => {
                const value = row[col];
                html += `<td>${this.formatCellValue(value)}</td>`;
            });

            html += '</tr>';
        });

        html += '</tbody></table>';

        tableElement.innerHTML = html;

        // Add click handlers
        this.attachRowClickHandlers(data);
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const tableElement = this.getTableElement();

        if (!tableElement) {
            console.error(`Table with id '${this.tableId}' not found`);
            return;
        }

        tableElement.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <p style="font-size: 18px; margin-bottom: 10px;">No tickets found</p>
                <p style="font-size: 14px;">Try adjusting your filters</p>
            </div>`;
    }

    /**
     * Attach click handlers to rows
     */
    attachRowClickHandlers(data) {
        const tableElement = this.getTableElement();

        if (!tableElement || !this.options.onRowClick) return;

        const rows = tableElement.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                this.options.onRowClick(data[index]);
            });
        });
    }

    /**
     * Get columns from data, excluding blacklisted ones
     */
    getColumns(dataItem, columnOrder = null) {
        let columns = columnOrder || Object.keys(dataItem);

        // ✅ Debug: See all columns before filtering
        console.log('📊 All columns from data:', columns);
        console.log('🚫 Blacklist:', this.options.blacklist);

        // Convert blacklist to lowercase for comparison
        const blacklistLower = this.options.blacklist.map(col => col.toLowerCase());

        // Filter out blacklisted columns
        const filteredColumns = columns.filter(col => {
            const isBlacklisted = blacklistLower.includes(col.toLowerCase());
            if (isBlacklisted) {
                console.log(`   ❌ Filtering out: ${col}`);
            }
            return !isBlacklisted;
        });

        console.log('✅ Columns after filtering:', filteredColumns);

        return filteredColumns;
    }


    /**
     * Format column name for display
     */
    formatColumnName(column) {
        // Convert camelCase to Title Case
        return column
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Format cell value for display
     */
    /**
 * Format cell value for display
 */
    formatCellValue(value) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        // ✅ Handle date strings from database
        if (this.isDateString(value)) {
            return this.formatDate(value);
        }

        // Handle Date objects
        if (value instanceof Date) {
            return this.formatDate(value);
        }

        // Handle booleans
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        // Escape HTML
        return this.escapeHtml(String(value));
    }

    /**
     * Check if string is a date
     */
    isDateString(value) {
        if (typeof value !== 'string') return false;

        // Check for ISO date format (2024-03-27T14:30:00 or 2024-03-27)
        const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

        if (isoDatePattern.test(value)) {
            const date = new Date(value);
            return !isNaN(date.getTime());
        }

        return false;
    }

    /**
     * Format date to human-readable format
     */
    formatDate(value) {
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return value;

        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };

        return date.toLocaleString('en-GB', options);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Sort table by column
     */
    sort(column) {
        // Toggle sort direction if same column
        if (this.currentSort.column === column) {
            this.currentSort.ascending = !this.currentSort.ascending;
        } else {
            this.currentSort.column = column;
            this.currentSort.ascending = true;
        }

        // Sort data
        this.data.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle null/undefined
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // Convert to string for comparison
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();

            if (aVal < bVal) return this.currentSort.ascending ? -1 : 1;
            if (aVal > bVal) return this.currentSort.ascending ? 1 : -1;
            return 0;
        });

        // Re-render
        this.render(this.data);

        // Update header to show sort direction
        this.updateSortIndicator(column);
    }

    /**
     * Update sort indicator in header
     */
    updateSortIndicator(column) {
        const tableElement = this.getTableElement();
        if (!tableElement) return;

        // Remove all existing indicators
        const headers = tableElement.querySelectorAll('th');
        headers.forEach(th => {
            th.textContent = th.textContent.replace(' ▲', '').replace(' ▼', '');
        });

        // Add indicator to current column
        const currentHeader = tableElement.querySelector(`th[data-column="${column}"]`);
        if (currentHeader) {
            const indicator = this.currentSort.ascending ? ' ▲' : ' ▼';
            currentHeader.textContent += indicator;
        }
    }

    /**
     * Get current data
     */
    getData() {
        return this.data;
    }

    /**
     * Get row count
     */
    getRowCount() {
        const tableElement = this.getTableElement();
        if (!tableElement) return 0;

        const rows = tableElement.querySelectorAll('tbody tr');
        return rows.length;
    }

    /**
     * Clear table
     */
    clear() {
        const tableElement = this.getTableElement();
        if (tableElement) {
            tableElement.innerHTML = '';
        }
        this.data = [];
    }

    /**
     * Destroy table manager
     */
    destroy() {
        const tableElement = this.getTableElement();
        if (tableElement) {
            tableElement.innerHTML = '';
        }
        this.data = [];
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.TableManager = TableManager;
}
