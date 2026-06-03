using HelpDeskNet8.Interfaces.Attachments;

namespace HelpDeskNet8.Models.Attachments
{
    public class AttachmentModel : IAttachment
    {
        public string AttachmentByteArray { get; set; } = string.Empty;
        public string AttachmentName { get; set; } = string.Empty;
        public int AttachmentImageType { get; set; }
    }
}
