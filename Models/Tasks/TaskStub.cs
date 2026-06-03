using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Tasks;
using HelpDeskNet8.Models.Attachments;
using HelpDeskNet8.Utilities;
using System.Data;

namespace HelpDeskNet8.Models.Tasks
{
    public class TaskStub : ITask
    {
        public int? TaskID { get; set; }
        public int? UserID { get; set; }
        public int? TicketID { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ProgressLog { get; set; } = string.Empty;
        public string AssignedTech { get; set; } = string.Empty;
        public int? Status { get; set; }
        public bool? Important { get; set; }
        public DateTime? RequiredDate { get; set; }
        public DateTime? Created { get; set; }
        public DateTime? Completed { get; set; }
        public IEnumerable<IAttachment> Attachments { get; set; } = new List<AttachmentModel>();

        internal static ITask FromReader(IDataReader reader)
        {
            TaskStub newTask = null;

            try
            {
                newTask = new TaskStub
                {
                    TaskID = reader["TaskID"] as int?,
                    UserID = null,                         
                    TicketID = reader["TicketID"] as int?,
                    Title = reader["Title"] as string ?? string.Empty,
                    Description = reader["Description"] as string ?? string.Empty,
                    AssignedTech = reader["AssignedTech"] as string ?? string.Empty,
                    Status = reader["Status"] as int?,
                    Important = reader["Important"] is int imp ? imp == 1 : null,
                    RequiredDate = reader["RequiredByDate"] as DateTime?,
                    Created = reader["DateCreated"] as DateTime?, 
                    Completed = reader["CompletionDate"] as DateTime?,
                    ProgressLog = reader["ProgressLog"] as string ?? string.Empty,
                    Attachments = ReadAttachments(reader)
                };
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(TaskStub), ex);
            }

            return newTask;
        }

        private static IEnumerable<IAttachment> ReadAttachments(IDataReader reader)
        {
            var attachments = new List<IAttachment>();

            for (int i = 1; i <= 5; i++)
            {
                string data = SafeGetString(reader, $"Attachment{i}");
                string info = SafeGetString(reader, $"AttachmentInfo{i}");
                string imageType = SafeGetString(reader, $"AttachmentImageType{i}");

                if (!string.IsNullOrEmpty(data))
                {
                    attachments.Add(new AttachmentModel
                    {
                        AttachmentByteArray = data,
                        AttachmentName = info ?? string.Empty,
                        AttachmentImageType = int.TryParse(imageType, out int imgType) ? imgType : 0
                    });
                }
            }

            return attachments;
        }

        private static string SafeGetString(IDataReader reader, string column)
        {
            try
            {
                int ordinal = reader.GetOrdinal(column);
                return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
            }
            catch (IndexOutOfRangeException)
            {
                return null;
            }
        }



    }
}
