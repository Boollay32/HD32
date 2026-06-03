namespace HelpDeskNet8.Interfaces.Users
{
    public interface IUser
    {
        int? UserID { get; set; }
        string UserName { get; set; }
        int? AuthorityID { get; set; }
        string UserEmail { get; set; }
        string UserPhone { get; set; }
        string UserLogin { get; set; }
        string AuthenticationToken { get; set; }
        DateTime ExpiryTime { get; set; }
        string AdminLevel { get; set; }
    }
}
