// core/api.js
// Centralised API helper — replaces all fetch/$.ajax calls

const API = {

    // -------------------------  Auth  ------------------------- //

    isAuthenticated() {
        const userName = sessionStorage.getItem(STORAGE_KEYS.USER_NAME);
        const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
        return !!(userName && token);
    },

    handleSessionTimeout() {
        BuildMessageBox('Your session has timed out.', 'Index');
    },

    async verifySession() {
        const data = await API.post('Authenticator/Authenticate', {
            userName: sessionStorage.getItem(STORAGE_KEYS.USER_NAME),
            token: sessionStorage.getItem(STORAGE_KEYS.TOKEN),
            utc: UTCWorkAround()
        });

        if (!data?.userID) {
            API.handleSessionTimeout();
            return false;
        }
        return true;
    },

    // -------------------------  Post  ------------------------- //

    post: async function (endpoint, data) {
        const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.status === 401) {
                BuildMessageBox('Your session has timed out.', 'Index');
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`API error [${endpoint}]:`, error);
            return null;
        }
    },

    // -------------------------  Auth Payload  ------------------------- //

    authPayload: function (extras = {}) {
        return {
            userName: sessionStorage.getItem(STORAGE_KEYS.USER_NAME),
            token: sessionStorage.getItem(STORAGE_KEYS.TOKEN),
            utc: UTCWorkAround(),
            ...extras
        };
    }
};
