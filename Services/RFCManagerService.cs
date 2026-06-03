using HelpDeskNet8.Interfaces.RFCs;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Models.RFCs;
using HelpDeskNet8.Models.Shared;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class RFCManager(IDbConnection connection) : IRFCManager
    {
        private readonly IDbConnection _connection = connection;

        public IEnumerable<IRFCStub> GetChangeRequest(int? CRUserID, IFilter filter)
        {
            if (filter == null)
                filter = new Filter();

            var RFCList = new RFCListItem();

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_RFCGet]";

                command.Parameters.Add(new SqlParameter("@ChangeRequestUserID", SqlDbType.Int) { Value = CRUserID ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestID", SqlDbType.Int) { Value = filter.RFCID ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestTitle", SqlDbType.NVarChar) { Value = filter.Title ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestAssignedTo", SqlDbType.NVarChar) { Value = filter.AssignedTechName ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestCreatedBy", SqlDbType.NVarChar) { Value = filter.CreatedByTech ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestCreateDate", SqlDbType.DateTime) { Value = filter.CreateDate ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestCreateDateTo", SqlDbType.DateTime) { Value = filter.DateTo ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestStatusID", SqlDbType.NVarChar) { Value = filter.Status ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestPriorityID", SqlDbType.NVarChar) { Value = filter.Priority ?? (object)DBNull.Value });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            RFCList.Add(RFCStub.FromReader(reader));
                        }
                    }
                    return RFCList;
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[{GetType().Name}] {ex.Message}");
                    return null;
                }
                finally
                {
                    _connection.Close();
                }
            }
        }

        public IRFC GetChangeRequestDetail(int? RFCID)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_RFCGetDetail]";
                command.Parameters.Add(new SqlParameter("@ChangeRequestID", SqlDbType.Int) { Value = RFCID ?? (object)DBNull.Value });

                _connection.Open();
                try
                {
                    IRFC rfc = null;
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                            rfc = RFC.FromReader(reader);
                    }
                    return rfc;
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[{GetType().Name}] {ex.Message}");
                    return null;
                }
                finally
                {
                    _connection.Close();
                }
            }
        }

        public List<object> SaveChangeRequest(int UserID, IRFC rfc, int UTC)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_RFCManage]";

                command.Parameters.Add(new SqlParameter("@ChangeRequestID", SqlDbType.Int) { Value = rfc.ChangeRequestID });
                command.Parameters.Add(new SqlParameter("@ChangeRequestUserID", SqlDbType.Int) { Value = UserID });
                command.Parameters.Add(new SqlParameter("@ChangeRequestTitle", SqlDbType.NVarChar) { Value = rfc.Title ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@AssignedToUserID", SqlDbType.Int) { Value = rfc.AssignedTechName ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestDescription", SqlDbType.NVarChar) { Value = rfc.Description ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestPriorityID", SqlDbType.Int) { Value = rfc.Priority });
                command.Parameters.Add(new SqlParameter("@ChangeRequestEnvironmentID", SqlDbType.Int) { Value = rfc.Environment });
                command.Parameters.Add(new SqlParameter("@ChangeRequestStatusID", SqlDbType.Int) { Value = rfc.Status });
                command.Parameters.Add(new SqlParameter("@AffectedBusinessSystemsOrServices", SqlDbType.NVarChar) { Value = rfc.AffectedBusinessSystemsOrServices ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@AffectedCustomers", SqlDbType.NVarChar) { Value = rfc.AffectedCustomers ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@BusinessJustification", SqlDbType.NVarChar) { Value = rfc.BusinessJustification ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@RiskAssessment", SqlDbType.NVarChar) { Value = rfc.RiskAssessment ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ImpactAnalysis", SqlDbType.NVarChar) { Value = rfc.ImpactAnalysis ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@InformationSecurityConsiderations", SqlDbType.NVarChar) { Value = rfc.InformationSecurityConsiderations ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@TargetDate", SqlDbType.DateTime) { Value = rfc.TargetDate ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });
                command.Parameters.Add(new SqlParameter("@CompletedDate", SqlDbType.DateTime) { Value = rfc.CompletedDate ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ApprovedBy", SqlDbType.NVarChar) { Value = rfc.ApprovedBy ?? (object)DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ApprovalDate", SqlDbType.DateTime) { Value = rfc.ApprovalDate ?? (object)DBNull.Value });

                _connection.Open();
                var result = new List<Object>();
                try
                {
                    if (rfc.ChangeRequestID != 0)
                    {
                        command.ExecuteNonQuery();
                        result.Add("Update");
                        result.Add(rfc.ChangeRequestID);
                    }
                    else
                    {
                        int newRFCID = (int)command.ExecuteScalar();
                        result.Add("Created");
                        result.Add(newRFCID);
                    }
                }
                catch (Exception ex)
                {
                    result.Add("Error");
                    result.Add(ex);
                }
                finally
                {
                    _connection.Close();
                }
                return result;
            }
        }
    }
}
