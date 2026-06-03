namespace HelpDeskNet8.Interfaces.Users
{
    public interface IUserStub
    {
        int? UserID { get; set; }
        string UserName { get; set; }
        string Authority { get; set; }
        string Phone { get; set; }
        int? Locked { get; set; }
        DateTime? LastLoginDate { get; set; }
        string AdminLevel { get; set; }
    }
}
