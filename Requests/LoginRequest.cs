namespace HelpDeskNet8.Requests
{
    public class PostLoginRequest
    {
        public string UserName { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
        public string? NewPassword { get; init; }
        public int UTC { get; init; }
    }

    public class SecondWallAuthRequest
    {
        public string Email { get; init; } = string.Empty;
        public int Pin { get; init; }
        public int UTC { get; init; }
    }
}
