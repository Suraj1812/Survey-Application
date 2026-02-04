namespace SurveyApi.Models
{
    public class Invitation
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string UniqueLink { get; set; } = Guid.NewGuid().ToString();
        public bool IsSubmitted { get; set; } = false;
        public int SurveyId { get; set; }
        public Survey? Survey { get; set; }
    }
}