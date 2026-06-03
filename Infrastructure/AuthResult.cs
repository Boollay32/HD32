namespace HelpDeskNet8.Infrastructure
{
    public class AuthResult
    {
        public bool IsSuccess { get; init; }
        public int ReturnCode { get; init; }
        public string? Token { get; init; }
        public DateTime? Expiry { get; init; }
        public string? Error { get; init; }

        public static AuthResult Success(int code, string token, DateTime? expiry) => new()
        {
            IsSuccess = true,
            ReturnCode = code,
            Token = token,
            Expiry = expiry
        };

        public static AuthResult Failed(string error) => new()
        {
            IsSuccess = false,
            Error = error
        };
    }
}
