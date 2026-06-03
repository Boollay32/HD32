using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Shared;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class HistoryManager : List<HistoryListItem>, IHistory
    {

        private readonly IDbConnection _connection;

        public HistoryManager(IDbConnection connection)
        {
            _connection = connection;
        }

        public object GetHistory(IUser user, int TicketID)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;

                command.CommandText = "[dbo].[usp_Helpdesk_GetHistoryDetail]";
                command.Parameters.Add(new SqlParameter("@TicketID", SqlDbType.Int) { Value = TicketID });
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {

                        this.Clear();

                        while (reader.Read())
                        {
                            var newitem = HistoryListItem.FromReader(reader);
                            if (newitem != null)
                            {
                                this.Add(newitem);
                            }
                        }
                    }
                    _connection.Close();
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

            return this;
        }

    }
}
