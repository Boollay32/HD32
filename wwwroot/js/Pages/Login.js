// =============================  Login Status Codes  ============================= //
// Fix: named constants — replaces magic numbers throughout
const LOGIN_STATUS = {
    SUCCESS: 0,
    PASSWORD_UPDATED: 1,
    DEFAULT_PASSWORD: 10,
    INVALID_CREDENTIALS: 95,
    ACCOUNT_LOCKED_ATTEMPTS: 96,
    NO_DEFAULT_PASSWORD: 97,
    ACCOUNT_LOCKED: 98,
    INVALID_CREDENTIALS_2: 99
};

// =============================  Init  ============================= //
window.onload = function () {
    sessionStorage.clear();
    sessionStorage.setItem("LoginPage", 1);

    are_cookies_enabled();
    CreatePinBoxes();

    document.getElementById("nav").innerHTML = "";

    // Fix: wire up events removed from HTML
    document.getElementById("Login-Button")?.addEventListener("click", () => Login(document.getElementById("login")));
    document.getElementById("SecondWall-Submit")?.addEventListener("click", SecondWallAuth);
    document.getElementById("NewPass-Submit")?.addEventListener("click", () => SetNewPassword(document.getElementById("NewPass")));
    document.getElementById("pass")?.addEventListener("keydown", e => { if (e.key === "Enter") Login(document.getElementById("login")); });    
};


// =============================  Login Functions  ============================= //

