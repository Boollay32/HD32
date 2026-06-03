using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Shared
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class ReportsController(IReports reportsM, IAuthenticator auth) : ControllerBase
    {
        private readonly IReports _reportsManager = reportsM;
        private readonly IAuthenticator _authenticator = auth;

        [HttpPost]
        public IActionResult DownloadReport([FromBody] AuthenticatedRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_reportsManager.DownloadReport());
        }

        [HttpPost]
        public IActionResult GetStats([FromBody] GetStatsRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_reportsManager.GetStats(request.StatsId));
        }
    }
}
