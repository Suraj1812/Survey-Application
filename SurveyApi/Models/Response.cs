namespace SurveyApi.Models
{
    public class Response
    {
        public int Id { get; set; }
        public int InvitationId { get; set; }
        public Invitation? Invitation { get; set; }
        public int OptionId { get; set; }
        public Option? Option { get; set; }
        public int QuestionId { get; set; }
    }
}