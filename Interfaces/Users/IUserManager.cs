using HelpDeskNet8.Interfaces.Shared;

namespace HelpDeskNet8.Interfaces.Users
{
    public interface IUserManager
    {
        IEnumerable<IUserStub> GetUsers(IFilter filter);

        IUser GetUserDetail(int UserID);
        
        string CreateUser(String UserLogin, String FName, String SName, String Phone, Int32 Authority, Int32 Department, int UTC);

        string DeleteUser(string AdminUser, string userLogin);

        String ResetUser(String UserLogin);

        String GetUserEmailAddress(int UserID, string UserFirstName, string UserLastName, string AuthorityName);

        int UpdateUser(string UserLogin, string Phone);

        string ManageUser(string UserLogin, string AdminUserLogin, Int32 UnlockUser, Int32 AdminLevelID, string Phone);
    }
}
