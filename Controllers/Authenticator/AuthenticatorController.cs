using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Authenticator
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class AuthenticatorController(IAuthenticator auth) : ControllerBase
    {
        private readonly IAuthenticator _authenticator = auth;

        [HttpPost]
        public IActionResult Authenticate([FromBody] AuthenticatedRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(new { userID = user.UserID });
        }

        [HttpPost]
        public IActionResult CheckAdmin([FromBody] AuthenticatedRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_authenticator.CheckAdmin(user));
        }
    }
}
