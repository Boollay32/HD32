using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Models.Shared;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class ReportManager : List<ReportListItem>, IReports
    {
        private readonly IDbConnection _connection;

        public ReportManager(IDbConnection connection)
        {
            _connection = connection;
        }

        public object DownloadReport()
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_RptWebCaptures]";

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        this.Clear();

                        while (reader.Read())
                        {
                            var newitem = ReportListItem.FromReader(reader);
                            if (newitem != null)
                            {
                                this.Add(newitem);
                            }
                        }
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

            return this;
        }

        public DataTable GetStats(Int32 StatsID)
        {
            try
            {
                DataTable StatsTable = new DataTable();

                using (IDbCommand command = _connection.CreateCommand())
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandText = "[dbo].[usp_Helpdesk_TicketStats]";
                    command.Parameters.Add(new SqlParameter("@ReportNo", SqlDbType.Int) { Value = StatsID });
                    _connection.Open();

                    StatsTable.Load(command.ExecuteReader());

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