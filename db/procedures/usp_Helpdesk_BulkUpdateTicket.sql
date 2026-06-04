/****** usp_Helpdesk_BulkUpdateTicket ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/**********************************************************************
  usp_Helpdesk_BulkUpdateTicket
  =============================
  Bulk-set status | assignedTech on many tickets in one call. Mirrors
  usp_Helpdesk_UpdateTicket / usp_Helpdesk_GetTickets behaviour:

    - AUTHORITY SCOPING: like GetTickets, when the caller's
      AuthorityAccessID = 0 they are restricted to their own
      AuthorityID. Govtech users (AccessID = 1) may update any ticket.
      Ids outside the caller's scope are silently dropped.
    - status -> 3 (Closed) stamps CloseDate (matches UpdateTicket).
    - always refreshes LastUpdateDate.
    - writes tblHistory rows, same wording as UpdateTicket, only for
      tickets that actually changed.

  Real ticket status ids (from the procs): 1 Open, 2 Pending, 3 Closed,
  4 Cancelled, 6 CR Open, 7 CR Assigned. CONFIRM the full set with
  SELECT StatusID, StatusDesc FROM tblStatus.
  Columns are fixed per IF-branch — no dynamic SQL.
*********************************************************************/
CREATE OR ALTER PROCEDURE [dbo].[usp_Helpdesk_BulkUpdateTicket]
    @UserID    int,
    @TicketIDs nvarchar(max),   -- comma-separated ticket ids
    @Field     nvarchar(32),    -- 'status' | 'assignedTech'
    @Value     int,             -- status id, or assigned-tech UserID
    @UTC       int
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now datetime = CASE WHEN @UTC = 1 THEN DATEADD(hh, 1, GETDATE()) ELSE GETDATE() END;

    -- caller's authority + access level (same lookup as usp_Helpdesk_GetTickets)
    DECLARE @AccessID int, @AuthorityUserID int;
    SELECT @AuthorityUserID = a.AuthorityID,
           @AccessID        = a.AuthorityAccessID
    FROM dbo.tblAuthority a
    JOIN dbo.tblUser b ON a.AuthorityID = b.AuthorityID
    WHERE b.UserID = @UserID;

    -- parse the id list
    DECLARE @Ids TABLE (TicketID int PRIMARY KEY);
    INSERT INTO @Ids (TicketID)
    SELECT DISTINCT TRY_CONVERT(int, value)
    FROM STRING_SPLIT(@TicketIDs, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL;

    -- scope: restricted users (AccessID = 0) may only touch their own authority's tickets
    IF ISNULL(@AccessID, 1) = 0
        DELETE i FROM @Ids i
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.tblTicket t
            WHERE t.TicketID = i.TicketID AND t.AuthorityID = @AuthorityUserID);

    -- ---------- STATUS ----------
    IF @Field = 'status'
    BEGIN
        DECLARE @ChangedS TABLE (TicketID int, OldStatusID int);
        INSERT INTO @ChangedS (TicketID, OldStatusID)
        SELECT t.TicketID, t.StatusID
        FROM dbo.tblTicket t
        JOIN @Ids i ON i.TicketID = t.TicketID
        WHERE ISNULL(t.StatusID, 0) <> @Value;

        UPDATE t
        SET t.StatusID       = @Value,
            t.LastUpdateDate = @Now,
            t.CloseDate      = CASE WHEN @Value = 3 THEN @Now ELSE t.CloseDate END   -- 3 = Closed (UpdateTicket)
        FROM dbo.tblTicket t
        JOIN @ChangedS c ON c.TicketID = t.TicketID;

        INSERT INTO tblHistory (TicketID, UserID, HistoryTxt, HistoryDate)
        SELECT c.TicketID, @UserID,
               'Ticket - status changed from ' + sFrom.StatusDesc + ' to ' + sTo.StatusDesc, @Now
        FROM @ChangedS c
        JOIN tblStatus sFrom ON sFrom.StatusID = c.OldStatusID
        JOIN tblStatus sTo   ON sTo.StatusID   = @Value;

        SELECT COUNT(*) AS Updated FROM @ChangedS;
    END

    -- ---------- ASSIGNED TECH ----------
    ELSE IF @Field = 'assignedTech'
    BEGIN
        DECLARE @ChangedT TABLE (TicketID int, OldTechID int);
        INSERT INTO @ChangedT (TicketID, OldTechID)
        SELECT t.TicketID, t.AssignedTechID
        FROM dbo.tblTicket t
        JOIN @Ids i ON i.TicketID = t.TicketID
        WHERE ISNULL(t.AssignedTechID, 0) <> @Value;

        UPDATE t
        SET t.AssignedTechID = @Value,
            t.LastUpdateDate = @Now
        FROM dbo.tblTicket t
        JOIN @ChangedT c ON c.TicketID = t.TicketID;

        INSERT INTO tblHistory (TicketID, UserID, HistoryTxt, HistoryDate)
        SELECT c.TicketID, @UserID,
               'Ticket - reassigned from '
                 + ISNULL(uo.UserFirstName + ' ' + uo.UserLastName, 'Unassigned') + ' to '
                 + ISNULL(un.UserFirstName + ' ' + un.UserLastName, 'Unassigned'), @Now
        FROM @ChangedT c
        LEFT JOIN tblUser uo ON uo.UserID = c.OldTechID
        LEFT JOIN tblUser un ON un.UserID = @Value;

        SELECT COUNT(*) AS Updated FROM @ChangedT;
    END

    ELSE
        THROW 50000, 'Field not permitted.', 1;
END
GO
