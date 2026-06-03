namespace HelpDeskNet8.Interfaces.Shared
{
    public interface IFilter
    {
        int? MySearch { get; set; }
        int? TicketID { get; set; }
        int? TaskID { get; set; }
        int? RFCID { get; set; }
        int? Status { get; set; }
        int? Priority { get; set; }
        int? Category { get; set; }
        string AssignedTechName { get; set; }
        string Title { get; set; }
        string CreatedByTech { get; set; }
        int? RequestType { get; set; }
        int? Important { get; set; }
        int? CreateDate { get; set; }
        int? RequiredByDate { get; set; }
        int? CompletionDate { get; set; }
        DateTime? DateTo { get; set; }
        DateTime? DateFrom { get; set; }
        int? UserID { get; set; }
        string UserFirstName { get; set; }
        string UserLastName { get; set; }
        int? Authority { get; set; }
        int? DepartmentID { get; set; }
        int? Locked { get; set; }
        int? Deactivated { get; set; }
        string UserEmail { get; set; }
        string UserSecondaryEmail { get; set; }
        string UserName { get; set; }
        string UserPhone { get; set; }
        string UserLogin { get; set; }
        string Subject { get; set; }
        int? WebCaptureReleaseID { get; set; }
    }
}