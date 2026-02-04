using System.ComponentModel.DataAnnotations;

namespace SurveyApi.Models
{
    public class Survey
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Title { get; set; } = null!; 
        
        [Required]
        public string Description { get; set; } = null!;
        
        public List<Question> Questions { get; set; } = new List<Question>();
        public List<Invitation> Invitations { get; set; } = new List<Invitation>();
    }
}