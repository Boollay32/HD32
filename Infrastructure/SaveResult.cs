// Infrastructure/SaveResult.cs
namespace HelpDeskNet8.Infrastructure
{
    public class SaveResult
    {
        public bool IsSuccess { get; init; }
        public bool IsUpdate { get; init; }  // true = update, false = create
        public int? ObjectID { get; init; }
        public string? Error { get; init; }

        public static SaveResult Updated(int? objectId) => new()
        {
            IsSuccess = true,
            IsUpdate = true,
            ObjectID = objectId
        };

        public static SaveResult Created(int newobjectId) => new()
        {
            IsSuccess = true,
            IsUpdate = false,
            ObjectID = newobjectId
        };

        public static SaveResult Failed(string error) => new()
        {
            IsSuccess = false,
            Error = error
        };
    }
}
