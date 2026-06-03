// =============================  Attachments.js  ============================= //

// -------------------------  Event Listener  ------------------------- //

document.addEventListener('change', e => {
    const input = e.target.closest('input[type="file"].FileUP');
    if (!input) return;
    const index = input.dataset.index;
    Attachments.getByteArray(index, input);
});

// -------------------------  API Calls  ------------------------- //

async function getAttachmentsNotes(ticketId, initialNoteId, rfc) {
    const data = await API.post('Attachment/GetAttachmentsNotes',
        API.authPayload({ ticketId, rfc })
    );

    if (!data) return;

    buildAttachmentsNotes(initialNoteId, data);

    const sendButton = document.getElementById('SendButton');
    if (sendButton) sendButton.disabled = false;
}

async function getAttachmentsTasks(ticketId) {
    const data = await API.post('Attachment/GetAttachmentsTasks',
        API.authPayload({ ticketId })
    );

    if (!data) return;

    buildAttachmentsTasks(data);

    const sendButton = document.getElementById('SendButton');
    if (sendButton) sendButton.disabled = false;
}

// -------------------------  Build / Render  ------------------------- //

function buildAttachmentsNotes(initialNoteId, attachmentList) {
    let lastNoteId = 0;
    let index = 1;

    for (const attachment of attachmentList) {
        if (!attachment) continue;

        const { noteID, attachmentName, attachmentInfo } = attachment;
        if (attachmentName === 'undefined') continue;

        index++;
        if (noteID !== lastNoteId) {
            lastNoteId = noteID;
            index = 1;
        }

        const newAttach = createTemplateForAttachment(index);
        let createdAttachment = null;
        let draggable = false;

        if (noteID === initialNoteId) {
            if (attachmentInfo !== 'undefined') {
                const createNoteList = document.getElementById('CreateNoteAttachmentList');
                if (!createNoteList) continue;

                createNoteList.style.display = 'block';
                createNoteList.insertAdjacentHTML('beforeend', newAttach);
                createdAttachment = createNoteList.children[index - 1];
                draggable = true;
            }
        } else {
            const noteBox = document.getElementById(noteID);
            if (noteBox) {
                const noteAttach = noteBox.children['Note-Attach'];
                if (noteAttach) {
                    noteAttach.insertAdjacentHTML('beforeend', newAttach);
                    createdAttachment = noteAttach.children[index - 1];
                }
            }
        }

        if (createdAttachment) {
            _setAttachmentAttributes(createdAttachment.children[1], attachment, index);
            if (!draggable) {
                createdAttachment.setAttribute('draggable', 'false');
            }
        }
    }

    const noteHolder = document.getElementById('CreateNoteAttachmentList');
    if (noteHolder && noteHolder.children.length < 5) {
        noteHolder.insertAdjacentHTML('beforeend',
            createBlankAttachment(noteHolder.children.length + 1)
        );
    }
}

function buildAttachmentsTasks(attachmentList) {
    let lastTaskId = 0;
    let index = 1;

    for (const attachment of attachmentList) {
        if (!attachment) continue;

        const { noteID, attachmentName } = attachment;
        if (attachmentName === 'undefined') continue;

        index++;
        if (noteID !== lastTaskId) {
            lastTaskId = noteID;
            index = 1;
        }

        const taskBox = document.getElementById(noteID);
        if (!taskBox) continue;

        const attachContainer = taskBox.children[1]?.children[5]?.children[0];
        if (!attachContainer) continue;

        attachContainer.insertAdjacentHTML('beforeend',
            createTemplateForAttachment(index)
        );

        const createdAttachment = attachContainer.children[index - 1];
        if (createdAttachment) {
            _setAttachmentAttributes(createdAttachment.children[1], attachment, index);
            createdAttachment.setAttribute('draggable', 'false');
        }
    }
}

function _setAttachmentAttributes(el, attachment, index) {
    const splitName = attachment.attachmentName.split('.');
    el.setAttribute('name', attachment.attachmentName);
    el.setAttribute('value', index);
    el.setAttribute('type', 'application');
    el.setAttribute('byteArray', attachment.attachmentByteArray);
    el.setAttribute('imageType', attachment.attachmentImageType);
    el.setAttribute('fileType', splitName[splitName.length - 1]);
    setAttachmentImage(el.parentElement);
}

// -------------------------  Templates  ------------------------- //

function createTemplateForAttachment(index) {
    return `
        <div class="Attachment-Icon" id="Attachment-Icon${index}" 
            draggable="true" name="Original">
            <div class="File-ImageSet" id="File-Image${index}"></div>
            <input title=" " type="application" name="Value"
                value="fileupload${index}" id="fileupload${index}"
                class="FileUP" onclick="DownloadAttachment(this)"
                 >
        </div>`;
}

function createBlankAttachment(index, prefix = '') {
    const id = prefix ? `${prefix}-${index}` : index;
    return `
        <div class="Attachment-Icon" id="Attachment-Icon${id}" 
            draggable="true" onmouseover="DisplayToolTip(this)" onmouseout="HideToolTip()" 
            Tooltip="Add Attachment">
            <div value="" class="File-ImageUnset" id="File-Image${id}">
                <img src="images/PlusIcon.png">
            </div>
            <input title=" " type="file" style="opacity:0;" name="Value"
                value="${index}" id="fileupload${id}" class="FileUP"                 
                onchange="GetByteArray(${index}, this)">
            <label id="Attach-Label" style="padding-left:20px !important;"></label>
        </div>`;
}

function setAttachmentImage(attachment) {
    const imageDiv = attachment.children[0];
    const imageType = attachment.children[1].getAttribute('imageType') ?? '';
    const imageTypeId = manageImageType(imageType);

    const images = {
        '1': '<img src="/images/Image-Icon.png" width="25px" height="25px">',
        '2': '<img src="/images/PDF-Icon.png" width="25px" height="25px">',
        '3': '<img src="/images/file.png" width="25px" height="25px">'
    };

    imageDiv.innerHTML = images[imageTypeId] ?? images['3'];
}

function manageImageType(imageType) {
    if (['1', '2', '3'].includes(imageType)) return imageType;

    const typeMap = { 'image': '1', 'pdf': '2' };
    return typeMap[imageType] ?? '3';
}

// -------------------------  Legacy Wrappers  ------------------------- //

function GetAttachmentsNotes(ticketId, initialNoteId, rfc) { return getAttachmentsNotes(ticketId, initialNoteId, rfc); }
function GetAttachmentsTasks(ticketId) { return getAttachmentsTasks(ticketId); }
function BuildAttachmentsNotes(initialNoteId, list) { buildAttachmentsNotes(initialNoteId, list); }
function BuildAttachmentsTasks(list) { buildAttachmentsTasks(list); }
function CreateTemplateForAttachment(index) { return createTemplateForAttachment(index); }
function CreateBlankAttachment(index) { return createBlankAttachment(index); }
function SetAttachmentImage(attachment) { setAttachmentImage(attachment); }
function ManageImageType(imageType) { return manageImageType(imageType); }
