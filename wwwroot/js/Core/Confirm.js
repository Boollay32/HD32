// =============================  Confirm.js  ============================= //
// Reusable, promise-based confirmation + unsaved-changes guard modal.
//
//   await Confirm.ask({ title, message, confirmText, cancelText, danger })
//      -> resolves true (confirmed) | false (cancelled)
//
//   await Confirm.guard({ title, message, saveText, discardText, cancelText })
//      -> resolves 'save' | 'discard' | 'cancel'
//
// Escape key and backdrop click always resolve to the SAFE option
// (false for ask, 'cancel' for guard) so nothing is lost by accident.
// ======================================================================== //

'use strict';

const Confirm = (() => {

    let _open = null; // { overlay, resolve, safeValue } — only one at a time

    // -------------------------  Build / teardown  ------------------------- //

    function _teardown(value) {
        if (!_open) return;
        const { overlay, resolve } = _open;
        document.removeEventListener('keydown', _onKeydown, true);
        overlay.classList.remove('is-visible');
        // allow the fade-out transition to finish before removal
        setTimeout(() => overlay.remove(), 160);
        _open = null;
        resolve(value);
    }

    function _onKeydown(e) {
        if (!_open) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            _teardown(_open.safeValue);
        }
    }

    function _icon(danger) {
        // warning triangle for danger, question circle otherwise
        return danger
            ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                   stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                 <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                 <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
               </svg>`
            : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                   stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                 <circle cx="12" cy="12" r="10"/>
                 <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
               </svg>`;
    }

    function _escape(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function _mount(html, safeValue, resolve) {
        // Close any prior dialog as a safe-cancel before opening a new one.
        if (_open) _teardown(_open.safeValue);

        const overlay = document.createElement('div');
        overlay.className = 'cf-overlay';
        overlay.setAttribute('role', 'presentation');
        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) _teardown(safeValue);
        });

        _open = { overlay, resolve, safeValue };
        document.addEventListener('keydown', _onKeydown, true);

        // force reflow then animate in
        requestAnimationFrame(() => overlay.classList.add('is-visible'));

        return overlay;
    }

    // -------------------------  ask (yes / no)  ------------------------- //

    function ask({
        title = 'Are you sure?',
        message = '',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        danger = false,
    } = {}) {
        return new Promise((resolve) => {
            const html = `
                <div class="cf-dialog ${danger ? 'cf-danger' : ''}" role="alertdialog"
                     aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-msg">
                    <div class="cf-head">
                        <span class="cf-icon">${_icon(danger)}</span>
                        <h2 class="cf-title" id="cf-title">${_escape(title)}</h2>
                    </div>
                    ${message ? `<p class="cf-msg" id="cf-msg">${_escape(message)}</p>` : ''}
                    <div class="cf-actions">
                        <button type="button" class="cf-btn cf-btn-ghost" data-cf="cancel">${_escape(cancelText)}</button>
                        <button type="button" class="cf-btn ${danger ? 'cf-btn-danger' : 'cf-btn-primary'}" data-cf="confirm">${_escape(confirmText)}</button>
                    </div>
                </div>`;

            const overlay = _mount(html, false, resolve);

            overlay.querySelector('[data-cf="cancel"]')
                ?.addEventListener('click', () => _teardown(false));
            overlay.querySelector('[data-cf="confirm"]')
                ?.addEventListener('click', () => _teardown(true));

            setTimeout(() => overlay.querySelector('[data-cf="confirm"]')?.focus(), 60);
        });
    }

    // -------------------------  guard (save / discard / cancel)  ------------------------- //

    function guard({
        title = 'Unsaved changes',
        message = 'You have changes that haven\u2019t been saved. What would you like to do?',
        saveText = 'Save',
        discardText = 'Discard',
        cancelText = 'Keep editing',
    } = {}) {
        return new Promise((resolve) => {
            const html = `
                <div class="cf-dialog" role="alertdialog" aria-modal="true"
                     aria-labelledby="cf-title" aria-describedby="cf-msg">
                    <div class="cf-head">
                        <span class="cf-icon">${_icon(false)}</span>
                        <h2 class="cf-title" id="cf-title">${_escape(title)}</h2>
                    </div>
                    ${message ? `<p class="cf-msg" id="cf-msg">${_escape(message)}</p>` : ''}
                    <div class="cf-actions cf-actions-3">
                        <button type="button" class="cf-btn cf-btn-ghost" data-cf="cancel">${_escape(cancelText)}</button>
                        <button type="button" class="cf-btn cf-btn-quiet" data-cf="discard">${_escape(discardText)}</button>
                        <button type="button" class="cf-btn cf-btn-primary" data-cf="save">${_escape(saveText)}</button>
                    </div>
                </div>`;

            const overlay = _mount(html, 'cancel', resolve);

            overlay.querySelector('[data-cf="cancel"]')
                ?.addEventListener('click', () => _teardown('cancel'));
            overlay.querySelector('[data-cf="discard"]')
                ?.addEventListener('click', () => _teardown('discard'));
            overlay.querySelector('[data-cf="save"]')
                ?.addEventListener('click', () => _teardown('save'));

            setTimeout(() => overlay.querySelector('[data-cf="save"]')?.focus(), 60);
        });
    }

    return { ask, guard };

})();
