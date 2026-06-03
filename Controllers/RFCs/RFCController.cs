using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.RFCs;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.RFCs;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace HelpDeskNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class RFCController(IRFCManager changeRequestM, IAuthenticator auth) : ControllerBase
    {
        private readonly IRFCManager _changeRequestManager = changeRequestM;
        private readonly IAuthenticator _authenticator = auth;

        [HttpPost]
        public IActionResult GetChangeRequests([FromBody] GetChangeRequestsRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var filterDict = new Dictionary<string, string>();
            if (request.Filters != null)
            {
                foreach (var kvp in request.Filters)
                {
                    string key = char.ToUpper(kvp.Key[0]) + kvp.Key.Substring(1);
                    if (key != "null") filterDict[key] = kvp.Value;
                }
            }

            Filter filter = TypeCreator.Setup<Filter>(filterDict);
            var result = _changeRequestManager.GetChangeRequest(user.UserID, filter);
            return Ok(result);
        }

        [HttpPost]
        public IActionResult GetChangeRequestDetail([FromBody] GetChangeRequestDetailRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var result = _changeRequestManager.GetChangeRequestDetail(request.RFCId);
            return Ok(result);
        }

        [HttpPost]
        public IActionResult SaveChangeRequest([FromBody] SaveChangeRequestRequest request)
        {
    IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var rfcBuild = new Dictionary<string, string>();
            rfcBuild.Add("ChangeRequestID", request.RFCId.ToString());

            foreach (var pair in request.ObjectInfo.Split('|'))
            {
                var set = pair.Split('`');
                string key = set[0];
                if (string.IsNullOrEmpty(key)) continue;
                if (key.Contains("-Day")) key = key.Replace("-Day", "");
                try { rfcBuild.Add(key, set[1]); }
                catch (ArgumentException) { }
            }

            IRFC rfc = new RFC();
            PopulateObject(rfc, rfcBuild);

            List<object> result = rfc.ChangeRequestID != 0
                ? _changeRequestManager.SaveChangeRequest((int)user.UserID, rfc.GetChanges(), request.UTC)
                : _changeRequestManager.SaveChangeRequest((int)user.UserID, rfc, request.UTC);

            if (result[0]?.ToString() == "Error") return BadRequest(result);
            return Ok(result);
        }

        private void PopulateObject<T>(T obj, Dictionary<string, string> data)
        {
            foreach (var item in data)
            {
                if (string.IsNullOrEmpty(item.Value)) continue;
                try
                {
                    string key = char.ToUpper(item.Key[0]) + item.Key.Substring(1);
                    PropertyInfo prop = obj.GetType().GetProperty(key, BindingFlags.Public | BindingFlags.Instance);
                    string typeName = prop.PropertyType.ToString();
                    if (typeName.Contains("DateTime"))
                        prop.SetValue(obj, DateTime.Parse(item.Value), null);
                    else if (typeName.Contains("Int"))
                        prop.SetValue(obj, Convert.ToInt32(item.Value), null);
                    else if (typeName.Contains("String"))
                        prop.SetValue(obj, item.Value, null);
                }
                catch { }
            }
        }
    }
}
