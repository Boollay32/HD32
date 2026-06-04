/****** usp_Helpdesk_BulkUpdateTicket ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/**********************************************************************
  usp_Helpdesk_BulkUpdateTicket
  =============================
  Bulk-set status | assignedTech on many tickets in one call.

  *** DRAFT — VERIFY AGAINST usp_Helpdesk_UpdateTicket / GetTickets ***
  I have the Task procs but not the Ticket ones, so the items below are
  assumptions carried over from the Task pattern + TicketManager:
    (A) ticket table is  dbo.tblTicket          (TaskManager used dbo.tblTask)
    (B) columns are      StatusID, AssignedTechID, TicketID
    (C) ticket status-description table is tblStatusTicket (StatusDesc)
    (D) closing/resolving a ticket has NO extra side-effect (e.g. a
        CloseDate stamp). If usp_Helpdesk_UpdateTicket sets a close date
        or fires anything on status change, replicate it here.
  Ticket status ids: 1 Open · 2 In Progress · 3 Pending · 4 Resolved · 5 Closed
  No authority scoping (consistent with the Task procs — keyed by id).
*********************************************************************/
CREATE OR ALTER PROCEDURE [dbo].[usp_Helpdesk_BulkUpdateTicket]
    @UserID    int,
    @TicketIDs nvarchar(max),
    @Field     nvarchar(32),
    @Value     int,
    @UTC       int
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now datetime = CASE WHEN @UTC = 1 THEN DATEADD(hh, 1, GETDATE()) ELSE GETDATE() END;

    DECLARE @Ids TABLE (TicketID int PRIMARY KEY);
    INSERT INTO @Ids (TicketID)
    SELECT DISTINCT TRY_CONVERT(int, value)
    FROM STRING_SPLIT(@TicketIDs, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL;

    IF @Field = 'status'
    BEGIN
        DECLARE @ChangedS TABLE (TicketID int, OldStatusID int);
        INSERT INTO @ChangedS (TicketID, OldStatusID)
        SELECT t.TicketID, t.StatusID
        FROM dbo.tblTicket t                                   -- (A)(B) verify
        JOIN @Ids i ON i.TicketID = t.TicketID
        WHERE ISNULL(t.StatusID, 0) <> @Value;

        UPDATE t
        SET t.StatusID = @Value
            -- (D) if a ticket close needs a date stamp, add e.g.:
            -- , t.CloseDate = CASE WHEN @Value = 5 THEN @Now ELSE t.CloseDate END
        FROM dbo.tblTicket t
        JOIN @ChangedS c ON c.TicketID = t.TicketID;

        INSERT INTO tblHistory (TicketID, UserID, HistoryTxt, HistoryDate)
        SELECT c.TicketID, @UserID,
               'Ticket ' + CAST(c.TicketID AS varchar) + ' - status updated from '
                 + so.StatusDesc + ' to ' + sn.StatusDesc, @Now
        FROM @ChangedS c
        JOIN tblStatusTicket so ON so.StatusID = c.OldStatusID  -- (C) verify table name
        JOIN tblStatusTicket sn ON sn.StatusID = @Value;

        SELECT COUNT(*) AS Updated FROM @ChangedS;
    END
    ELSE IF @Field = 'assignedTech'
    BEGIN
        DECLARE @ChangedT TABLE (TicketID int, OldTechID int);
        INSERT INTO @ChangedT (TicketID, OldTechID)
        SELECT t.TicketID, t.AssignedTechID
        FROM dbo.tblTicket t
        JOIN @Ids i ON i.TicketID = t.TicketID
        WHERE ISNULL(t.AssignedTechID, 0) <> @Value;

        UPDATE t
        SET t.AssignedTechID = @Value
        FROM dbo.tblTicket t
        JOIN @ChangedT c ON c.TicketID = t.TicketID;

        INSERT INTO tblHistory (TicketID, UserID, HistoryTxt, HistoryDate)
        SELECT c.TicketID, @UserID,
               'Ticket ' + CAST(c.TicketID AS varchar) + ' - reassigned from '
                 + (uo.UserFirstName + ' ' + uo.UserLastName) + ' to '
                 + (un.UserFirstName + ' ' + un.UserLastName), @Now
        FROM @ChangedT c
        JOIN tblUser uo ON uo.UserID = c.OldTechID
        JOIN tblUser un ON un.UserID = @Value;

        SELECT COUNT(*) AS Updated FROM @ChangedT;
    END
    ELSE
        THROW 50000, 'Field not permitted.', 1;
END
GO
