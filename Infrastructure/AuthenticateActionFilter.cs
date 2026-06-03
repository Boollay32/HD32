using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HelpDeskNet8.Infrastructure
{
    public class AuthenticateActionFilter(IAuthenticator authenticator) : IActionFilter
    {
        private readonly IAuthenticator _authenticator = authenticator;

        public void OnActionExecuting(ActionExecutingContext context)
        {
            // Fix: skip auth for actions without AuthenticatedRequest — e.g. login page
            if (!context.ActionArguments.Values.OfType<AuthenticatedRequest>().Any())
                return;

            var request = context.ActionArguments.Values
                .OfType<AuthenticatedRequest>()
                .First();

            IUser? user = _authenticator.AuthenticateByToken(
                request.UserName, request.Token, request.UTC);

            if (user == null)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            context.HttpContext.Items["AuthenticatedUser"] = user;
        }

        public void OnActionExecuted(ActionExecutedContext context) { }
    }
}
