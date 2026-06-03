using HelpDeskNet8.Interfaces.Users;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Infrastructure
{
    public static class ControllerExtensions
    {
        public static IUser GetAuthenticatedUser(this ControllerBase controller) =>
            controller.HttpContext.Items["AuthenticatedUser"] as IUser;
    }
}
