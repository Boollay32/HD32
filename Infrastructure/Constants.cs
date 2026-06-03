// Infrastructure/Constants.cs
namespace HelpDeskNet8.Infrastructure
{
    public static class Constants
    {
        public static class Authority
        {
            public const int Govtech = 151;  // Govtech internal authority
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
