using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SurveyApi.Models
{
    public class Option
    {
        [Key]
        public int Id { get; set; }
        
        [Required(ErrorMessage = "Option text is required")]
        public string Text { get; set; } = string.Empty;
        
        [Required]
        public int QuestionId { get; set; }
        
        [JsonIgnore] 
        public Question? Question { get; set; }
    }
}