namespace HelpDeskNet8.Requests
{
    public class GetStatsRequest : AuthenticatedRequest
    {
        public int StatsId { get; set; }
    }
}
