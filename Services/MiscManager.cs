#region HEADER
//  • GovtechHelpDesk
//   └ GovtechHelpDesk.Services
//    └ TicketManager.cs
// 
// Created 17/08/2017 11:14
// Updated 21/08/2017 17:34 by Sam (Sam)
#endregion

using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Net.Mail;


namespace HelpDeskNet8.Services
{
    public class MiscManager : IMiscManager
    {
        private readonly IDbConnection _connection;
        public MiscManager(IDbConnection connection)
        {
            _connection = connection;
        }

        public int GetRequestID(int ID, IUser user)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_GetRequestID]";
                command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = ID });
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });

                _connection.Open();

                var RequestID = command.ExecuteScalar();

                _connection.Close();

                return Convert.ToInt32(RequestID);
            }
        }

        public DataTable GetFilterItems(String Group)
        {

            DataTable FilterTable = new DataTable();
            try
            {
                using (IDbCommand command = _connection.CreateCommand())
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandText = "[dbo].[usp_Helpdesk_GetFilter]";
                    command.Parameters.Add(new SqlParameter("@FilterGroup", SqlDbType.NVarChar) { Value = Group });

                    _connection.Open();

                    FilterTable.Load(command.ExecuteReader());

                    _connection.Close();
                    return FilterTable;
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

        public bool SubmitFAQ(int UserID, String Question, int UTC)
        {
            try
            {
                using (IDbCommand command = _connection.CreateCommand())
                {
                    command.CommandType = CommandType.StoredProcedure;

                    command.CommandText = "[dbo].[usp_Helpdesk_CollectFAQs]";
                    command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = UserID });
                    command.Parameters.Add(new SqlParameter("@Question", SqlDbType.NVarChar) { Value = Question });
                    command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });

                    _connection.Open();

                    int rowsupdated = command.ExecuteNonQuery();

                    _connection.Close();

                    return (rowsupdated == 1);
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

            return false;
        }

        public List<Object> SendMailMessage(string from, string[] recepients, string subject, string body)
        {
            // Instantiate a new instance of MailMessage
            MailMessage mMailMessage = new MailMessage();

            // Set the sender address of the mail message
            mMailMessage.From = new MailAddress(from);

            foreach (string recepient in recepients)
            {
                // Set the recepient address of the mail message
                mMailMessage.To.Add(new MailAddress(recepient));
            }

            // Set the subject of the mail message
            mMailMessage.Subject = subject;
            // Set the body of the mail message
            mMailMessage.Body = body;

            // Set the format of the mail message body as HTML
            mMailMessage.IsBodyHtml = true;
            // Set the priority of the mail message to normal
            mMailMessage.Priority = MailPriority.Normal;

            // Instantiate a new instance of SmtpClient
            SmtpClient mSmtpClient = new SmtpClient();
            mSmtpClient.EnableSsl = true;
            mSmtpClient.Host = "smtp.office365.com";
            mSmtpClient.UseDefaultCredentials = false;
            mSmtpClient.Port = 587;
            //Attachment att = new Attachment(new MemoryStream(myBytes), name);

            mSmtpClient.Credentials = new System.Net.NetworkCredential(Environment.GetEnvironmentVariable("EmailSenderAddress"), Environment.GetEnvironmentVariable("EmailSenderPassword"), "govtech.co.uk");

            // Send the mail message
            List<Object> Result = new List<Object>();
            Exception Exeption = null;
            try
            {
                mSmtpClient.Send(mMailMessage);
                Result.Add("Success");
                Result.Add("Email Sent");

            }
            catch (Exception EX) { Exeption = EX; }
            {
                if (Exeption == null)
                {
                    return Result;
                }

                Result.Clear();
                _connection.Close();
                Result.Add("Error");
                Result.Add(Exeption);
            }

            return Result;
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

    }
}
