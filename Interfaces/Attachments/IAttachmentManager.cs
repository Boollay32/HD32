using HelpDeskNet8.Interfaces.Users;

namespace HelpDeskNet8.Interfaces.Attachments
{
    public interface IAttachmentManager
    {
        IEnumerable<IAttachment> GetAttachmentsNotes(IUser user, int TicketID, int RFC);

        IEnumerable<IAttachment> GetAttachmentsTasks(IUser user, int TicketID);

    }
}
