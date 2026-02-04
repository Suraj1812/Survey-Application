# Survey Application (.NET + Angular + PostgreSQL)

This project is a simple Survey Application built using:
- Backend: ASP.NET Core (.NET 6/7/8)
- Frontend: Angular
- Database: PostgreSQL
- Email: SMTP (Gmail/Mailtrap/MailHog)

It allows an admin to create surveys, send email invitations with unique links, collect responses, and view reports.

## Features

### Admin Side
- Create surveys with title and description
- Add MCQ questions with 2–5 options
- Send survey invitations via email
- View survey reports (votes and percentages)

### User Side
- Open survey using a unique link
- Submit survey without login
- Same link cannot be reused after submission

## Project Structure

SurveyApp/
├── SurveyApi          (ASP.NET Core backend)
├── survey-frontend   (Angular frontend)
└── README.md

## Prerequisites

- .NET SDK 6 or higher
- Node.js (v16+ recommended)
- Angular CLI
- PostgreSQL
- SMTP account (Gmail / Mailtrap / MailHog)

## Database Setup (PostgreSQL)

1. Create a database:
sql
CREATE DATABASE surveydb;

2. Update connection string in:

SurveyApi/appsettings.json

Example:

json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=surveydb;Username=postgres;Password=yourpassword"
}

3. Run migrations:

bash
dotnet ef database update

## SMTP Configuration

Update in `appsettings.json`:

json
"SmtpSettings": {
  "Host": "smtp.gmail.com",
  "Port": 587,
  "Username": "your_email@gmail.com",
  "Password": "your_app_password",
  "EnableSsl": true
}

You may use:

* Gmail SMTP
* Mailtrap (for testing)
* MailHog

## Backend Setup

bash
cd SurveyApi
dotnet restore
dotnet run

Backend will run at:

http://localhost:5168

## Frontend Setup

cd survey-frontend
npm install
ng serve

Frontend will run at:

http://localhost:4200

## How to Use

1. Open frontend in browser
2. Click **Create Survey**
3. Add title, description, questions and options
4. Create survey
5. Add respondent emails and send invitations
6. Respondents open email link and submit survey
7. Admin can view report from **Report** section

## API Endpoints (Main)

* POST `/api/Survey` → Create survey
* POST `/api/Survey/{id}/invite` → Send invitations
* GET `/api/Survey/respond/{token}` → Get survey by link
* POST `/api/Survey/respond/{token}` → Submit response
* GET `/api/Survey/{id}/report` → Summary report
* GET `/api/Survey/{id}/report/details` → Detailed report

## Assumptions

* No authentication is implemented (single admin assumed)
* Only MCQ type questions are supported
* One response per invitation link is allowed


## Demo Video

A demo video is provided showing:

* Survey creation
* Email sending
* Survey response
* Report generation

## Author

Suraj Singh