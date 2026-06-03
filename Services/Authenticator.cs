using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Users;
using HelpDeskNet8.Utilities;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class Authenticator(string connectionString) : IAuthenticator
    {
        private readonly SqlConnection _connection = new SqlConnection(connectionString);

        public int StatusCode { get; private set; }
        public string? StatusText { get; private set; }

        public IUser? AuthenticateByPassword(string username, string password,
            int UTC, string? newPassword = null)
        {
            IUser? user = null;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_Login]";

                command.Parameters.Add(new SqlParameter("@UserName", SqlDbType.NVarChar) { Value = username });
                command.Parameters.Add(new SqlParameter("@UserPassword", SqlDbType.NVarChar) { Value = password });
                command.Parameters.Add(new SqlParameter("@UserPasswordChanged", SqlDbType.NVarChar) { Value = (object?)newPassword ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            user = User.FromReader(reader);
                            StatusCode = (int)reader["ResponseCode"];
                            StatusText = (string)reader["ResponseStatus"];
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Fix: AppLogger — consistent with rest of codebase
                    AppLogger.Error(nameof(Authenticator), ex);
                }
                finally
                {
                    // Fix: always close — was missing entirely
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return user;
        }

        public IUser? AuthenticateByToken(string username, string token, int UTC)
        {
            IUser? user = null;

            using (SqlCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_TokenAuthenticateSession]";

                // Fix: explicit SqlParameter — not AddWithValue implicit inference
                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.NVarChar) { Value = username });
                command.Parameters.Add(new SqlParameter("@UserToken", SqlDbType.NVarChar) { Value = token });
                command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });

                _connection.Open();
                try
                {
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                            user = User.FromReader(reader);
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(Authenticator), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return user?.UserID != null ? user : null;
        }

        public int CheckAdmin(IUser user)
        {
            int adminLevel = 0;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_AdminAccessCheck]";
                command.Parameters.Add(new SqlParameter("@UserLogin", SqlDbType.Int) { Value = user.UserID });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                            adminLevel = Convert.ToInt32(reader[0]);
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(Authenticator), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return adminLevel;
        }

        public void Logout(int userID)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[dbo].[usp_Helpdesk_DeleteSession]";
                command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = userID });

                _connection.Open();
                try
                {
                    command.ExecuteNonQuery();
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(Authenticator), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }
        }

        public string GetMessage()
        {
            string message = string.Empty;

            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_ShowSystemMessage]";

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                            message = (string)reader["messagetext"];
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(Authenticator), ex);
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return message;
        }

        public AuthResult SecondWallAuth(string email, int pin, int UTC)
        {
            using (IDbCommand command = _connection.CreateCommand())
            {
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "[usp_Helpdesk_LoginPart2]";
                command.Parameters.Add(new SqlParameter("@UserName", SqlDbType.NVarChar) { Value = email });
                command.Parameters.Add(new SqlParameter("@UserPIN", SqlDbType.Int) { Value = pin });
                command.Parameters.Add(new SqlParameter("@UTC", SqlDbType.Int) { Value = UTC });

                _connection.Open();
                try
                {
                    using (IDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            int returnCode = (int)reader["ReturnCode"];
                            string token = (string)reader["ResponseToken"];
                            DateTime? expiry = reader["ResponseExpiryTime"] as DateTime?
                                                  ?? DateTime.MinValue;

                            // Fix: typed AuthResult — not List<object>
                            return AuthResult.Success(returnCode, token, expiry);
                        }
                    }
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(Authenticator), ex);
                    return AuthResult.Failed("Authentication error occurred.");
                }
                finally
                {
                    if (_connection.State == ConnectionState.Open)
                        _connection.Close();
                }
            }

            return AuthResult.Failed("No response from authentication service.");
        }
    }
}
