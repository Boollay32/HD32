using HelpDeskNet8.Interfaces.Tickets;
using HelpDeskNet8.Utilities;
using System.Data;

namespace HelpDeskNet8.Models.Tickets
{
    public class Ticket : ITicket
    {
        internal ITicket _originalTicket;

        // -------------------------  Change Detection  ------------------------- //

        public ITicket GetChanges()
        {
            if (_originalTicket == null) return this;
            return ModelDiff.GetChanges(this, (Ticket)_originalTicket);
        }

        // -------------------------  Properties  ------------------------- //

        public int? TicketID { get; set; }
        public DateTime? Created { get; set; }
        public DateTime? CloseDate { get; set; }
        public DateTime? FirstResponseDate { get; set; }
        public string Department { get; set; }
        public string Subject { get; set; }
        public DateTime? Updated { get; set; }
        public string RequestType { get; set; }
        public int? RequestID { get; set; }
        public string RequestDescription { get; set; }
        public string RequestDetail { get; set; }
        public string Notes { get; set; }
        public DateTime? NotesDate { get; set; }
        public string RaisedBy { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string Authority { get; set; }
        public int? UserAuthorityID { get; set; }
        public string Priority { get; set; }
        public int? Category { get; set; }
        public string AssignedTech { get; set; }
        public bool? Notify { get; set; }
        public bool? NotifyTech { get; set; }
        public int? TicketTypeID { get; set; }
        public string Customer { get; set; }
        public string CallNumber { get; set; }
        public string RevenuesReference { get; set; }
        public DateTime? SubmissionDate { get; set; }
        public string FormReference { get; set; }
        public string PropertyAddress { get; set; }
        public string CustomerSurname { get; set; }
        public int? DocumentManagementSystemID { get; set; }
        public int? RevenuesFormTypeID { get; set; }
        public int? FormProviderID { get; set; }
        public string ClaimantSurname { get; set; }
        public string ClaimReference { get; set; }
        public DateTime? ClaimDate { get; set; }
        public string NINO { get; set; }
        public DateTime? EstimatedCompletionDate { get; set; }
        public string Status { get; set; }
        public string StatusDesc { get; set; }
        public string AlertLevel { get; set; }
        public int? AssignedTechID { get; set; }          // ← renamed from AssignedTechName
        public string AssignedTechEmail { get; set; }
        public string AuthorityName { get; set; }
        public string IssueTypeDesc { get; set; }
        public string ResourceRequired { get; set; }
        public string WebCaptureImpact { get; set; }
        public DateTime? DateAssignedtoRelease { get; set; }
        public int? WebCaptureReleaseID { get; set; }
        public int? WebCaptureTypeID { get; set; }
        public int? WebCaptureStatusID { get; set; }
        public int? ReleasePriorityID { get; set; }
        public int? eCaptureCRTypeID { get; set; }
        public int? eCaptureReleaseID { get; set; }
        public int? eCaptureStatusID { get; set; }
        public string WebCaptureBENsProcess { get; set; } // ← removed WebCAPTUREBensProcess duplicate
        public string WebCaptureREVsProcess { get; set; }
        public string eCaptureCategory { get; set; }
        public int? ProjectTypeID { get; set; }
        public string ProjectName { get; set; }
        public string EmailCC { get; set; }
        public string FileName { get; set; }
        public DateTime? TargetDate { get; set; }
        public DateTime? CompleteDate { get; set; }
        public string BusinessImpact { get; set; }
        public DateTime? IncidentStartDate { get; set; }

        // -------------------------  Data Reader  ------------------------- //

        internal static ITicket? FromReader(IDataReader reader)
        {
            if (reader["TicketID"] == DBNull.Value) return null;

            Ticket newTicket = null;

            try
            {
                newTicket = new Ticket
                {
                    TicketID = (int)reader["TicketID"],
                    Created = reader["Open Date"] as DateTime?,
                    FirstResponseDate = reader["First Response Date"] as DateTime?,
                    CloseDate = reader["Close Date"] as DateTime?,
                    Updated = reader["Last updated"] as DateTime?,
                    RequestID = reader["RequestID"] as int?,
                    RequestType = reader["RequestDesc"] as string,
                    RequestDetail = reader["RequestDetail"] as string,
                    Department = reader["departmentDesc"] as string,
                    Notes = reader["Notes"] as string,
                    RaisedBy = reader["RaisedBy"] as string,
                    Subject = reader["Subject"] as string,
                    UserName = reader["Client"] as string,
                    Email = reader["Email"] as string,
                    Priority = Convert.ToString(reader["PriorityID"]),
                    Category = reader["CategoryID"] as int?,
                    TicketTypeID = reader["TicketTypeID"] as int?,
                    Customer = reader["Customer"] as string,
                    CallNumber = reader["CallNumber"] as string,
                    RevenuesReference = reader["RevenuesReference"] as string,
                    SubmissionDate = reader["SubmissionDate"] as DateTime?,
                    FormReference = reader["FormReference"] as string,
                    PropertyAddress = reader["PropertyAddress"] as string,
                    CustomerSurname = reader["CustomerSurname"] as string,
                    DocumentManagementSystemID = reader["DocumentManagementSystemID"] as int?,
                    RevenuesFormTypeID = reader["RevenuesFormTypeID"] as int?,
                    FormProviderID = reader["FormProviderID"] as int?,
                    ClaimantSurname = reader["ClaimantSurname"] as string,
                    ClaimReference = reader["ClaimReference"] as string,
                    ClaimDate = reader["ClaimDate"] as DateTime?,
                    NINO = reader["NINO"] as string,
                    EstimatedCompletionDate = reader["EstimatedCompletionDate"] as DateTime?,
                    Status = Convert.ToString(reader["statusID"]),
                    AssignedTechID = reader["AssignedTechID"] as int?,
                    AssignedTechEmail = reader["AssignedTechEmail"] as string,
                    AuthorityName = reader["AuthorityName"] as string,
                    ResourceRequired = reader["ResourceRequired"] as string,
                    WebCaptureImpact = reader["webCaptureImpact"] as string,
                    DateAssignedtoRelease = reader["DateAssignedtoRelease"] as DateTime?,
                    WebCaptureReleaseID = reader["webCaptureReleaseID"] as int?,
                    WebCaptureTypeID = reader["WebCaptureTypeID"] as int?,
                    WebCaptureStatusID = reader["webCaptureStatusID"] as int?,
                    ReleasePriorityID = reader["ReleasePriorityID"] as int?,
                    eCaptureCRTypeID = reader["eCaptureCRTypeID"] as int?,
                    eCaptureReleaseID = reader["eCaptureReleaseID"] as int?,
                    eCaptureStatusID = reader["eCaptureStatusID"] as int?,
                    WebCaptureBENsProcess = reader["webCaptureBENsProcess"] as string,
                    WebCaptureREVsProcess = reader["webCaptureREVsProcess"] as string,
                    eCaptureCategory = reader["ECaptureCategory"] as string,
                    ProjectName = reader["ProjectName"] as string,
                    ProjectTypeID = reader["ProjectTypeID"] as int?,
                    EmailCC = reader["EmailCC"] as string,
                    FileName = reader["FileName"] as string,
                    TargetDate = reader["TargetDate"] as DateTime?,
                    CompleteDate = reader["CompleteDate"] as DateTime?,
                    IncidentStartDate = reader["IncidentStartDate"] as DateTime?,
                    BusinessImpact = reader["BusinessImpact"] as string,
                    Notify = reader["Notify"] as bool?,
                    NotifyTech = reader["NotifyTech"] as bool?,
                };

                newTicket._originalTicket = (Ticket)newTicket.MemberwiseClone();
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(Ticket), ex);
            }

            return newTicket;
        }
    }
}
