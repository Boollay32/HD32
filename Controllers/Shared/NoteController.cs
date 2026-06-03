using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Notes;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Shared
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class NoteController(INoteManager notesM, IAuthenticator auth) : ControllerBase
    {
        private readonly INoteManager _notesManager = notesM;
        private readonly IAuthenticator _authenticator = auth;

        [HttpPost]
        public IActionResult GetNotes([FromBody] GetNotesRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var result = _notesManager.GetNotes(user, request.TicketId);
            return Ok(result);
        }

        [HttpPost]
        [DisableRequestSizeLimit]
        public IActionResult SaveNote([FromBody] SaveNoteRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            INote note = NoteMapper.Map(request.ObjectInfo);
            if (note == null) return BadRequest("Invalid note data.");

            var result = _notesManager.SaveNote(note, request.Attachments, user.UserID, request.RFC, request.UTC);
            return Ok(result);
        }

        [HttpPost]
        public IActionResult GetRFCNotes([FromBody] GetRFCNotesRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var result = _notesManager.GetRFCNotes(user, request.RFCId);
            return Ok(result);
        }
    }
}
