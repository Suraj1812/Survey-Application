import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute, Router, NavigationEnd } from "@angular/router";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit {
  currentView = "home";
  isRespondentMode: boolean = false;
  survey = {
    title: "",
    description: "",
    questions: [
      {
        text: "",
        options: ["", ""],
      },
    ],
  };

  trackByIndex(index: number, item: any) {
    return index;
  }

  detailedReport: any[] = [];
  showDetailedReport: boolean = false;
  emails: string[] = [""];
  uniqueLink = "";
  responseSurvey: any;
  answers: any = {};
  report: any;
  surveyId: number = 0;
  toastMessage: string = "";
  toastType: "success" | "error" = "success";
  showToast: boolean = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkHashForSurveyLink();
      }
    });

    this.checkHashForSurveyLink();
  }

  checkHashForSurveyLink() {
    const hash = window.location.hash;
    if (hash && hash.includes("/survey/")) {
      const parts = hash.split("/");
      if (parts.length >= 3) {
        this.uniqueLink = parts[2];
        this.currentView = "respond";
        this.isRespondentMode = true;
        this.loadSurveyForResponse();
      }
    } else {
      this.isRespondentMode = false;
    }
  }

  showNotification(message: string, type: "success" | "error" = "success") {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  addQuestion() {
    this.survey.questions.push({
      text: "",
      options: ["", ""],
    });
  }

  removeQuestion(index: number) {
    this.survey.questions.splice(index, 1);
  }

  addOption(qIndex: number) {
    this.survey.questions[qIndex].options.push("");
  }

  removeOption(qIndex: number, oIndex: number) {
    this.survey.questions[qIndex].options.splice(oIndex, 1);
  }

  createSurvey() {
    if (!this.survey.title.trim()) {
      this.showNotification("Survey title is required", "error");
      return;
    }

    if (!this.survey.description.trim()) {
      this.showNotification("Survey description is required", "error");
      return;
    }

    const surveyData = {
      title: this.survey.title,
      description: this.survey.description,
      questions: this.survey.questions.map((q) => ({
        text: q.text,
        options: q.options
          .filter((opt) => opt.trim() !== "")
          .map((opt) => ({ text: opt })),
      })),
    };

    this.http.post("http://localhost:5168/api/Survey", surveyData).subscribe(
      (res: any) => {
        this.surveyId = res.id;
        this.showNotification(`Survey created with ID: ${this.surveyId}`);
        this.currentView = "invite";
      },
      (error) => {
        console.error("Error creating survey:", error);
        this.showNotification(error.error || "Error creating survey.", "error");
      },
    );
  }

  addEmail() {
    this.emails.push("");
  }

  removeEmail(index: number) {
    this.emails.splice(index, 1);
  }

  sendInvitations() {
    const validEmails = this.emails.filter((e) => e.trim() !== "");
    if (validEmails.length === 0) {
      this.showNotification("Please add at least one email address", "error");
      return;
    }

    this.http
      .post(
        `http://localhost:5168/api/Survey/${this.surveyId}/invite`,
        validEmails,
      )
      .subscribe(
        () => {
          this.showNotification("Invitations sent successfully!");
          this.currentView = "home";
          this.emails = [""];
        },
        (error) => {
          console.error("Error sending invitations:", error);
          this.showNotification("Error sending invitations.", "error");
        },
      );
  }

  loadSurveyForResponse() {
    if (!this.uniqueLink || !this.uniqueLink.trim()) {
      this.showNotification("Please enter a survey link", "error");
      return;
    }

    this.http
      .get(`http://localhost:5168/api/Survey/respond/${this.uniqueLink}`)
      .subscribe(
        (res: any) => {
          this.responseSurvey = res.survey;
          this.currentView = "respond";
        },
        (error) => {
          console.error("Error loading survey:", error);
          this.showNotification(
            "Invalid survey link or survey already submitted",
            "error",
          );
          this.currentView = "home";
          this.isRespondentMode = true;
        },
      );
  }

  submitResponse() {
    if (Object.keys(this.answers).length === 0) {
      this.showNotification("Please answer at least one question", "error");
      return;
    }

    this.http
      .post(
        `http://localhost:5168/api/Survey/respond/${this.uniqueLink}`,
        this.answers,
      )
      .subscribe(
        () => {
          this.showNotification("Response submitted successfully!");
          this.currentView = "thankyou";
          this.isRespondentMode = true;
          this.answers = {};
          window.location.hash = "";
        },
        (error) => {
          console.error("Error submitting response:", error);
          this.showNotification("Error submitting response.", "error");
        },
      );
  }

  goToCreateSurvey() {
    this.survey = {
      title: "",
      description: "",
      questions: [
        {
          text: "",
          options: ["", ""],
        },
      ],
    };
    this.currentView = "create";
  }

  goToHome() {
    this.currentView = "home";
    this.uniqueLink = "";
    window.location.hash = "";
  }

  goToInvite() {
    if (!this.surveyId || this.surveyId === 0) {
      this.showNotification("Please create a survey first", "error");
      return;
    }
    this.currentView = "invite";
  }

  goToReport() {
    if (!this.surveyId || this.surveyId === 0) {
      this.showNotification("Please create a survey first", "error");
      return;
    }

    this.http
      .get(`http://localhost:5168/api/Survey/${this.surveyId}/report`)
      .subscribe(
        (res: any) => {
          this.report = res;
          this.showDetailedReport = false;
          this.currentView = "report";
        },
        (error) => {
          console.error("Error loading report:", error);
          this.showNotification(
            "No report found. Create survey, send invites and get responses first.",
            "error",
          );
        },
      );
  }

  loadDetailedReport() {
    this.http
      .get<
        any[]
      >(`http://localhost:5168/api/Survey/${this.surveyId}/report/details`)
      .subscribe(
        (res) => {
          this.detailedReport = res;
          this.showDetailedReport = true;
        },
        (error) => {
          console.error("Error loading detailed report:", error);
          this.showNotification("Error loading detailed report", "error");
        },
      );
  }
}
