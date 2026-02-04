using System.Net;
using System.Net.Mail;
using System.Text;

namespace SurveyApi
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendInvitationEmailAsync(string to, string uniqueLink, string surveyTitle, string surveyDescription)
        {
            try
            {
                var smtpSettings = _config.GetSection("SmtpSettings");
                
                var host = smtpSettings["Host"] ?? "smtp.gmail.com";
                var port = ParsePort(smtpSettings["Port"]);
                var username = smtpSettings["Username"];
                var password = smtpSettings["Password"];
                var from = smtpSettings["From"] ?? "noreply@surveyapp.com";
                var baseUrl = smtpSettings["BaseUrl"] ?? "http://localhost:4200";
                
                using var smtpClient = new SmtpClient(host)
                {
                    Port = port,
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 10000
                };

                var surveyUrl = $"{baseUrl}/#/survey/{uniqueLink}";
                
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(from, "Survey App"),
                    Subject = $"Survey Invitation: {surveyTitle}",
                    Body = BuildHtmlBody(surveyTitle, surveyDescription, surveyUrl),
                    IsBodyHtml = true,
                    Priority = MailPriority.High,
                    BodyEncoding = Encoding.UTF8
                };
                
                mailMessage.To.Add(new MailAddress(to));
                
                _logger.LogInformation($"Sending survey invitation to: {to}");
                await smtpClient.SendMailAsync(mailMessage);
                _logger.LogInformation($"Successfully sent invitation to: {to}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {to}");
                throw;
            }
        }

        private int ParsePort(string portString)
        {
            if (int.TryParse(portString, out int port))
            {
                return port;
            }
            return 587;
        }

        private string BuildHtmlBody(string surveyTitle, string surveyDescription, string surveyUrl)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;'>
    <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 4px; overflow: hidden;'>
        <div style='background: #2563eb; color: white; padding: 20px; text-align: center;'>
            <h1 style='margin: 0; font-size: 22px;'>Survey Invitation</h1>
        </div>
        
        <div style='padding: 25px;'>
            <p>You have been invited to complete a survey.</p>
            
            <div style='font-size: 18px; font-weight: bold; color: #2563eb; margin: 15px 0 5px 0;'>{surveyTitle}</div>
            <div style='color: #666; margin-bottom: 20px;'>{surveyDescription}</div>
            
            <div style='text-align: center; margin: 25px 0;'>
                <a href='{surveyUrl}' style='display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 16px; font-weight: bold;'>
                    Take Survey
                </a>
            </div>
            
            <div style='background: #f0f9ff; padding: 12px; margin: 15px 0; border-left: 3px solid #2563eb;'>
                Time required: 5-10 minutes
            </div>
            
            <div style='margin: 20px 0;'>
                <div style='color: #666; font-size: 14px; margin-bottom: 5px;'>Or use this link:</div>
                <a href='{surveyUrl}' style='color: #2563eb; word-break: break-all;'>{surveyUrl}</a>
            </div>
            
            <div style='border-top: 1px solid #eee; padding-top: 20px; margin-top: 25px; font-size: 12px; color: #888;'>
                <p>This link is unique to you. Do not share it.</p>
                <p>This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>";
        }
    }
}