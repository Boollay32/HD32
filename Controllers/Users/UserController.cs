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

        [HttpPost]
        public IActionResult GetUsers([FromBody] GetUsersRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var filterDict = new Dictionary<string, string>();
            if (request.Filters != null)
            {
                foreach (var kvp in request.Filters)
                {
                    if (kvp.Key == "null") continue;
                    string value = kvp.Value switch
                    {
                        "true" => "1",
                        "on" => "0",
                        var v => v
                    };
                    filterDict.Add(kvp.Key, value);
                }
            }

            Filter filter = TypeCreator.Setup<Filter>(filterDict);
            return Ok(_userManager.GetUsers(filter));
        }


        [HttpPost]
        public IActionResult GetUserDetail([FromBody] GetUserDetailRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_userManager.GetUserDetail(request.UserId));
        }

        [HttpPost]
        public IActionResult CreateUser([FromBody] CreateUserRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_userManager.CreateUser(
                request.UserLogin, request.FirstName, request.LastName,
                request.Phone, request.AuthorityId, request.Department, request.UTC));
        }

        [HttpPost]
        public IActionResult DeleteUser([FromBody] UserLoginRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_userManager.DeleteUser(user.UserLogin, request.UserLogin));
        }

        [HttpPost]
        public IActionResult ResetUser([FromBody] UserLoginRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_userManager.ResetUser(request.UserLogin));
        }

        [HttpPost]
        public IActionResult UpdateUser([FromBody] UpdateUserRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            return Ok(_userManager.UpdateUser(request.UserLogin, request.Phone));
        }

        [HttpPost]
        public IActionResult ManageUser([FromBody] ManageUserRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

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
