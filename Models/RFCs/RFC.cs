using HelpDeskNet8.Interfaces.RFCs;
using HelpDeskNet8.Utilities;
using System.Data;

namespace HelpDeskNet8.Models.RFCs
{
    public class RFC : IRFC
    {
        internal IRFC _originalTicket;

        public IRFC GetChanges()
        {
            if (_originalTicket == null) return this;
            return ModelDiff.GetChanges(this, (RFC)_originalTicket);
        }

        // -------------------------  Properties  ------------------------- //

        public int? ChangeRequestID { get; set; }
        public string ChangeRequestOriginator { get; set; }
        public int? LastUpdatedUserID { get; set; }
        public string OriginatorEmail { get; set; }
        public DateTime? ChangeRequestCreateDate { get; set; }
        public string Title { get; set; }
        public DateTime? CloseDate { get; set; }
        public string Status { get; set; }
        public string AssignedTechName { get; set; }
        public string AssignedTechEmail { get; set; }
        public string Priority { get; set; }
        public string Description { get; set; }
        public string Environment { get; set; }
        public string AffectedBusinessSystemsOrServices { get; set; }
        public string AffectedCustomers { get; set; }
        public string BusinessJustification { get; set; }
        public string RiskAssessment { get; set; }
        public string ImpactAnalysis { get; set; }
        public string InformationSecurityConsiderations { get; set; }
        public DateTime? TargetDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public string LastUpdatedBy { get; set; }
        public DateTime? LastUpdateDate { get; set; }
        public string ApprovedBy { get; set; }
        public DateTime? ApprovalDate { get; set; }

        // -------------------------  Data Reader  ------------------------- //

        internal static IRFC? FromReader(IDataReader reader)
        {
            if (reader["ChangeRequestID"] == DBNull.Value) return null;

            RFC newRFC = null;

            try
            {
                newRFC = new RFC
                {
                    ChangeRequestID = reader["ChangeRequestID"] as int?,
                    ChangeRequestOriginator = reader["Change Request Originator"] as string,
                    OriginatorEmail = reader["OriginatorEmail"] as string,
                    ChangeRequestCreateDate = reader["ChangeRequestCreateDate"] as DateTime?,
                    Title = reader["ChangeRequestTitle"] as string,
                    Description = reader["ChangeRequestDescription"] as string,
                    Status = reader["ChangeRequestStatusDesc"] as string,
                    Priority = reader["ChangeRequestPriorityDesc"] as string,
                    Environment = reader["ChangeRequestEnvironmentDesc"] as string,
                    AssignedTechName = reader["AssignedTechName"] as string,
                    AssignedTechEmail = reader["AssignedTechEmail"] as string,
                    LastUpdatedBy = reader["Last Updated By"] as string,
                    LastUpdateDate = reader["LastUpdateDate"] as DateTime?,
                    AffectedBusinessSystemsOrServices = reader["AffectedBusinessSystemsOrServices"] as string,
                    AffectedCustomers = reader["AffectedCustomers"] as string,
                    BusinessJustification = reader["BusinessJustification"] as string,
                    RiskAssessment = reader["RiskAssessment"] as string,
                    ImpactAnalysis = reader["ImpactAnalysis"] as string,
                    InformationSecurityConsiderations = reader["InformationSecurityConsiderations"] as string,
                    TargetDate = reader["TargetDate"] as DateTime?,
                    CompletedDate = reader["CompletedDate"] as DateTime?,
                    ApprovedBy = reader["ApprovedBy"] as string,
                    ApprovalDate = reader["ApprovalDate"] as DateTime?,
                };

                // Store clone for change tracking
                newRFC._originalTicket = (RFC)newRFC.MemberwiseClone();
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(RFC), ex);
            }

            return newRFC;
        }
    }
}