async function Login(form, e) {
    ToggleWaiting();

    const LoginForm = document.getElementById("login");
    const NewPassForm = document.getElementById("NewPass");
    let pass = "";
    let newpass = "";
    let name = "";

    if (window.location.hostname === 'localhost') {
        // DEV ONLY — remove before commit
        name = 'alex.bull@govtech.co.uk';
        pass = '(Qundai214620!)';
    } else {
        if (NewPassForm[0].value !== "") {
            newpass = NewPassForm.pass1.value;
            pass = "Helpdesk";
        } else {
            pass = LoginForm.psw.value;
        }
        name = LoginForm.uname.value;
        if (!name || !pass) {
            ToggleWaiting();
            return;
        }
    }

    const UTC = UTCWorkAround();

    try {
        const response = await fetch("/api/Login/PostLogin", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            // Fix: credentials in body — not headers
            body: JSON.stringify({
                userName: name,
                password: pass,
                newPassword: newpass || null,
                UTC: UTC
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        sessionStorage.setItem("UserName", name);
        sessionStorage.setItem("UserID", data.userID);
        sessionStorage.setItem("AuthorityID", data.authorityID);

        HandleStatusLogin(data.status);

    } catch (error) {
        console.error('Login error:', error);
        BuildMessageBox("Failed to Connect to server, please contact Govtech for assistance.", "Index");
    } finally {
        LoginForm.psw.value = "";
        const pass1 = document.getElementById("pass1");
        const pass2 = document.getElementById("pass2");
        if (pass1) pass1.value = "";
        if (pass2) pass2.value = "";
        ToggleWaiting();
    }
}

function HandleStatusLogin(status) {
    // Fix: named constants — not magic numbers
    switch (status) {
        case LOGIN_STATUS.SUCCESS:
            sessionStorage.setItem("Status", 0);
            break;

        case LOGIN_STATUS.PASSWORD_UPDATED:
            BuildMessageBox("Logged in & password updated");
            sessionStorage.setItem("Status", 0);
            break;

        case LOGIN_STATUS.DEFAULT_PASSWORD:
            // User logging in with default password — show reset form
            document.getElementById("Login-Container").classList.remove("active");
            document.getElementById("ResetPassword-Container").classList.add("active");
            sessionStorage.setItem("Status", 1);
            return; // Fix: early return — don't show SecondWall

        case LOGIN_STATUS.INVALID_CREDENTIALS:
        case LOGIN_STATUS.INVALID_CREDENTIALS_2:
            BuildMessageBox("Username or password incorrect", "Index");
            sessionStorage.setItem("Status", 1);
            return; // Fix: early return — don't show SecondWall on failure

        case LOGIN_STATUS.ACCOUNT_LOCKED_ATTEMPTS:
            BuildMessageBox("No. of login attempts exceeds maximum - account locked for security purposes", "Index");
            document.getElementById("pass").value = "";
            sessionStorage.setItem("Status", 1);
            return;

        case LOGIN_STATUS.NO_DEFAULT_PASSWORD:
            BuildMessageBox("User does not have a default password - please contact your system administrator", "Index");
            sessionStorage.setItem("Status", 1);
            return;

        case LOGIN_STATUS.ACCOUNT_LOCKED:
            BuildMessageBox("User locked - please contact your system administrator", "Index");
            document.getElementById("pass").value = "";
            sessionStorage.setItem("Status", 1);
            return;

        default:
            BuildMessageBox("An unexpected error occurred. Please try again.", "Index");
            sessionStorage.setItem("Status", 1);
            return;
    }
       
    document.getElementById("Login-Container").classList.remove("active");
    document.getElementById("SecondWall-Container").classList.add("active");
}

async function SecondWallAuth() {
    let status = sessionStorage.getItem("Status");
    let pin = '';
    let email = '';

    if (window.location.hostname === 'localhost') {
        email = 'alex.bull@govtech.co.uk';
        pin = '526826';
    }
    else{
        if (status === "1") {
            BuildMessageBox("Incorrect Credentials", "Index");
            return;
        }

        ToggleWaiting();

        email = sessionStorage.getItem("UserName");
        const pinBoxes = document.querySelectorAll("#Pin-Boxes input, #Pin-Boxes select");
        pin = Array.from(pinBoxes).map(b => b.value).join("");
    }
    
    const UTC = UTCWorkAround();

    try {
        const response = await fetch("/api/Login/SecondWallAuth", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            // Fix: PIN + email in body — not headers
            // Fix: typed properties — not array indexes
            body: JSON.stringify({ email, pin: parseInt(pin), UTC })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Fix: named AuthResult properties — not data[0], data[1]
        if (data.isSuccess) {
            sessionStorage.setItem("Token", data.token);
            await LoadMessage();
        } else if (data.returnCode === LOGIN_STATUS.ACCOUNT_LOCKED) {
            BuildMessageBox("Incorrect Pin", "Index");
        } else {
            BuildMessageBox("Incorrect Credentials", "Index");
        }

    } catch (error) {
        console.error('SecondWallAuth error:', error);
        BuildMessageBox("Incorrect Credentials", "Index");
    } finally {
        ToggleWaiting();
    }
}

function SetNewPassword(form) {
    const pass1 = form.passretype1.value;
    const pass2 = form.passretype2.value;

    if (pass1 !== pass2) {
        BuildMessageBox("Password didn't match, please try again.");
        document.getElementById("pass1").value = "";
        document.getElementById("pass2").value = "";
        return;
    }

    const errors = [];
    if (pass1.length < 12) errors.push("Your password must be at least 12 characters");
    if (!/[a-z]/.test(pass1)) errors.push("Your password must contain at least one lowercase letter");
    if (!/[A-Z]/.test(pass1)) errors.push("Your password must contain at least one uppercase letter");
    if (!/[0-9]/.test(pass1)) errors.push("Your password must contain at least one digit");

    if (errors.length > 0) {
        BuildMessageBox(errors.join("\n"));
        document.getElementById("pass1").value = "";
        document.getElementById("pass2").value = "";
        return;
    }

    document.getElementById('ResetPassword-Container').style.display = 'none';
    Login(form);
}

// =============================  Misc Functions  ============================= //

function CreatePinBoxes() {
    const PinBoxes = document.getElementById("Pin-Boxes");
    let Generate1 = Math.floor(Math.random() * 6) + 1;
    let Generate2 = Math.floor(Math.random() * 6) + 1;

    while (Generate1 === Generate2) {
        Generate2 = Math.floor(Math.random() * 6) + 1;
    }

    for (let i = 1; i <= 6; i++) {
        if (Generate1 === i || Generate2 === i) {
            PinBoxes.innerHTML += `<select class="PIN-Tile" id="pin-${i}" onkeydown="IgnoreAlpha(event)"></select>`;
            const PinDrop = document.getElementById(`pin-${i}`);
            for (let j = 0; j <= 9; j++) {
                PinDrop.innerHTML += `<option>${j}</option>`;
            }
        } else {
            PinBoxes.innerHTML += `<input type="tel" size="1" maxlength="1" id="pin-${i}" />`;
        }
    }

    Array.from(PinBoxes.getElementsByTagName("select"))
        .forEach(select => select.selectedIndex = -1);
}

function are_cookies_enabled() {
    if (navigator.cookieEnabled) {
        DisplayAndHideItemsByTagName("body", true);
    } else {
        DisplayAndHideItemsByTagName("body", false);
        window.cookieconsent_options = {
            message: "This website uses cookies to ensure you get the best experience on our website. Please enable them to continue.",
            dismiss: "Got it!",
            learnMore: "More info",
            link: null,
            theme: "dark-top"
        };
    }
}

function enter(form, e) {
    if (e.keyCode === 13) Login(form);
}

function IgnoreAlpha(e) {
    event.preventDefault();
}

async function LoadMessage() {
    try {
        const response = await fetch("/api/Login/LoginMessage", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 401) {
            BuildMessageBox("Your session has timed out.", "Index");
            return;
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        let encodedStr = data.replace(/[\u00A0-\u9999<>&]/gim,
            i => `&#${i.charCodeAt(0)};`);

        if (encodedStr.charAt(0) === '"') {
            encodedStr = encodedStr.slice(1, -1);
        }

        if (encodedStr !== "EMPTY") {
            const destination = sessionStorage.getItem("Admin") === "4" ? "RFC" : "TicketPage";
            BuildMessageBox(encodedStr, destination);
        } else {
            OkayButtonPress("TicketPage");
        }

    } catch (error) {
        console.error('LoadMessage error:', error);
    } finally {
        const sendButton = document.getElementById("SendButton");
        if (sendButton) sendButton.disabled = false;
    }
}
