using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Interfaces.Shared;

namespace HelpDeskNet8.Controllers.Users
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class UserController(IAuthenticator auth, IUserManager userManager) : ControllerBase
    {
        private readonly IUserManager _userManager = userManager;
        private readonly IAuthenticator _authenticator = auth;

        // Full access (view every authority + edit) belongs to Govtech admins.
        // Admin-level legend (usp_Helpdesk_AdminAccessCheck): 0 = authority/client,
        // 1 = standard Govtech, 2 = admin, 4 = RFC-only. Level 2 is the admin tier.
        private bool IsGovtechAdmin(IUser user) =>
            _authenticator.CheckAdmin(user) == Constants.AdminLevel.Admin;

        // The filter a caller is allowed to use: non-admins are pinned to their own
        // authority no matter what the request asked for. Uses the existing
        // @AuthorityID parameter, so nothing about the DB call changes.
        private static Filter ScopedFilter(IUser user, bool isAdmin, IDictionary<string, string> requested)
        {
            var dict = new Dictionary<string, string>();
            if (requested != null)
            {
                foreach (var kvp in requested)
                {
                    if (kvp.Key == "null") continue;
                    dict[kvp.Key] = kvp.Value switch
                    {
                        "true" => "1",
                        "on" => "0",
                        var v => v
                    };
                }
            }

            if (!isAdmin)
                dict["Authority"] = (user.AuthorityID ?? 0).ToString();

            return TypeCreator.Setup<Filter>(dict);
        }

        [HttpPost]
        public IActionResult GetUsers([FromBody] GetUsersRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_userManager.GetUsers(ScopedFilter(user, IsGovtechAdmin(user), request.Filters)));
        }

        [HttpPost]
        public IActionResult GetUserDetail([FromBody] GetUserDetailRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            // A non-admin may only open a user that appears in their own authority's
            // list — the same scoped query GetUsers runs — so scope is defined once.
            if (!IsGovtechAdmin(user))
            {
                var visible = _userManager.GetUsers(ScopedFilter(user, false, null));
                if (!visible.Any(u => u.UserID == request.UserId))
                    return StatusCode(403);
            }

            return Ok(_userManager.GetUserDetail(request.UserId));
        }

        [HttpPost]
        public IActionResult CreateUser([FromBody] CreateUserRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();
            if (!IsGovtechAdmin(user)) return StatusCode(403);

            return Ok(_userManager.CreateUser(
                request.UserLogin, request.FirstName, request.LastName,
                request.Phone, request.AuthorityId, request.Department, request.UTC));
        }

        [HttpPost]
        public IActionResult DeleteUser([FromBody] UserLoginRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();
            if (!IsGovtechAdmin(user)) return StatusCode(403);

            return Ok(_userManager.DeleteUser(user.UserLogin, request.UserLogin));
        }

        [HttpPost]
        public IActionResult ResetUser([FromBody] UserLoginRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();
            if (!IsGovtechAdmin(user)) return StatusCode(403);

            return Ok(_userManager.ResetUser(request.UserLogin));
        }

        [HttpPost]
        public IActionResult UpdateUser([FromBody] UpdateUserRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();
            if (!IsGovtechAdmin(user)) return StatusCode(403);

            return Ok(_userManager.UpdateUser(request.UserLogin, request.Phone));
        }

        [HttpPost]
        public IActionResult ManageUser([FromBody] ManageUserRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();
            if (!IsGovtechAdmin(user)) return StatusCode(403);

            int unlockUserInt = string.IsNullOrEmpty(request.UnlockUser) ? 0 : Convert.ToInt32(request.UnlockUser);
            int adminLevelIdInt = string.IsNullOrEmpty(request.AdminLevelId) ? 0 : Convert.ToInt32(request.AdminLevelId);

            return Ok(_userManager.ManageUser(request.UserLogin, user.UserLogin, unlockUserInt, adminLevelIdInt, request.Phone));
        }

        [HttpPost]
        public IActionResult GetUserEmailAddress([FromBody] GetUserEmailAddressRequest request)
        {
            return Ok(_userManager.GetUserEmailAddress(request.UserId, request.FirstName, request.LastName, request.AuthorityName));
        }
    }
}
