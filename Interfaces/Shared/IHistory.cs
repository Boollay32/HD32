using HelpDeskNet8.Interfaces.Users;

namespace HelpDeskNet8.Interfaces.Shared
{
    public interface IHistory
    {
        object GetHistory(IUser user, int TicketID);
    }
}