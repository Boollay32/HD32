/**
 * SnowEffect.js
 * Modern Christmas snow effect with depth layers
 * Version: 2.0
 */

class SnowEffect {
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== false,
            snowflakeCount: options.snowflakeCount || 50,
            startDate: options.startDate || '12-01',
            endDate: options.endDate || '01-07',
            navbarOnly: options.navbarOnly || false, // Snow only over navbar
            ...options
        };

        this.snowContainer = null;
        this.snowflakes = [];

        if (this.shouldShowSnow()) {
            this.init();
        }
    }

    shouldShowSnow() {
        if (!this.options.enabled) return false;

        const now = new Date();
        const currentYear = now.getFullYear();

        const [startMonth, startDay] = this.options.startDate.split('-').map(Number);
        const [endMonth, endDay] = this.options.endDate.split('-').map(Number);

        const startDate = new Date(currentYear, startMonth - 1, startDay);
        let endDate = new Date(currentYear, endMonth - 1, endDay);

        if (endMonth === 1) {
            endDate = new Date(currentYear + 1, endMonth - 1, endDay);
        }

        return now >= startDate && now <= endDate;
    }

    init() {
        this.createSnowContainer();
        this.createSnowflakes();
    }

    createSnowContainer() {
        const existing = document.getElementById('snow-overlay');
        if (existing) {
            existing.remove();
        }

        this.snowContainer = document.createElement('div');
        this.snowContainer.id = this.options.navbarOnly ? 'navbar-snow' : 'snow-overlay';

        document.body.appendChild(this.snowContainer);
    }

    createSnowflakes() {
        for (let i = 0; i < this.options.snowflakeCount; i++) {
            const snowflake = this.createSnowflake();
            this.snowflakes.push(snowflake);
            this.snowContainer.appendChild(snowflake);
        }
    }

    createSnowflake() {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';

        // Random depth layer
        const depthRandom = Math.random();
        let depthClass, sizeClass;

        if (depthRandom < 0.3) {
            depthClass = 'near';
            sizeClass = 'size-large';
        } else if (depthRandom < 0.7) {
            depthClass = 'medium';
            sizeClass = 'size-medium';
        } else {
            depthClass = 'far';
            sizeClass = 'size-small';
        }

        snowflake.classList.add(depthClass, sizeClass);

        // Add sparkle to some snowflakes
        if (Math.random() < 0.2) {
            snowflake.classList.add('sparkle');
        }

        // Random horizontal position
        const startX = Math.random() * 100;
        snowflake.style.left = `${startX}%`;

        // Random animation delay for staggered effect
        const delay = Math.random() * 5;
        snowflake.style.animationDelay = `${delay}s`;

        return snowflake;
    }

    stop() {
        if (this.snowContainer) {
            this.snowContainer.remove();
            this.snowContainer = null;
            this.snowflakes = [];
        }
    }

    toggle() {
        if (this.snowContainer) {
            this.stop();
        } else {
            this.init();
        }
    }
}

if (typeof window !== 'undefined') {
    window.SnowEffect = SnowEffect;
}
