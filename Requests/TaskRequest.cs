using HelpDeskNet8.Interfaces.Attachments;

namespace HelpDeskNet8.Requests
{
    public class GetTasksRequest : AuthenticatedRequest
    {
        public Dictionary<string, string> Filters { get; set; }
    }

    public class GetTaskDetailRequest : AuthenticatedRequest
    {
        public int TaskId { get; set; }
    }

    public class SaveTaskRequest : AuthenticatedRequest
    {
        public string ObjectInfo { get; set; }
        public IEnumerable<IAttachment> Attachments { get; set; } = Enumerable.Empty<IAttachment>();
    }
}
