using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Requests;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;
using System.Collections;
using System.Data;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Interfaces.Tasks;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Interfaces.Notes;
using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.RFCs;
using HelpDeskNet8.Interfaces.Shared;

namespace HelpDeskNet8.Controllers.Shared
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class MiscController : ControllerBase
    {
        private readonly IAuthenticator _authenticator;
        private readonly IDropdowns _dropDownManager;
        private readonly ITaskManager _taskManager;
        private readonly IMiscManager _miscManager;

        public MiscController(
            IAuthenticator auth,
            INoteManager notesM,
            IHistory historyM,
            IAttachmentManager attachmentM,
            IRFCManager changeRequestM,
            ITaskManager taskManagerM,
            IMiscManager miscManagerM,
            IDropdowns dropDownManagerM)
        {
            _authenticator = auth;
            _dropDownManager = dropDownManagerM;
            _taskManager = taskManagerM;
            _miscManager = miscManagerM;
        }

        [HttpPost]
        public IActionResult GetRequestId([FromBody] GetRequestIdRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var requestId = _miscManager.GetRequestID(request.TicketId, user);
            return Ok(requestId);
        }

        [HttpPost]
        public IActionResult GetFilterItems([FromBody] GetFilterItemsRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var filterTable = _miscManager.GetFilterItems(request.Group);

            var result = filterTable.AsEnumerable()
                .Select(row => filterTable.Columns.Cast<DataColumn>()
                    .ToDictionary(col => col.ColumnName, col => row[col]))
                .ToList();

            return Ok(result);
        }

        [HttpPost]
        public IActionResult GetDropDownList([FromBody] GetDropDownListRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var dropdowns = _dropDownManager.GetDropDowns(user, request.Filter, request.Group);

            if (dropdowns is not IEnumerable enumerable)
                return Ok(new Dictionary<string, List<object>>());

            var grouped = new Dictionary<string, List<object>>();

            foreach (var item in enumerable)
            {
                if (item is not DropdownListItem dropdownItem) continue;

                if (!grouped.TryGetValue(dropdownItem.Table, out var list))
                {
                    list = new List<object>();
                    grouped[dropdownItem.Table] = list;
                }

                list.Add(new
                {
                    id = dropdownItem.ID,
                    name = dropdownItem.Name,
                    text = dropdownItem.Name,
                    value = dropdownItem.ID.ToString()
                });
            }

            return Ok(grouped);
        }

        [HttpPost]
        public IActionResult UpdateLoginMessage([FromBody] UpdateLoginMessageRequest request)
        {
            // Auth check was missing in original — added
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var message = request.Message?.Replace("\\n", Environment.NewLine);
            _miscManager.UpdateLoginMessage(request.UserId, message, request.UTC);
            return Ok();
        }

        [HttpPost]
        public IActionResult SendMailMessage([FromBody] SendMailMessageRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            string[] recipients = request.To.Split(',');
            var result = _miscManager.SendMailMessage(request.From, recipients, request.Subject, request.Body);

            if (result[0]?.ToString() == "Error")
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost]
        public IActionResult OrderList([FromBody] OrderListRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            // Build DataTable from JSON rows — replaces pipe-delimited string parsing
            var columns = request.Columns;
            var table = new DataTable();

            foreach (var col in columns)
            {
                if (col.Contains(" ID"))
                    table.Columns.Add(col, typeof(int));
                else if (col.Contains("Date") || col == "Created")
                    table.Columns.Add(col, typeof(DateTime));
                else
                    table.Columns.Add(col, typeof(string));
            }

            foreach (var row in request.Rows)
            {
                var dataRow = table.NewRow();
                foreach (var col in columns)
                {
                    if (!row.TryGetValue(col, out var value)) continue;

                    try
                    {
                        if (string.IsNullOrEmpty(value) && col.Contains("Completed"))
                            dataRow[col] = "1900-01-01T00:00:00";
                        else
                            dataRow[col] = value;
                    }
                    catch { /* skip invalid values */ }
                }
                table.Rows.Add(dataRow);
            }

            var sortExpression = request.OrderType == "0"
                ? $"{request.ColumnToOrderBy} DESC"
                : $"{request.ColumnToOrderBy} ASC";

            var dataView = table.DefaultView;
            dataView.Sort = sortExpression;

            return Ok(dataView.ToTable());
        }
    }
}
