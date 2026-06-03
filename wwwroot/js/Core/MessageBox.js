// =============================  MessageBox.js  ============================= //

const MessageBox = {

    // -------------------------  Core  ------------------------- //

    _getElements() {
        const screenCover = document.getElementById('MessageBox-ScreenCover-Div');
        return {
            screenCover,
            messageBox: screenCover?.children[0]?.children[0] ?? null,
            outerDiv: document.getElementById('MessageBox-Outer-Div'),
            buttonDiv: document.getElementById('Button-Div')
        };
    },

    _setMessage(messageBox, outerDiv, message) {
        outerDiv?.classList.remove('Large');

        if (messageBox) {
            messageBox.innerHTML = '';
            const p = document.createElement('p');
            p.id = 'MessageBox-Message';
            p.innerText = message;           // innerText — XSS safe
            messageBox.appendChild(p);
        }

        document.getElementById('MessageBox-Message')
            ?.classList.remove('Large');
    },

    _show() {
        UI.showById('MessageBox-ScreenCover-Div');
        UI.showById('MessageBox-Outer-Div');
    },

    // -------------------------  Build  ------------------------- //

    build(message, loadPage) {
        const { screenCover, messageBox, outerDiv, buttonDiv } = this._getElements();
        if (!screenCover || !buttonDiv) return;

        this._setMessage(messageBox, outerDiv, message);

        buttonDiv.innerHTML = '';

        const okayBtn = document.createElement('button');
        okayBtn.className = 'accept OkayButton';
        okayBtn.innerText = 'Okay';
        okayBtn.addEventListener('click', () => this.okayButtonPress(loadPage));

        buttonDiv.appendChild(okayBtn);
        this._show();
    },

    buildWithCallback(message, callback) {
        const { screenCover, messageBox, outerDiv, buttonDiv } = this._getElements();
        if (!screenCover || !buttonDiv) return;

        this._setMessage(messageBox, outerDiv, message);

        buttonDiv.innerHTML = '';
        buttonDiv.style.width = '140px';

        const yesBtn = document.createElement('button');
        yesBtn.className = 'accept OkayButton';
        yesBtn.innerText = 'Yes';
        yesBtn.addEventListener('click', () => {
            this.okayButtonPress('');
            if (typeof callback === 'function') callback();
        });

        const noBtn = document.createElement('button');
        noBtn.className = 'cancel OkayButton';
        noBtn.innerText = 'No';
        noBtn.addEventListener('click', () => this.okayButtonPress(''));

        buttonDiv.appendChild(yesBtn);
        buttonDiv.appendChild(noBtn);
        this._show();
    },

    // -------------------------  Help  ------------------------- //

    getHelpMessage() {
        return [
            '- Click on the green plus icon to create new attachment.',
            '- Drag the created attachments over the bin icon and release to delete.',
            '- Orange surrounded attachments indicate an original attachment.',
            '- Non original attachments can be replaced by resetting them again.'
        ].join('\n\n');
    },

    // -------------------------  Okay / Close  ------------------------- //

    okayButtonPress(returnPage) {
        const screenCover = document.getElementById('MessageBox-ScreenCover-Div');
        if (screenCover) {
            screenCover.classList.remove('BackgroundTint');
            screenCover.style.display = 'none';
        }

        if (!returnPage) return;

        if (returnPage === 'Index') {
            sessionStorage.clear();
            window.open('.', '_self', false);
            return;
        }

        // Route map — replaces eval()
        const ROUTES = {
            'TicketPage': () => Nav.toTicketPage(),
            'TicketDetails': () => Nav.toTicketDetails(),
            'RFC': () => Nav.toRFCPage(),
            'RFCDetails': () => Nav.toRFCDetails(),
            'UserDetails': () => Nav.toUserDetails(),
            'AdminPage': () => Nav.toAdminPage(),
            'Index': () => { sessionStorage.clear(); window.open('.', '_self', false); }
        };

        const route = ROUTES[returnPage];
        if (route) {
            route();
        } else {
            console.warn(`MessageBox: unknown route '${returnPage}'`);
        }
    },

    // -------------------------  Go Back  ------------------------- //

    goBack(location) {
        if (location === 'RFC') {
            this._goBackRFC();
        } else {
            this._goBackAdmin();
        }
    },

    _goBackRFC() {
        const IDS = [
            'Display-ChangeRequest-Panel',
            'Create-ChangeRequest-Panel',
            'DisableBackground'
        ];

        for (const id of IDS) {
            UI.hideById(id);
        }

        const form = document.getElementById('CreateCRForm');
        if (form) {
            form.reset();
            for (const el of form.elements) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.value = '';
                }
            }
        }

        const attachDiv = document.getElementById('Attach-Div');
        if (attachDiv) attachDiv.innerHTML = '';

        const attachmentIcon = document.getElementById('Attachment-Icon1');
        if (attachmentIcon) {
            attachmentIcon.innerHTML = '';
            attachmentIcon.appendChild(
                document.createRange().createContextualFragment(
                    createBlankAttachment(1)
                )
            );
        }
    },

    _goBackAdmin() {        
        if (addVisible || editVisible) {            
            return;
        }

        // Hide all header buttons
        const headerButtons = document.getElementById('header-buttons');
        if (headerButtons) {
            for (const btn of headerButtons.querySelectorAll('button')) {
                btn.style.display = 'none';
            }
        }

        // Hide all detail body panels
        const detailBody = document.getElementById('Detail-Body');
        if (detailBody) {
            for (const panel of detailBody.children) {
                panel.style.display = 'none';
            }
        }

        UI.showById('MainAdminPage');
    }
};

// -------------------------  Legacy Wrappers  ------------------------- //

function BuildMessageBox(message, loadPage) { MessageBox.build(message, loadPage); }
function BuildMessageBoxFunction(message, callback) { MessageBox.buildWithCallback(message, callback); }
function HelpMessageBoxes() { return MessageBox.getHelpMessage(); }
function OkayButtonPress(returnPage) { MessageBox.okayButtonPress(returnPage); }
function GoBack(location) { MessageBox.goBack(location); }
