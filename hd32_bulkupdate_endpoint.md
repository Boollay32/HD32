# HD32 — `BulkUpdate` endpoint spec

The queue bulk actions (`hd32_theme_bulk_apply.py`) post to **`Ticket/BulkUpdate`** and
**`Task/BulkUpdate`**. Those endpoints don't exist yet — this is the server side to add.

## Why a dedicated endpoint (not `SaveTicket`/`SaveTask`)

`TicketOperations.saveTicket` and `TaskOperations.saveTask` build their payload from the
**entire detail-page form** (`Form.getValues` over every `.Value` element) and POST it whole.
They are full-object saves. Looping them for a bulk edit with only `{id, status}` risks the
server blanking subject, body, priority, custom fields, etc. — across every selected record at
once. `BulkUpdate` instead touches **one whitelisted column** and nothing else.

## Contract

**Route:** `POST api/Ticket/BulkUpdate`, `POST api/Task/BulkUpdate`
(the front-end calls `API.post('Ticket/BulkUpdate', …)`; `API.post` prepends `api/`).

**Request body** (after `API.authPayload`, which adds `utc`):

```json
{ "ids": [4101, 4105, 4110], "field": "status", "value": "Pending", "utc": 60 }
```

- `ids` — ticket IDs / task IDs to update.
- `field` — **must be server-whitelisted** to `"status"` or `"assignedTech"`. Reject anything else.
- `value` — the new value. **Semantics match the single-save path:**
  - Ticket `status`: the status label as shown (`Open`/`Pending`/`On Hold`/`Closed`/`Solved`) —
    map to whatever column representation `SaveTicket` stores. Reject unknown labels.
  - Task `status`: the integer code (`1` New, `2` In Progress, `3` Complete, `4` Withdrawn, `5` Draft).
  - `assignedTech`: the same tech identifier used elsewhere. *(Bulk assign-to isn't wired in the
    front-end yet — see the note at the end — but the endpoint should support the field.)*

**Response:** `Ok(SaveResult)` — the engine reloads the queue after a successful apply, so it just
needs success/failure. `{ "isSuccess": true, "updated": 3 }` is plenty.

## Security (non-negotiable)

1. **Whitelist `field`** to an allowlist mapped to real column names server-side. Never interpolate
   the client string into SQL.
2. **Re-apply per-record authority scoping** — exactly as `GetTickets`/`GetTasks`/`GetUserDetail`
   already scope by `user.AuthorityID` and admin level. A user must not bulk-edit records they
   can't see. Filter `ids` down to the permitted set before updating; ignore the rest.
3. **Parameterise** the id list and value. One `UPDATE … WHERE Id IN (@ids) AND <scope>`.
4. **Validate `value`** against the allowed set for that field; reject unknowns with `BadRequest`.

## Controller stub (matches your existing conventions)

```csharp
// Controllers/Tasks/TaskController.cs — add alongside SaveTask
[HttpPost]
public IActionResult BulkUpdate([FromBody] BulkUpdateRequest request)
{
    IUser user = this.GetAuthenticatedUser();
    if (user == null) return Unauthorized();

    SaveResult result = _taskManager.BulkUpdate(
        user, request.Ids, request.Field, request.Value, request.UTC);

    if (!result.IsSuccess) return BadRequest(result.Error);
    return Ok(result);
}
```

```csharp
// Controllers/Tickets/TicketController.cs — same shape, _ticketManager.BulkUpdate(...)
```

## Request DTO

```csharp
// Requests/BulkUpdateRequest.cs
namespace HelpDeskNet8.Requests
{
    public class BulkUpdateRequest
    {
        public List<int> Ids { get; set; } = new();
        public string Field { get; set; }   // "status" | "assignedTech"
        public string Value { get; set; }   // label / code / tech id (see contract)
        public int UTC { get; set; }
    }
}
```

## Manager / service sketch

```csharp
// TaskManager.BulkUpdate (TicketManager mirrors this)
private static readonly Dictionary<string, string> AllowedFields = new()
{
    ["status"]       = "Status",        // TODO: confirm real column names
    ["assignedTech"] = "AssignedTech",
};

public SaveResult BulkUpdate(IUser user, List<int> ids, string field, string value, int utc)
{
    if (ids is null || ids.Count == 0)        return SaveResult.Fail("No records selected.");
    if (!AllowedFields.TryGetValue(field, out var column))
        return SaveResult.Fail("Field not permitted.");

    // 1. validate value for this field (reuse your existing status/tech mapping)
    //    e.g. map "Pending" -> stored code, or verify the int task-status / tech id.
    object dbValue = MapAndValidate(field, value);   // TODO; return Fail on unknown value

    // 2. scope ids to what THIS user may edit — same rule as GetTasks/GetTickets
    List<int> permitted = FilterToPermitted(user, ids);   // TODO; reuse existing scoping
    if (permitted.Count == 0) return SaveResult.Fail("Nothing updatable for this user.");

    // 3. one parameterised update (sketch — use your existing data layer / proc)
    //    UPDATE <table> SET [<column>] = @value, ModifiedUTC = @utc
    //    WHERE Id IN (<@idN params>) AND <authority scope>
    int updated = _data.BulkUpdate(column, dbValue, permitted, utc);

    return SaveResult.Ok(updated);   // or however SaveResult signals success + count
}
```

### Optional: stored proc instead of inline SQL

If you prefer to keep writes in procs (consistent with `usp_Helpdesk_*`), a proc taking a TVP of
ids + a single pre-validated column/value works well:

```sql
-- usp_Helpdesk_BulkUpdateTaskStatus  (one per field/table, so the column is fixed & safe)
CREATE PROCEDURE usp_Helpdesk_BulkUpdateTaskStatus
    @Ids        dbo.IntList READONLY,   -- TVP
    @StatusCode INT,
    @AuthorityID INT                    -- caller scope
AS
BEGIN
    UPDATE t
       SET t.Status = @StatusCode
      FROM Tasks t
      JOIN @Ids i ON i.Value = t.TaskID
     WHERE t.AuthorityID = @AuthorityID;   -- adjust to your real scoping
    SELECT @@ROWCOUNT AS Updated;
END
```

A proc-per-field keeps the column name fixed in SQL (no dynamic column), which is the safest shape.

## What's already done (front-end)

`hd32_theme_bulk_apply.py` adds the `bulk` config to `TicketPage.js` and `TasksPage.js`:
**Set status** only, options `Open/Pending/On Hold/Closed/Solved` (tickets) and
`New/In Progress/Complete/Withdrawn/Draft` (tasks, sent as codes 1–5). Selection, select-all,
`Space`-to-select, the bulk bar, and reload-after-apply are all handled by the existing
`QueueView` engine. Until this endpoint exists, a bulk apply is caught by the engine and the
queue simply reloads unchanged — no data is touched.

## Note: bulk **assign-to** (next step)

Bulk *assign* isn't in the front-end yet because the assignee option list only exists after the
queue data loads (the engine builds bulk `<select>`s once, at scaffold time, before data). Two
clean ways to add it:

- **Engine tweak:** repopulate any bulk select marked `dynamicField: 'assignedTech'` inside
  `render()`, mirroring the existing `_refreshFilterOptions()` (distinct values from loaded rows).
- **Static source:** point the bulk `options` at the same tech roster the detail-page assignee
  dropdown uses (e.g. `Misc/GetDropDownList`).

Either is a small follow-up; the `BulkUpdate` endpoint above already supports `field: "assignedTech"`.
