using HelpDeskNet8.Infrastructure;
using HelpDeskNet8.Interfaces.Attachments;
using HelpDeskNet8.Interfaces.Notes;
using HelpDeskNet8.Interfaces.RFCs;
using HelpDeskNet8.Interfaces.Shared;
using HelpDeskNet8.Interfaces.Tasks;
using HelpDeskNet8.Interfaces.Tickets;
using HelpDeskNet8.Interfaces.Users;
using HelpDeskNet8.Services;
using Microsoft.ApplicationInsights.AspNetCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.SetBasePath(Directory.GetCurrentDirectory());
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

var connectionString = builder.Configuration.GetConnectionString("testgovtechhelpdesk");

builder.Services.AddDBConnection(connectionString);

builder.Services.AddScoped<IAuthenticator>(provider =>
    new Authenticator(connectionString));

builder.Services.AddScoped<ITicketManager, TicketManager>();
builder.Services.AddScoped<IUserManager, UserManager>();
builder.Services.AddScoped<IDropdowns, DropdownManager>();
builder.Services.AddScoped<INoteManager, NoteManager>();
builder.Services.AddScoped<IHistory, HistoryManager>();
builder.Services.AddScoped<IAttachmentManager, AttachmentManager>();
builder.Services.AddScoped<IRFCManager, RFCManager>();
builder.Services.AddScoped<IReports, ReportManager>();
builder.Services.AddScoped<ITaskManager, TaskManager>();
builder.Services.AddScoped<IMiscManager, MiscManager>();

builder.Services.AddApplicationInsightsTelemetry();
builder.Services.AddSingleton<JavaScriptSnippet>();

if (!builder.Environment.IsDevelopment())
{
    builder.Services.Configure<MvcOptions>(o => o.Filters.Add(new RequireHttpsAttribute()));
}

builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add<AuthenticateActionFilter>();
});
builder.Services.AddScoped<AuthenticateActionFilter>();

// CORS: restrict to origins listed under "Cors:AllowedOrigins" in config.
// Falls back to the previous permissive behaviour only while none are set,
// so nothing changes until you populate that setting - then it locks down.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigins is { Length: > 0 })
            policy.WithOrigins(corsOrigins).AllowAnyMethod().AllowAnyHeader();
        else
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader(); // TODO: set Cors:AllowedOrigins
    });
});

var app = builder.Build();

app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

//app.UseHttpsRedirection();

var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".less"] = "text/css";
provider.Mappings[".js"] = "application/javascript";
provider.Mappings[".mjs"] = "application/javascript";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider,
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name.EndsWith(".js", StringComparison.OrdinalIgnoreCase) ||
            ctx.File.Name.EndsWith(".mjs", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Content-Type"] = "application/javascript; charset=utf-8";
        }

        if (app.Environment.IsDevelopment())
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            ctx.Context.Response.Headers["Pragma"] = "no-cache";
            ctx.Context.Response.Headers["Expires"] = "0";
        }
    }
});

app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
