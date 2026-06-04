#!/usr/bin/env python3
# =============================================================================
#  HD32 — wire up the BulkUpdate C# (controllers, managers, interfaces)
# =============================================================================
#  Adds the BulkUpdate action to TaskController/TicketController, the BulkUpdate
#  method to TaskManager/TicketManager (each in that manager's own style), and
#  the method signature to ITaskManager/ITicketManager (found wherever they live
#  in your tree). Idempotent, preserves CRLF + BOM. Run from the repo root.
#
#  Pairs with the already-committed Requests/BulkUpdateRequest.cs and the
#  db/procedures/*.sql. Deploy the procs to the database separately.
# =============================================================================
import io, os, re, sys

# ---------- BOM/CRLF-preserving IO ----------
def load(p):
    raw = open(p, "rb").read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    text = raw.decode("utf-8-sig")
    return text.replace("\r\n", "\n"), ("\r\n" in text), bom

def save(p, text_lf, crlf, bom):
    out = text_lf.replace("\n", "\r\n") if crlf else text_lf
    data = (b"\xef\xbb\xbf" if bom else b"") + out.encode("utf-8")
    open(p, "wb").write(data)

def insert_before(path, anchor, block, guard):
    """Insert `block` immediately before `anchor` (idempotent via `guard`)."""
    if not os.path.exists(path):
        return ("missing", path)
    text, crlf, bom = load(path)
    if guard in text:
        return ("skip", path)
    if anchor not in text:
        return ("no-anchor", path)
    save(path, text.replace(anchor, block + anchor, 1), crlf, bom)
    return ("ok", path)

# ---------- 1. Controller actions ----------
TASK_CTRL_ANCHOR = "        [HttpPost]\n        public IActionResult GetTasks([FromBody] GetTasksRequest request)"
TASK_CTRL_BLOCK = """        [HttpPost]
        public IActionResult BulkUpdate([FromBody] BulkUpdateRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            SaveResult result = _taskManager.BulkUpdate(
                user, request.Ids, request.Field, request.Value, request.UTC);

            if (!result.IsSuccess) return BadRequest(result.Error);
            return Ok(result);
        }

"""

TICKET_CTRL_ANCHOR = "        [HttpPost]\n        public IActionResult GetTickets([FromBody] GetTicketsRequest request)"
TICKET_CTRL_BLOCK = """        [HttpPost]
        public IActionResult BulkUpdate([FromBody] BulkUpdateRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            SaveResult result = _ticketManager.BulkUpdate(
                user, request.Ids, request.Field, request.Value, request.UTC);

            if (!result.IsSuccess) return BadRequest(result.Error);
            return Ok(result);
        }

"""

# ---------- 2. Manager methods ----------
TASK_MGR_ANCHOR = "        public IEnumerable<ITask> GetTasks(IUser user, IFilter filter, int UTC)"
TASK_MGR_BLOCK = """        public SaveResult BulkUpdate(IUser user, IEnumerable<int> ids, string field, int value, int UTC)
        {
            var idList = (ids ?? Enumerable.Empty<int>()).Where(id => id > 0).Distinct().ToList();
            if (idList.Count == 0)
                return SaveResult.Failed("No records selected.");
            if (field != "status" && field != "assignedTech")
                return SaveResult.Failed("Field not permitted.");

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
                int updated = (int)command.ExecuteScalar();
                return SaveResult.Updated(updated);
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

"""

