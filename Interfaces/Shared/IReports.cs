using System.Data;

namespace HelpDeskNet8.Interfaces.Shared
{
    public interface IReports
    {
        object DownloadReport();
        DataTable GetStats(Int32 StatsID);

    }
}
