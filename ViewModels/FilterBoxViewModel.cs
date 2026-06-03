namespace HelpDeskNet8.Models.ViewModels
{
    public class FilterBoxViewModel
    {
        public string EntityType { get; set; } = "Tickets";

        // Standard Filters
        public bool ShowStatus { get; set; } = true;
        public bool ShowPriority { get; set; } = true;
        public bool ShowTitle { get; set; } = true;
        public bool ShowAssignedTo { get; set; } = true;
        public bool ShowDateRange { get; set; } = true;

        // Labels
        public string TitleLabel { get; set; } = "Title";

        // Fix: List<string> → List<FilterOption> — value/label separation
        public List<FilterOption> StatusOptions { get; set; } = new();
        public List<FilterOption> PriorityOptions { get; set; } = new();

        // Fix: default selected values — open/active items shown by default
        public List<string> DefaultStatuses { get; set; } = new();
        public List<string> DefaultPriorities { get; set; } = new();

        // Custom Filters
        public List<CustomFilter> CustomFilters { get; set; } = new();

        // Fix: static factory methods per entity type — correct options + defaults per entity
        public static FilterBoxViewModel ForTickets() => new()
        {
            EntityType = "Tickets",
            StatusOptions = new List<FilterOption>
            {
                new FilterOption { Value = "1", Label = "Open" },
                new FilterOption { Value = "2", Label = "In Progress" },
                new FilterOption { Value = "3", Label = "Pending" },
                new FilterOption { Value = "4", Label = "Resolved" },
                new FilterOption { Value = "5", Label = "Closed" }
            },
            PriorityOptions = new List<FilterOption>
            {
                new FilterOption { Value = "1", Label = "Critical" },
                new FilterOption { Value = "2", Label = "High" },
                new FilterOption { Value = "3", Label = "Medium" },
                new FilterOption { Value = "4", Label = "Low" }
            },
            // Fix: default to open/active — excludes Resolved and Closed on first load
            DefaultStatuses = new List<string> { "1", "2", "3" },
            DefaultPriorities = new List<string> { "1", "2", "3", "4" }
        };

        public static FilterBoxViewModel ForRFCs() => new()
        {
            EntityType = "RFCs",
            ShowPriority = true,
            StatusOptions = new List<FilterOption>
            {
                new FilterOption { Value = "1", Label = "Draft" },
                new FilterOption { Value = "2", Label = "New" },
                new FilterOption { Value = "3", Label = "Approved" },
                new FilterOption { Value = "4", Label = "Rejected" },
                new FilterOption { Value = "5", Label = "Approved with condition" },
                new FilterOption { Value = "6", Label = "Incomplete" },
                new FilterOption { Value = "7", Label = "Complete" },
                new FilterOption { Value = "8", Label = "In Progress" }
            },
            PriorityOptions = new List<FilterOption>
            {
                new FilterOption { Value = "1", Label = "Emergency" },
                new FilterOption { Value = "2", Label = "High" },
                new FilterOption { Value = "3", Label = "Medium" },
                new FilterOption { Value = "4", Label = "Low" }
            },
            // Fix: default to active RFC statuses — excludes Complete/Rejected on first load
            DefaultStatuses = new List<string> { "1", "2", "3", "5", "8" },
            DefaultPriorities = new List<string>()
        };

        public static FilterBoxViewModel ForTasks() => new()
        {
            EntityType = "Tasks",
            ShowPriority = false,  // Tasks have no priority
            StatusOptions = new List<FilterOption>
            {
                new FilterOption { Value = "1", Label = "New" },
                new FilterOption { Value = "2", Label = "In Progress" },
                new FilterOption { Value = "3", Label = "Complete" },
                new FilterOption { Value = "4", Label = "Withdrawn" },
                new FilterOption { Value = "5", Label = "Draft" }
            },
            // Fix: default to active task statuses — excludes Complete/Withdrawn on first load
            DefaultStatuses = new List<string> { "1", "2", "5" },
            DefaultPriorities = new List<string>()
        };

        public static FilterBoxViewModel ForUsers() => new()
        {
            EntityType = "Users",
            ShowStatus = false,
            ShowPriority = false,
            ShowTitle = true,
            ShowAssignedTo = false,
            ShowDateRange = false,
            TitleLabel = "Username",
            CustomFilters = new List<CustomFilter>
            {
                new CustomFilter
                {
                    Name        = "Email",
                    Label       = "Email",
                    Type        = "text",
                    Placeholder = "Search by email..."
                },
                new CustomFilter
                {
                    Name    = "Department",
                    Label   = "Department",
                    Type    = "select",
                    Options = new List<FilterOption>
                    {
                        new("IT",         "IT"),
                        new("HR",         "HR"),
                        new("Finance",    "Finance"),
                        new("Operations", "Operations"),
                        new("Support",    "Support")
                    }
                },
                new CustomFilter
                {
                    Name    = "Role",
                    Label   = "Role",
                    Type    = "select",
                    Options = new List<FilterOption>
                    {
                        new("Admin",      "Admin"),
                        new("Manager",    "Manager"),
                        new("User",       "User"),
                        new("Technician", "Technician")
                    }
                }
            }
        };
    }

    // Fix: replaces List<string> — value/label separation
    // FilterBoxViewModel.cs — add constructor to FilterOption
    public class FilterOption
    {
        public FilterOption() { }

        public FilterOption(string value, string label, bool selected = false)
        {
            Value = value;
            Label = label;
            Selected = selected;
        }

        public string Value { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public bool Selected { get; set; } = false;
    }


    public class CustomFilter
    {
        public string Name { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Type { get; set; } = "text";  // Fix: default to "text" — no longer accepts any string
        public string Placeholder { get; set; } = string.Empty;

        // Fix: List<string> → List<FilterOption> — value/label separation
        public List<FilterOption> Options { get; set; } = new();
    }
}
