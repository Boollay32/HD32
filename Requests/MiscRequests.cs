using HelpDeskNet8.Requests;

namespace HelpDeskNet8.Requests
{
    public class GetRequestIdRequest : AuthenticatedRequest
    {
        public int TicketId { get; set; }
    }

    public class GetFilterItemsRequest : AuthenticatedRequest
    {
        public string Group { get; set; }
    }

    public class GetDropDownListRequest : AuthenticatedRequest
    {
        public int Filter { get; set; }
        public string Group { get; set; }
    }


    public class UpdateLoginMessageRequest : AuthenticatedRequest
    {
        public int UserId { get; set; }
        public string Message { get; set; }
    }

    public class SendMailMessageRequest : AuthenticatedRequest
    {
        public string To { get; set; }
        public string From { get; set; }
        public string Subject { get; set; }
        public string Body { get; set; }
    }

    public class OrderListRequest : AuthenticatedRequest
    {
        public string ColumnToOrderBy { get; set; }
        public string OrderType { get; set; }
        public List<string> Columns { get; set; }
        public List<Dictionary<string, string>> Rows { get; set; }
    }
}
