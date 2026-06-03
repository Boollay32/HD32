using HelpDeskNet8.Interfaces.Shared;

namespace HelpDeskNet8.Models.Shared
{
    public class Filter : IFilter
    {
        public int? MySearch { get; set; }
        public int? TicketID { get; set; }
        public int? TaskID { get; set; }
        public int? RFCID { get; set; }
        public int? Status { get; set; }
        public int? Priority { get; set; }
        public int? Category { get; set; }
        public string AssignedTechName { get; set; }
        public string Title { get; set; }
        public string CreatedByTech { get; set; }
        public int? RequestType { get; set; }
        public int? Important { get; set; }
        public int? CreateDate { get; set; }
        public int? RequiredByDate { get; set; }
        
        public int? CompletionDate { get; set; }
        
        public DateTime? DateFrom { get; set; }
        
        public DateTime? DateTo { get; set; }
        
        public int? UserID { get; set; }
        
        public string UserFirstName { get; set; }
        
        public string UserLastName { get; set; }
        
        public int? Authority { get; set; }
        
        public int? DepartmentID { get; set; }
        
        public int? Locked { get; set; }
        
        public int? Deactivated { get; set; }
        
        public string UserEmail { get; set; }
        
        public string UserSecondaryEmail { get; set; }
        
        public string UserName { get; set; }
        
        public string UserPhone { get; set; }
        
        public string UserLogin { get; set; }
        
        public string AuthenticationToken { get; set; }
        
        public DateTime ExpiryTime { get; set; }
        
        public string Subject { get; set; }
        
        public int? WebCaptureReleaseID { get; set; }

    }
}