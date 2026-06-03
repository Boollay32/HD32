// =============================  AdminOperations.js  ============================= //

class AdminOperations extends PageBase {
    constructor() {
        super();
    }

    // -------------------------  Create User  ------------------------- //

    async createUser() {
        const createBtn = document.getElementById('CreateUser-Button');
        if (createBtn) createBtn.disabled = true;

        try {
            const fields = document.getElementById('NewUserForm')
                ?.getElementsByClassName('Value');
            if (!fields) return;

            if (!this._validateUserForm(fields)) return;

            const itemList = this._buildItemList(fields);

            const data = await API.post('User/CreateUser',
                API.authPayload({ list: itemList })
            );

            ClearAllFormInputs('NewUserForm');
            BuildMessageBox(`User Created. Please relay the PIN to the user. ${data}`, 'UserPage');

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't create user.");
            }
        } finally {
            if (createBtn) createBtn.disabled = false;
        }
    }

    _validateUserForm(fields) {
        for (const field of fields) {
            if (field.required && !field.value) {
                const label = field.parentElement?.parentElement
                    ?.children[0]?.children[0]?.innerText ?? 'Field';
                BuildMessageBox(`${label} must be completed.`);
                return false;
            }
        }

        const email = fields[0]?.value ?? '';
        if (!this._isValidEmail(email)) {
            BuildMessageBox('The Login name is not a valid email address.');
            return false;
        }

        return true;
    }

    _isValidEmail(email) {
        return /(.+)@(.+){2,}\.(.+){2,}/.test(email);
    }

    _buildItemList(fields) {
        // Trailing backtick intentional — server expects delimited list
        return [...fields].map(f => f.value).join('`') + '`';
    }


    // -------------------------  Update Login Message  ------------------------- //

    async updateLoginMessage(hide = false) {
        try {
            let message = document.getElementById('UpdateMessage')?.value ?? '';
            const result = hide ? 'removed.' : 'updated.';

            if (hide) message = 'EMPTY';
            if (!message) return;

            await API.post('Misc/UpdateLoginMessage',
                API.authPayload({ objectInfo: JSON.stringify(message) })
            );

            BuildMessageBox(`The Login message has been ${result}`, 'AdminPage');

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.handleError("Error: Couldn't update login message.");
            }
        }
    }
}

// -------------------------  Init  ------------------------- //

const adminOperations = new AdminOperations();

// -------------------------  Legacy Wrappers  ------------------------- //

function CreateUser() { adminOperations.createUser(); }
function CreateBugOrRequest() { adminOperations.createBugOrRequest(); }
function GetBORDetail(barId) { adminOperations.getBORDetail(barId); }
function UpdateBugOrRequest() { adminOperations.updateBugOrRequest(); }
function UpdateMessageCall(hide) { adminOperations.updateLoginMessage(hide); }
