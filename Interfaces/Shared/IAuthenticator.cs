using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Users;

namespace HelpDeskNet8.Interfaces.Shared
{
    public interface IAuthenticator
    {
        int StatusCode { get; }
        string? StatusText { get; }

        // Fix: nullable return — null = auth failed
        IUser? AuthenticateByPassword(string username, string password,
            int UTC, string? newPassword = null);

        // Fix: nullable return — null = token invalid/expired
        IUser? AuthenticateByToken(string username, string token, int UTC);

        void Logout(int userID);

        string GetMessage();

        // Fix: AuthResult — strongly typed — replaces List<object>
        AuthResult SecondWallAuth(string email, int pin, int UTC);

        int CheckAdmin(IUser user);
    }
}
