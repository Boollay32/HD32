// =====================  MessagesPanel.js  ===================== //

'use strict';

const MessagesPanel = (() => {

    // -------------------------  Constants  ------------------------- //

    const POLL_INTERVAL_MS = 30_000; // 30 seconds
    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_B = MAX_FILE_SIZE_MB * 1024 * 1024;
    const MAX_ATTACHMENTS = 5;
    const CHAR_LIMIT = 2000;

    const MSG_DIRECTION = {
        OUT: 'out',
        IN: 'in',
    };

    // -------------------------  State  ------------------------- //

    const State = {
        ticketId: null,
        messages: [],
        pendingFiles: [],
        isLoading: false,
        isSending: false,
        pollTimer: null,
        lastMessageId: null,
        unreadCount: 0,
        isScrolledUp: false,
    };

    // -------------------------  DOM refs  ------------------------- //

    const Dom = {
        thread: () => document.getElementById('Messages-Thread'),
        textarea: () => document.getElementById('msg-textarea'),
        sendBtn: () => document.getElementById('msg-send-btn'),
        charcount: () => document.getElementById('msg-charcount'),
        fileInput: () => document.getElementById('msg-file-input'),
        attachList: () => document.getElementById('msg-attachment-list'),
        unreadBadge: () => document.getElementById('msg-unread-badge'),
        composerDock: () => document.getElementById('Messages-Compose'),
        notifyBanner: () => document.getElementById('notify-banner'),
    };

    // -------------------------  Session  ------------------------- //

    const Session = {
        get token() { return sessionStorage.getItem(STORAGE_KEYS.TOKEN); },
        get userId() { return sessionStorage.getItem(STORAGE_KEYS.USER_ID); },
        get isAdmin() { return parseInt(sessionStorage.getItem(STORAGE_KEYS.ADMIN) ?? '0', 10) >= 1; },
    };

    // -------------------------  Helpers  ------------------------- //

    const Helpers = {

        formatTime(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            if (isNaN(d)) return '';
            return d.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
            });
        },

        formatDateLabel(raw) {
            if (!raw) return '';
            const d = new Date(raw);
            const today = new Date();
            const yest = new Date();
            yest.setDate(today.getDate() - 1);

            const sameDay = (a, b) =>
                a.getFullYear() === b.getFullYear() &&
                a.getMonth() === b.getMonth() &&
                a.getDate() === b.getDate();

            if (sameDay(d, today)) return 'Today';
            if (sameDay(d, yest)) return 'Yesterday';

            return d.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
        },

        dateKey(raw) {
            const d = new Date(raw);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

    // -------------------------  Init  ------------------------- //

    function init(ticketId) {
    State.ticketId = parseInt(ticketId, 10);

        _bindComposer();
        _bindFileInput();
        _bindScroll();

        getMessages();
        _startPolling();
    }

    // -------------------------  Public API  ------------------------- //

    return {
        init,
        getMessages,
        // Exposed for NotifyBanner dismiss
        clearUnread: () => {
            State.unreadCount = 0;
            _updateUnreadBadge();
        },
    };

})();


// -------------------------  Get Messages  ------------------------- //

