using HelpDeskNet8.Interfaces.Shared;

namespace HelpDeskNet8.Interfaces.RFCs
{

    public interface IRFCManager
    {
        IEnumerable<IRFCStub> GetChangeRequest(int? CRUserID, IFilter IF);

        IRFC GetChangeRequestDetail(int? RFCID);

        List<Object> SaveChangeRequest(int CRUserID, IRFC RFC, int UTC);
    }
}