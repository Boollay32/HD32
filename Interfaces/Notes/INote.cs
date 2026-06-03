using HelpDeskNet8.Interfaces.Attachments;

namespace HelpDeskNet8.Interfaces.Notes
{
    public interface INote
    {
        int? NoteSequence { get; set; }
        int? TicketID { get; set; }
        int? RFCID { get; set; }
        int? NoteID { get; set; }
        int? NotesUserID { get; set; }
        int? AuthorityID { get; set; }
        bool? VisibleToClient { get; set; }
        string NoteDescription { get; set; }
        string NotesAddedBy { get; set; }
        DateTime? NoteDate { get; set; }
        IEnumerable<IAttachment> Attachments { get; set; }
    }
}
