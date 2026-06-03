// =============================  AttachmentUI.js  ============================= //

// -------------------------  Count  ------------------------- //

function getAttachmentCount() {
    return document.getElementById('CreateNoteAttachmentList')
        ?.getElementsByClassName('File-ImageSet').length ?? 0;
}

// -------------------------  Show / Hide Detail  ------------------------- //

function showFileDetail(fileImage) {
    if (fileImage.parentElement.children[0].className === 'File-ImageUnset') return;

    const pos = fileImage.getBoundingClientRect();
    const popupBox = document.getElementById('PopupBox');
    if (!popupBox) return;

    popupBox.style.left = `${pos.left - 5}px`;
    popupBox.style.top = `${pos.top + 26}px`;
    popupBox.innerText = fileImage.getAttribute('name') ?? '';
    UI.show('PopupBox');
}

function hideFileDetail() {
    const popupBox = document.getElementById('PopupBox');
    if (!popupBox) return;
    popupBox.innerHTML = '';
    popupBox.style.display = 'none';
}

// -------------------------  Notify  ------------------------- //

function setNotifyResponse() {
    const isNotified = sessionStorage.getItem(STORAGE_KEYS.CURRENT_TICKET_NTFY) === 'true';
    if (!isNotified) return;

    const falseReply = document.getElementById('FalseReply');
    if (falseReply) falseReply.style.display = 'block';

    const header = document.getElementById('Detail-Header');
    if (header?.children[0]) {
        header.children[0].innerText = `⦿${header.children[0].innerText}`;
    }
}

// -------------------------  Clear  ------------------------- //

function checkForLastAttachment(noteDiv) {
    if (!noteDiv) return;

    const lastChild = noteDiv.children[3];
    if (noteDiv.children.length === 4 &&
        lastChild?.children[0]?.className === 'File-ImageSet') {
        noteDiv.insertAdjacentHTML('beforeend', createBlankAttachment(5));
    }
}

function clearAttachment(number, noteDiv) {
    number = parseInt(number);

    const attach = noteDiv
        ? noteDiv.children[number - 1]
        : document.getElementById(`Attachment-Icon${number}`);

    if (!attach || attach.children[0].className === 'File-ImageUnset') return;

    attach.remove();

    for (let i = number; i <= 5; i++) {
        const next = i + 1;
        let attachIcon, image, attachBox;

        if (noteDiv) {
            attachIcon = noteDiv.children[i - 1];
            if (!attachIcon) return;
            image = attachIcon.children[0];
            attachBox = attachIcon.children[1];
        } else {
            image = document.getElementById(`File-Image${next}`);
            attachBox = document.getElementById(`fileupload${next}`);
            attachIcon = document.getElementById(`Attachment-Icon${next}`);
        }

        if (!image || !attachIcon) return;

        const fileSet = image.className;
        const imageToShow = image.children[0]?.src
            ?.replace(window.location.origin, '') ?? '';

        let fileData = '';
        let fileName = 'Value';

        if (attachIcon.children[1]?.getAttribute('bytearray')) {
            fileData = attachIcon.children[1].getAttribute('bytearray');
            fileName = attachBox?.getAttribute('name') ?? 'Value';
        } else if (attachIcon.getAttribute('bytearray')) {
            fileData = attachIcon.getAttribute('bytearray');
            fileName = attachIcon.getAttribute('name') ?? 'Value';
        }

        const fileNode = attachIcon.children[1];
        const fileNodeType = fileNode?.getAttribute('type') ?? '';
        const fileNodeName = fileNode?.getAttribute('name') ?? '';

        const isExisting = !!attachIcon.getAttribute('name');
        const attachmentType = isExisting ? 'bytearray' : 'filedata';
        const onChange = isExisting
            ? 'onclick="DownloadAttachment(this)"'
            : `onchange="GetByteArray(${i}, this)"`;

        attachIcon.id = `Attachment-Icon${i}`;
        attachIcon.innerHTML = `
            <div class="${fileSet}" id="File-Image${i}">
                <img src="${imageToShow}" style="height:25px; width:25px;">
            </div>
            <input type="${fileNodeType}" name="${fileNodeName}" value="${i}"
                id="fileupload${i}" class="FileUP"
                 
                ${onChange} ${attachmentType}="${fileData}">`;
    }
}

// -------------------------  Drag / Drop  ------------------------- //

function dragIt(event) {
    try {
        const id = event.target.id || event.currentTarget.id;
        const parentId = event.target.parentElement?.id ?? '';
        if (id) event.dataTransfer.setData('text', `${id}\`${parentId}`);
    } catch (ex) {
        console.warn('dragIt error:', ex);
    }
}

function dropIt(event) {
    const noteDiv = event.currentTarget
        ?.parentElement
        ?.parentElement
        ?.children[1];

    const transferData = event.dataTransfer.getData('text');
    if (!transferData) return;

    const [targetID, sourceID] = transferData.split('`');

    const validSources = ['CreateNoteAttachmentList', 'TaskDetailAttachmentList'];
    if (validSources.includes(sourceID)) {
        const number = targetID.slice(-1);
        clearAttachment(number, noteDiv);
        checkForLastAttachment(noteDiv);
        event.preventDefault();
    }

    hideFileDetail();
}

// -------------------------  Legacy Wrappers  ------------------------- //

function GetAttachmentCount() { return getAttachmentCount(); }
function ShowFileDetail(fileImage) { showFileDetail(fileImage); }
function HideFileDetail() { hideFileDetail(); }
function SetNotifyResponse() { setNotifyResponse(); }
function CheckForLastAttachment(noteDiv) { checkForLastAttachment(noteDiv); }
function ClearAttachment(number, noteDiv) { clearAttachment(number, noteDiv); }
