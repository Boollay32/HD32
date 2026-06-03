// =============================  Cookie.js  ============================= //

class CookieConsent {

    constructor(options = {}) {
        this.options = {
            message: "We use cookies to improve your experience. Please turn on cookies or the HelpDesk won't work.",
            acceptButton: true,
            acceptText: 'I Understand',
            acceptFunction: null,
            declineButton: true,
            declineText: 'Disable Cookies',
            declineFunction: null,
            policyButton: false,
            policyText: 'Privacy Policy',
            policyURL: '/privacy-policy/',
            autoEnable: true,
            acceptOnContinue: false,
            acceptOnScroll: false,
            acceptAnyClick: false,
            expireDays: 365,
            renewOnVisit: false,
            forceShow: false,
            effect: 'slide',     // slide | fade | hide
            element: 'body',
            append: false,
            fixed: false,
            bottom: false,
            zindex: '9999',
            domain: window.location.hostname,
            referrer: document.referrer,
            ...options
        };

        this.cookieName = 'cb-enabled';
        this.cookieBar = null;
        this.scrollHandler = null;
        this.clickHandler = null;

        this.init();
    }

    // -------------------------  Init  ------------------------- //

    init() {
        const cookieValue = this.getCookieValue();

        if (cookieValue === '' && this.options.autoEnable) {
            this.setCookie('enabled');
        }

        if (['accepted', 'declined'].includes(cookieValue) && this.options.renewOnVisit) {
            this.setCookie(cookieValue);
        }

        if (this.options.acceptOnContinue) {
            const fromSameDomain = this.options.referrer.includes(this.options.domain);
            const notPolicyPage = !window.location.href.includes(this.options.policyURL);
            const notResolved = !['accepted', 'declined'].includes(cookieValue);

            if (fromSameDomain && notPolicyPage && notResolved) {
                this.setCookie('accepted');
                return;
            }
        }

        if (this.options.forceShow || cookieValue === 'enabled' || cookieValue === '') {
            this.showBanner();
        }
    }

    // -------------------------  Cookie Read / Write  ------------------------- //

    getCookieValue() {
        for (const cookie of document.cookie.split('; ')) {
            const [name, value] = cookie.split('=');
            if (name === this.cookieName) return value;
        }
        return '';
    }

    setCookie(value) {
        const expireDate = new Date();
        expireDate.setTime(expireDate.getTime() + (this.options.expireDays * 86400000));
        document.cookie = `${this.cookieName}=${value}; expires=${expireDate.toUTCString()}; path=/`;
    }

    isEnabled() {
        const value = this.getCookieValue();
        return value === 'enabled' || value === 'accepted';
    }

    // -------------------------  Banner  ------------------------- //

    showBanner() {
        const targetElement = document.querySelector(this.options.element);
        if (!targetElement) {
            console.error(`CookieConsent: element '${this.options.element}' not found`);
            return;
        }

        const bar = this._buildBanner();

        if (this.options.append) {
            targetElement.appendChild(bar);
        } else {
            targetElement.insertBefore(bar, targetElement.firstChild);
        }

        this.cookieBar = bar;

        this._attachEventListeners();

        if (this.options.acceptOnScroll) this._setupScrollAccept();
        if (this.options.acceptAnyClick) this._setupClickAccept();
    }

    _buildBanner() {
        const bar = document.createElement('div');
        bar.id = 'cookie-bar';

        const classes = [];
        if (this.options.fixed) classes.push('fixed');
        if (this.options.bottom) classes.push('bottom');
        if (classes.length) bar.className = classes.join(' ');

        if (this.options.zindex) bar.style.zIndex = this.options.zindex;

        const p = document.createElement('p');
        p.innerText = this.options.message
            .replace('{policy_url}', this.options.policyURL);

        if (this.options.acceptButton) {
            p.appendChild(this._createLink('cb-enable', this.options.acceptText));
        }

        if (this.options.declineButton) {
            p.appendChild(this._createLink('cb-disable', this.options.declineText));
        }

        if (this.options.policyButton) {
            const policyLink = this._createLink('cb-policy', this.options.policyText);
            policyLink.href = this.options.policyURL;
            p.appendChild(policyLink);
        }

        bar.appendChild(p);
        return bar;
    }