async function getMessages() {
    if (State.isLoading) return;
    State.isLoading = true;

    try {
        const resp = await fetch(
            `/api/Ticket/GetMessages?TicketID=${State.ticketId}`,
            {
                headers: {
                    'Authorization': `Bearer ${Session.token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!resp.ok) throw new Error(`GetMessages ${resp.status}`);

        const messages = await resp.json();

        if (!Array.isArray(messages)) return;

        // First load — full render
        if (State.messages.length === 0) {
            State.messages = messages;
            _renderThread(messages);
            _scrollToBottom(false);
            return;
        }

        // Poll — only append new messages
        const newMessages = messages.filter(
            m => !State.messages.some(e => e.MessageID === m.MessageID)
        );

        if (newMessages.length === 0) return;

        State.messages.push(...newMessages);
        _appendMessages(newMessages);

        // Unread — only count inbound messages user hasn't seen
        const inbound = newMessages.filter(m => !_isOutbound(m));
        if (inbound.length > 0 && State.isScrolledUp) {
            State.unreadCount += inbound.length;
            _updateUnreadBadge();
        } else {
            _scrollToBottom(true);
        }

    } catch (err) {
        console.error('MessagesPanel.getMessages:', err);
    } finally {
        State.isLoading = false;
    }
}

// -------------------------  Render thread  ------------------------- //

function _renderThread(messages) {
    const thread = Dom.thread();
    if (!thread) return;

    thread.innerHTML = '';

    if (messages.length === 0) {
        thread.appendChild(_buildEmptyState());
        return;
    }

    const fragment = document.createDocumentFragment();
    let lastKey = null;

    messages.forEach(msg => {
        const key = Helpers.dateKey(msg.CreatedDate);

        // Date divider
        if (key !== lastKey) {
            fragment.appendChild(
                _buildDateDivider(msg.CreatedDate)
            );
            lastKey = key;
        }

        fragment.appendChild(_buildBubbleRow(msg));
    });

    thread.appendChild(fragment);

    // Store last message ID for polling
    State.lastMessageId = messages[messages.length - 1]?.MessageID ?? null;
}

// -------------------------  Append new messages  ------------------------- //

function _appendMessages(messages) {
    const thread = Dom.thread();
    if (!thread) return;

    // Remove empty state if present
    const empty = thread.querySelector('.td-thread-empty');
    empty?.remove();

    const fragment = document.createDocumentFragment();

    // Check if we need a new date divider
    const lastExisting = State.messages[State.messages.length - messages.length - 1];
    let lastKey = lastExisting
        ? Helpers.dateKey(lastExisting.CreatedDate)
        : null;

    messages.forEach(msg => {
        const key = Helpers.dateKey(msg.CreatedDate);

        if (key !== lastKey) {
            fragment.appendChild(_buildDateDivider(msg.CreatedDate));
            lastKey = key;
        }

        fragment.appendChild(_buildBubbleRow(msg));
    });

    thread.appendChild(fragment);

    State.lastMessageId = messages[messages.length - 1]?.MessageID ?? null;
}

// -------------------------  Date divider  ------------------------- //

function _buildDateDivider(raw) {
    const div = document.createElement('div');
    div.className = 'td-date-divider';
    div.setAttribute('role', 'separator');
    div.setAttribute('aria-label', Helpers.formatDateLabel(raw));

    const span = document.createElement('span');
    span.textContent = Helpers.formatDateLabel(raw);
    div.appendChild(span);

    return div;
}

// -------------------------  Empty state  ------------------------- //

function _buildEmptyState() {
    const div = document.createElement('div');
    div.className = 'td-thread-empty';
    div.setAttribute('aria-label', 'No messages yet');
    div.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p>No messages yet.<br>Start the conversation below.</p>
        `;
    return div;
}

// -------------------------  Outbound check  ------------------------- //

function _isOutbound(msg) {
    // Outbound = sent by current user
    return String(msg.SenderID) === String(Session.userId);
}

// -------------------------  Scroll  ------------------------- //

function _scrollToBottom(smooth = true) {
    const thread = Dom.thread();
    if (!thread) return;

    thread.scrollTo({
        top: thread.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
    });
}

function _bindScroll() {
    const thread = Dom.thread();
    if (!thread) return;

    thread.addEventListener('scroll', () => {
        const distFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
        State.isScrolledUp = distFromBottom > 80;

        // User scrolled back to bottom — clear unread
        if (!State.isScrolledUp && State.unreadCount > 0) {
            State.unreadCount = 0;
            _updateUnreadBadge();
        }
    }, { passive: true });
}

// -------------------------  Unread badge  ------------------------- //

function _updateUnreadBadge() {
    const badge = Dom.unreadBadge();
    if (!badge) return;

    if (State.unreadCount > 0) {
        badge.textContent = State.unreadCount > 99 ? '99+' : State.unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// -------------------------  Polling  ------------------------- //

function _startPolling() {
    _stopPolling();
    State.pollTimer = setInterval(getMessages, POLL_INTERVAL_MS);
}

function _stopPolling() {
    if (State.pollTimer) {
        clearInterval(State.pollTimer);
        State.pollTimer = null;
    }
}

// Stop polling when tab is hidden — resume on visibility
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        _stopPolling();
    } else {
        getMessages();
        _startPolling();
    }
});

// -------------------------  Bubble builder  ------------------------- //

function _buildBubbleRow(msg) {
    const outbound = _isOutbound(msg);
    const direction = outbound ? MSG_DIRECTION.OUT : MSG_DIRECTION.IN;

    const row = document.createElement('div');
    row.className = `td-bubble-row td-bubble-row--${direction}`;
    row.dataset.mid = msg.MessageID;

    // Sender name — only show on inbound
    if (!outbound && msg.SenderName) {
        const sender = document.createElement('span');
        sender.className = 'td-bubble-sender';
        sender.textContent = Helpers.escapeHtml(msg.SenderName);
        row.appendChild(sender);
    }

    // Bubble
    row.appendChild(_buildBubble(msg, outbound));

    // Meta row (time + status)
    row.appendChild(_buildBubbleMeta(msg, outbound));

    return row;
}

// -------------------------  Bubble  ------------------------- //

function _buildBubble(msg, outbound) {
    const bubble = document.createElement('div');
    bubble.className = 'td-bubble';

    // Message body
    if (msg.Body) {
        const body = document.createElement('p');
        body.className = 'td-bubble-body';
        body.textContent = msg.Body; // textContent — no XSS risk
        bubble.appendChild(body);
    }

    // Attachments
    if (Array.isArray(msg.Attachments) && msg.Attachments.length > 0) {
        bubble.appendChild(_buildBubbleAttachments(msg.Attachments, outbound));
    }

    return bubble;
}

// -------------------------  Bubble meta  ------------------------- //

function _buildBubbleMeta(msg, outbound) {
    const meta = document.createElement('div');
    meta.className = 'td-bubble-meta';

    // Time
    const time = document.createElement('span');
    time.className = 'td-bubble-time';
    time.textContent = Helpers.formatTime(msg.CreatedDate);
    meta.appendChild(time);

    // Read status — outbound only
    if (outbound) {
        const status = document.createElement('span');
        status.className = `td-bubble-status ${msg.IsRead ? 'read' : 'delivered'}`;
        status.textContent = msg.IsRead ? 'Read' : 'Delivered';
        meta.appendChild(status);
    }

    return meta;
}

// -------------------------  Bubble attachments  ------------------------- //

function _buildBubbleAttachments(attachments, outbound) {
    const wrap = document.createElement('div');
    wrap.className = 'td-bubble-attachments';

    attachments.forEach(att => {
        const link = document.createElement('a');
        link.className = 'td-bubble-file';
        link.href = att.FileURL ?? '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `Download ${att.FileName}`);

        link.innerHTML = `
                <span aria-hidden="true">${Helpers.fileIcon(att.FileName)}</span>
                <span>${Helpers.escapeHtml(att.FileName)}</span>
                <span class="td-bubble-file-size mono">
                    ${Helpers.fileSizeLabel(att.FileSize ?? 0)}
                </span>
            `;

        wrap.appendChild(link);
    });

    return wrap;
}

// -------------------------  Pending attachment chips  ------------------------- //

function _buildAttachChip(file, index) {
    const chip = document.createElement('div');
    chip.className = 'td-attach-chip';
    chip.dataset.index = index;

    chip.innerHTML = `
            <span aria-hidden="true">${Helpers.fileIcon(file.name)}</span>
            <span title="${Helpers.escapeHtml(file.name)}">
                ${Helpers.escapeHtml(file.name)}
            </span>
            <span class="mono">${Helpers.fileSizeLabel(file.size)}</span>
            <button type="button"
                    aria-label="Remove ${Helpers.escapeHtml(file.name)}"
                    data-index="${index}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

    chip.querySelector('button')
        ?.addEventListener('click', () => _removeAttachment(index));

    return chip;
}

function _renderAttachChips() {
    const list = Dom.attachList();
    if (!list) return;

    list.innerHTML = '';

    State.pendingFiles.forEach((file, i) => {
        list.appendChild(_buildAttachChip(file, i));
    });
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
        UI.toast?.(
            `${rejected.join(', ')} exceeded ${MAX_FILE_SIZE_MB}MB limit`,
            'warning',
        );
    }

    _renderAttachChips();

    // Reset input so same file can be re-added after removal
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

    // Drag and drop onto composer dock
    Dom.composerDock()?.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        Dom.composerDock()?.classList.add('is-dragover');
    });

    Dom.composerDock()?.addEventListener('dragleave', () => {
        Dom.composerDock()?.classList.remove('is-dragover');
    });

    Dom.composerDock()?.addEventListener('drop', (e) => {
        e.preventDefault();
        Dom.composerDock()?.classList.remove('is-dragover');
        _addAttachments(e.dataTransfer.files);
    });
}
// -------------------------  Composer binding  ------------------------- //

function _bindComposer() {
    const textarea = Dom.textarea();
    const sendBtn = Dom.sendBtn();
    if (!textarea || !sendBtn) return;

    // Input — enable/disable send + charcount + auto-grow
    textarea.addEventListener('input', () => {
        const len = textarea.value.length;

        // Charcount
        const cc = Dom.charcount();
        if (cc) {
            cc.textContent = `${len} / ${CHAR_LIMIT}`;
            cc.classList.toggle('is-near-limit', len >= CHAR_LIMIT * 0.85);
            cc.classList.toggle('is-at-limit', len >= CHAR_LIMIT);
        }

        // Send button
        sendBtn.disabled = len === 0;

        // Auto-grow
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    });

    // Enter to send — Shift+Enter for newline
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) sendBtn.click();
        }
    });

    // Send button click
    sendBtn.addEventListener('click', _sendMessage);
}

// -------------------------  Send message  ------------------------- //

async function _sendMessage() {
    if (State.isSending) return;

    const textarea = Dom.textarea();
    const sendBtn = Dom.sendBtn();
    if (!textarea || !sendBtn) return;

    const body = textarea.value.trim();
    if (!body && State.pendingFiles.length === 0) return;

    State.isSending = true;
    sendBtn.disabled = true;

    // Optimistic bubble
    const tempId = `temp-${Date.now()}`;
    const tempMsg = _buildOptimisticMsg(tempId, body);
    _appendMessages([tempMsg]);
    _scrollToBottom(true);

    try {
        let attachmentRefs = [];

        // Upload attachments first if any
        if (State.pendingFiles.length > 0) {
            attachmentRefs = await _uploadAttachments(State.pendingFiles);
        }

        // Post message
        const payload = {
            TicketID: State.ticketId,
            Body: body,
            Attachments: attachmentRefs,
        };

        const resp = await fetch('/api/Ticket/SendMessage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Session.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) throw new Error(`SendMessage ${resp.status}`);

        const saved = await resp.json();

        // Replace optimistic bubble with real one
        _replaceOptimisticBubble(tempId, saved);

        // Update state
        State.messages.push(saved);
        State.lastMessageId = saved.MessageID;

        // Clear composer
        _clearComposer(textarea, sendBtn);
        _clearAttachments();

    } catch (err) {
        console.error('MessagesPanel._sendMessage:', err);

        // Remove optimistic bubble
        _removeOptimisticBubble(tempId);

        // Restore textarea content
        textarea.disabled = false;
        sendBtn.disabled = false;

        UI.toast?.('Failed to send message', 'error');

    } finally {
        State.isSending = false;
        sendBtn.disabled = textarea.value.trim().length === 0;
    }
}

// -------------------------  Optimistic message  ------------------------- //

function _buildOptimisticMsg(tempId, body) {
    return {
        MessageID: tempId,
        SenderID: Session.userId,
        SenderName: null,
        Body: body,
        CreatedDate: new Date().toISOString(),
        Attachments: State.pendingFiles.map(f => ({
            FileName: f.name,
            FileSize: f.size,
            FileURL: null, // not yet uploaded
        })),
        IsRead: false,
        _optimistic: true,
    };
}

function _replaceOptimisticBubble(tempId, savedMsg) {
    const thread = Dom.thread();
    const tempRow = thread?.querySelector(`[data-mid="${tempId}"]`);
    if (!tempRow) return;

    const realRow = _buildBubbleRow(savedMsg);
    tempRow.replaceWith(realRow);
}

function _removeOptimisticBubble(tempId) {
    const thread = Dom.thread();
    const tempRow = thread?.querySelector(`[data-mid="${tempId}"]`);
    tempRow?.remove();
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

// -------------------------  File upload  ------------------------- //

async function _uploadAttachments(files) {
    const formData = new FormData();

    files.forEach(file => {
        formData.append('files', file, file.name);
    });

    formData.append('TicketID', State.ticketId);

    const resp = await fetch('/api/Ticket/UploadAttachments', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${Session.token}`,
            // No Content-Type — browser sets multipart boundary automatically
        },
        body: formData,
    });

    if (!resp.ok) throw new Error(`UploadAttachments ${resp.status}`);

    const result = await resp.json();

    // Expect array of { FileName, FileSize, FileURL }
    return Array.isArray(result) ? result : [];
}

