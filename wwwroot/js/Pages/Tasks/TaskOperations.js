// =============================  TaskOperations.js  ============================= //

class TaskOperations extends PageBase {
    constructor() {
        super();
    }

    // -------------------------  Fetch  ------------------------- //

    async getTasks(ticketId) {
        const filter = ticketId
            ? `TicketID\`${ticketId}`
            : BuildFilterSearch();

        const data = await API.post('Task/GetTasks', API.authPayload({ filter }));
        if (!data) return;

        const isTicketPage = window.location.pathname === '/TicketPage';

        if (isTicketPage) {
            CreateDynamicTable(data, null,
                [STORAGE_KEYS.USER_ID, 'progressLog', 'description', 'created'], 'Status/3');
            setTimeout(() => SetHeaderWidths(), 100);
        }
        else {
            taskPopulator.buildTasks(data);
            if (ticketId) await this.getAttachmentsTasks(ticketId);
        }
    }

    async getTaskDetail(taskId) {
        const data = await API.post('Task/GetTaskDetail',
            API.authPayload({ taskId })
        );
        if (!data) return;
        taskPopulator.fillTaskDetails(data[0]);
    }

    // -------------------------  Save  ------------------------- //

    async saveTask() {
        if (!Form.validate('NewTaskForm')) return;

        const ticketId = document.getElementById('TicketID')?.innerText;
        const elements = document.getElementById('NewTaskForm')
            .getElementsByClassName('Value');

        const formData = Form.getValues(elements, { ticketId });
        const attachments = GetAttachmentsFromDiv(
            document.getElementById('TaskDetailAttachmentList')
        );

        const data = await API.post('Task/SaveTask', API.authPayload({
            ...formData,
            attachment: attachments
        }));

        if (!data) return;

        this._updateAssignedTechSession();
        this._sendTaskNotification(data, ticketId);

        const saveButton = document.getElementById('Save-Button');
        if (saveButton) saveButton.disabled = false;
    }

    _updateAssignedTechSession() {
        const assignedTechEl = document.getElementById('assignedTech');
        const value = assignedTechEl?.options[assignedTechEl.selectedIndex]?.value ?? '';
        sessionStorage.setItem(STORAGE_KEYS.NEW_ASSIGNED_TECH, value);
    }

    _sendTaskNotification(data, ticketId) {
        // Reuse base class notification logic
        this._sendNotificationEmail('Task', data[0], ticketId ?? data[1]);
    }

    // -------------------------  Panel  ------------------------- //

    displayTaskPanel(task) {
        const taskForm = document.getElementById('NewTaskForm');
        const saveButton = document.getElementById('SaveTask-Button');

        if (task) {
            saveButton.outerHTML = '<button type="button" class="accept" id="SaveTask-Button" onclick="taskOperations.saveTask()">Update</button>';
            this.getTaskDetail(task);
            taskForm['completed'].parentElement.parentElement.style.display = 'block';
            taskForm['progressLog'].parentElement.parentElement.style.display = 'block';
            this.checkTasksStatus(taskForm['status']);
        }
        else {
            taskForm['taskID'].value = 'New';
            taskForm['requiredDate'].value = '';
            taskForm['title'].value = '';
            taskForm['description'].value = '';
            taskForm['assignedTech'].selectedIndex = -1;
            taskForm['status'].selectedIndex = 0;
            taskForm['status'].disabled = true;
            taskForm['important'].selectedIndex = -1;
            taskForm['completed'].parentElement.parentElement.style.display = 'none';
            taskForm['progressLog'].parentElement.parentElement.style.display = 'none';
            saveButton.outerHTML = '<button type="button" class="accept" id="SaveTask-Button" onclick="taskOperations.saveTask()">Save</button>';
        }

        document.getElementById('CreateTask-Div').style.display = 'block';

        _setButtonState('SaveEmail-Button', false);
        _setButtonState('Save-Button', false);

        const attachmentBox = document.getElementById('TaskDetailAttachmentList');
        if (task) {
            const attachments = document.getElementById(task)
                ?.children[1].children[5].children[0].children;
            if (attachments) TransferAttachmentsForEdit(attachments, attachmentBox);
        }

        SetCurrentAssignedTech('assignedTech');
    }

    hideTaskPanel(location) {
        if (location) {
            const attachList = location.parentElement.parentElement
                .children[9].children[1];

            if (attachList) {
                attachList.innerHTML = CreateBlankAttachment(1);
                _setButtonState('SaveEmail-Button', true);
            }

            document.getElementById('CreateTask-Div').style.display = 'none';
        }

        document.getElementById('progressLog').innerText = '';
        SetCurrentAssignedTech('assignedTechName');
        sessionStorage.setItem('TaskID', '');

        _setButtonState('Save-Button', true);
    }

    checkTasksStatus(statusObject) {
        const isComplete = statusObject.selectedIndex === 2;
        const completedInput = document.getElementById('completed');

        completedInput.disabled = !isComplete;

        if (isComplete) {
            if (!completedInput.value) {
                completedInput.value = new Date().toISOString().split('T')[0];
            }
        }
        else {
            completedInput.value = '';
        }
    }

    orderTaskByDate(orderValue) {
        const divs = document.getElementsByClassName('Task-Box');
        let switching = true;

        while (switching) {
            switching = false;

            for (let i = 0; i < divs.length - 1; i++) {
                const x = divs[i].attributes[orderValue]?.nodeValue.toLowerCase();
                const y = divs[i + 1].attributes[orderValue]?.nodeValue.toLowerCase();

                if (x > y) {
                    divs[i].parentNode.insertBefore(divs[i + 1], divs[i]);
                    switching = true;
                    break;
                }
            }
        }
    }
}

// -------------------------  Init  ------------------------- //

const taskOperations = new TaskOperations();

// -------------------------  Legacy Wrappers  ------------------------- //

function GetTasks(ticketId) { return taskOperations.getTasks(ticketId); }
function GetTaskDetail(taskId) { return taskOperations.getTaskDetail(taskId); }
function SaveTask() { taskOperations.saveTask(); }
function DisplayTaskPanel(task) { taskOperations.displayTaskPanel(task); }
function HideTaskPanel(location) { taskOperations.hideTaskPanel(location); }
function CheckTasksStatus(status) { taskOperations.checkTasksStatus(status); }
function OrderTaskByDate(orderVal) { taskOperations.orderTaskByDate(orderVal); }
