namespace HelpDeskNet8.Interfaces.RFCs
{
    public interface IRFC
    {
        int? ChangeRequestID { get; set; }
        String Title { get; set; }
        string Status { get; set; }
        int? LastUpdatedUserID { get; set; }
        DateTime? ChangeRequestCreateDate { get; set; }
        String ChangeRequestOriginator { get; set; }
        String OriginatorEmail { get; set; }
        String AssignedTechName { get; set; }
        String AssignedTechEmail { get; set; }
        string Priority { get; set; }
        String Description { get; set; }
        String Environment { get; set; }
        String AffectedBusinessSystemsOrServices { get; set; }
        String AffectedCustomers { get; set; }
        String BusinessJustification { get; set; }
        String RiskAssessment { get; set; }
        String ImpactAnalysis { get; set; }
        String InformationSecurityConsiderations { get; set; }
        DateTime? TargetDate { get; set; }
        DateTime? CompletedDate { get; set; }
        string ApprovedBy { get; set; }
        DateTime? ApprovalDate { get; set; }
        IRFC GetChanges();
    }
}