# HD32 — `BulkUpdate` endpoint: integration guide

Wires the queue bulk actions to the server. The front-end (after `hd32_bulk_fix_tickets.py`)
posts to **`Ticket/BulkUpdate`** and **`Task/BulkUpdate`** with:

```json
{ "ids": [4101, 4105], "field": "status", "value": 3, "userName": "...", "token": "...", "utc": 60 }
```

`value` is an **int id** (status id, or — later — assigned-tech id). `field` is whitelisted to
`"status" | "assignedTech"` in both C# and the proc. The engine reloads the queue after a 200, so
the response just needs success/failure.

Six edits + two new procs. New files in this folder: `BulkUpdateRequest.cs`,
`usp_Helpdesk_BulkUpdateTask.sql`, `usp_Helpdesk_BulkUpdateTicket.sql`.

---

## 1. Request DTO  — add `Requests/BulkUpdateRequest.cs`

(See the `BulkUpdateRequest.cs` file. It extends `AuthenticatedRequest`, so UserName/Token/UTC
bind automatically.)

## 2. Interface methods

Add this line to **`ITaskManager`** and **`ITicketManager`** (wherever they're declared — they're
registered in `Program.cs` as `AddScoped<ITaskManager, TaskManager>()` etc.). Ensure the file has
`using HelpDeskNet8.Infrastructure;` (for `SaveResult`) and `HelpDeskNet8.Interfaces.Users;` (for `IUser`):

```csharp
SaveResult BulkUpdate(IUser user, IEnumerable<int> ids, string field, int value, int UTC);
```

## 3. Controller actions

**`Controllers/Tasks/TaskController.cs`** — add alongside `SaveTask`:

