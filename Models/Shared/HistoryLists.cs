#region HEADER
//  • GovtechHelpDesk
//   └ GovtechHelpDesk.Services
//    └ DropdownLists.cs
// 
// Created 23/08/2017 15:18
// Updated 23/08/2017 15:18 by Sam (Sam)
#endregion

using System.Data;


namespace HelpDeskNet8.Models.Shared
{


    public class HistoryListItem
    {


        public string HistoryTxt { get; set; }

        public string Name { get; set; }

        public DateTime HistoryDate { get; set; }



        internal static HistoryListItem FromReader(IDataReader reader)
        {
            HistoryListItem newItem = null;


            if (reader["HistoryTxt"] != DBNull.Value)
            {
                newItem = new HistoryListItem
                {
                    HistoryTxt = (string)reader["HistoryTxt"],
                    Name = (string)reader["Name"],
                    HistoryDate = (DateTime)reader["HistoryDate"]
                };
            }

            return newItem;
        }
    }

}