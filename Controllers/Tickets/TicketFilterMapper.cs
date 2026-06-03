using HelpDeskNet8.Models.Shared;

namespace HelpDeskNet8.Controllers.Tickets
{
    public static class TicketFilterMapper
    {
        public static Filter Map(Dictionary<string, string>? filters)
        {
            if (filters == null) return new Filter();

            var filterDict = new Dictionary<string, string>();

            foreach (var kvp in filters)
            {
                if (string.IsNullOrEmpty(kvp.Key)) continue;

                string key = char.ToUpper(kvp.Key[0]) + kvp.Key[1..];

                key = key switch
                {
                    "TicketNumber" => "TicketID",
                    "RequestNumber" => "RequestId",
                    _ => key
                };

                if (!string.IsNullOrWhiteSpace(kvp.Value))
                    filterDict[key] = kvp.Value;
            }

            return TypeCreator.Setup<Filter>(filterDict);
        }
    }
}
