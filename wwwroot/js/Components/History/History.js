// =============================  History.js  ============================= //

// -------------------------  API  ------------------------- //

async function getHistory(ticketId) {
    const data = await API.post('History/GetHistory',
        API.authPayload({ ticketId })
    );

    if (!data) return;

    buildHistory(data);

    const sendButton = document.getElementById('SendButton');
    if (sendButton) sendButton.disabled = false;
}

// -------------------------  Build  ------------------------- //

function buildHistory(historyList) {
    const historyDiv = document.querySelector('.HistoryDiv');
    if (!historyDiv) return;

    const fragment = document.createDocumentFragment();

    for (const item of historyList) {
        if (!item) continue;
        fragment.appendChild(_createHistoryRow(item));
    }

    historyDiv.appendChild(fragment);
}

function _createHistoryRow(item) {
    const outer = document.createElement('div');
    outer.className = 'full';

    const inner = document.createElement('div');
    inner.id = 'History-Div';

    const dateDiv = _createLabelDiv('left', item.historyDate);
    const nameDiv = _createLabelDiv('left', item.name);
    const textDiv = _createLabelDiv('right', item.historyTxt);

    inner.appendChild(dateDiv);
    inner.appendChild(nameDiv);
    inner.appendChild(textDiv);
    outer.appendChild(inner);

    return outer;
}

function _createLabelDiv(side, text) {
    const div = document.createElement('div');
    div.className = side;

    const label = document.createElement('label');
    label.className = 'body';
    label.innerText = text ?? ''; // innerText — XSS safe

    div.appendChild(label);
    return div;
}

// -------------------------  Legacy Wrappers  ------------------------- //

function GetHistory(ticketId) { return getHistory(ticketId); }
function BuildHistory(historyList) { buildHistory(historyList); }
