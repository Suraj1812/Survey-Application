namespace SurveyApi
{
    public interface IEmailService
    {
        Task SendInvitationEmailAsync(string to, string uniqueLink, string surveyTitle, string surveyDescription);
    }
}