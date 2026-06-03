using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Models.Users;
using HelpDeskNet8.Utilities;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class UserManager(IDbConnection connection) : IUserManager
    {
        private readonly IDbConnection _connection = connection;

        public IEnumerable<IUserStub> GetUsers(IFilter filter)
        {
            filter ??= new Filter();
            var userList = new UserList();

            if (filter.Deactivated == 1)
                filter.Locked = 99;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_GetUsers]";

                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = filter.UserID });
                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.NVarChar) { Value = filter.UserLogin });
                command.Parameters.Add(new SqlParameter("@UserFirstName", SqlDbType.NVarChar) { Value = filter.UserFirstName });
                command.Parameters.Add(new SqlParameter("@UserLastName", SqlDbType.NVarChar) { Value = filter.UserLastName });
                command.Parameters.Add(new SqlParameter("@UserEmail", SqlDbType.NVarChar) { Value = filter.UserEmail });
                command.Parameters.Add(new SqlParameter("@UserSecondaryEmail", SqlDbType.NVarChar) { Value = filter.UserSecondaryEmail });
                command.Parameters.Add(new SqlParameter("@UserName", SqlDbType.NVarChar) { Value = filter.UserName });
                command.Parameters.Add(new SqlParameter("@UserPhone", SqlDbType.NVarChar) { Value = filter.UserPhone });
                command.Parameters.Add(new SqlParameter("@AuthorityID", SqlDbType.Int) { Value = filter.Authority });
                command.Parameters.Add(new SqlParameter("@DepartmentID", SqlDbType.Int) { Value = filter.DepartmentID });
                command.Parameters.Add(new SqlParameter("@LockedStatus", SqlDbType.Int) { Value = filter.Locked });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                            userList.Add(UserStub.FromReader(reader));
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return userList;
        }

        public IUser? GetUserDetail(int userID)
        {
            IUser? newUser = null;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_GetUserDetail]";
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = userID });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read() && reader["UserID"] != DBNull.Value)
                        {
                            newUser = new User
                            {
                                UserID = reader["UserID"] as int?,
                                UserEmail = reader["Email"] as string,
                                UserName = reader["User Name"] as string,
                                Authority = (string)reader["Authority"],
                                UserPhone = (string)reader["Phone"],
                                LastConnectionDate = reader["Last Connection Date"] as DateTime?,
                                Locked = (int?)reader["Locked"],
                                AdminLevel = (string)reader["AdminLevel"]
                            };
                        }
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return newUser;
        }

        public string CreateUser(string userLogin, string fName, string sName, string phone, int authority, int department, int utc)
        {
            string result = string.Empty;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_AddUser]";

                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.NVarChar) { Value = userLogin });
                command.Parameters.Add(new SqlParameter("@UserFirstName", SqlDbType.NVarChar) { Value = fName });
                command.Parameters.Add(new SqlParameter("@UserLastName", SqlDbType.NVarChar) { Value = sName });
                command.Parameters.Add(new SqlParameter("@UserPhone", SqlDbType.NVarChar) { Value = phone });
                command.Parameters.Add(new SqlParameter("@AuthorityID", SqlDbType.Int) { Value = authority });
                command.Parameters.Add(new SqlParameter("@DepartmentID", SqlDbType.Int) { Value = department });
                command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = utc });

                _connection.Open();
                try
                {
                    result = (string)command.ExecuteScalar();
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return result;
        }

        public string DeleteUser(string adminUser, string userLogin)
        {
            string result = string.Empty;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_UserDelete]";

                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.NVarChar) { Value = userLogin });
                command.Parameters.Add(new SqlParameter("@AdminUserLogin", SqlDbType.NVarChar) { Value = adminUser });

                _connection.Open();
                try
                {
                    result = (string)command.ExecuteScalar();
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return result;
        }

        public string ResetUser(string userLogin)
        {
            string pin = string.Empty;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_ResetUser]";
                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.NVarChar) { Value = userLogin });

                _connection.Open();
                try
                {
                    pin = (string)command.ExecuteScalar();
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return pin;
        }

        public string GetUserEmailAddress(int userID, string userFirstName, string userLastName, string authorityName)
        {
            string message = string.Empty;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_GetEmailAddress]";

                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = userID });
                command.Parameters.Add(new SqlParameter("@UserFirstName", SqlDbType.NVarChar) { Value = string.IsNullOrWhiteSpace(userFirstName) ? (object)DBNull.Value : userFirstName });
                command.Parameters.Add(new SqlParameter("@UserLastName", SqlDbType.NVarChar) { Value = string.IsNullOrWhiteSpace(userLastName) ? (object)DBNull.Value : userLastName });
                command.Parameters.Add(new SqlParameter("@Authority", SqlDbType.NVarChar) { Value = string.IsNullOrWhiteSpace(authorityName) ? (object)DBNull.Value : authorityName });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                            message = reader["EMailAddress"] as string ?? string.Empty;
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return message;
        }

        public int UpdateUser(string userLogin, string phone)
        {
            int updated = 0;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_UpdateUser]";

                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.NVarChar) { Value = userLogin });
                command.Parameters.Add(new SqlParameter("@UserPhone", SqlDbType.NVarChar) { Value = phone });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                            updated = (int)reader["AdminCheck"];
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return updated;
        }

        public string ManageUser(string userLogin, string adminUserLogin, int unlockUser, int adminLevelID, string phone)
        {
            string updated = string.Empty;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_UserManage]";

                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.NVarChar) { Value = userLogin });
                command.Parameters.Add(new SqlParameter("@AdminUserLogin", SqlDbType.NVarChar) { Value = adminUserLogin });
                command.Parameters.Add(new SqlParameter("@UnlockUser", SqlDbType.Int) { Value = unlockUser });
                command.Parameters.Add(new SqlParameter("@AdminLevelID", SqlDbType.Int) { Value = adminLevelID });
                command.Parameters.Add(new SqlParameter("@UserPhone", SqlDbType.NVarChar) { Value = phone });

                _connection.Open();
                try
                {
                    updated = (string)command.ExecuteScalar();
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(UserManager), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return updated;
        }
    }
}
