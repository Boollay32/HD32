using HelpDeskNet8.Requests;

namespace HelpDeskNet8.Requests
{
    public class GetHistoryRequest : AuthenticatedRequest
    {
        public int TicketId { get; set; }
    }
}
