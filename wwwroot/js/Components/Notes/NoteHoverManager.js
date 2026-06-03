// =============================  NoteHoverManager.js  ============================= //

class NoteHoverManager {

    constructor(options = {}) {
        this.options = {
            noteBoxId: options.noteBoxId ?? 'Note-Display',
            noteHoverClass: options.noteHoverClass ?? 'note-hover',
            hiddenNoteClass: options.hiddenNoteClass ?? 'hidden-note',
            offsetX: options.offsetX ?? 10,
            offsetY: options.offsetY ?? 10,
            maxWidth: options.maxWidth ?? 400
        };

        this.noteBox = null;
        this.init();
    }

    // -------------------------  Init  ------------------------- //

    init() {
        this._createNoteBox();
        this._attachGlobalListeners();
    }

    // -------------------------  Create  ------------------------- //

    _createNoteBox() {
        this.noteBox = document.getElementById(this.options.noteBoxId);
        if (this.noteBox) return;

        this.noteBox = document.createElement('div');
        this.noteBox.id = this.options.noteBoxId;
        this.noteBox.style.cssText = `
            position: fixed;
            display: none;
            background: white;
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            max-width: ${this.options.maxWidth}px;
            z-index: 10000;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
        `;

        if (document.body) {
            document.body.appendChild(this.noteBox);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body?.appendChild(this.noteBox);
            });
        }
    }

    // -------------------------  Listeners  ------------------------- //

    _attachGlobalListeners() {
        document.addEventListener('mouseover', (e) => {
            const noteHover = e.target.closest(`.${this.options.noteHoverClass}`);
            if (noteHover) this.show(e, noteHover);
        });

        document.addEventListener('mouseout', (e) => {
            const noteHover = e.target.closest(`.${this.options.noteHoverClass}`);
            if (noteHover) this.hide();
        });

        document.addEventListener('scroll', () => this.hide(), true);
    }

    // -------------------------  Show / Hide  ------------------------- //

    show(event, noteHover) {
        if (!this.noteBox) return;

        const hiddenNote = noteHover.querySelector(`.${this.options.hiddenNoteClass}`);
        if (!hiddenNote) return;

        const noteText = hiddenNote.textContent?.trim();
        if (!noteText) return;

        this.noteBox.textContent = noteText;
        this._position(event);
        this.noteBox.style.display = 'block';
    }

    hide() {
        if (this.noteBox) this.noteBox.style.display = 'none';
    }

    // -------------------------  Position  ------------------------- //

    _position(event) {
        if (!this.noteBox) return;

        const { offsetX, offsetY } = this.options;
        const { clientX, clientY } = event;
        const { width, height } = this.noteBox.getBoundingClientRect();

        let left = clientX + offsetX;
        let top = clientY + offsetY;

        if (left + width > window.innerWidth) left = clientX - width - offsetX;
        if (top + height > window.innerHeight) top = clientY - height - offsetY;
        if (left < 0) left = offsetX;
        if (top < 0) top = offsetY;

        this.noteBox.style.left = `${left}px`;
        this.noteBox.style.top = `${top}px`;
    }

    // -------------------------  Update  ------------------------- //

    updateContent(content) {
        if (this.noteBox) this.noteBox.textContent = content;
    }

    // -------------------------  Destroy  ------------------------- //

    destroy() {
        this.noteBox?.parentNode?.removeChild(this.noteBox);
        this.noteBox = null;
    }
}

// -------------------------  Init  ------------------------- //

if (typeof window !== 'undefined') {
    const _initNoteHoverManager = () => {
        window.noteHoverManager = new NoteHoverManager();
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', _initNoteHoverManager)
        : _initNoteHoverManager();
}
