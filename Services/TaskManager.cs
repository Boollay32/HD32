using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Tasks;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Models.Shared;
using HelpDeskNet8.Models.Tasks;
using HelpDeskNet8.Utilities;
using Microsoft.Data.SqlClient;
using System.Data;

namespace HelpDeskNet8.Services
{
    public class TaskManager : ITaskManager
    {
        private readonly IDbConnection _connection;

        public TaskManager(IDbConnection connection)
        {
            _connection = connection;
        }

        public SaveResult BulkUpdate(IUser user, IEnumerable<int> ids, string field, int value, int UTC)
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

        public IEnumerable<ITask> GetTasks(IUser user, IFilter filter, int UTC)
        {
            filter ??= new Filter();

            var taskList = new TaskList();

            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandText = "[dbo].[usp_Helpdesk_GetTasks]";

            var parameters = new Dictionary<string, (SqlDbType Type, object Value)>
            {
                { "@UserID",        (SqlDbType.Int,      user.UserID) },
                { "@MyTasks",       (SqlDbType.Int,      filter.MySearch) },
                { "@TicketID",      (SqlDbType.Int,      filter.TicketID) },
                { "@TaskID",        (SqlDbType.Int,      filter.TaskID) },
                { "@Title",         (SqlDbType.NVarChar, filter.Title) },
                { "@RequiredByDate",(SqlDbType.Int,      filter.RequiredByDate) },
                { "@CompletionDate",(SqlDbType.Int,      filter.CompletionDate) },
                { "@CreateDate",    (SqlDbType.Int,      filter.CreateDate) },
                { "@DateFrom",      (SqlDbType.DateTime, filter.DateFrom) },
                { "@DateTo",        (SqlDbType.DateTime, filter.DateTo) },
                { "@StatusID",      (SqlDbType.Int,      filter.Status) },
                { "@Important",     (SqlDbType.Int,      filter.Important) },
                { "@AssignedTechID",(SqlDbType.Int,      filter.AssignedTechName) }
            };
            AddParameters(command, parameters);

            _connection.Open();
            try
            {
                using IDataReader reader = command.ExecuteReader();
                while (reader.Read())
                    taskList.Add((TaskStub)TaskStub.FromReader(reader));
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(TaskManager), ex);
            }
            finally
            {
                _connection.Close();
            }

            return taskList;
        }

        public IEnumerable<ITask> GetTaskDetail(IUser user, int taskID)
        {
            var taskList = new TaskList();

            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandText = "[dbo].[usp_Helpdesk_GetTaskDetail]";
            command.Parameters.Add(new SqlParameter("@TaskID", SqlDbType.Int) { Value = taskID });
            command.Parameters.Add(new SqlParameter("@UserID", SqlDbType.Int) { Value = user.UserID });

            _connection.Open();
            try
            {
                using IDataReader reader = command.ExecuteReader();
                while (reader.Read())
                    taskList.Add((TaskStub)TaskStub.FromReader(reader));
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(TaskManager), ex);
            }
            finally
            {
                _connection.Close();
            }

            return taskList;
        }

        public SaveResult SaveTask(ITask task, IEnumerable<IAttachment> attachments, int? userID, int UTC)
        {
            using IDbCommand command = _connection.CreateCommand();
            command.CommandType = CommandType.StoredProcedure;
            command.CommandText = "[dbo].[usp_Helpdesk_ManageTask]";
            command.CommandTimeout = 60;

            var taskParameters = new Dictionary<string, (SqlDbType Type, object Value)>
            {
                { "@TaskID",        (SqlDbType.Int,      (object)task.TaskID ?? DBNull.Value) },
                { "@ProgressLog",   (SqlDbType.NVarChar, (object)task.ProgressLog ?? DBNull.Value) },
                { "@CompletionDate",(SqlDbType.DateTime, (object)task.Completed ?? DBNull.Value) },
                { "@UTC",           (SqlDbType.Int,      UTC) },
                { "@UserID",        (SqlDbType.Int,      userID.HasValue ? (object)userID.Value : DBNull.Value) },
                { "@TicketID",      (SqlDbType.Int,      (object)task.TicketID ?? DBNull.Value) },
                { "@TaskDescr",     (SqlDbType.NVarChar, (object)task.Description ?? DBNull.Value) },
                { "@StatusID",      (SqlDbType.Int,      (object)task.Status ?? DBNull.Value) },
                { "@Important",     (SqlDbType.Int,      task.Important == true ? 1 : 0) },
                { "@AssignedTechID",(SqlDbType.Int,      int.TryParse(task.AssignedTech, out int techId) ? techId : DBNull.Value) },
                { "@Title",         (SqlDbType.NVarChar, (object)task.Title ?? DBNull.Value) },
                { "@RequiredByDate",(SqlDbType.DateTime, (object)task.RequiredDate ?? DBNull.Value) }
            };
            AddParameters(command, taskParameters);

            var attachmentList = attachments.ToList();
            const int MAX_ATTACHMENTS = 5;

            for (int i = 1; i <= MAX_ATTACHMENTS; i++)
            {
                var (byteArray, info, imageType) = GetAttachmentDetails(attachmentList, i - 1);
                var attachmentParameters = new Dictionary<string, (SqlDbType Type, object Value)>
                {
                    { $"@Attachment{i}",          (SqlDbType.VarBinary, byteArray) },
                    { $"@Attachment{i}Desc",       (SqlDbType.NVarChar,  info) },
                    { $"@Attachment{i}ImageType",  (SqlDbType.NVarChar,  imageType) }
                };
                AddParameters(command, attachmentParameters);
            }

            _connection.Open();
            try
            {
                bool isUpdate = task.TaskID.HasValue && task.TaskID != 0;

                if (isUpdate)
                {
                    command.ExecuteNonQuery();
                    return SaveResult.Updated(task.TaskID);
                }
                else
                {
                    int newTaskID = (int)command.ExecuteScalar();
                    return SaveResult.Created(newTaskID);
                }
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

        private static (string ByteArray, string Info, int ImageType) GetAttachmentDetails(List<IAttachment> attachmentList, int index)
        {
            if (attachmentList.Count <= index) return ("", "", 0);

            try
            {
                var attachment = attachmentList[index];
                return (
                    attachment.AttachmentByteArray,
                    attachment.AttachmentName,
                    (int)attachment.AttachmentImageType
                );
            }
            catch (Exception ex)
            {
                AppLogger.Error(nameof(TaskManager), ex);
                return ("", "", 0);
            }
        }

        private static void AddParameters(IDbCommand command, Dictionary<string, (SqlDbType Type, object Value)> parameterList)
        {
            foreach (var param in parameterList)
            {
                command.Parameters.Add(new SqlParameter(param.Key, param.Value.Type)
                {
                    Value = param.Value.Value
                });
            }
        }
    }
}
