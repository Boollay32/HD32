namespace HelpDeskNet8.Interfaces.Attachments
{
    public interface IAttachment
    {
        string AttachmentByteArray { get; set; }
        string AttachmentName { get; set; }
        int AttachmentImageType { get; set; }
    }
}
