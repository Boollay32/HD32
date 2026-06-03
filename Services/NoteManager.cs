using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Notes;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Models.Notes;
using HelpDeskNet8.Utilities;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class NoteManager : INoteManager
    {
        private readonly IDbConnection _connection;

        public NoteManager(IDbConnection connection)
        {
            _connection = connection;
        }

        public IEnumerable<INote> GetNotes(IUser user, int ticketID)
        {
            var noteList = new NoteList();

            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandText = "[dbo].[usp_Helpdesk_GetNotesDetail]";
            command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ticketID });
            command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });

            _connection.Open();
            try
            {
                using IDataReader reader = command.ExecuteReader();
                while (reader.Read())
                    noteList.Add((NoteStub)NoteStub.FromReader(reader));
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(NoteManager), ex);
            }
            finally
            {
                _connection.Close();
            }

            return noteList;
        }

        public IEnumerable<INote> GetRFCNotes(IUser user, int rfcID)
        {
            var noteList = new NoteList();

            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandText = "[dbo].[usp_Helpdesk_RFCGetNotesDetail]";
            command.Parameters.Add(new SqlParameter("@ChangeRequestID", SqlDbType.Int) { Value = rfcID });
            command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });

            _connection.Open();
            try
            {
                using IDataReader reader = command.ExecuteReader();
                while (reader.Read())
                    noteList.Add((NoteStub)NoteStub.FromReader(reader));
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(NoteManager), ex);
            }
            finally
            {
                _connection.Close();
            }

            return noteList;
        }

        public SaveResult SaveNote(INote note, IEnumerable<IAttachment> attachments, int? userID, bool rfc, int UTC)
        {
            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandTimeout = 60;

            if (rfc)
            {
                command.CommandText = "[dbo].[usp_Helpdesk_RFCManageNotes]";
                command.Parameters.Add(new SqlParameter("@ChangeRequestID", SqlDbType.Int) { Value = (object)note.RFCID ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestNotesID", SqlDbType.Int) { Value = (object)note.NoteID ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ChangeRequestNotes", SqlDbType.NVarChar) { Value = note.NoteDescription });
                command.Parameters.Add(new SqlParameter("@ChangeRequestNotesUserID", SqlDbType.Int) { Value = (object)userID ?? DBNull.Value });
            }
            else
            {
                command.CommandText = "[dbo].[usp_Helpdesk_Ticket_ManageNotes]";
                command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = (object)note.TicketID ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@NoteID", SqlDbType.Int) { Value = (object)note.NoteID ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@Notes", SqlDbType.NVarChar) { Value = note.NoteDescription });
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = (object)userID ?? DBNull.Value });
            }

            command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });
            command.Parameters.Add(new SqlParameter("@VisibleToClient", SqlDbType.Bit) { Value = (object)note.VisibleToClient ?? DBNull.Value });

            var attachmentList = attachments.ToList();

            for (int i = 1; i <= 5; i++)
            {
                object byteArray = DBNull.Value;
                object info = DBNull.Value;
                object imageType = DBNull.Value;

                int index = i - 1;
                if (index < attachmentList.Count)
                {
                    var attachment = attachmentList[index];

                    if (!string.IsNullOrEmpty(attachment.AttachmentByteArray))
                        byteArray = Convert.FromBase64String(attachment.AttachmentByteArray);

                    if (!string.IsNullOrEmpty(attachment.AttachmentName))
                        info = attachment.AttachmentName;

                    imageType = attachment.AttachmentImageType.ToString();
                }

                command.Parameters.Add(new SqlParameter($"@Attachment{i}", SqlDbType.VarBinary) { Value = byteArray });
                command.Parameters.Add(new SqlParameter($"@Attachment{i}Desc", SqlDbType.NVarChar) { Value = info });
                command.Parameters.Add(new SqlParameter($"@Attachment{i}ImageType", SqlDbType.NVarChar) { Value = imageType });
            }

            _connection.Open();
            try
            {
                command.ExecuteNonQuery();
                bool isUpdate = note.NoteID.HasValue && note.NoteID != 0;
                return isUpdate ? SaveResult.Updated(note.NoteID) : SaveResult.Created(note.NoteID ?? 0);
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(NoteManager), ex);
                return SaveResult.Failed(ex.Message);
            }
            finally
            {
                _connection.Close();
            }
        }
    }
}
