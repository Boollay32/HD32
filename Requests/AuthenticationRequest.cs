namespace HelpDeskNet8.Requests;

public class AuthenticatedRequest
{
    public string UserName { get; set; }
    public string Token { get; set; }
    public int UTC { get; set; }
}