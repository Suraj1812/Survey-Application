using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SurveyApi.Data;
using SurveyApi.Models;

namespace SurveyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SurveyController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<SurveyController> _logger;

        public SurveyController(AppDbContext context, IEmailService emailService, ILogger<SurveyController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllSurveys()
        {
            var surveys = await _context.Surveys
                .OrderByDescending(s => s.Id)
                .Select(s => new 
                { 
                    s.Id, 
                    s.Title,
                    s.Description,
                    TotalInvitations = s.Invitations.Count,
                    TotalResponses = s.Invitations.Count(i => i.IsSubmitted)
                })
                .ToListAsync();
                
            return Ok(surveys);
        }

        [HttpPost]
        public async Task<IActionResult> CreateSurvey([FromBody] Survey survey)
        {
            if (survey.Questions == null || survey.Questions.Count == 0)
            {
                return BadRequest("Survey must have at least one question.");
            }

            foreach (var question in survey.Questions)
            {
                if (question.Options == null || question.Options.Count < 2 || question.Options.Count > 5)
                {
                    return BadRequest($"Question '{question.Text}' must have 2 to 5 options.");
                }
                
                question.Survey = null;
                question.SurveyId = 0;
                
                if (question.Options != null)
                {
                    question.Options = question.Options
                        .Where(option => !string.IsNullOrWhiteSpace(option.Text))
                        .ToList();
                    
                    if (question.Options.Count < 2)
                    {
                        return BadRequest($"Question '{question.Text}' must have at least 2 options with text.");
                    }
                    
                    foreach (var option in question.Options)
                    {
                        option.Question = null;
                        option.QuestionId = 0;
                    }
                }
            }

            _context.Surveys.Add(survey);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSurvey), new { id = survey.Id }, survey);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSurvey(int id)
        {
            var survey = await _context.Surveys
                .Include(s => s.Questions)
                    .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(s => s.Id == id);
            
            if (survey == null)
                return NotFound();
                
            return Ok(survey);
        }

        [HttpPost("{surveyId}/invite")]
        public async Task<IActionResult> InviteRespondents(int surveyId, [FromBody] List<string> emails)
        {
            try
            {
                var survey = await _context.Surveys.FindAsync(surveyId);
                if (survey == null)
                    return NotFound("Survey not found");

                if (emails == null || !emails.Any())
                    return BadRequest("No email addresses provided");

                var distinctEmails = emails.Distinct().ToList();
                var sentEmails = new List<string>();
                var failedEmails = new List<string>();
                
                foreach (var email in distinctEmails)
                {
                    try
                    {
                        if (!IsValidEmail(email))
                        {
                            _logger.LogWarning($"Invalid email format: {email}");
                            failedEmails.Add(email);
                            continue;
                        }

                        var existingInvitation = await _context.Invitations
                            .FirstOrDefaultAsync(i => i.Email == email && i.SurveyId == surveyId);
                        
                        if (existingInvitation != null)
                        {
                            _logger.LogInformation($"Email already invited: {email}");
                            continue;
                        }

                        var uniqueLink = Guid.NewGuid().ToString();
                        var invitation = new Invitation 
                        { 
                            Email = email, 
                            SurveyId = surveyId,
                            UniqueLink = uniqueLink,
                            IsSubmitted = false
                        };
                        
                        _context.Invitations.Add(invitation);
                        
                        await _emailService.SendInvitationEmailAsync(
                            email, 
                            uniqueLink, 
                            survey.Title, 
                            survey.Description
                        );
                        
                        sentEmails.Add(email);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to send invitation to {email}");
                        failedEmails.Add(email);
                    }
                }
                
                await _context.SaveChangesAsync();
                
                return Ok(new 
                { 
                    message = "Invitations processed successfully!",
                    sentCount = sentEmails.Count,
                    failedCount = failedEmails.Count,
                    sentEmails = sentEmails,
                    failedEmails = failedEmails
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in InviteRespondents");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("respond/{uniqueLink}")]
        public async Task<IActionResult> GetSurveyForResponse(string uniqueLink)
        {
            var invitation = await _context.Invitations
                .Include(i => i.Survey)
                    .ThenInclude(s => s.Questions)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(i => i.UniqueLink == uniqueLink && !i.IsSubmitted);
                
            if (invitation == null)
                return NotFound("Invalid or already used survey link");
                
            return Ok(new 
            { 
                Survey = invitation.Survey,
                InvitationId = invitation.Id
            });
        }

        [HttpPost("respond/{uniqueLink}")]
        public async Task<IActionResult> SubmitResponse(string uniqueLink, [FromBody] Dictionary<int, int> answers)
        {
            var invitation = await _context.Invitations
                .FirstOrDefaultAsync(i => i.UniqueLink == uniqueLink && !i.IsSubmitted);
                
            if (invitation == null)
                return BadRequest("Invalid or already submitted link");

            if (answers == null || answers.Count == 0)
                return BadRequest("No answers provided");

            foreach (var answer in answers)
            {
                var option = await _context.Options
                    .FirstOrDefaultAsync(o => o.Id == answer.Value && o.QuestionId == answer.Key);
                    
                if (option == null)
                {
                    return BadRequest($"Invalid option {answer.Value} for question {answer.Key}");
                }

                var response = new Response
                {
                    InvitationId = invitation.Id,
                    QuestionId = answer.Key,
                    OptionId = answer.Value
                };
                _context.Responses.Add(response);
            }
            
            invitation.IsSubmitted = true;
            await _context.SaveChangesAsync();
            
            return Ok(new { message = "Thank you for completing the survey!" });
        }

        [HttpGet("{surveyId}/report")]
        public async Task<IActionResult> GetReport(int surveyId)
        {
            var survey = await _context.Surveys
                .Include(s => s.Questions)
                    .ThenInclude(q => q.Options)
                .Include(s => s.Invitations)
                .FirstOrDefaultAsync(s => s.Id == surveyId);
                
            if (survey == null)
                return NotFound("Survey not found");

            var responses = await _context.Responses
                .Include(r => r.Option)
                    .ThenInclude(o => o.Question)
                .Include(r => r.Invitation)
                .Where(r => r.Invitation.SurveyId == surveyId)
                .ToListAsync();

            var totalResponses = survey.Invitations.Count(i => i.IsSubmitted);
            
            var questionReports = survey.Questions.Select(question => new
            {
                QuestionId = question.Id,
                QuestionText = question.Text,
                Options = question.Options.Select(option => new
                {
                    OptionId = option.Id,
                    OptionText = option.Text,
                    Count = responses.Count(r => r.OptionId == option.Id),
                    Percentage = totalResponses > 0 
                        ? Math.Round((responses.Count(r => r.OptionId == option.Id) * 100.0 / totalResponses), 2)
                        : 0
                })
            });

            var report = new
            {
                SurveyTitle = survey.Title,
                TotalInvitations = survey.Invitations.Count,
                TotalResponses = totalResponses,
                ResponseRate = survey.Invitations.Count > 0 
                    ? Math.Round((totalResponses * 100.0 / survey.Invitations.Count), 2)
                    : 0,
                QuestionReports = questionReports
            };
            
            return Ok(report);
        }

        [HttpGet("{surveyId}/report/details")]
        public async Task<IActionResult> GetDetailedReport(int surveyId)
        {
            var responses = await _context.Responses
                .Include(r => r.Invitation)
                .Include(r => r.Option)
                    .ThenInclude(o => o.Question)
                .Where(r => r.Invitation.SurveyId == surveyId)
                .ToListAsync();

            var result = responses
                .GroupBy(r => r.Invitation.Email)
                .Select(group => new
                {
                    Email = group.Key,
                    Answers = group.Select(r => new
                    {
                        Question = r.Option.Question.Text,
                        SelectedOption = r.Option.Text
                    }).ToList()
                });

            return Ok(result);
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }
    }
}