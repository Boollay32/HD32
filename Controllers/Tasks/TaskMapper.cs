using HelpDeskNet8.Interfaces.Tasks;
using HelpDeskNet8.Models.Tasks;

namespace HelpDeskNet8.Controllers.Tasks
{
    public static class TaskMapper
    {
        public static ITask? Map(string objectInfo)
        {
            if (string.IsNullOrEmpty(objectInfo)) return null;

            var fields = objectInfo
                .Split('|', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Split('`'))
                .Where(s => s.Length == 2 && !string.IsNullOrEmpty(s[0]))
                .ToDictionary(s => s[0], s => s[1]);

            var task = new TaskStub();

            if (fields.TryGetValue("TaskID", out var id) && int.TryParse(id, out int taskId))
                task.TaskID = taskId;
            if (fields.TryGetValue("TicketID", out var ticketId) && int.TryParse(ticketId, out int tId))
                task.TicketID = tId;
            if (fields.TryGetValue("UserID", out var userId) && int.TryParse(userId, out int uId))
                task.UserID = uId;
            if (fields.TryGetValue("title", out var title))
                task.Title = title;
            if (fields.TryGetValue("description", out var desc))
                task.Description = desc;
            if (fields.TryGetValue("progressLog", out var log))
                task.ProgressLog = log;
            if (fields.TryGetValue("assignedTech", out var tech))
                task.AssignedTech = tech;
            if (fields.TryGetValue("status", out var status) && int.TryParse(status, out int statusId))
                task.Status = statusId;
            if (fields.TryGetValue("important", out var imp))
                task.Important = imp == "1" || imp == "true";
            if (fields.TryGetValue("requiredDate", out var req) && DateTime.TryParse(req, out DateTime reqDate))
                task.RequiredDate = reqDate;
            if (fields.TryGetValue("completed", out var comp) && DateTime.TryParse(comp, out DateTime compDate))
                task.Completed = compDate;

            return task;
        }
    }
}
