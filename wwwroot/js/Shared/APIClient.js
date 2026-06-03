class APIClient {
    constructor() {
        this.storageKeys = {
            username: STORAGE_KEYS.USER_NAME,
            token: 'Token',
            userId: STORAGE_KEYS.USER_ID,
            myTickets: STORAGE_KEYS.MY_TICKETS
        };
    }

    isAuthenticated() {
        return !!(this.getUsername() && this.getToken());
    }

    getUsername() {
        return sessionStorage.getItem(this.storageKeys.username);
    }

    getToken() {
        return sessionStorage.getItem(this.storageKeys.token);
    }

    getUserId() {
        return sessionStorage.getItem(this.storageKeys.userId);
    }

    getMyTickets() {
        return sessionStorage.getItem(this.storageKeys.myTickets) || '0';
    }

    getUTC() {
        if (typeof UTCWorkAround === 'function') {
            return UTCWorkAround();
        }
        return new Date().getTimezoneOffset() / -60;
    }

    /**
     * Returns auth fields to merge into a request body
     * Use this instead of getAuthHeaders() for all controller calls
     * @returns {Object}
     */
    getAuthBody() {
        if (!this.isAuthenticated()) {
            console.warn('User not authenticated');
            return null;
        }

        return {
            userName: this.getUsername(),
            token: this.getToken(),
            utc: this.getUTC()
        };
    }

    /**
     * Make an authenticated POST request
     * Auth fields are merged into the request body automatically
     * @param {string} url 
     * @param {Object} data - Your request data (auth fields added automatically)
     * @returns {Promise}
     */
    async post(url, data = {}) {
        if (!this.isAuthenticated()) {
            this.handleUnauthorized();
            throw new Error('Not authenticated');
        }

        const body = {
            ...this.getAuthBody(),  // userName, token, utc
            ...data                 // your additional fields
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            // Only log out on 401 — server says this user is not permitted
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Unauthorized');
            }

            // Any other error — do NOT log out, just throw so the caller handles it
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`POST ${url} failed:`, error);
            throw error;
        }
    }

    /**
     * Make an authenticated GET request
     * @param {string} url
     * @returns {Promise}
     */
    async get(url) {
        if (!this.isAuthenticated()) {
            this.handleUnauthorized();
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`GET ${url} failed:`, error);
            throw error;
        }
    }

    /**
     * Only called when server returns 401 — user is genuinely not permitted
     * This is the ONLY place a logout/redirect should be triggered
     */
    handleUnauthorized() {
        console.warn('Unauthorized — redirecting to login');
        this.clearAuth();

        if (typeof BuildMessageBox === 'function') {
            BuildMessageBox('You are not authorised. Please log in again.', 'Index');
        } else {
            alert('You are not authorised. Please log in again.');
            window.location.href = '/';
        }
    }

    clearAuth() {
        sessionStorage.removeItem(this.storageKeys.username);
        sessionStorage.removeItem(this.storageKeys.token);
        sessionStorage.removeItem(this.storageKeys.userId);
    }

    setAuth(username, token, userId) {
        sessionStorage.setItem(this.storageKeys.username, username);
        sessionStorage.setItem(this.storageKeys.token, token);
        if (userId) {
            sessionStorage.setItem(this.storageKeys.userId, userId);
        }
    }
}

if (typeof window !== 'undefined') {
    window.apiClient = new APIClient();
}
