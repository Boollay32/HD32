// =====================  Notes.js  ===================== //

'use strict';

const Notes = (() => {

    // -------------------------  Constants  ------------------------- //

    const CHAR_LIMIT = 2000;
    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_B = MAX_FILE_SIZE_MB * 1024 * 1024;
    const MAX_ATTACHMENTS = 5;

    const VISIBILITY = {
        INTERNAL: 'internal',
        CLIENT: 'client',
    };

    // -------------------------  State  ------------------------- //

    const State = {
        ticketId: null,
        notes: [],
        pendingFiles: [],
        isLoading: false,
        isSending: false,
        visibility: VISIBILITY.INTERNAL,
    };

    // -------------------------  DOM refs  ------------------------- //

    const Dom = {
        noteThread: () => document.getElementById('Notes-Thread'),
        textarea: () => document.getElementById('note-textarea'),
        sendBtn: () => document.getElementById('note-send-btn'),
        charcount: () => document.getElementById('note-charcount'),
        fileInput: () => document.getElementById('note-file-input'),
        attachList: () => document.getElementById('note-attachment-list'),
        visibilityBtn: () => document.getElementById('note-visibility-btn'),
        scopeNote: () => document.getElementById('note-scope-banner'),
        composeDock: () => document.getElementById('Notes-Compose'),
    };

    // -------------------------  Session  ------------------------- //

    const Session = {
        get token() { return sessionStorage.getItem(STORAGE_KEYS.TOKEN); },
        get userId() { return sessionStorage.getItem(STORAGE_KEYS.USER_ID); },
        get userName() { return sessionStorage.getItem(STORAGE_KEYS.USER_NAME); },
        get isAdmin() { return parseInt(sessionStorage.getItem(STORAGE_KEYS.ADMIN) ?? '0', 10) >= 1; },
    };

    // -------------------------  Helpers  ------------------------- //

    const Helpers = {

        formatTime(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            if (isNaN(d)) return '';
            return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        },

        formatDate(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            if (isNaN(d)) return '';
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        },

        formatDateTime(raw) {
            if (!raw) return '';
            return `${Helpers.formatDate(raw)} ${Helpers.formatTime(raw)}`;
        },

        initials(name) {
            if (!name) return '?';
            return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
        },

        escapeHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        fileIcon(filename) {
            const ext = filename?.split('.').pop()?.toLowerCase() ?? '';
            const map = {
                pdf: '📄', doc: '📝', docx: '📝',
                xls: '📊', xlsx: '📊',
                png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️',
                zip: '🗜️', rar: '🗜️',
                mp4: '🎬', mov: '🎬',
                mp3: '🎵',
                txt: '📃',
            };
            return map[ext] ?? '📎';
        },

        fileSizeLabel(bytes) {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        },
    };

    // -------------------------  ObjectInfo builder  ------------------------- //

    // Builds pipe-backtick string matching SaveNoteRequest.ObjectInfo
    // format: "FieldA`valueA|FieldB`valueB"
    function _buildObjectInfo(fields) {
        return Object.entries(fields)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${k}\`${v}`)
            .join('|');
    }

    // -------------------------  Init  ------------------------- //

    function init(ticketId) {
    State.ticketId = parseInt(ticketId, 10);

        _bindComposer();
        _bindVisibilityBtn();
        _bindFileInput();
        _applyScopeBanner();

        _getNotes();
    }

    // -------------------------  Scope banner  ------------------------- //

    function _applyScopeBanner() {
        const banner = Dom.scopeNote();
        if (!banner) return;

        if (!Session.isAdmin) {
            banner.setAttribute('hidden', '');
            return;
        }

        banner.removeAttribute('hidden');
        _updateScopeBanner();
    }

    function _updateScopeBanner() {
        const banner = Dom.scopeNote();
        if (!banner) return;

        const isClient = State.visibility === VISIBILITY.CLIENT;
        banner.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                ${isClient
                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                : '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'}
            </svg>
            ${isClient
                ? 'This note <strong>will be visible</strong> to the client.'
                : 'This note is <strong>internal only</strong> — not visible to the client.'}
        `;
    }

    // -------------------------  Send note  ------------------------- //

    async function _sendNote() {
        if (State.isSending) return;

        const textarea = Dom.textarea();
        const sendBtn = Dom.sendBtn();
        if (!textarea || !sendBtn) return;

        const body = textarea.value.trim();
        if (!body && State.pendingFiles.length === 0) return;

        State.isSending = true;
        sendBtn.disabled = true;

        // Optimistic note
        const tempId = `temp-${Date.now()}`;
        _appendNote(_buildOptimisticNote(tempId, body));

        try {
            // Build ObjectInfo pipe-backtick string matching SaveNoteRequest
            const objectInfo = _buildObjectInfo({
                TicketID: State.ticketId,
                noteDescription: body,
                visibleToClient: State.visibility === VISIBILITY.CLIENT ? '1' : '0',
            });

            // Convert pending files to base64 attachment refs
            const attachments = await _prepareAttachments(State.pendingFiles);

            const data = await API.post(
                'TicketDetails/SaveNote',
                API.authPayload({
                    objectInfo,
                    attachments,
                    rfc: false,
                })
            );

            if (!data) throw new Error('SaveNote returned null');

            // Server returns updated notes array — re-render
            if (Array.isArray(data)) {
                State.notes = data;
                _renderNotes(data);
            } else {
                // Single note returned — replace optimistic
                _replaceOptimisticNote(tempId, data);
                State.notes.push(data);
            }

            _updatePip();
            _clearComposer(textarea, sendBtn);
            _clearAttachments();

            // Reset visibility to internal after send
            State.visibility = VISIBILITY.INTERNAL;
            _applyVisibilityBtn();
            _updateScopeBanner();

        } catch (err) {
            console.error('Notes._sendNote:', err);
            _removeOptimisticNote(tempId);
            textarea.disabled = false;
            UI.toast?.('Failed to add note', 'error');

        } finally {
            State.isSending = false;
            sendBtn.disabled = textarea.value.trim().length === 0;
        }
    }

    // -------------------------  Get notes  ------------------------- //

    async function _getNotes() {
        if (State.isLoading) return;
        State.isLoading = true;

        try {
            const data = await API.post(
                'TicketDetails/GetNotes',
                API.authPayload({ ticketId: State.ticketId })
            );

            if (!Array.isArray(data)) return;

            State.notes = data;
            _renderNotes(data);
            _updatePip();

        } catch (err) {
            console.error('Notes._getNotes:', err);
            UI.toast?.('Failed to load notes', 'error');
        } finally {
            State.isLoading = false;
        }
    }

    // -------------------------  Render notes  ------------------------- //

    function _renderNotes(notes) {
        const thread = Dom.noteThread();
        if (!thread) return;

        thread.innerHTML = '';

        if (notes.length === 0) {
            thread.appendChild(_buildEmptyState());
            return;
        }

        const fragment = document.createDocumentFragment();
        notes.forEach(note => fragment.appendChild(_buildNoteCard(note)));
        thread.appendChild(fragment);

        _scrollToBottom(false);
    }

    // -------------------------  Append single note  ------------------------- //

    function _appendNote(note) {
        const thread = Dom.noteThread();
        if (!thread) return;

        const empty = thread.querySelector('.td-thread-empty');
        empty?.remove();

        thread.appendChild(_buildNoteCard(note));
        _scrollToBottom(true);
    }

    // -------------------------  Optimistic helpers  ------------------------- //

    function _replaceOptimisticNote(tempId, savedNote) {
        const thread = Dom.noteThread();
        const tempCard = thread?.querySelector(`[data-nid="${tempId}"]`);
        if (!tempCard) return;
        tempCard.replaceWith(_buildNoteCard(savedNote));
    }

    function _removeOptimisticNote(tempId) {
        const thread = Dom.noteThread();
        thread?.querySelector(`[data-nid="${tempId}"]`)?.remove();
    }

    // -------------------------  Empty state  ------------------------- //

    function _buildEmptyState() {
        const div = document.createElement('div');
        div.className = 'td-thread-empty';
        div.setAttribute('aria-label', 'No notes yet');
        div.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>
            <p>No notes yet.<br>Add an internal note below.</p>
        `;
        return div;
    }

    // -------------------------  Scroll  ------------------------- //

    function _scrollToBottom(smooth = true) {
        const thread = Dom.noteThread();
        if (!thread) return;
        thread.scrollTo({ top: thread.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
    }

    // -------------------------  Tab pip  ------------------------- //

    function _updatePip() {
        if (typeof Tabs !== 'undefined') {
            Tabs.setPip('notes', State.notes.length);
        }
    }

    // -------------------------  Note card builder  ------------------------- //

    function _buildNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'td-note-card';
        card.dataset.nid = note.NoteID;

        if (note.IsVisibleToClient) card.classList.add('is-visible-to-client');
        if (note._optimistic) card.classList.add('is-optimistic');

        card.appendChild(_buildNoteHead(note));
        card.appendChild(_buildNoteBody(note));

        if (Array.isArray(note.Attachments) && note.Attachments.length > 0) {
            card.appendChild(_buildNoteAttachments(note.Attachments));
        }

        return card;
    }

    // -------------------------  Note head  ------------------------- //

    function _buildNoteHead(note) {
        const head = document.createElement('div');
        head.className = 'td-note-head';

        const avatar = document.createElement('div');
        avatar.className = 'td-note-avatar';
        avatar.textContent = Helpers.initials(note.AuthorName);
        avatar.setAttribute('aria-hidden', 'true');
        head.appendChild(avatar);

        const author = document.createElement('span');
        author.className = 'td-note-author';
        author.textContent = Helpers.escapeHtml(note.AuthorName ?? 'Unknown');
        head.appendChild(author);

        if (note.IsVisibleToClient) {
            const badge = document.createElement('span');
            badge.className = 'td-note-visible-badge';
            badge.innerHTML = `
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                Visible to client
            `;
            head.appendChild(badge);
        }

        const time = document.createElement('span');
        time.className = 'td-note-time';
        time.textContent = Helpers.formatDateTime(note.CreatedDate);
        time.setAttribute('title', note.CreatedDate ?? '');
        head.appendChild(time);

        return head;
    }

    // -------------------------  Note body  ------------------------- //

    function _buildNoteBody(note) {
        const body = document.createElement('div');
        body.className = 'td-note-body';
        body.textContent = note.Body ?? '';
        return body;
    }

    // -------------------------  Note attachments  ------------------------- //

    function _buildNoteAttachments(attachments) {
        const wrap = document.createElement('div');
        wrap.className = 'td-note-attachments';

        attachments.forEach(att => {
            const link = document.createElement('a');
            link.className = 'td-note-file';
            link.href = att.FileURL ?? '#';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('aria-label', `Download ${att.FileName}`);
            link.innerHTML = `
                <span aria-hidden="true">${Helpers.fileIcon(att.FileName)}</span>
                <span>${Helpers.escapeHtml(att.FileName)}</span>
                <span class="mono">${Helpers.fileSizeLabel(att.FileSize ?? 0)}</span>
            `;
            wrap.appendChild(link);
        });

        return wrap;
    }

    // -------------------------  Attachment chips  ------------------------- //

    function _buildAttachChip(file, index) {
        const chip = document.createElement('div');
        chip.className = 'td-attach-chip';
        chip.dataset.index = index;
        chip.innerHTML = `
            <span aria-hidden="true">${Helpers.fileIcon(file.name)}</span>
            <span title="${Helpers.escapeHtml(file.name)}">${Helpers.escapeHtml(file.name)}</span>
            <span class="mono">${Helpers.fileSizeLabel(file.size)}</span>
            <button type="button" aria-label="Remove ${Helpers.escapeHtml(file.name)}" data-index="${index}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        chip.querySelector('button')?.addEventListener('click', () => _removeAttachment(index));
        return chip;
    }

    function _renderAttachChips() {
        const list = Dom.attachList();
        if (!list) return;
        list.innerHTML = '';
        State.pendingFiles.forEach((file, i) => list.appendChild(_buildAttachChip(file, i)));
    }

    // -------------------------  Attachment management  ------------------------- //

    function _addAttachments(files) {
        const remaining = MAX_ATTACHMENTS - State.pendingFiles.length;

        if (remaining <= 0) {
            UI.toast?.(`Maximum ${MAX_ATTACHMENTS} attachments allowed`, 'warning');
            return;
        }

        const toAdd = Array.from(files).slice(0, remaining);
        const rejected = [];

        toAdd.forEach(file => {
            if (file.size > MAX_FILE_SIZE_B) {
                rejected.push(file.name);
                return;
            }
            State.pendingFiles.push(file);
        });

        if (rejected.length > 0) {
            UI.toast?.(`${rejected.join(', ')} exceeded ${MAX_FILE_SIZE_MB}MB limit`, 'warning');
        }

        _renderAttachChips();

        const input = Dom.fileInput();
        if (input) input.value = '';
    }

    function _removeAttachment(index) {
        State.pendingFiles.splice(index, 1);
        _renderAttachChips();
    }

    function _clearAttachments() {
        State.pendingFiles = [];
        _renderAttachChips();
    }

    // -------------------------  File input binding  ------------------------- //

    function _bindFileInput() {
        Dom.fileInput()?.addEventListener('change', (e) => {
            _addAttachments(e.target.files);
        });

        Dom.composeDock()?.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            Dom.composeDock()?.classList.add('is-dragover');
        });

        Dom.composeDock()?.addEventListener('dragleave', () => {
            Dom.composeDock()?.classList.remove('is-dragover');
        });

        Dom.composeDock()?.addEventListener('drop', (e) => {
            e.preventDefault();
            Dom.composeDock()?.classList.remove('is-dragover');
            _addAttachments(e.dataTransfer.files);
        });
    }

    // -------------------------  Visibility toggle  ------------------------- //

    function _bindVisibilityBtn() {
        const btn = Dom.visibilityBtn();
        if (!btn) return;

        _applyVisibilityBtn();

        btn.addEventListener('click', () => {
            State.visibility = State.visibility === VISIBILITY.INTERNAL
                ? VISIBILITY.CLIENT
                : VISIBILITY.INTERNAL;

            _applyVisibilityBtn();
            _updateScopeBanner();
        });
    }

    function _applyVisibilityBtn() {
        const btn = Dom.visibilityBtn();
        if (!btn) return;

        const isClient = State.visibility === VISIBILITY.CLIENT;

        btn.setAttribute('aria-pressed', isClient ? 'true' : 'false');
        btn.setAttribute('title', isClient
            ? 'Visible to client — click to make internal'
            : 'Internal only — click to share with client'
        );

        btn.innerHTML = isClient
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
               </svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
               </svg>`;
    }

    // -------------------------  Composer binding  ------------------------- //

    function _bindComposer() {
        const textarea = Dom.textarea();
        const sendBtn = Dom.sendBtn();
        if (!textarea || !sendBtn) return;

        textarea.addEventListener('input', () => {
            const len = textarea.value.length;

            const cc = Dom.charcount();
            if (cc) {
                cc.textContent = `${len} / ${CHAR_LIMIT}`;
                cc.classList.toggle('is-near-limit', len >= CHAR_LIMIT * 0.85);
                cc.classList.toggle('is-at-limit', len >= CHAR_LIMIT);
            }

            sendBtn.disabled = len === 0;

            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) sendBtn.click();
            }
        });

        sendBtn.addEventListener('click', _sendNote);
    }
       

    // -------------------------  Optimistic note  ------------------------- //

    function _buildOptimisticNote(tempId, body) {
        return {
            NoteID: tempId,
            AuthorName: Session.userName ?? 'You',
            Body: body,
            CreatedDate: new Date().toISOString(),
            IsVisibleToClient: State.visibility === VISIBILITY.CLIENT,
            Attachments: State.pendingFiles.map(f => ({
                FileName: f.name,
                FileSize: f.size,
                FileURL: null,
            })),
            _optimistic: true,
        };
    }

    // -------------------------  Clear composer  ------------------------- //

    function _clearComposer(textarea, sendBtn) {
        textarea.value = '';
        textarea.style.height = 'auto';
        sendBtn.disabled = true;

        const cc = Dom.charcount();
        if (cc) {
            cc.textContent = `0 / ${CHAR_LIMIT}`;
            cc.classList.remove('is-near-limit', 'is-at-limit');
        }
    }

    // -------------------------  Prepare attachments (base64)  ------------------------- //

    async function _prepareAttachments(files) {
        if (!files.length) return [];

        return Promise.all(files.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                AttachmentName: file.name,
                AttachmentByteArray: reader.result.split(',')[1], // base64 only
                AttachmentImageType: file.type,
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })));
    }

    // -------------------------  Send note (inner body)  ------------------------- //

    async function _sendNote(textarea, sendBtn, body) {
        try {
            // Build ObjectInfo pipe-backtick string
            const objectInfo = _buildObjectInfo({
                TicketID: State.ticketId,
                noteDescription: body,
                visibleToClient: State.visibility === VISIBILITY.CLIENT ? '1' : '0',
            });

            // Convert pending files to base64
            let attachmentRefs = [];
            if (State.pendingFiles.length > 0) {
                attachmentRefs = await _encodeAttachments(State.pendingFiles);
            }

            const data = await API.post(
                'TicketDetails/SaveNote',
                API.authPayload({
                    objectInfo,
                    attachments: attachmentRefs,
                    rfc: false,
                })
            );

            if (!data) throw new Error('SaveNote returned null');

            const notes = Array.isArray(data) ? data : [data];
            State.notes = notes;

            _renderNotes(notes);
            _updatePip();
            _clearComposer(textarea, sendBtn);
            _clearAttachments();

            // Reset visibility to internal after send
            State.visibility = VISIBILITY.INTERNAL;
            _applyVisibilityBtn();
            _updateScopeBanner();

        } catch (err) {
            console.error('Notes._sendNote:', err);
            _removeOptimisticNote(tempId);
            textarea.disabled = false;
            sendBtn.disabled = false;
            UI.toast?.('Failed to add note', 'error');

        } finally {
            State.isSending = false;
            sendBtn.disabled = textarea.value.trim().length === 0;
        }
    }

    // -------------------------  Optimistic note  ------------------------- //

    function _buildOptimisticNote(tempId, body) {
        return {
            NoteID: tempId,
            AuthorName: Session.userName ?? 'You',
            Body: body,
            CreatedDate: new Date().toISOString(),
            IsVisibleToClient: State.visibility === VISIBILITY.CLIENT,
            Attachments: State.pendingFiles.map(f => ({
                FileName: f.name,
                FileSize: f.size,
                FileURL: null,
            })),
            _optimistic: true,
        };
    }

    // -------------------------  Clear composer  ------------------------- //

    function _clearComposer(textarea, sendBtn) {
        textarea.value = '';
        textarea.style.height = 'auto';
        sendBtn.disabled = true;

        const cc = Dom.charcount();
        if (cc) {
            cc.textContent = `0 / ${CHAR_LIMIT}`;
            cc.classList.remove('is-near-limit', 'is-at-limit');
        }
    }

    // -------------------------  Encode attachments  ------------------------- //

    async function _encodeAttachments(files) {
        const results = await Promise.all(files.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const base64 = e.target.result.split(',')[1];
                    resolve({
                        AttachmentByteArray: base64,
                        AttachmentName: file.name,
                        AttachmentImageType: file.type,
                    });
                };

                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }));

        return results;
    }

    // -------------------------  Public API  ------------------------- //

    return {
        init,
        refresh: _getNotes,
    };

})();
