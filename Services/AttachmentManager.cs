using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Attachments;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class AttachmentManager : IAttachmentManager
    {
        private readonly IDbConnection _connection;

        public AttachmentManager(IDbConnection connection)
        {
            _connection = connection;
        }

        public IEnumerable<IAttachment> GetAttachmentsNotes(IUser user, int ticketID, int rfc)
        {
            var attachments = new AttachmentList();

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;

                if (rfc == 1)
                {
                    command.CommandText = "[dbo].[usp_Helpdesk_RFCGetAttachments]";
                    command.Parameters.Add(new SqlParameter("@ChangeRequestID", SqlDbType.Int) { Value = ticketID });
                }
                else
                {
                    command.CommandText = "[dbo].[usp_Helpdesk_GetAttachmentsNotes]";
                    command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });
                    command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ticketID });
                }

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                            attachments.Add((AttachmentStub)AttachmentStub.FromReader(reader));
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
            }

            return attachments;
        }

        public IEnumerable<IAttachment> GetAttachmentsTasks(IUser user, int ticketID)
        {
            var attachments = new AttachmentList();

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_GetAttachmentsTasks]";
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });
                command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ticketID });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                            attachments.Add((AttachmentStub)AttachmentStub.FromReader(reader));
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
            }

            return attachments;
        }
    }
}
