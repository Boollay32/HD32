// =============================  Emails.js  ============================= //

const GOVTECH_EMAIL = 'govtech.helpdesk@govtech.co.uk';

// -------------------------  Server Check  ------------------------- //

function _isTestServer() {
    const host = window.location.hostname;
    return host === 'testgovtechhelpdesk.azurewebsites.net' || host === 'localhost';
}

// -------------------------  Orchestration  ------------------------- //

async function SendNotificationEmail(type, notificationType, objectId, respondingUser, itemOwner) {
    const currentPage = type === 'Task' ? 'Ticket' : type;

    _showNotificationMessage(type, notificationType, objectId, currentPage, itemOwner);

    const address = await BuildEmailAddressList(
        notificationType, type,
        sessionStorage.getItem(STORAGE_KEYS.NEW_ASSIGNED_TECH),
        respondingUser, itemOwner
    );

    if (!address) return;

    const subject = CreateMessageSubject(notificationType, type, objectId);
    const body = BuildEmailBody(notificationType, type, objectId);
    await SendMailMessage(address, subject, body);
}

function _showNotificationMessage(type, notificationType, objectId, currentPage, itemOwner) {
    if (notificationType === 'Responded') {
        BuildMessageBox(`Note added to ${type}`, `${currentPage}Details`);
        return;
    }

    if (notificationType === 'Assigned') {
        const newTech = sessionStorage.getItem(STORAGE_KEYS.NEW_ASSIGNED_TECH);
        const oldTech = sessionStorage.getItem(STORAGE_KEYS.OLD_ASSIGNED_TECH);

        if (newTech !== oldTech && oldTech !== '') {
            BuildMessageBox(`${type} Re-Assigned`, `${currentPage}Details`);
        } else if (itemOwner === '' || type === 'Task') {
            BuildMessageBox(`Created ${type} ${objectId}`, `${currentPage}Details`);
        }
        return;
    }

    if (notificationType === 'Update') {
        BuildMessageBox(`${type} ${objectId} updated`, `${currentPage}Details`);
        if (type === 'Task') sessionStorage.setItem('TaskID', '');
    }
}

// -------------------------  Subject  ------------------------- //

function CreateMessageSubject(objectAction, objectType, objectId) {
    const testPrefix = _isTestServer() ? `Test App ${objectType} - ` : '';
    const action = objectAction === 'CreatedFor' ? 'Created' : objectAction;
    return `${testPrefix}${action} ${objectType} ${objectId}`;
}

// -------------------------  Body  ------------------------- //

function BuildEmailBody(objectAction, objectType, objectId) {
    const userName = _escapeHtml(sessionStorage.getItem(STORAGE_KEYS.USER_NAME) ?? '');
    const testPrefix = _isTestServer() ? `Test App ${objectType} - ` : '';

    const NOTIFICATIONS = {
        'Responded': {
            subject: `${testPrefix}Responded ${objectType}`,
            message: `${objectType} number ${objectId}, has been responded to. It may require your attention, please review.`
        },
        'Assigned': {
            subject: `${testPrefix}Assigned ${objectType}`,
            message: `${objectType} number ${objectId} has been assigned to you.`
        },
        'Re-Assigned': {
            subject: `${testPrefix}Assigned ${objectType}`,
            message: `${objectType} number ${objectId} has been assigned to you.`
        },
        'CreatedFor': {
            subject: `${testPrefix}A ${objectType} has been created on your behalf.`,
            message: `${objectType} number ${objectId}, was created for you by a Govtech staff member.`
        }
    };

    const notification = NOTIFICATIONS[objectAction] ?? {
        subject: `${testPrefix}${objectAction} ${objectType}`,
        message: `${objectType} number ${objectId}.`
    };

    return `
        <div style="margin-bottom:30px;">
            <table style="border-radius:3px; width:800px; padding-left:20px;
                background-color:#eaeaea !important; border:solid grey 1px;">
                <thead style="font-size:18px;">
                    <tr style="height:40px; color:white; font-size:20px !important;
                        background-color:#484848;">
                        <td><b>Govtech Helpdesk - New Notification</b></td>
                    </tr>
                </thead>
                <tbody style="font-size:16px; background-color:#eaeaea !important;">
                    <tr><td><b>From : </b>${userName}</td></tr>
                    <tr><td><b>Subject : </b>${notification.subject}</td></tr>
                    <tr><td><b>Notification : </b>${notification.message}</td></tr>
                    <tr>
                        <td>
                            <b>Please log into Govtech Helpdesk to view the ${objectType} and respond.</b>
                        </td>
                    </tr>
                    <tr style="padding-bottom:20px;">
                        <td>
                            <a>Please do not reply to this email as it is only a notification and replies are not monitored.<br></a>
                            <a>Never use a link in an email to access the helpdesk as a security measure.
                            Links can be forged by Criminals and Hackers. Instead search for the website using your browser.</a>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`;
}

function _escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// -------------------------  API / Send  ------------------------- //

async function SendMailMessage(address, subject, emailText) {
    await API.post('Misc/SendMailMessage', API.authPayload({
        to: address,
        from: GOVTECH_EMAIL,
        subject,
        objectInfo: emailText
    }));
}

async function GetUserEmailAddress(userInfo) {
    if (!userInfo) return '';
    if (userInfo.includes('@')) return userInfo;

    const authorityName = document.getElementById('authorityName')?.innerText ?? '';

    let userId = '';
    let userFirstName = '';
    let userLastName = '';

    if (userInfo.includes(' ')) {
        [userFirstName, userLastName] = userInfo.split(' ');
    } else {
        userId = userInfo;
    }

    const data = await API.post('User/GetUserEmailAddress', {
        userId,
        userFirstName,
        userLastName,
        authorityName
    });

    return data ?? '';
}

// -------------------------  Helpers  ------------------------- //

async function BuildEmailAddressList(notificationType, objectType, assignedUser, respondingUser, itemOwner) {
    const [respondingEmail, assignedEmail, ownerEmail] = await Promise.all([
        GetUserEmailAddress(respondingUser),
        GetUserEmailAddress(assignedUser),
        GetUserEmailAddress(itemOwner)
    ]);

    if (notificationType === 'Assigned') return assignedEmail;

    if (notificationType === 'Responded') {
        const authorityEl = document.getElementById('authorityName');
        const isGovtech = authorityEl?.innerHTML === 'Govtech Solutions Limited';
        const isTask = objectType === 'Task';

        if (!authorityEl || (isGovtech && !isTask)) return '';

        if (respondingEmail === ownerEmail) return assignedEmail;
        if (respondingEmail === assignedEmail) return ownerEmail;

        const isRestrictedAuthority = sessionStorage.getItem(STORAGE_KEYS.AUTHORITY_ID) === '151';
        return isRestrictedAuthority
            ? ownerEmail
            : `${ownerEmail},${assignedEmail}`;
    }

    return '';
}

function getItemOwner() {
    return document.getElementById('OriginatorEmail')?.innerText
        ?? document.getElementById(STORAGE_KEYS.USER_NAME)?.innerText
        ?? '';
}

// -------------------------  Legacy Wrappers  ------------------------- //

function GetItemOwner() { return getItemOwner(); }
