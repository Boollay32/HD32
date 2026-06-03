namespace HelpDeskNet8.Models.Shared
{
    public class TransferObject
    {
        public string? Token { get; set; }
        public int Status { get; set; }
        public int? UserID { get; set; }
        public int? AuthorityID { get; set; }
    }
}
