using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Requests;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Shared
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class HistoryController(IHistory historyM, IAuthenticator auth) : ControllerBase
    {
        private readonly IHistory _historyManager = historyM;
        private readonly IAuthenticator _authenticator = auth;
                
        [HttpPost]
        public IActionResult GetHistory([FromBody] GetHistoryRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var result = _historyManager.GetHistory(user, request.TicketId);
            return Ok(result);
        }
    }
}
