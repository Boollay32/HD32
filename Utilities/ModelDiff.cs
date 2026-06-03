using System.Reflection;

namespace HelpDeskNet8.Utilities
{
    public static class ModelDiff
    {
        /// <summary>
        /// Returns a new instance of T with only changed properties populated.
        /// Unchanged properties are left as null/default.
        /// </summary>
        public static T GetChanges<T>(T current, T original) where T : class, new()
        {
            if (original == null) return current;

            var changes = new T();
            var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
                                      .Where(p => p.CanRead && p.CanWrite);

            foreach (var prop in properties)
            {
                var currentVal = prop.GetValue(current);
                var originalVal = prop.GetValue(original);

                // Always carry ID fields through
                if (prop.Name.EndsWith("ID", StringComparison.OrdinalIgnoreCase) ||
                    prop.Name.EndsWith("Id", StringComparison.OrdinalIgnoreCase))
                {
                    prop.SetValue(changes, currentVal);
                    continue;
                }

                // Only set if changed
                if (!Equals(currentVal, originalVal))
                    prop.SetValue(changes, currentVal);
            }

            return changes;
        }
    }
}
