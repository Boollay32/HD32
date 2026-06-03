using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Shared;
using System.Data;

namespace HelpDeskNet8.Interfaces.Shared
{
    public interface IDropdowns
    {
        IEnumerable<DropdownListItem> GetDropDowns(IUser user, int Filter, string Group);
        DataTable GetCustomFields(IUser user, int request);
    }
}