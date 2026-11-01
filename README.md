# DarkSpot — Digital Dark Spot Research Intelligence

**Find what's missing. Discover information gaps, uncover conflicting claims, and identify what needs further investigation.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20DarkSpot-16a34a?style=for-the-badge)](https://darkspot-frontend.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/sivaraju-1220m/digital-dark-spot)

---

## 1. Overview

DarkSpot is an AI-powered web research intelligence platform designed to help users explore what information is missing from a topic.

Traditional search engines provide links, and AI tools often summarize available information. DarkSpot takes a different approach: it retrieves information from multiple web sources and uses AI to organize the findings into research claims, agreements, potential conflicts, evidence gaps, unanswered questions, and verification steps.

The goal is not simply to summarize what is already known, but to help users investigate what remains unclear.

## 2. The Problem

When researching a topic, users often face several challenges:

- Information is scattered across multiple websites and publications.
- Different sources may present different claims or interpretations.
- Important evidence may be missing or insufficient.
- Research limitations and unanswered questions can be difficult to identify.
- Verifying information manually can be time-consuming.

DarkSpot aims to make this research process more structured and accessible.

## 3. Our Solution

DarkSpot combines automatic web-source retrieval with AI-powered analysis to produce a structured research report.

A user enters a research question. The platform retrieves relevant web sources, analyses their available content, and presents findings in an organized workspace.

Instead of providing only a conventional summary, DarkSpot highlights potential information gaps and areas that deserve further verification.

## 4. Key Features

### 🔎 Automatic Web Research
- Accepts natural-language research questions.
- Automatically retrieves relevant web sources.
- Displays retrieved sources with links to their original publications.

### 🧠 AI-Powered Research Analysis
- Extracts key claims from retrieved material.
- Identifies agreements across multiple sources.
- Detects potential conflicts that require further investigation.
- Highlights evidence gaps and missing information.
- Generates unanswered research questions.

### 📋 Verification Checklist
- Provides suggested verification steps.
- Organizes verification tasks by priority.
- Helps users identify which findings need closer examination.

### 📚 Research Workspace
- Displays research results in a structured interface.
- Supports saving research.
- Provides research history.
- Includes settings for history management.
- Allows users to explore additional source content.

### 🔗 Source Transparency
- Displays source references alongside relevant findings.
- Provides links to original sources.
- Helps users inspect the evidence behind AI-generated analysis.

## 5. How It Works

```text
       USER RESEARCH QUESTION
                 |
                 v
       AUTOMATIC WEB SEARCH
                 |
                 v
        SOURCE RETRIEVAL
                 |
                 v
       AI-POWERED ANALYSIS
                 |
       +---------+---------+
       |         |         |
       v         v         v
     Claims   Agreements  Potential
                           Conflicts
       |         |         |
       +---------+---------+
                 |
                 v
          EVIDENCE GAPS
                 |
                 v
        UNANSWERED QUESTIONS
                 |
                 v
       VERIFICATION CHECKLIST
                 |
                 v
       STRUCTURED RESEARCH
              REPORT
```

## 6. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Build tool | Vite |
| Programming language | JavaScript |
| Styling | CSS |
| Icons | Lucide React |
| Backend | Python |
| Backend framework | FastAPI |
| Web search | Tavily API |
| AI analysis | Google Gemini API |
| Frontend hosting | Render |
| Backend hosting | Render |
| Version control | Git and GitHub |

## 7. Application Architecture

DarkSpot uses a separate frontend and backend architecture.

**Frontend**
- Provides the research interface and workspace.
- Collects research questions.
- Displays AI-generated findings and source references.
- Manages research history and user settings.

**Backend**
- Receives research requests from the frontend.
- Retrieves web information through the search integration.
- Uses the AI integration to analyse retrieved content.
- Returns structured research results to the frontend.

**External services**
- Tavily provides web search capabilities.
- Google Gemini provides AI-powered analysis.

The frontend communicates with the backend through HTTP API requests.

## 8. Live Application

**Try DarkSpot:**  
https://darkspot-frontend.onrender.com

**GitHub Repository:**  
https://github.com/sivaraju-1220m/digital-dark-spot

## 9. Local Installation and Setup

### Prerequisites

Install the following:

- Python
- Node.js and npm
- Git

### Step 1 — Clone the repository

```bash
git clone https://github.com/sivaraju-1220m/digital-dark-spot.git
cd digital-dark-spot
```

### Step 2 — Set up the backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the backend directory:

```env
TAVILY_API_KEY=your_tavily_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Never publish your actual API keys.

Start the backend:

```bash
uvicorn main:app --reload
```

The local backend will run at:

```text
http://127.0.0.1:8000
```

### Step 3 — Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend directory:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Open the local development URL displayed by Vite, usually:

```text
http://localhost:5173
```

## 10. Example Research Questions

Try questions such as:

**Environment**
> What are the environmental, economic, and social impacts of groundwater depletion in India, and what sustainable solutions have been proposed?

**Economics**
> How do India's GDP growth estimates differ across institutions, and what methodological factors explain the differences?

**Artificial Intelligence**
> What are the major unanswered research questions and conflicting findings in AI safety research?

These examples demonstrate how DarkSpot can be used across different research areas.

## 11. Limitations and Responsible Use

DarkSpot is a research-assistance tool, not an independent fact-verification authority.

- AI-generated findings may contain inaccuracies.
- Search relevance does not automatically indicate source credibility.
- Retrieved sources may contain incomplete information.
- Potential conflicts require examination of context, methodology, time period, and definitions.
- The absence of detected conflicts does not prove that no conflicting evidence exists.
- Source dates and freshness may not always be available.
- Direct URL submission is not currently supported in this prototype.
- Users should inspect original sources before relying on research findings.

DarkSpot is intended to support critical thinking and further investigation, not replace human judgment.

## 12. Future Improvements

Potential areas for further development include:

- More advanced source credibility assessment.
- Improved detection of outdated information.
- Better comparison of conflicting numerical claims.
- Expanded source coverage.
- User-provided URL analysis.
- More detailed evidence tracing.
- Exportable research reports.

## 13. Project Information

**Project:** Digital Dark Spot Research Intelligence  
**Project Name:** DarkSpot  
**Hackathon:** SHIN CHAN Online Hackathon 2026  
**Category:** AI-Powered Research Intelligence

---

**DarkSpot — Don't just find information. Find what's missing.**