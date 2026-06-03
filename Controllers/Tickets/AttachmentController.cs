using HelpDeskNet8.Requests;
using HelpDeskNet8.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Shared;

namespace HelpDeskNet8.Controllers.Tickets
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class AttachmentController(IAttachmentManager attachmentM, IAuthenticator auth) : ControllerBase
    {
        private readonly IAttachmentManager _attachmentManager = attachmentM;
        private readonly IAuthenticator _authenticator = auth;
              
        [HttpPost]
        public IActionResult GetAttachmentsNotes([FromBody] GetAttachmentsNotesRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var result = _attachmentManager.GetAttachmentsNotes(user, request.TicketId, request.RFC);
            return Ok(result);
        }

        [HttpPost]
        public IActionResult GetAttachmentsTasks([FromBody] GetAttachmentsTasksRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var result = _attachmentManager.GetAttachmentsTasks(user, request.TicketId);
            return Ok(result);
        }
    }
}
