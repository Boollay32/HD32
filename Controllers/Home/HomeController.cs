using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Home
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
