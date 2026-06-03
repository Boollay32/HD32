using HelpDeskNet8.Interfaces.Users;
using System.Data;

namespace HelpDeskNet8.Interfaces.Shared
{

    public interface IMiscManager
    {
        int GetRequestID(int ID, IUser user);
        DataTable GetFilterItems(String Group);
        bool SubmitFAQ(int UserID, String Question, int UTC);
        List<Object> SendMailMessage(string @from, string[] recepients, string subject, string body);
        void UpdateLoginMessage(int userIDInt, string message, int UTC);
    }
}