```csharp
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

**`Controllers/Tickets/TicketController.cs`** — identical, calling `_ticketManager.BulkUpdate(...)`.

## 4. Manager methods

**`Services/TaskManager.cs`** — matches this manager's dict + `AddParameters` style:

```csharp
public SaveResult BulkUpdate(IUser user, IEnumerable<int> ids, string field, int value, int UTC)
{
    var idList = (ids ?? Enumerable.Empty<int>()).Where(id => id > 0).Distinct().ToList();
    if (idList.Count == 0)                        return SaveResult.Failed("No records selected.");
    if (field != "status" && field != "assignedTech")
        return SaveResult.Failed("Field not permitted.");   // defence in depth (proc also branches)

    using IDbCommand command = _connection.CreateCommand();
    command.CommandType = CommandType.StoredProcedure;
    command.CommandText = "[dbo].[usp_Helpdesk_BulkUpdateTask]";
    command.CommandTimeout = 60;

    AddParameters(command, new Dictionary<string, (SqlDbType Type, object Value)>
    {
        { "@UserID",  (SqlDbType.Int,      user.UserID.HasValue ? (object)user.UserID.Value : DBNull.Value) },
        { "@TaskIDs", (SqlDbType.NVarChar, string.Join(",", idList)) },
        { "@Field",   (SqlDbType.NVarChar, field) },
        { "@Value",   (SqlDbType.Int,      value) },
        { "@UTC",     (SqlDbType.Int,      UTC) },
    });

    _connection.Open();
    try
    {
        int updated = (int)command.ExecuteScalar();   // proc ends with SELECT @@ROWCOUNT
        return SaveResult.Updated(updated);           // ObjectID carries the affected count
    }
    catch (Exception ex)
    {
        AppLogger.Error(nameof(TaskManager), ex);
        return SaveResult.Failed(ex.Message);
    }
    finally
    {
        _connection.Close();
    }
}
```

**`Services/TicketManager.cs`** — same body, but this manager adds params inline (no `AddParameters`
helper). Use `[dbo].[usp_Helpdesk_BulkUpdateTicket]`, `@TicketIDs`, and `nameof(TicketManager)`:

```csharp
public SaveResult BulkUpdate(IUser user, IEnumerable<int> ids, string field, int value, int UTC)
{
    var idList = (ids ?? Enumerable.Empty<int>()).Where(id => id > 0).Distinct().ToList();
    if (idList.Count == 0)                        return SaveResult.Failed("No records selected.");
    if (field != "status" && field != "assignedTech")
        return SaveResult.Failed("Field not permitted.");

    using IDbCommand command = _connection.CreateCommand();
    command.CommandType = CommandType.StoredProcedure;
    command.CommandText = "[dbo].[usp_Helpdesk_BulkUpdateTicket]";
    command.CommandTimeout = 60;

    command.Parameters.Add(new SqlParameter("@UserID",   SqlDbType.Int)      { Value = user.UserID.HasValue ? (object)user.UserID.Value : DBNull.Value });
    command.Parameters.Add(new SqlParameter("@TicketIDs",SqlDbType.NVarChar) { Value = string.Join(",", idList) });
    command.Parameters.Add(new SqlParameter("@Field",    SqlDbType.NVarChar) { Value = field });
    command.Parameters.Add(new SqlParameter("@Value",    SqlDbType.Int)      { Value = value });
    command.Parameters.Add(new SqlParameter("@UTC",      SqlDbType.Int)      { Value = UTC });

    _connection.Open();
    try
    {
        int updated = (int)command.ExecuteScalar();
        return SaveResult.Updated(updated);
    }
    catch (Exception ex)
    {
        AppLogger.Error(nameof(TicketManager), ex);
        return SaveResult.Failed(ex.Message);
    }
    finally
    {
        _connection.Close();
    }
}
```

## 5. Stored procs

Run `usp_Helpdesk_BulkUpdateTask.sql` and `usp_Helpdesk_BulkUpdateTicket.sql`.

- **Task proc — final.** Matches `usp_Helpdesk_ManageTask`: real table `dbo.tblTask`, the
  `CompletionDate` rule (stamped when status becomes Complete/3, cleared otherwise), and
  `tblHistory` audit rows for tasks that actually changed.
- **Ticket proc — DRAFT, verify before running.** I had the Task procs, not the ticket ones, so it
  assumes `dbo.tblTicket` with `StatusID`/`AssignedTechID`, a `tblStatusTicket(StatusDesc)` lookup
  for history wording, and **no** close-date side-effect on status change. Each assumption is marked
  `(A)`–`(D)` in the file. Confirm them against `usp_Helpdesk_UpdateTicket` /
  `usp_Helpdesk_GetTickets` — especially whether closing a ticket should stamp a close date.

**On authority scoping:** `usp_Helpdesk_GetTasks` and `usp_Helpdesk_ManageTask` do **not** restrict
by user authority — they key off `TaskID`/`TicketID`, so any authenticated user can read/edit any
task today. The bulk procs match that posture, so they introduce **no new** exposure relative to
your existing single save. If you ever want true per-user authority scoping, that's a separate
change that should apply to `GetTasks`/`ManageTask` too — not something to bolt onto bulk alone.

Both procs use `STRING_SPLIT` (SQL Server 2016+) and fixed columns per `IF` branch — no dynamic SQL.

---

## Verify

1. With the endpoint live, select rows on Tickets/Tasks → bulk bar → Set status → Apply. The queue
   reloads with the new status.
2. **Test scoping first** with a low-privilege user: confirm a bulk apply that includes ids outside
   their authority updates only the permitted ones (the `Updated` count should reflect that).
3. Status ids: tickets `1 Open · 2 In Progress · 3 Pending · 4 Resolved · 5 Closed`;
   tasks `1 New · 2 In Progress · 3 Complete · 4 Withdrawn · 5 Draft`.

## Later: bulk assign-to

The endpoint already accepts `field: "assignedTech"` (value = tech id). To surface it in the UI,
add an `assignedTech` bulk action whose options are the tech roster. Since the queue loads data
async, the options need to come from either a small engine tweak (repopulate the bulk `<select>`
in `render()`, like `_refreshFilterOptions`) or the existing `Misc/GetDropDownList` tech list.
