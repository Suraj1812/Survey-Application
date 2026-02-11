import { Component, OnInit, OnDestroy } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute, Router, NavigationEnd } from "@angular/router";
import { environment } from "src/environments/environment";
import Chart from "chart.js/auto";
import { Subscription } from "rxjs";

interface Question {
  id?: number;
  text: string;
  options: string[];
}

interface Survey {
  id?: number;
  title: string;
  description: string;
  questions: Question[];
  totalResponses?: number;
  totalInvitations?: number;
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit, OnDestroy {
  currentView = "home";
  isRespondentMode: boolean = false;
  survey: Survey = {
    title: "",
    description: "",
    questions: [
      {
        text: "",
        options: ["", ""],
      },
    ],
  };

  allSurveys: Survey[] = [];
  selectedSurveyId: number | null = null;
  isLoadingSurveys: boolean = false;

  trackByIndex(index: number): number {
    return index;
  }

  radarChart: Chart | null = null;
  detailedReport: any[] = [];
  showDetailedReport: boolean = false;
  emails: string[] = [""];
  uniqueLink = "";
  responseSurvey: any;
  answers: { [key: number]: number } = {};
  report: any;
  surveyId: number = 0;
  toastMessage: string = "";
  toastType: "success" | "error" = "success";
  showToast: boolean = false;
  isSending: boolean = false;

  private routerSubscription!: Subscription;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkHashForSurveyLink();
      }
    });

    this.checkHashForSurveyLink();
    this.loadAllSurveys();
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.radarChart) {
      this.radarChart.destroy();
    }
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

  loadAllSurveys() {
    this.isLoadingSurveys = true;
    this.http.get<any[]>(`${environment.apiUrl}/api/Survey`).subscribe(
      (surveys) => {
        this.allSurveys = surveys;
        this.isLoadingSurveys = false;
      },
      (error) => {
        console.error("Error loading surveys:", error);
        this.isLoadingSurveys = false;
      },
    );
  }

  onSurveySelect() {
    if (this.selectedSurveyId) {
      this.surveyId = this.selectedSurveyId;
      const selectedSurvey = this.allSurveys.find(
        (s) => s.id === this.selectedSurveyId,
      );
      if (selectedSurvey) {
        this.showNotification(`Survey "${selectedSurvey.title}" selected`);
      }
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

    this.http.post(`${environment.apiUrl}/api/Survey`, surveyData).subscribe(
      (res: any) => {
        this.surveyId = res.id;
        this.showNotification(`Survey created with ID: ${this.surveyId}`);
        this.currentView = "invite";
        this.loadAllSurveys();
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
    if (this.isSending) return;

    const validEmails = this.emails.filter((e) => e.trim() !== "");
    if (validEmails.length === 0) {
      this.showNotification("Please add at least one email address", "error");
      return;
    }

    this.isSending = true;

    this.http
      .post(
        `${environment.apiUrl}/api/Survey/${this.surveyId}/invite`,
        validEmails,
      )
      .subscribe(
        () => {
          this.showNotification("Invitations sent successfully!");
          this.currentView = "home";
          this.emails = [""];
          this.isSending = false;
        },
        (error) => {
          console.error("Error sending invitations:", error);
          this.showNotification("Error sending invitations.", "error");
          this.isSending = false;
        },
      );
  }

  loadSurveyForResponse() {
    if (!this.uniqueLink || !this.uniqueLink.trim()) {
      this.showNotification("Please enter a survey link", "error");
      return;
    }

    this.http
      .get(`${environment.apiUrl}/api/Survey/respond/${this.uniqueLink}`)
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
        `${environment.apiUrl}/api/Survey/respond/${this.uniqueLink}`,
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
    this.loadAllSurveys();
  }

  goToInvite() {
    if (!this.selectedSurveyId && !this.surveyId) {
      this.showNotification("Please select or create a survey first", "error");
      return;
    }

    if (this.selectedSurveyId) {
      this.surveyId = this.selectedSurveyId;
    }

    this.currentView = "invite";
  }

  goToReport() {
    if (!this.selectedSurveyId && !this.surveyId) {
      this.showNotification("Please select or create a survey first", "error");
      return;
    }

    const reportSurveyId = this.selectedSurveyId || this.surveyId;

    this.http
      .get(`${environment.apiUrl}/api/Survey/${reportSurveyId}/report`)
      .subscribe(
        (res: any) => {
          this.report = res;
          this.showDetailedReport = false;
          this.currentView = "report";

          setTimeout(() => {
            this.renderRadarChart();
          }, 0);
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
    const reportSurveyId = this.selectedSurveyId || this.surveyId;

    this.http
      .get<
        any[]
      >(`${environment.apiUrl}/api/Survey/${reportSurveyId}/report/details`)
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

  renderRadarChart() {
    const canvas = document.getElementById(
      "surveyRadarChart",
    ) as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    if (!this.report || !this.report.questionReports) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const labels = this.report.questionReports.map(function (
      _: any,
      i: number,
    ) {
      return (i + 1).toString();
    });

    const insideValues = this.report.questionReports.map(function (q: any) {
      let total = 0;
      let count = 0;

      q.options.forEach(function (o: any) {
        const value = Number(o.optionText);
        if (!isNaN(value)) {
          total += value * o.count;
          count += o.count;
        }
      });

      return count ? +(total / count).toFixed(2) : 0;
    });

    const outsideValues = this.report.questionReports.map(function (q: any) {
      let total = 0;
      let count = 0;

      q.options.forEach(function (o: any) {
        const value = Number(o.optionText);
        if (!isNaN(value)) {
          total += value * o.count;
          count += o.count;
        }
      });

      if (!count) {
        return 0;
      }

      const avg = total / count;
      let maxDeviation = 0;
      let deviationValue = avg;

      q.options.forEach(function (o: any) {
        const value = Number(o.optionText);
        if (!isNaN(value)) {
          const deviation = Math.abs(value - avg);
          if (deviation > maxDeviation) {
            maxDeviation = deviation;
            deviationValue = value;
          }
        }
      });

      return +deviationValue.toFixed(2);
    });

    if (this.radarChart) {
      this.radarChart.destroy();
    }

    this.radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Inside view",
            data: insideValues,
            borderColor: "#3BC9DB",
            backgroundColor: "rgba(59,201,219,0.25)",
            borderWidth: 4,
            pointRadius: 4,
          },
          {
            label: "Outside view",
            data: outsideValues,
            borderColor: "#F06595",
            backgroundColor: "rgba(240,101,149,0.25)",
            borderWidth: 4,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 13,
              },
            },
          },
        },
        scales: {
          r: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              display: false,
            },
            grid: {
              color: "#e5e7eb",
            },
            angleLines: {
              color: "#e5e7eb",
            },
            pointLabels: {
              font: {
                size: 13,
                weight: "bold",
              },
              color: "#6b7280",
            },
          },
        },
        elements: {
          line: {
            tension: 0.35,
          },
        },
      },
    });
  }

  getSelectedSurveyTitle(): string {
    if (this.report && this.report.surveyTitle) {
      return this.report.surveyTitle;
    }

    const selectedId = Number(this.selectedSurveyId || this.surveyId);

    const selected = this.allSurveys.find((s) => s.id === selectedId);

    return selected ? selected.title : "N/A";
  }

  getReportSurveyId(): number {
    return this.selectedSurveyId || this.surveyId || 0;
  }

  getOptionPercentage(option: any): string {
    if (
      !option ||
      option.percentage === undefined ||
      option.percentage === null
    ) {
      return "0.00";
    }
    return option.percentage.toFixed(2);
  }
}