// -------------------------  Unread badge  ------------------------- //

function _updateUnreadBadge() {
    const badge = Dom.unreadBadge();
    if (!badge) return;

    if (State.unreadCount > 0) {
        badge.textContent = State.unreadCount > 99 ? '99+' : State.unreadCount;
        badge.classList.remove('hidden');
        badge.setAttribute('aria-label', `${State.unreadCount} unread message${State.unreadCount === 1 ? '' : 's'}`);
    } else {
        badge.classList.add('hidden');
        badge.removeAttribute('aria-label');
    }
}

// -------------------------  Scroll to unread  ------------------------- //

function _buildScrollToUnreadBtn() {
    const existing = document.getElementById('scroll-to-unread');
    if (existing) return existing;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'scroll-to-unread';
    btn.className = 'td-scroll-unread-btn';
    btn.setAttribute('aria-live', 'polite');

    btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span id="scroll-unread-label"></span>
        `;

    btn.addEventListener('click', () => {
        _scrollToBottom(true);
        State.unreadCount = 0;
        _updateUnreadBadge();
        _hideScrollToUnreadBtn();
    });

    // Insert above composer dock
    const dock = Dom.composerDock();
    dock?.parentElement?.insertBefore(btn, dock);

    return btn;
}

function _showScrollToUnreadBtn(count) {
    const btn = _buildScrollToUnreadBtn();
    const label = btn.querySelector('#scroll-unread-label');

    if (label) {
        label.textContent = count === 1
            ? '1 new message'
            : `${count} new messages`;
    }

    btn.classList.remove('hidden');
}

function _hideScrollToUnreadBtn() {
    const btn = document.getElementById('scroll-to-unread');
    btn?.classList.add('hidden');
}

// -------------------------  Scroll binding  ------------------------- //

function _bindScroll() {
    const thread = Dom.thread();
    if (!thread) return;

    thread.addEventListener('scroll', _onScroll, { passive: true });
}

function _onScroll() {
    const thread = Dom.thread();
    if (!thread) return;

    const distFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    State.isScrolledUp = distFromBottom > 80;

    if (!State.isScrolledUp) {
        // User scrolled back to bottom — clear unread
        if (State.unreadCount > 0) {
            State.unreadCount = 0;
            _updateUnreadBadge();
            _hideScrollToUnreadBtn();
        }
    }
}

function _scrollToBottom(smooth = true) {
    const thread = Dom.thread();
    if (!thread) return;

    thread.scrollTo({
        top: thread.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
    });
}

// -------------------------  Polling  ------------------------- //

function _startPolling() {
    _stopPolling();
    State.pollTimer = setInterval(_poll, POLL_INTERVAL_MS);
}

function _stopPolling() {
    if (State.pollTimer) {
        clearInterval(State.pollTimer);
        State.pollTimer = null;
    }
}

async function _poll() {
    if (State.isLoading || State.isSending) return;

    try {
        const resp = await fetch(
            `/api/Ticket/GetMessages?TicketID=${State.ticketId}&After=${State.lastMessageId ?? ''}`,
            {
                headers: {
                    'Authorization': `Bearer ${Session.token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!resp.ok) throw new Error(`Poll ${resp.status}`);

        const newMessages = await resp.json();
        if (!Array.isArray(newMessages) || newMessages.length === 0) return;

        // Filter out any optimistic messages already in state
        const filtered = newMessages.filter(
            m => !State.messages.some(e => e.MessageID === m.MessageID)
        );

        if (filtered.length === 0) return;

        State.messages.push(...filtered);
        _appendMessages(filtered);

        // Inbound only — outbound already shown optimistically
        const inbound = filtered.filter(m => !_isOutbound(m));

        if (inbound.length === 0) return;

        if (State.isScrolledUp) {
            State.unreadCount += inbound.length;
            _updateUnreadBadge();
            _showScrollToUnreadBtn(State.unreadCount);
        } else {
            _scrollToBottom(true);
        }

    } catch (err) {
        console.error('MessagesPanel._poll:', err);
    }
}

// -------------------------  Visibility API  ------------------------- //

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        _stopPolling();
    } else {
        // Immediate catch-up poll then restart interval
        _poll();
        _startPolling();
    }
});

// -------------------------  Focus polling boost  ------------------------- //

window.addEventListener('focus', () => {
    if (!State.pollTimer) return;
    _poll();
});

window.addEventListener('blur', () => {
    // Keep polling on blur — tab still visible
    // Only stop on visibilitychange (tab hidden)
});

// -------------------------  Cleanup  ------------------------- //

window.addEventListener('beforeunload', () => {
    _stopPolling();
});

// -------------------------  Less CSS additions  ------------------------- //
// Add to TicketDetails.less after 3c:
/*
    
*/
