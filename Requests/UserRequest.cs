namespace HelpDeskNet8.Requests
{
    public class GetUsersRequest : AuthenticatedRequest
    {
        public Dictionary<string, string> Filters { get; set; }
    }

    public class GetUserDetailRequest : AuthenticatedRequest
    {
        public int UserId { get; set; }
    }

    public class CreateUserRequest : AuthenticatedRequest
    {
        public string UserLogin { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Phone { get; set; }
        public int AuthorityId { get; set; }
        public int Department { get; set; }
    }

    public class UserLoginRequest : AuthenticatedRequest
    {
        public string UserLogin { get; set; }
    }

    public class UpdateUserRequest : AuthenticatedRequest
    {
        public string UserLogin { get; set; }
        public string Phone { get; set; }
    }

    public class ManageUserRequest : AuthenticatedRequest
    {
        public string UserLogin { get; set; }
        public string UnlockUser { get; set; }
        public string AdminLevelId { get; set; }
        public string Phone { get; set; }
    }

    public class GetUserEmailAddressRequest
    {
        public int UserId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string AuthorityName { get; set; }
    }
}
