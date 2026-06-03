using HelpDeskNet8.Utilities;
using System.Reflection;

public static class TypeCreator
{
    public static T Setup<T>(Dictionary<string, string> dictionary)
    {
        object newObject = Activator.CreateInstance(typeof(T))
            ?? throw new InvalidOperationException(
                $"{typeof(T).Name} has no parameterless constructor.");

        if (dictionary == null || dictionary.Count == 0)
            return (T)newObject;

        foreach (PropertyInfo propertyInfo in newObject.GetType().GetProperties())
        {
            if (!dictionary.ContainsKey(propertyInfo.Name)) continue;

            string value = dictionary[propertyInfo.Name];
            bool propertySet = false;

            if (!propertySet) Set<DateTime>(ref propertySet, newObject, propertyInfo, value);
            if (!propertySet) Set<DateTime?>(ref propertySet, newObject, propertyInfo, value);
            if (!propertySet) Set<int>(ref propertySet, newObject, propertyInfo, value);
            if (!propertySet) Set<int?>(ref propertySet, newObject, propertyInfo, value);
            if (!propertySet) Set<float>(ref propertySet, newObject, propertyInfo, value);
            if (!propertySet) Set<bool>(ref propertySet, newObject, propertyInfo, value);
            if (!propertySet) Set<string>(ref propertySet, newObject, propertyInfo, value);
        }

        return (T)newObject;
    }

    private static void Set<T>(ref bool propertySet, object newObject, PropertyInfo propertyInfo, string value)
    {
        try
        {
            Type targetType = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);

            // Handle null/empty for nullable types
            if (string.IsNullOrEmpty(value))
            {
                propertyInfo.SetValue(newObject, null);
                propertySet = true;
                return;
            }

            propertyInfo.SetValue(newObject, Convert.ChangeType(value, targetType));
            propertySet = true;
        }
        catch (InvalidCastException) { }
        catch (FormatException) { }
        catch (OverflowException) { }
        catch (Exception ex)
        {
            AppLogger.Error(nameof(TypeCreator), ex);
        }
    }

}
