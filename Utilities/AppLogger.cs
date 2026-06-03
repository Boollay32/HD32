namespace HelpDeskNet8.Utilities
{
    public static class AppLogger
    {
        public static void Error(string caller, Exception ex) =>
            Console.Error.WriteLine($"[{caller}] {ex.GetType().Name}: {ex.Message}");
    }
}