    _createLink(className, text) {
        const a = document.createElement('a');
        a.href = '#';
        a.className = className;
        a.innerText = text;
        return a;
    }

    // -------------------------  Event Listeners  ------------------------- //

    _attachEventListeners() {
        this.cookieBar.querySelector('.cb-enable')
            ?.addEventListener('click', (e) => { e.preventDefault(); this.accept(); });

        this.cookieBar.querySelector('.cb-disable')
            ?.addEventListener('click', (e) => { e.preventDefault(); this.decline(); });
    }

    _setupScrollAccept() {
        const scrollStart = window.pageYOffset || document.documentElement.scrollTop;

        this.scrollHandler = () => {
            const scrollNew = window.pageYOffset || document.documentElement.scrollTop;
            const scrollDiff = Math.abs(scrollNew - scrollStart);
            if (scrollDiff >= Math.round(this.options.acceptOnScroll)) this.accept();
        };

        window.addEventListener('scroll', this.scrollHandler);
    }

    _setupClickAccept() {
        this.clickHandler = (e) => {
            if (!e.target.classList.contains('cb-policy')) this.accept();
        };

        document.addEventListener('click', this.clickHandler);
    }

    // -------------------------  Accept / Decline  ------------------------- //

    accept() {
        const cookieValue = this.getCookieValue();
        this.setCookie('accepted');

        this._removeBanner(() => {
            if (this.options.acceptFunction) {
                this.options.acceptFunction(cookieValue);
            } else if (!['enabled', 'accepted'].includes(cookieValue)) {
                window.location.reload();
            }
        });
    }

    decline() {
        const cookieValue = this.getCookieValue();

        const deleteDate = new Date();
        deleteDate.setTime(deleteDate.getTime() - 864000000);

        for (const cookie of document.cookie.split('; ')) {
            const [name] = cookie.split('=');
            const domain = name.includes('_')
                ? `; domain=${this.options.domain.replace('www', '')}`
                : '';
            document.cookie = `${name}=0; expires=${deleteDate.toUTCString()}${domain}; path=/`;
        }

        this.setCookie('declined');

        this._removeBanner(() => {
            if (this.options.declineFunction) {
                this.options.declineFunction(cookieValue);
            } else if (['enabled', 'accepted'].includes(cookieValue)) {
                window.location.reload();
            }
        });
    }

    // -------------------------  Remove Banner  ------------------------- //

    _removeBanner(callback) {
        if (!this.cookieBar) return;

        if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
        if (this.clickHandler) document.removeEventListener('click', this.clickHandler);

        const delay = this.options.effect === 'hide' ? 0 : 300;

        if (this.options.effect === 'slide') {
            this.cookieBar.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            this.cookieBar.style.transform = 'translateY(-100%)';
            this.cookieBar.style.opacity = '0';
        } else if (this.options.effect === 'fade') {
            this.cookieBar.style.transition = 'opacity 0.3s ease-out';
            this.cookieBar.style.opacity = '0';
        }

        setTimeout(() => {
            this.cookieBar?.parentNode?.removeChild(this.cookieBar);
            callback?.();
        }, delay);
    }

    // -------------------------  Static  ------------------------- //

    static areCookiesEnabled() {
        for (const cookie of document.cookie.split('; ')) {
            const [name, value] = cookie.split('=');
            if (name === 'cb-enabled') return ['enabled', 'accepted'].includes(value);
        }
        return false;
    }

    static setCookieValue(value, expireDays = 365) {
        const expireDate = new Date();
        expireDate.setTime(expireDate.getTime() + (expireDays * 86400000));
        document.cookie = `cb-enabled=${value}; expires=${expireDate.toUTCString()}; path=/`;
        return value === 'accepted';
    }
}

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.CookieConsent = CookieConsent;
}
