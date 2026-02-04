using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SurveyApi.Models
{
    public class Question
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Text { get; set; } = null!;
        
        [Required]
        public int SurveyId { get; set; }
        
        [JsonIgnore] 
        public Survey? Survey { get; set; }
        
        public List<Option> Options { get; set; } = new List<Option>();
    }
}