/****** usp_Helpdesk_BulkUpdateTask ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/**********************************************************************
  usp_Helpdesk_BulkUpdateTask
  ===========================
  Bulk-set a single whitelisted field (status | assignedTech) on many
  tasks in one call. Mirrors usp_Helpdesk_ManageTask behaviour:
    - status -> 3 (Complete) stamps CompletionDate; any other status
      clears it (matches ManageTask's CASE WHEN StatusID = 3 ... ELSE '').
    - writes tblHistory rows, same wording as ManageTask, only for tasks
      that actually changed.
  No authority scoping — consistent with usp_Helpdesk_GetTasks /
  usp_Helpdesk_ManageTask, which scope by TaskID, not by user authority.
  Columns are fixed per IF-branch, so there is no dynamic SQL.
*********************************************************************/
CREATE OR ALTER PROCEDURE [dbo].[usp_Helpdesk_BulkUpdateTask]
    @UserID  int,
    @TaskIDs nvarchar(max),     -- comma-separated task ids
    @Field   nvarchar(32),      -- 'status' | 'assignedTech'
    @Value   int,               -- status id (1-5) or assigned-tech UserID
    @UTC     int
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now datetime = CASE WHEN @UTC = 1 THEN DATEADD(hh, 1, GETDATE()) ELSE GETDATE() END;

    -- parse the id list
    DECLARE @Ids TABLE (TaskID int PRIMARY KEY);
    INSERT INTO @Ids (TaskID)
    SELECT DISTINCT TRY_CONVERT(int, value)
    FROM STRING_SPLIT(@TaskIDs, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL;

    -- ---------- STATUS ----------
    IF @Field = 'status'
    BEGIN
        -- snapshot only the tasks that will actually change
        DECLARE @ChangedS TABLE (TaskID int, TicketID int, OldStatusID int);
        INSERT INTO @ChangedS (TaskID, TicketID, OldStatusID)
        SELECT t.TaskID, t.TicketID, t.StatusID
        FROM dbo.tblTask t
        JOIN @Ids i ON i.TaskID = t.TaskID
        WHERE ISNULL(t.StatusID, 0) <> @Value;

        UPDATE t
        SET t.StatusID       = @Value,
            t.CompletionDate = CASE WHEN @Value = 3 THEN @Now ELSE '' END   -- mirror ManageTask
        FROM dbo.tblTask t
        JOIN @ChangedS c ON c.TaskID = t.TaskID;

        INSERT INTO tblHistory (TicketID, UserID, HistoryTxt, HistoryDate)
        SELECT c.TicketID, @UserID,
               'Task ' + CAST(c.TaskID AS varchar) + ' - status updated from ' + so.statusDesc + ' to ' + sn.statusDesc,
               @Now
        FROM @ChangedS c
        JOIN tblStatusTask so ON so.StatusID = c.OldStatusID
        JOIN tblStatusTask sn ON sn.StatusID = @Value;

        SELECT COUNT(*) AS Updated FROM @ChangedS;
    END

    -- ---------- ASSIGNED TECH ----------
    ELSE IF @Field = 'assignedTech'
    BEGIN
        DECLARE @ChangedT TABLE (TaskID int, TicketID int, OldTechID int);
        INSERT INTO @ChangedT (TaskID, TicketID, OldTechID)
        SELECT t.TaskID, t.TicketID, t.AssignedTechID
        FROM dbo.tblTask t
        JOIN @Ids i ON i.TaskID = t.TaskID
        WHERE ISNULL(t.AssignedTechID, 0) <> @Value;

        UPDATE t
        SET t.AssignedTechID = @Value
        FROM dbo.tblTask t
        JOIN @ChangedT c ON c.TaskID = t.TaskID;

        INSERT INTO tblHistory (TicketID, UserID, HistoryTxt, HistoryDate)
        SELECT c.TicketID, @UserID,
               'Task ' + CAST(c.TaskID AS varchar) + ' - task reassigned from '
                 + (uo.UserFirstName + ' ' + uo.UserLastName) + ' to '
                 + (un.UserFirstName + ' ' + un.UserLastName),
               @Now
        FROM @ChangedT c
        JOIN tblUser uo ON uo.UserID = c.OldTechID
        JOIN tblUser un ON un.UserID = @Value;

        SELECT COUNT(*) AS Updated FROM @ChangedT;
    END

    ELSE
        THROW 50000, 'Field not permitted.', 1;
END
GO
