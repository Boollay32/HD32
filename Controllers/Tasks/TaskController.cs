using HelpDeskNet8.Controllers.Tickets;
using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Tasks;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Requests;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskNet8.Controllers.Tasks
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class TaskController(ITaskManager taskM, IAuthenticator auth) : ControllerBase
    {
        private readonly ITaskManager _taskManager = taskM;
        private readonly IAuthenticator _authenticator = auth;

        [HttpPost]
        public IActionResult GetTasks([FromBody] GetTasksRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            Filter filter = TicketFilterMapper.Map(request.Filters);
            var result = _taskManager.GetTasks(user, filter, request.UTC);
            return Ok(result);
        }

        [HttpPost]
        public IActionResult GetTaskDetail([FromBody] GetTaskDetailRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            var result = _taskManager.GetTaskDetail(user, request.TaskId);
            return Ok(result);
        }

        [HttpPost]
        public IActionResult SaveTask([FromBody] SaveTaskRequest request)
        {
            IUser user = this.GetAuthenticatedUser();
            if (user == null) return Unauthorized();

            ITask task = TaskMapper.Map(request.ObjectInfo);
            if (task == null) return BadRequest("Invalid task data.");

            SaveResult result = _taskManager.SaveTask(task, request.Attachments, user.UserID, request.UTC);
            if (!result.IsSuccess) return BadRequest(result.Error);

            return Ok(result);
        }
    }
}
