namespace HelpDeskNet8.Models.ViewModels
{
    public class DetailsHeaderViewModel
    {
        public string EntityLabel { get; set; }  // "Ticket", "RFC", "User"
        public string EntityIdElementId { get; set; }  // "TicketID", "RFCID", "UserID"
        public List<HeaderButton> Buttons { get; set; } = new();
    }

    public class HeaderButton
    {
        public string Id { get; set; }
        public string Label { get; set; }
        public string CssClass { get; set; } = "accept";
        public bool Hidden { get; set; } = false;
    }
}
