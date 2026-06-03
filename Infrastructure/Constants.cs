// Infrastructure/Constants.cs
namespace HelpDeskNet8.Infrastructure
{
    public static class Constants
    {
        public static class Authority
        {
            public const int Govtech = 151;  // Govtech internal authority
        }

        // Admin tiers returned by usp_Helpdesk_AdminAccessCheck (IAuthenticator.CheckAdmin).
        public static class AdminLevel
        {
            public const int Authority = 0;        // external authority (client) user
            public const int StandardGovtech = 1;  // standard Govtech staff
            public const int Admin = 2;            // full access: view all authorities + edit
            public const int RfcOnly = 4;          // RFC-only access
        }

        public static class TicketDefaults
        {
            public const int StatusId = 1;  // Open
            public const int PriorityId = 2;  // Medium
            public const int CategoryId = 1;  // General
        }

        // Fix: login status codes — replaces magic numbers in Login.js and HandleStatusLogin
        public static class LoginStatus
        {
            public const int Success = 0;
            public const int PasswordUpdated = 1;
            public const int DefaultPassword = 10;
            public const int InvalidCredentials = 95;
            public const int AccountLockedAttempts = 96;
            public const int NoDefaultPassword = 97;
            public const int AccountLocked = 98;
            public const int InvalidCredentials2 = 99;
        }
    }
}
