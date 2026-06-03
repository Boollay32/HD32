using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Notes;
using HelpDeskNet8.Utilities;
using System.Data;

namespace HelpDeskNet8.Models.Notes
{
    public class NoteStub : INote
    {
        public int? NoteSequence { get; set; }
        public int? TicketID { get; set; }
        public int? RFCID { get; set; }
        public int? NoteID { get; set; }
        public int? NotesUserID { get; set; }
        public int? AuthorityID { get; set; }
        public bool? VisibleToClient { get; set; }
        public string NoteDescription { get; set; } = string.Empty;
        public string NotesAddedBy { get; set; } = string.Empty;
        public DateTime? NoteDate { get; set; }
        public IEnumerable<IAttachment> Attachments { get; set; } = Enumerable.Empty<IAttachment>();

        internal static NoteStub FromReader(IDataReader reader)
        {
            bool hasTicketId = false;
            bool hasRFCId = false;

            for (int i = 0; i < reader.FieldCount; i++)
            {
                string fieldName = reader.GetName(i);
                if (fieldName.Equals("TicketID", StringComparison.InvariantCultureIgnoreCase))
                    hasTicketId = true;
                if (fieldName.Equals("ChangeRequestID", StringComparison.InvariantCultureIgnoreCase))
                    hasRFCId = true;
            }

            try
            {
                if (hasTicketId)
                {
                    return new NoteStub
                    {
                        NoteSequence = reader["NoteSeq"] as int?,
                        TicketID = reader["TicketID"] as int?,
                        NotesAddedBy = reader["Name"] as string ?? string.Empty,
                        NoteDescription = reader["Notes"] as string ?? string.Empty,
                        NoteDate = reader["NotesDate"] as DateTime?,
                        NoteID = reader["NoteID"] as int?,
                        VisibleToClient = reader["VisibleToClient"] as bool?,
                        NotesUserID = reader["NotesUserID"] as int?,
                        AuthorityID = reader["AuthorityId"] as int?
                        // Attachments loaded separately via AttachmentStub.FromReader()
                    };
                }

                if (hasRFCId)
                {
                    return new NoteStub
                    {
                        RFCID = reader["ChangeRequestID"] as int?,
                        NotesAddedBy = reader["NotesAddedBy"] as string ?? string.Empty,
                        NoteDescription = reader["Notes"] as string ?? string.Empty,
                        NoteID = reader["NoteID"] as int?,
                        NoteDate = reader["NotesDate"] as DateTime?,
                        NotesUserID = reader["UserID"] as int?
                    };
                }

                // Fallback
                return new NoteStub
                {
                    NotesAddedBy = reader["NotesAddedBy"] as string ?? string.Empty,
                    NoteDescription = reader["Notes"] as string ?? string.Empty,
                    NoteID = reader["NoteID"] as int?,
                    NoteDate = reader["NotesDate"] as DateTime?,
                    NotesUserID = reader["UserID"] as int?
                };
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(NoteStub), ex);
                return new NoteStub();
            }
        }
    }
}
