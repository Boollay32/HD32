namespace HelpDeskNet8.Models.ViewModels
{
    public class DetailFieldViewModel
    {
        public string Label { get; set; }
        public string FieldId { get; set; }
        public string FieldType { get; set; } = "input";
        public string CssClass { get; set; } = "Detail-Div";
        public bool Required { get; set; } = false;
        public bool Disabled { get; set; } = false;
        public bool Hidden { get; set; } = false;
        public int? MaxLength { get; set; }
        public string Value { get; set; }
        public string OnChange { get; set; }  // ← added
        public string Placeholder { get; set; }  // ← added — useful for inputs
        public List<SelectOption> Options { get; set; } = new();
    }

    public class SelectOption
    {
        public string Value { get; set; }
        public string Label { get; set; }
        public bool Selected { get; set; } = false;  // ← added — for pre-selected options
    }
}
