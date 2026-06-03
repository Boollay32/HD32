using HelpDeskNet8.Controllers.Shared;
using HelpDeskNet8.Controllers.Tasks;
using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Notes;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Tasks;
using HelpDeskNet8.Interfaces.Tickets;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Attachments;
using HelpDeskNet8.Models.Notes;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Models.Tasks;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Tickets
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class TicketDetailsController(
        ITicketManager ticketManager,
        INoteManager noteManager,
        ITaskManager taskManager,
        IAttachmentManager attachmentManager,
        IHistory history) : ControllerBase
    {
        private readonly ITicketManager _ticketManager = ticketManager;
        private readonly INoteManager _noteManager = noteManager;
        private readonly ITaskManager _taskManager = taskManager;
        private readonly IAttachmentManager _attachmentManager = attachmentManager;
        private readonly IHistory _history = history;

        // -------------------------  Ticket  ------------------------- //

        [HttpPost]
        public IActionResult GetTicketDetail([FromBody] GetTicketDetailRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            if (request.TicketId <= 0) return BadRequest("Invalid ticket ID.");

            var ticket = _ticketManager.GetTicketDetail(request.TicketId, user);
            if (ticket == null) return NotFound();

            return Ok(ticket);
        }

        // -------------------------  Notes  ------------------------- //

        [HttpPost]
        public IActionResult GetNotes([FromBody] GetNotesRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            if (request.TicketId <= 0) return BadRequest("Invalid ticket ID.");

            var notes = _noteManager.GetNotes(user, request.TicketId);
            return Ok(notes);
        }

        [HttpPost]
        public IActionResult SaveNote([FromBody] SaveNoteRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var note = NoteMapper.Map(request.ObjectInfo);
            if (note == null) return BadRequest("Invalid note data.");

            if (string.IsNullOrWhiteSpace(note.NoteDescription))
                return BadRequest("Note description is required.");

            var attachments = _mapAttachments(request.Attachments);

            // Stamp server-side user fields
            note.NotesUserID = user.UserID;
            note.AuthorityID = user.AuthorityID;

            var result = _noteManager.SaveNote(
                note,
                attachments,
                user.UserID,
                rfc: request.RFC,
                UTC: request.UTC);

            if (!result.IsSuccess)
                return BadRequest(result.Error);

            // Return updated notes so UI can re-render without a second call
            var notes = _noteManager.GetNotes(user, note.TicketID ?? 0);
            return Ok(notes);
        }

        // -------------------------  Tasks  ------------------------- //

        [HttpPost]
        public IActionResult GetTasks([FromBody] GetTasksRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            // Reuse TicketFilterMapper — same Dictionary<string,string> pattern
            var filter = TicketFilterMapper.Map(request.Filters);

            var tasks = _taskManager.GetTasks(user, filter, UTC: 0);
            return Ok(tasks);
        }

        [HttpPost]
        public IActionResult SaveTask([FromBody] SaveTaskRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var task = TaskMapper.Map(request.ObjectInfo);
            if (task == null) return BadRequest("Invalid task data.");

            if (string.IsNullOrWhiteSpace(task.Title))
                return BadRequest("Task title is required.");

            var attachments = _mapAttachments(request.Attachments);

            // Stamp server-side user
            task.UserID = user.UserID;

            var result = _taskManager.SaveTask(
                task,
                attachments,
                user.UserID,
                UTC: 0);

            if (!result.IsSuccess)
                return BadRequest(result.Error);

            // Return updated task list scoped to same ticket
            var filter = new Filter { TicketID = task.TicketID };
            var tasks = _taskManager.GetTasks(user, filter, UTC: 0);
            return Ok(tasks);
        }

        // -------------------------  Activity  ------------------------- //

        [HttpPost]
        public IActionResult GetActivity([FromBody] GetHistoryRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            if (request.TicketId <= 0) return BadRequest("Invalid ticket ID.");

            var activity = _history.GetHistory(user, request.TicketId);
            return Ok(activity);
        }

        // -------------------------  Private helpers  ------------------------- //

        private static IEnumerable<IAttachment> _mapAttachments(
            IEnumerable<IAttachment>? attachments)
        {
            if (attachments == null) return Enumerable.Empty<IAttachment>();

            return attachments
                .Where(a => !string.IsNullOrWhiteSpace(a.AttachmentByteArray))
                .Select(a => new AttachmentStub
                {
                    AttachmentByteArray = a.AttachmentByteArray,
                    AttachmentName = a.AttachmentName ?? string.Empty,
                    AttachmentImageType = a.AttachmentImageType,
                })
                .ToList();
        }
    }
}
