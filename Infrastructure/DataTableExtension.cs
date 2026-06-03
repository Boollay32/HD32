using System.Data;

namespace HelpDeskNet8.Infrastructure
{
    public static class DataTableExtensions
    {
        public static List<Dictionary<string, object>> ToListOfDictionaries(this DataTable table) =>
            table.AsEnumerable()
                 .Select(row => table.Columns
                     .Cast<DataColumn>()
                     .ToDictionary(col => col.ColumnName, col => row[col]))
                 .ToList();
    }
}
