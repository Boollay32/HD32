using HelpDeskNet8.Interfaces.Attachments;

namespace HelpDeskNet8.Interfaces.Tasks
{
    public interface ITask
    {
        int? TaskID { get; set; }
        int? TicketID { get; set; }
        int? UserID { get; set; }
        string Title { get; set; }
        string Description { get; set; }
        string ProgressLog { get; set; }
        string AssignedTech { get; set; }
        int? Status { get; set; }
        bool? Important { get; set; }
        DateTime? RequiredDate { get; set; }
        DateTime? Created { get; set; }
        DateTime? Completed { get; set; }
        IEnumerable<IAttachment> Attachments { get; set; }
    }
}
