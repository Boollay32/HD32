using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Shared;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class DropdownManager : List<DropdownListItem>, IDropdowns
    {

        private readonly IDbConnection _connection;

        public DropdownManager(IDbConnection connection)
        {
            _connection = connection;
        }


        public IEnumerable<DropdownListItem> GetDropDowns(IUser user, int Filter, string Group)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_References_1]";
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });
                command.Parameters.Add(new SqlParameter("@Filter", SqlDbType.Int) { Value = Filter });
                command.Parameters.Add(new SqlParameter("@Group", SqlDbType.NVarChar) { Value = Group });

                _connection.Open();

                using (IDataReader reader = command.ExecuteReader())
                {
                    this.Clear();
                    try
                    {
                        while (reader.Read())
                        {
                            var newitem = DropdownListItem.FromReader(reader);
                            if (newitem != null)
                            {
                                this.Add(newitem);
                            }
                        }
                    }
                    catch (Exception ex)
{
    Console.Error.WriteLine($"[{GetType().Name}] {ex.Message}");
}

                }
                _connection.Close();
            }

            return this;
        }

        public DataTable GetCustomFields(IUser user, int requestID)
        {

            DataTable CustomFieldsTable = new DataTable();
            try
            {
                using (IDbCommand command = _connection.CreateCommand())
                {
                    command.CommandType = CommandType.StoredProcedure;
                    command.CommandText = "[dbo].[usp_Helpdesk_GetCustomFields]";
                    command.Parameters.Add(new SqlParameter("@CustomFilterGroup", SqlDbType.Int) { Value = requestID });

                    _connection.Open();

                    CustomFieldsTable.Load(command.ExecuteReader());

                    _connection.Close();
                    return CustomFieldsTable;
                }
            }
            catch (Exception ex)
{
    Console.Error.WriteLine($"[{GetType().Name}] {ex.Message}");
}

            _connection.Close();

            return null;
        }
    }
}

