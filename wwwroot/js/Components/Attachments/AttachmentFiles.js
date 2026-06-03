// =============================  AttachmentFiles.js  ============================= //

// -------------------------  Validation  ------------------------- //

const VALID_FILE_EXTENSIONS = [
    '.x-zip-compressed', '.rar', '.zipx', '.zip', '.msg', '.vnd', '.plain',
    '.msword', '.wbk', '.dot', '.docb', '.dotm', '.dotx', '.docm', '.odt',
    '.dif', '.csv', '.txt', '.doc', '.docx', '.pdf', '.wmf', '.tiff', '.jpg',
    '.jpeg', '.bmp', '.gif', '.png', '.emf', '.xps', '.ods', '.xls', '.xlsx',
    '.xlsm', '.xlsb', '.xltm', '.xltx', '.xlt', '.xml', '.xlam', '.xla',
    '.xlw', '.xlr'
];

function validateAttachment(fileInfo, fileSize) {
    if (!fileInfo) {
        BuildMessageBox('Invalid file type.');
        return false;
    }

    const fileType = '.' + (fileInfo.split('/')[1]?.split('.')[0] ?? '');

    if (!VALID_FILE_EXTENSIONS.includes(fileType)) {
        BuildMessageBox(`Unsupported File Type: ${fileType}`);
        return false;
    }

    if (fileSize >= 10485760) {
        BuildMessageBox('Attachment must be 10MB or smaller.');
        return false;
    }

    return true;
}

// -------------------------  Image Type  ------------------------- //

function setImageTypeId(type) {
    if (['image', 'jpg', 'png', 'tiff'].includes(type)) return 1;
    if (type === 'pdf') return 2;
    return 3;
}

// -------------------------  Byte Array  ------------------------- //

function getByteArray(fileNumber, currentAttachment, moreThanOne = true) {
    const fileList = currentAttachment.files;
    if (!fileList?.length) return;

    const reader = new FileReader();

    reader.onloadend = function () {
        const arrayBuffer = reader.result;
        const file = fileList[0];

        if (!validateAttachment(file.type, arrayBuffer.byteLength)) return;

        const result = _arrayBufferToBase64(arrayBuffer);
        const fileTypes = file.type.split('/');
        const fileType = fileTypes[0] === 'application' ? fileTypes[1] : fileTypes[0];

        updateAttach(result, fileNumber, fileType, currentAttachment, moreThanOne);
    };

    reader.readAsArrayBuffer(fileList[0]);
}

// Chunked base64 — avoids stack overflow on large files
function _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
}

// -------------------------  Update Attachment  ------------------------- //

function updateAttach(fileData, fileNumber, fileType, attachmentInput, moreThanOne) {
    const currentAttachment = attachmentInput.offsetParent;
    const attachmentHolderDiv = currentAttachment.parentElement;

    const attachList = [...attachmentHolderDiv.children]
        .filter(el => el.className === 'Attachment-Icon');
    const attachCount = attachList.length;

    const splitName = attachmentInput.files[0].name.split('.');

    attachmentInput.setAttribute('bytearray', fileData);
    attachmentInput.setAttribute('name', attachmentInput.files[0].name);
    attachmentInput.setAttribute('value', fileNumber - 1);
    attachmentInput.setAttribute('type', 'file');
    attachmentInput.setAttribute('imageType', setImageTypeId(fileType));
    attachmentInput.setAttribute('fileType', splitName[splitName.length - 1]);

    attachList[fileNumber - 1].children[0].className = 'File-ImageSet';
    setAttachmentImage(currentAttachment);

    if (moreThanOne && attachCount === fileNumber && attachCount < 5) {
        const fileEl = document.getElementById(`fileupload${fileNumber}`);
        if (fileEl?.innerHTML !== '') {
            attachmentHolderDiv.insertAdjacentHTML('beforeend',
                createBlankAttachment(fileNumber + 1)
            );
        }
    }
}

// -------------------------  Download  ------------------------- //

function downloadAttachment(attach) {
    if (!attach.attributes['bytearray']) {
        attach = attach.parentElement;
    }

    let byteArray = attach.getAttribute('bytearray');
    const type = attach.getAttribute('type');
    const name = attach.getAttribute('name');
    const fileExtension = type?.split('/')[1];

    if (fileExtension === '.zip') {
        BuildMessageBox('Please be careful opening .zip files. It is recommended you scan them with antivirus software before opening.');
        return;
    }

    // Strip attachment desc markers
    byteArray = byteArray.replace(/,Attach\dDesc/g, '');

    const byteCharacters = atob(byteArray);
    const byteNumbers = Uint8Array.from(byteCharacters, c => c.charCodeAt(0));
    const fileBlob = new Blob([byteNumbers], { type });
    const fileURL = URL.createObjectURL(fileBlob);

    const displayImage = document.getElementById('DisplayImage');
    if (displayImage) {
        displayImage.innerHTML = `
            <div id="DownloadAttach">
                <a id="DownloadFile" download="${name}" href="${fileURL}"></a>
            </div>`;
        document.getElementById('DownloadFile')?.click();
    }

    setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
}

// -------------------------  Get Form Attachments  ------------------------- //

function getAttachementsOnForm(attachmentNodes) {
    const attachmentObject = {};

    for (let a = 0; a < 5; a++) {
        if (!attachmentNodes[a]) continue;

        const attachmentItem = attachmentNodes[a].parentNode;
        const attachmentInput = attachmentItem.children[1];

        _buildAttachment(attachmentObject, attachmentInput, a);
    }

    return attachmentObject;
}

function _buildAttachment(attachmentObject, attachmentInput, index) {
    let fileDataType = '';

    if (attachmentInput.attributes['filedata']) {
        fileDataType = 'filedata';
    } else if (attachmentInput.attributes['bytearray']) {
        fileDataType = 'bytearray';
    }

    if (!fileDataType) return attachmentObject;

    const byteValue = attachmentInput.getAttribute(fileDataType);
    if (!byteValue || byteValue === 'Value') return attachmentObject;

    const sections = byteValue.split('"');
    const fileInfo = `${attachmentInput.getAttribute('name')}\`${attachmentInput.getAttribute('type')}`;

    attachmentObject[`Attachment${index}`] = sections[0];
    attachmentObject[`AttachmentInfo${index}`] = fileInfo;

    return attachmentObject;
}

// -------------------------  Legacy Wrappers  ------------------------- //

function ValidateAttachment(fileInfo, fileSize) { return validateAttachment(fileInfo, fileSize); }
function SetImageTypeID(type) { return setImageTypeId(type); }
function GetByteArray(fileNumber, attachment, moreThanOne) { getByteArray(fileNumber, attachment, moreThanOne); }
function UpdateAttach(data, num, type, input, moreThanOne) { updateAttach(data, num, type, input, moreThanOne); }
function DownloadAttachment(attach) { downloadAttachment(attach); }
function GetAttachementsOnForm(nodes) { return getAttachementsOnForm(nodes); }
function BuildAttachements(obj, input, index) { return _buildAttachment(obj, input, index); }
