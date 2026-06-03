using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Shared
{
    public class PageController : Controller
    {
        [Route("StatsPage")]
        public IActionResult StatsPage() => View("~/Views/Page/StatsPage.cshtml");

        [Route("AdminPage")]
        public IActionResult AdminPage() => View("~/Views/Page/AdminPage.cshtml");

        [Route("CreateRFC")]
        public IActionResult CreateRFC() => View("~/Views/Page/RFC/CreateRFC.cshtml");

        [Route("CreateTicket")]
        public IActionResult CreateTicket() => View("~/Views/Page/Ticket/CreateTicket.cshtml");

        [Route("FAQPage")]
        public IActionResult FAQPage() => View("~/Views/Page/FAQPage.cshtml");

        [Route("RFC")]
        public IActionResult RFC() => View("~/Views/Page/RFC/RFCPage.cshtml");

        [Route("RFCDetails")]
        public IActionResult RFCDetails() => View("~/Views/Page/RFC/RFCDetails.cshtml");

        [Route("Stats")]
        public IActionResult Stats() => View("~/Views/Page/StatsPage.cshtml");

        [Route("TicketDetails")]
        public IActionResult TicketDetails() => View("~/Views/Page/Ticket/TicketDetails.cshtml");

        [Route("TicketPage")]
        public IActionResult TicketPage() => View("~/Views/Page/Ticket/TicketPage.cshtml");

        [Route("UserDetails")]
        public IActionResult UserDetails() => View("~/Views/Page/User/UserDetails.cshtml");

        [Route("UserPage")]
        public IActionResult UserPage() => View("~/Views/Page/User/UserPage.cshtml");

        [Route("Tasks")]
        public IActionResult Tasks() => View("~/Views/Page/Tasks/TasksPage.cshtml");

        [Route("TaskDetails")]
        public IActionResult TaskDetails() => View("~/Views/Page/TaskDetails.cshtml");
    }
}
