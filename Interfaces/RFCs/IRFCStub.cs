namespace HelpDeskNet8.Interfaces.RFCs
{
    public interface IRFCStub
    {

        int? RFCID { get; set; }
        String Title { get; set; }
        String Status { get; set; }
        String CreatedBy { get; set; }
        //DateTime? CreatedDate { get; set; }
        String AssignedTech { get; set; }
        DateTime? TargetDate { get; set; }
        //DateTime? Completed { get; set; }
        String Priority { get; set; }

    }
}