TICKET_MGR_ANCHOR = "        public IEnumerable<ITicketStub> GetTickets(IUser user, IFilter filter, Int32 mytickets, int UTC)"
TICKET_MGR_BLOCK = """        public SaveResult BulkUpdate(IUser user, IEnumerable<int> ids, string field, int value, int UTC)
        {
            var idList = (ids ?? Enumerable.Empty<int>()).Where(id => id > 0).Distinct().ToList();
            if (idList.Count == 0)
                return SaveResult.Failed("No records selected.");
            if (field != "status" && field != "assignedTech")
                return SaveResult.Failed("Field not permitted.");

            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandText = "[dbo].[usp_Helpdesk_BulkUpdateTicket]";
            command.CommandTimeout = 60;

            command.Parameters.Add(new SqlParameter("@UserID",    SqlDbType.Int)      { Value = user.UserID.HasValue ? (object)user.UserID.Value : DBNull.Value });
            command.Parameters.Add(new SqlParameter("@TicketIDs", SqlDbType.NVarChar) { Value = string.Join(",", idList) });
            command.Parameters.Add(new SqlParameter("@Field",     SqlDbType.NVarChar) { Value = field });
            command.Parameters.Add(new SqlParameter("@Value",     SqlDbType.Int)      { Value = value });
            command.Parameters.Add(new SqlParameter("@UTC",       SqlDbType.Int)      { Value = UTC });

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

"""

# ---------- 3. Interface signature (located dynamically) ----------
IFACE_SIG = "        SaveResult BulkUpdate(IUser user, IEnumerable<int> ids, string field, int value, int UTC);\n"

def patch_interface(name):
    """Find the .cs declaring `interface <name>` and add the method as its first member."""
    pat = re.compile(r"(interface\s+" + re.escape(name) + r"\b[^{]*\{)")
    for root, _, files in os.walk("."):
        if "/." in root.replace("\\", "/"):
            continue
        for fn in files:
            if not fn.endswith(".cs"):
                continue
            p = os.path.join(root, fn)
            text, crlf, bom = load(p)
            if not pat.search(text):
                continue
            if "BulkUpdate" in text:
                return ("skip", p)
            new = pat.sub(lambda m: m.group(1) + "\n" + IFACE_SIG.rstrip("\n"), text, count=1)
            save(p, new, crlf, bom)
            return ("ok", p)
    return ("not-found", name)

def brace_ok(path):
    if not os.path.exists(path):
        return True
    t, _, _ = load(path)
    return t.count("{") == t.count("}")

def main():
    if not (os.path.isdir("Controllers") and os.path.isdir("Services")):
        sys.exit("Run from the repo root (folder with Controllers/ and Services/).")

    results = []
    results.append(("TaskController action",   insert_before("Controllers/Tasks/TaskController.cs",      TASK_CTRL_ANCHOR,   TASK_CTRL_BLOCK,   "BulkUpdate")))
    results.append(("TicketController action", insert_before("Controllers/Tickets/TicketController.cs",  TICKET_CTRL_ANCHOR, TICKET_CTRL_BLOCK, "BulkUpdate")))
    results.append(("TaskManager method",      insert_before("Services/TaskManager.cs",                  TASK_MGR_ANCHOR,    TASK_MGR_BLOCK,    "BulkUpdate")))
    results.append(("TicketManager method",    insert_before("Services/TicketManager.cs",                TICKET_MGR_ANCHOR,  TICKET_MGR_BLOCK,  "BulkUpdate")))
    results.append(("ITaskManager signature",  patch_interface("ITaskManager")))
    results.append(("ITicketManager signature",patch_interface("ITicketManager")))

    print("Result:")
    for label, (status, info) in results:
        print("   [%-9s] %s -> %s" % (status, label, info))

    # brace sanity on the four code files
    bad = [p for p in ["Controllers/Tasks/TaskController.cs", "Controllers/Tickets/TicketController.cs",
                       "Services/TaskManager.cs", "Services/TicketManager.cs"] if not brace_ok(p)]
    print("\nBrace balance:", "OK" if not bad else ("UNBALANCED -> " + ", ".join(bad)))

    warn = [l for l, (s, _) in results if s in ("no-anchor", "not-found", "missing")]
    if warn:
        print("\n!! Needs attention:", ", ".join(warn))
        print("   If an interface shows 'not-found', it isn't in your tree — add this line to it:")
        print("   " + IFACE_SIG.strip())
    print("\nNext: build, then commit. (Deploy db/procedures/*.sql to the database separately.)")

if __name__ == "__main__":
    main()
