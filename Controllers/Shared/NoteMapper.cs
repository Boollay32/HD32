using HelpDeskNet8.Interfaces.Notes;
using HelpDeskNet8.Models.Notes;

namespace HelpDeskNet8.Controllers.Shared
{
    public static class NoteMapper
    {
        public static INote? Map(string objectInfo)
        {
            if (string.IsNullOrEmpty(objectInfo)) return null;

            var fields = objectInfo
                .Split('|', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Split('`'))
                .Where(s => s.Length == 2 && !string.IsNullOrEmpty(s[0]))
                .ToDictionary(s => s[0], s => s[1]);

            var note = new NoteStub();

            if (fields.TryGetValue("NoteID", out var id) && int.TryParse(id, out int noteId))
                note.NoteID = noteId;
            if (fields.TryGetValue("TicketID", out var ticketId) && int.TryParse(ticketId, out int tId))
                note.TicketID = tId;
            if (fields.TryGetValue("RFCID", out var rfcId) && int.TryParse(rfcId, out int rId))
                note.RFCID = rId;
            if (fields.TryGetValue("noteDescription", out var desc))
                note.NoteDescription = desc;
            if (fields.TryGetValue("visibleToClient", out var visible))
                note.VisibleToClient = visible == "1" || visible == "true";
            if (fields.TryGetValue("noteDate", out var date) && DateTime.TryParse(date, out DateTime noteDate))
                note.NoteDate = noteDate;

            return note;
        }
    }
}
