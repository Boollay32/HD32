// Requests/BulkUpdateRequest.cs
namespace HelpDeskNet8.Requests;

// Inherits UserName / Token / UTC from AuthenticatedRequest, so the front-end's
// API.authPayload({ ids, field, value }) binds straight onto this.
public class BulkUpdateRequest : AuthenticatedRequest
{
    public List<int> Ids { get; set; } = new();   // ticket ids / task ids to update
    public string Field { get; set; }             // "status" | "assignedTech"  (whitelisted)
    public int Value { get; set; }                // status id, or assigned-tech id
}
