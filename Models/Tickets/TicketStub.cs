#region HEADER
//  • GovtechHelpDesk
//   └ GovtechHelpDesk.Services
//    └ Ticket.cs
// 
// Created 16/08/2017 12:34
// Updated 21/08/2017 17:34 by Sam (Sam)
#endregion

using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Tickets;
using HelpDeskNet8.Services;
using HelpDeskNet8.Utilities;
using System.Data;


namespace HelpDeskNet8.Models.Tickets
{

    //[KnownType(typeof(IEnumerable<TicketStub>))]
    public class TicketStub : ITicketStub
    {

        public int? TicketID { get; set; }

        public DateTime? Created { get; set; }

        public DateTime? Updated { get; set; }

        public string RequestType { get; set; }

        public string Subject { get; set; }

        public string Notes { get; set; }

        public string UserName { get; set; }

        public string StatusDesc { get; set; }

        public string Status { get; set; }

        public string AssignedTech { get; set; }

        public string Authority { get; set; }

        public string Priority { get; set; }

        public string Notify { get; set; }

        internal static TicketStub FromReader(IDataReader reader)
        {
            TicketStub newTicketStub = null;

            try
            {
                if (reader["TicketID"] != DBNull.Value)
                {
                    newTicketStub = new TicketStub
                    {
                        TicketID = (int)reader["TicketID"],
                        Created = (DateTime?)reader["CreateDate"],
                        Updated = (DateTime?)reader["LastUpdateDate"],
                        RequestType = (string)reader["RequestDesc"],
                        Subject = (string)reader["TicketSubject"],
                        Notes = (string)reader["Notes"],
                        UserName = (string)reader["Client"],
                        Status = (string)reader["StatusDesc"],
                        AssignedTech = reader["Assigned Tech"] is DBNull ? String.Empty : (string)reader["Assigned Tech"],
                        Authority = (string)reader["AuthorityAbbr"],
                        Priority = (string)reader["PriorityDesc"],
                        Notify = (string)reader["Notify"]
                    };
                }
            }
            catch (Exception ex)
{
                AppLogger.Error(nameof(TicketStub), ex);
            }

            return newTicketStub;
        }

    }

}