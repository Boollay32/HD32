namespace HelpDeskNet8.Models.ViewModels
{
    public class ListPageViewModel
    {
        public FilterBoxViewModel FilterBox { get; set; }
        public string? PageJs { get; set; }
        public string? PageCss { get; set; }

        // Fix: factory methods — correct FilterBox defaults per entity
        public static ListPageViewModel ForTickets(string? pageCss = null) => new()
        {
            FilterBox = FilterBoxViewModel.ForTickets(),
            PageJs = "~/js/Pages/Ticket/TicketList.js",
            PageCss = pageCss
        };

        public static ListPageViewModel ForRFCs(string? pageCss = null) => new()
        {
            FilterBox = FilterBoxViewModel.ForRFCs(),
            PageJs = "~/js/Pages/RFC/RFCList.js",
            PageCss = pageCss
        };

        public static ListPageViewModel ForTasks(string? pageCss = null) => new()
        {
            FilterBox = FilterBoxViewModel.ForTasks(),
            PageJs = "~/js/Pages/Task/TaskList.js",
            PageCss = pageCss
        };
    }
}
