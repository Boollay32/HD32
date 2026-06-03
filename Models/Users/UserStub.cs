#region HEADER
//  • GovtechHelpDesk
//   └ GovtechHelpDesk.Services
//    └ Ticket.cs
// 
// Created 16/08/2017 12:34
// Updated 21/08/2017 17:34 by Sam (Sam)
#endregion

using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Services;
using HelpDeskNet8.Utilities;
using System.Data;


namespace HelpDeskNet8.Models.Users
{

    public class UserStub : IUserStub
    {

        public int? UserID { get; set; }

        public string UserName { get; set; }

        public string Authority { get; set; }

        public string Phone { get; set; }

        public string Email { get; set; }

        public int? Locked { get; set; }

        public DateTime? LastLoginDate { get; set; }

        public String AdminLevel { get; set; }



        internal static UserStub FromReader(IDataReader reader)
        {
            UserStub newUserStub = null;

            try
            {
                if (reader["User Name"] != DBNull.Value)
                {
                    newUserStub = new UserStub
                    {
                        UserID = (int?)reader["User ID"],
                        UserName = (string)reader["User Name"] as String,
                        Phone = reader["Phone"] as String,
                        Authority = (string)reader["Authority"] as String,
                        Email = (string)reader["Email"] as String,
                        Locked = (int?)reader["Locked"],
                        LastLoginDate = (DateTime)reader["Last Login Date"],
                        AdminLevel = (string)reader["AdminLevel"] as String,
                    };
                }
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(UserStub), ex);
            }

            return newUserStub;
        }
    }
}
