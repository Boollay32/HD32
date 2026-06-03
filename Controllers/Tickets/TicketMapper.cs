using HelpDeskNet8.Interfaces.Tickets;
using HelpDeskNet8.Models.Tickets;

namespace HelpDeskNet8.Controllers.Tickets
{
    public static class TicketMapper
    {
        public static ITicket? Map(string objectInfo)
        {
            if (string.IsNullOrEmpty(objectInfo)) return null;

            var fields = objectInfo
                .Split('|', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Split('`'))
                .Where(s => s.Length == 2 && !string.IsNullOrEmpty(s[0]))
                .ToDictionary(s => s[0], s => s[1]);

            var ticket = new Ticket();

            if (fields.TryGetValue("TicketID", out var id) && int.TryParse(id, out int ticketId))
                ticket.TicketID = ticketId;
            if (fields.TryGetValue("status", out var status))
                ticket.Status = status;
            if (fields.TryGetValue("priority", out var pri))
                ticket.Priority = pri;
            if (fields.TryGetValue("subject", out var subject))
                ticket.Subject = subject;
            if (fields.TryGetValue("assignedTechName", out var tech) && int.TryParse(tech, out int techId))
                ticket.AssignedTechID = techId;
            if (fields.TryGetValue("category", out var cat) && int.TryParse(cat, out int catId))
                ticket.Category = catId;
            if (fields.TryGetValue("targetDate", out var target) && DateTime.TryParse(target, out DateTime targetDate))
                ticket.TargetDate = targetDate;

            return ticket;
        }
    }
}
