#region HEADER
//  • GovtechHelpDesk
//   └ GovtechHelpDesk.Services
//    └ DbServiceCollectionExtensions.cs
// 
// Created 16/08/2017 12:34
// Updated 21/08/2017 17:34 by Sam (Sam)
#endregion

using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Data;

namespace HelpDeskNet8.Services
{

    public static class ServiceCollectionExtensions
    {

        public static IServiceCollection AddDBConnection(this IServiceCollection services, string connectionstring)
        {
            if (services == null)
            {
                throw new ArgumentNullException(nameof(services));
            }

            services.TryAdd(ServiceDescriptor.Scoped<IDbConnection>(sp => new SqlConnection(connectionstring)));

            return services;
        }

    }

}