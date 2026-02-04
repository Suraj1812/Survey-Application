using Microsoft.EntityFrameworkCore;
using SurveyApi.Models;

namespace SurveyApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Survey> Surveys { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<Option> Options { get; set; }
        public DbSet<Invitation> Invitations { get; set; }
        public DbSet<Response> Responses { get; set; }
    }
}