#region HEADER
//  • GovtechHelpDesk
//   └ GovtechHelpDesk.Services
//    └ User.cs
// 
// Created 16/08/2017 12:34
// Updated 21/08/2017 17:34 by Sam (Sam)
#endregion

using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Utilities;
using System.Data;


namespace HelpDeskNet8.Models.Users
{

    public class User : IUser
    {


        public int? UserID { get; set; }

        public int? AuthorityID { get; set; }

        public string Authority { get; set; }

        public int? DepartmentID { get; set; }

        public string UserLogin { get; set; }

        public string AuthenticationToken { get; set; }

        public DateTime ExpiryTime { get; set; }

        public DateTime? LastConnectionDate { get; set; }

        public string UserEmail { get; set; }

        public string UserName { get; set; }

        public string UserPhone { get; set; }


        public string AdminLevel { get; set; }

        public int? Locked { get; set; }

        internal static IUser FromReader(IDataReader reader)
        {
            User newUser = null;

            if (reader["ResponseUserID"] != DBNull.Value)
            {
                try
                {
                    newUser = new User
                    {
                        UserID = reader["ResponseUserID"] as int?,
                        UserName = reader["ResponseFirstName"] as string + " " + reader["ResponseLastName"] as string,
                        AuthorityID = reader["ResponseAuthorityID"] as int?,
                        UserLogin = (string)reader["ResponseLogin"],
                        ExpiryTime = (DateTime)reader["ResponseExpiryTime"]
                    };
                }
                catch (Exception ex)
                {
                    AppLogger.Error(nameof(User), ex);
                }
            }

            return newUser;
        }
    }
}