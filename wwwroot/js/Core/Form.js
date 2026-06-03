// =============================  Form.js  ============================= //

const Form = {

    // -------------------------  Get Values  ------------------------- //

    getValues(elements, data = {}) {
        for (const el of elements) {
            if (!el?.id) continue;

            const key = el.id;
            let value = '';

            if (el.nodeName === 'SELECT') {
                value = el.selectedIndex >= 0 ? el[el.selectedIndex].value : 0;

            } else if (el.attributes?.checkbox) {
                for (let i = 0; i < el.children.length; i++) {
                    if (el.childNodes[i].childNodes[0].checked) {
                        value += `${i + 1}-`;
                    }
                }

            } else if (el.nodeName === 'INPUT' || el.nodeName === 'TEXTAREA') {
                if (el.type === 'checkbox') {
                    value = el.checked ? 1 : 0;
                } else if (el.type === 'date') {
                    value = el.value || '1900-01-01 00:00:00.000';
                } else {
                    value = el.value;
                }

            } else if (el.nodeName === 'LABEL') {
                value = el.innerText;
            }

            data[key] = value.toString()
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/&/g, '&amp;');  // regex — replaces all &
        }

        return data;
    },

    // -------------------------  Validate  ------------------------- //

    validate(formId) {
        const fields = document.getElementById(formId)
            ?.getElementsByClassName('Value') ?? [];

        for (const field of fields) {
            if (!field.required || field.value !== '') continue;

            const label = field.parentElement?.parentElement
                ?.children[0]?.children[0]?.innerText;

            BuildMessageBox(`${label} must be filled out.`);
            return false;
        }

        return true;
    },

    // -------------------------  Clear  ------------------------- //

    clear(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        for (const el of form.querySelectorAll('input')) el.value = '';
        for (const el of form.querySelectorAll('select')) el.selectedIndex = -1;
        for (const el of form.querySelectorAll('textarea')) el.value = '';
    },

    clearSelects(keepCurrent = false) {
        const KEEP_IDS = ['RequestDescription', 'status', 'priority'];

        for (const select of document.getElementsByTagName('SELECT')) {
            if (keepCurrent && KEEP_IDS.includes(select.id)) continue;
            select.selectedIndex = -1;
        }
    },

    // -------------------------  Select Helpers  ------------------------- //

    setSelectByValue(selectEl, value) {
        const strValue = value.toString();
        for (let i = 0; i < selectEl.length; i++) {
            if (selectEl[i].getAttribute('value') === strValue) {
                selectEl.selectedIndex = i;
                break;
            }
        }
    },

    setSelectByName(selectEl, value) {
        const strValue = value.toString();
        for (let i = 0; i < selectEl.options.length; i++) {
            if (selectEl.options[i].innerText === strValue) {
                selectEl.selectedIndex = i;
                break;
            }
        }
    },

    // -------------------------  Checkboxes  ------------------------- //

    populateCheckboxes(container, value) {
        const checked = value.split('-');
        for (let i = 0; i < container.childNodes.length; i++) {
            if (checked.includes((i + 1).toString())) {
                container.childNodes[i].children[0].checked = true;
            }
        }
    },

    // -------------------------  Date  ------------------------- //

    setTargetDateMin() {
        const today = new Date().toISOString().split('T')[0];
        for (const id of ['TargetDate', 'requiredDate']) {
            document.getElementById(id)?.setAttribute('min', today);
        }
    },

    // -------------------------  Buttons  ------------------------- //

    disableTicketButtons() {
        for (const id of ['newNoteButton', 'Save-Button']) {
            const btn = document.getElementById(id);
            if (!btn) continue;
            btn.disabled = true;
            btn.className = 'cancel';
        }
    }
};

// -------------------------  Global  ------------------------- //

if (typeof window !== 'undefined') {
    window.Form = Form;
}
