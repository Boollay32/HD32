using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Tickets;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using HelpDeskNet8.Controllers.Shared;
using HelpDeskNet8.Controllers.Tasks;  
using HelpDeskNet8.Controllers.Tickets;  

namespace HelpDeskNet8.Controllers.Tickets
{

    [ApiController]
    [Route("api/[controller]/[action]")]
    public class TicketController(
        ITicketManager ticketM,
        IAuthenticator auth,
        IDropdowns dropDownProv) : ControllerBase
    {
        private readonly ITicketManager _ticketManager = ticketM;
        private readonly IDropdowns _dropDown = dropDownProv;

        // GetTicketDetail removed - the detail page calls
        // TicketDetailsController.GetTicketDetail (with id validation + NotFound).
        // This duplicate had no JS caller and skipped those checks.

        [HttpPost]
        public IActionResult GetTickets([FromBody] GetTicketsRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            Filter filter = TicketFilterMapper.Map(request.Filters);
            var allTickets = _ticketManager.GetTickets(user, filter, request.MyTicket, request.UTC);
            return Ok(allTickets);
        }

        [HttpPost]
        public IActionResult SaveTicket([FromBody] SaveTicketRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            ITicket ticket = TicketMapper.Map(request.ObjectInfo);
            if (ticket == null) return BadRequest("Invalid ticket data.");

            // Fix: redacted value restored
            if (request.ContactClientAuthorityId.HasValue && request.ContactClientUserId.HasValue)
            {
                ticket.AssignedTechID = user.UserID;
                user.UserID = request.ContactClientUserId.Value;
                user.AuthorityID = request.ContactClientAuthorityId.Value;
            }

            // Fix: SaveResult — strongly typed — replaces List<object> index access
            SaveResult result = ticket.TicketID != null
                ? _ticketManager.SaveTicket(ticket.GetChanges(), user, request.UTC, request.FalseReply, request.EmailSent, visibleToClient: 1)
                : _ticketManager.SaveTicket(ticket, user, request.UTC, request.FalseReply, request.EmailSent);

            if (!result.IsSuccess)
                return BadRequest(result.Error);

            return Ok(result);
        }

        [HttpPost]
        public IActionResult GetRequestId([FromBody] GetRequestIdRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var requestId = _ticketManager.GetRequestID(request.TicketId, user);
            return Ok(requestId);
        }

        [HttpPost]
        public IActionResult ChangeCustomFields([FromBody] ChangeCustomFieldsRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            DataTable customFields = _dropDown.GetCustomFields(user, request.RequestId);
            var result = customFields.ToListOfDictionaries();
            return Ok(result);
        }
    }
}
