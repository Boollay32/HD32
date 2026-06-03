using System.Data;


namespace HelpDeskNet8.Models.Shared
{

    public class ReportListItem
    {

        public int TicketID { get; set; }

        public int? UserID { get; set; }

        public string CreatedBy { get; set; }

        public string CreateDate { get; set; }

        public int? WebCaptureReleaseID { get; set; }

        public string WebCaptureReleaseDesc { get; set; }

        public string TicketSubject { get; set; }

        public int? NoteID { get; set; }

        public string Details { get; set; }


        internal static ReportListItem FromReader(IDataReader reader)
        {
            ReportListItem newItem = null;

            if (reader["TicketID"] != DBNull.Value)
            {
                try
                {
                    newItem = new ReportListItem
                    {
                        TicketID = (int)reader["TicketID"],
                        UserID = (int?)reader["UserID"],
                        CreatedBy = (string)reader["CreatedBy"],
                        CreateDate = (string)reader["CreateDate"],
                        WebCaptureReleaseID = (int?)reader["WebCaptureReleaseID"],
                        WebCaptureReleaseDesc = (string)reader["WebCaptureReleaseDesc"],
                        TicketSubject = (string)reader["TicketSubject"],
                        NoteID = (int?)reader["NoteID"],
                        Details = (string)reader["Details"],
                    };
                }
                catch (Exception EX)
                {
                    var Exeption = EX;
                }
            }
            return newItem;
        }
    }
}
