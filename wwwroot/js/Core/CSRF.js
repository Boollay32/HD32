(function () {
    function getAntiForgeryToken() {
        const tokenInput = document.querySelector('input[name^="__RequestVerificationToken"]');
        return tokenInput ? tokenInput.value : null;
    }

    const originalFetch = window.fetch;

    window.fetch = function (url, options = {}) {
        if (options.method?.toUpperCase() === 'POST') {
            const token = getAntiForgeryToken();
            if (token) {
                options.headers = options.headers || {};
                if (options.headers instanceof Headers) {
                    options.headers.append('RequestVerificationToken', token);
                } else {
                    options.headers['RequestVerificationToken'] = token;
                }
            }
        }
        return originalFetch(url, options);
    };

    window.ajaxPost = async function (url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': getAntiForgeryToken()
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    };

    window.ajaxGet = async function (url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    };
})();
