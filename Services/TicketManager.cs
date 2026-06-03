#region HEADER
//  • GovtechHelpDesk
//   └ GovtechHelpDesk.Services
//    └ TicketManager.cs
// 
// Created 17/08/2017 11:14
// Updated 21/08/2017 17:34 by Sam (Sam)
#endregion

using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Tickets;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Models.Tickets;
using HelpDeskNet8.Utilities;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{

    public class TicketManager : ITicketManager
    {       
        private readonly IDbConnection _connection;

        public TicketManager(IDbConnection connection)
        {
            _connection = connection;
        }

        public IEnumerable<ITicketStub> GetTickets(IUser user, IFilter filter, Int32 mytickets, int UTC)
        {
            if (filter == null)
            { filter = new Filter(); }

            var TicketList = new TicketList();

            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandText = "[dbo].[usp_Helpdesk_GetTickets]";

            command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.NVarChar) { Value = user.UserID });
            command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });
            command.Parameters.Add(new SqlParameter("@MyTickets", SqlDbType.Int) { Value = mytickets });
            command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = filter.TicketID });
            command.Parameters.Add(new SqlParameter("@StatusID", SqlDbType.Int) { Value = filter.Status });
            command.Parameters.Add(new SqlParameter("@PriorityID", SqlDbType.Int) { Value = filter.Priority });
            command.Parameters.Add(new SqlParameter("@AssignedTechID", SqlDbType.Int) { Value = int.TryParse(filter.AssignedTechName, out int AssignedTechId) ? AssignedTechId : (object)DBNull.Value });
            command.Parameters.Add(new SqlParameter("@AuthorityID", SqlDbType.Int) { Value = filter.Authority });
            command.Parameters.Add(new SqlParameter("@RequestID", SqlDbType.Int) { Value = filter.RequestType });
            command.Parameters.Add(new SqlParameter("@CreateDate", SqlDbType.DateTime2) { Value = filter.DateFrom });
            command.Parameters.Add(new SqlParameter("@DateTo", SqlDbType.DateTime2) { Value = filter.DateTo });
            command.Parameters.Add(new SqlParameter("@WebCaptureReleaseID", SqlDbType.Int) { Value = filter.WebCaptureReleaseID });
            command.Parameters.Add(new SqlParameter("@Subject", SqlDbType.NVarChar) { Value = filter.Subject });
            command.Parameters.Add(new SqlParameter("@CategoryID", SqlDbType.Int) { Value = filter.Category });

            _connection.Open();
            try
            {
                using IDataReader reader = command.ExecuteReader();
                while (reader.Read())
                {
                    TicketList.Add(TicketStub.FromReader(reader));
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[{GetType().Name}] {ex.Message}");
            }
            finally
            {
                _connection.Close();
            }

            return TicketList;
        }

        public int GetRequestID(int ID, IUser user)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_GetRequestID]";

                command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ID });
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.NVarChar) { Value = user.UserID });

                _connection.Open();

                var RequestID = command.ExecuteScalar();

                _connection.Close();

                return Convert.ToInt32(RequestID);
            }
        }

        public ITicket GetTicketDetail(int ID, IUser user)
        {
            try
            {
                using (IDbCommand command = _connection.CreateCommand())
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandText = "[dbo].[usp_Helpdesk_GetTicketDetail]";

                    command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ID });
                    command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.NVarChar) { Value = user.UserID });

                    _connection.Open();

                    ITicket ticket = null;
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            ticket = Ticket.FromReader(reader);
                        }
                    }

                    _connection.Close();
                    return ticket;
                }
            }

            catch (Exception EX)
            {
                _connection.Close();

                return null;
            }
        }

        public SaveResult SaveTicket(ITicket ticket, IUser user, int UTC, bool FalseReply, int emailSent, int visibleToClient = 1, DateTime? closeDate = null)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;

                // Fix: track intent with bool — not string comparison later
                bool isUpdate = ticket.TicketID != null;

                if (isUpdate)
                {
                    command.CommandText = "[dbo].[usp_Helpdesk_UpdateTicket]";
                    command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ticket.TicketID });
                    command.Parameters.Add(new SqlParameter("@Notes", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.Notes) });
                    command.Parameters.Add(new SqlParameter("@VisibleToClient", SqlDbType.Int) { Value = visibleToClient });
                    command.Parameters.Add(new SqlParameter("@IssueTypeDesc", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.IssueTypeDesc) });
                    command.Parameters.Add(new SqlParameter("@AuthorityDesc", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.AuthorityName) });
                    command.Parameters.Add(new SqlParameter("@StatusID", SqlDbType.Int) { Value = ToSqlValue(ticket.Status) });
                    command.Parameters.Add(new SqlParameter("@PriorityID", SqlDbType.Int) { Value = ToSqlValue(ticket.Priority) });
                    command.Parameters.Add(new SqlParameter("@CategoryID", SqlDbType.Int) { Value = ToSqlValue(ticket.Category) });
                    command.Parameters.Add(new SqlParameter("@Notify", SqlDbType.Bit)
                    {
                        Value = FalseReply ? false : ticket.Notify
                    });
                    command.Parameters.Add(new SqlParameter("@NotifyTech", SqlDbType.Bit)
                    {
                        // FalseReply clears both directions
                        Value = FalseReply ? false : (ticket.NotifyTech ?? false)
                    });
                }
                else
                {
                    command.CommandText = "[dbo].[usp_Helpdesk_WriteNewTicket]";
                    command.Parameters.Add(new SqlParameter("@AuthorityID", SqlDbType.NVarChar) { Value = user.AuthorityID });
                    command.Parameters.Add(new SqlParameter("@StatusID", SqlDbType.Int) { Value = Constants.TicketDefaults.StatusId });
                    command.Parameters.Add(new SqlParameter("@PriorityID", SqlDbType.Int) { Value = Constants.TicketDefaults.PriorityId });
                    command.Parameters.Add(new SqlParameter("@CategoryID", SqlDbType.Int) { Value = Constants.TicketDefaults.CategoryId });
                    command.Parameters.Add(new SqlParameter("@RequestID", SqlDbType.Int) { Value = Convert.ToInt32(ticket.RequestType) });
                    command.Parameters.Add(new SqlParameter("@CustomfieldsConfigDesc", SqlDbType.NVarChar) { Value = DBNull.Value });

                    bool notifyUser = user.AuthorityID == Constants.Authority.Govtech ||
                                      ticket.UserName != Convert.ToString(user.UserID);

                    command.Parameters.Add(new SqlParameter("@Notify", SqlDbType.Bit)
                    {
                        Value = notifyUser
                    });
                    command.Parameters.Add(new SqlParameter("@NotifyTech", SqlDbType.Bit)
                    {
                        Value = ticket.NotifyTech ?? false
                    });
                }



                // Shared parameters
                command.Parameters.Add(new SqlParameter("@Subject", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.Subject) });
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });
                command.Parameters.Add(new SqlParameter("@SubmissionDate", SqlDbType.DateTime) { Value = ticket.SubmissionDate ?? DateTime.Now });
                command.Parameters.Add(new SqlParameter("@AssignedTechID", SqlDbType.Int) { Value = ToSqlValue(ticket.AssignedTechID) });
                command.Parameters.Add(new SqlParameter("@RequestDetail", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.RequestDetail) });
                command.Parameters.Add(new SqlParameter("@TicketTypeID", SqlDbType.Int) { Value = ToSqlValue(ticket.TicketTypeID) });

                // Customer/Form
                command.Parameters.Add(new SqlParameter("@Customer", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.Customer) });
                command.Parameters.Add(new SqlParameter("@CustomerSurname", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.CustomerSurname) });
                command.Parameters.Add(new SqlParameter("@FormReference", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.FormReference) });
                command.Parameters.Add(new SqlParameter("@PropertyAddress", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.PropertyAddress) });
                command.Parameters.Add(new SqlParameter("@DocumentManagementSystemID", SqlDbType.Int) { Value = ToSqlValue(ticket.DocumentManagementSystemID) });
                command.Parameters.Add(new SqlParameter("@RevenuesFormTypeID", SqlDbType.Int) { Value = ToSqlValue(ticket.RevenuesFormTypeID) });
                command.Parameters.Add(new SqlParameter("@RevenuesReference", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.RevenuesReference) });
                command.Parameters.Add(new SqlParameter("@FormProviderID", SqlDbType.Int) { Value = ToSqlValue(ticket.FormProviderID) });

                // Claims
                command.Parameters.Add(new SqlParameter("@ClaimantSurname", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.ClaimantSurname) });
                command.Parameters.Add(new SqlParameter("@ClaimReference", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.ClaimReference) });
                command.Parameters.Add(new SqlParameter("@ClaimDate", SqlDbType.DateTime) { Value = ToSqlValue(ticket.ClaimDate) });
                command.Parameters.Add(new SqlParameter("@NINO", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.NINO) });

                // Dates
                command.Parameters.Add(new SqlParameter("@EstimatedCompletionDate", SqlDbType.DateTime) { Value = ToSqlValue(ticket.EstimatedCompletionDate) });
                command.Parameters.Add(new SqlParameter("@TargetDate", SqlDbType.DateTime) { Value = ToSqlValue(ticket.TargetDate) });
                command.Parameters.Add(new SqlParameter("@IncidentStartDate", SqlDbType.DateTime) { Value = ToSqlValue(ticket.IncidentStartDate) });
                command.Parameters.Add(new SqlParameter("@CompleteDate", SqlDbType.DateTime) { Value = ToSqlValue(ticket.CompleteDate) });

                // Additional
                command.Parameters.Add(new SqlParameter("@BusinessImpact", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.BusinessImpact) });
                command.Parameters.Add(new SqlParameter("@RaisedBy", SqlDbType.Int) { Value = ToSqlValue(ticket.RaisedBy) });
                command.Parameters.Add(new SqlParameter("@webCaptureBENsProcessDesc", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.WebCaptureBENsProcess) });
                command.Parameters.Add(new SqlParameter("@ResourceRequired", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.ResourceRequired) });
                command.Parameters.Add(new SqlParameter("@CallNumber", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.CallNumber) });

                // WebCapture
                command.Parameters.Add(new SqlParameter("@webCaptureReleaseID", SqlDbType.Int) { Value = ToSqlValue(ticket.WebCaptureReleaseID) });
                command.Parameters.Add(new SqlParameter("@webCaptureTypeID", SqlDbType.Int) { Value = ToSqlValue(ticket.WebCaptureTypeID) });
                command.Parameters.Add(new SqlParameter("@webCaptureStatusID", SqlDbType.Int) { Value = ToSqlValue(ticket.WebCaptureStatusID) });
                command.Parameters.Add(new SqlParameter("@DateAssignedToRelease", SqlDbType.DateTime) { Value = ToSqlValue(ticket.DateAssignedtoRelease) });
                command.Parameters.Add(new SqlParameter("@ReleasePriorityID", SqlDbType.Int) { Value = ToSqlValue(ticket.ReleasePriorityID) });
                command.Parameters.Add(new SqlParameter("@eCaptureReleaseID", SqlDbType.Int) { Value = ToSqlValue(ticket.eCaptureReleaseID) });
                command.Parameters.Add(new SqlParameter("@eCaptureCRTypeID", SqlDbType.Int) { Value = ToSqlValue(ticket.eCaptureCRTypeID) });
                command.Parameters.Add(new SqlParameter("@webCaptureImpact", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.WebCaptureImpact) });
                command.Parameters.Add(new SqlParameter("@eCaptureStatusID", SqlDbType.Int) { Value = ToSqlValue(ticket.eCaptureStatusID) });
                command.Parameters.Add(new SqlParameter("@webCaptureBENsProcess", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.WebCaptureBENsProcess) });
                command.Parameters.Add(new SqlParameter("@webCaptureREVsProcess", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.WebCaptureREVsProcess) });
                command.Parameters.Add(new SqlParameter("@eCaptureCategory", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.eCaptureCategory) });

                // Project
                command.Parameters.Add(new SqlParameter("@ProjectName", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.ProjectName) });
                command.Parameters.Add(new SqlParameter("@ProjectTypeID", SqlDbType.Int) { Value = ToSqlValue(ticket.ProjectTypeID) });

                // System
                command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });
                command.Parameters.Add(new SqlParameter("@EmailCC", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.EmailCC) });
                command.Parameters.Add(new SqlParameter("@FileName", SqlDbType.NVarChar) { Value = ToSqlValue(ticket.FileName) });

                _connection.Open();
                try
                {
                    if (isUpdate)
                    {
                        command.ExecuteNonQuery();
                        return SaveResult.Updated(ticket.TicketID);
                    }
                    else
                    {
                        int newTicketID = (int)command.ExecuteScalar();
                        return SaveResult.Created(newTicketID);
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(TicketManager), ex);
                    return SaveResult.Failed("An error occurred saving the ticket.");
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }
        }

        private object ToSqlValue(int? value)
        {
            return value.HasValue && value.Value != 0 ? (object)value.Value : DBNull.Value;
        }

        private object ToSqlValue(string value)
        {
            return !string.IsNullOrWhiteSpace(value) ? (object)value : DBNull.Value;
        }

        private object ToSqlValue(DateTime? value)
        {
            return value.HasValue && value.Value != DateTime.MinValue ? (object)value.Value : DBNull.Value;
        }

        public void UpdateLoginMessage(int UserID, string Message, int UTC)
        {
            try
            {
                using (IDbCommand command = _connection.CreateCommand())
                {
                    command.CommandType = CommandType.StoredProcedure;

                    command.CommandText = "[dbo].[usp_Helpdesk_AddSystemMessage]";
                    command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = UserID });
                    command.Parameters.Add(new SqlParameter("@messageText", SqlDbType.NVarChar) { Value = Message });
                    command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });

                    _connection.Open();
                    command.ExecuteNonQuery();
                    _connection.Close();

                    return;
                }
            }
            catch (Exception EX)
            {

                Console.WriteLine(EX);
                _connection.Close();
                return;
            }
        }

        public DataTable GetStats(int ID, IUser user)
        {
            try
            {
                DataTable StatsTable = new DataTable();

                using (IDbCommand command = _connection.CreateCommand())
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandText = "[dbo].[usp_Helpdesk_GetTicketDetail]";

                    command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ID });
                    command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });

                    _connection.Open();

                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            StatsTable.Load(command.ExecuteReader());
                        }
                    }
                    _connection.Close();
                    return StatsTable;
                }
            }

            catch (Exception ex)
            {
                Console.Error.WriteLine($"[{GetType().Name}] {ex.Message}");
            }
            finally
            {
                _connection.Close();
            }

            return null;
        }
    }
}

