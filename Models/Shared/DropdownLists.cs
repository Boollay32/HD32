using System.Data;


namespace HelpDeskNet8.Models.Shared
{
    public class DropdownListItem
    {
        public string Table { get; set; }
        public int ID { get; set; }
        public string Name { get; set; }

        internal static DropdownListItem FromReader(IDataReader reader)
        {
            DropdownListItem newItem = null;

            if (reader["ID"] != DBNull.Value)
            {
                var op1 = reader["TableName"] as string ?? "";

                if (op1 != "")
                {
                    newItem = new DropdownListItem
                    {
                        Table = (string)reader["TableName"],
                        ID = (int)reader["ID"],
                        Name = (string)reader["Descr"],

                    };
                }
            }
            return newItem;
        }
    }
}
