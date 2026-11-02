# AutoProcure AI

AutoProcure AI is an intelligent procurement automation platform built for enterprise purchasing workflows. It combines deterministic procurement logic with Google Gemini-powered reasoning to standardize item descriptions, detect anomalies, recommend actions, and support human approval decisions.

This project was developed as part of the Aspire Pak Angels Final Hackathon and demonstrates how AI and operational rules can be combined to improve purchasing decisions, reduce manual effort, and create audit-friendly workflows.

## Overview

AutoProcure AI helps teams:

- Normalize messy purchase descriptions into ERP-friendly item names
- Match requests to a master catalog of standard SKUs
- Detect budget variance, operational anomalies, and low-confidence matches
- Recommend approval, reduction, investigation, hold, or expedite actions
- Track procurement sessions and approval decisions over time
- Handle uploaded spreadsheet-based procurement files

## Key Features

### AI-powered procurement intelligence
- Standardizes raw purchase descriptions with Gemini
- Validates AI output before accepting it
- Uses deterministic fallback logic when AI is unavailable or malformed
- Produces human-readable procurement explanations

### Procurement decision engine
- Evaluates item quantity, cost, budget variance, and stock availability
- Recommends procurement decisions based on predefined logic
- Supports different operational decision states

### Human approval workflow
- Maintains session-based agent workflows
- Supports human review and decision capture
- Keeps approval history and audit trail

### Operational features
- Dashboard and analytics views
- Request processing lifecycle
- Historical data exploration
- File upload support for Excel/CSV-style procurement data

## Tech Stack

- React + TypeScript
- Vite
- Express.js
- Node.js
- Firebase
- Google Gemini / GenAI
- Tailwind CSS
- Recharts
- xlsx

## Project Structure

```text
.
├── .env.example
├── .gitignore
├── bun.lock
├── firebase-applet-config.json
├── firebase-blueprint.json
├── firestore.rules
├── index.html
├── metadata.json
├── package.json
├── server.ts
├── storage.rules
├── tsconfig.json
├── vite.config.ts
├── public/
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── services/
│   ├── types/
│   ├── views/
│   ├── index.css
│   └── main.tsx
└── data/
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- A Google Gemini API key

### Install dependencies

```bash
npm install
```

or

```bash
bun install
```

### Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Then fill in your values:

```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
```

## Run the app

```bash
npm run dev
```

The app runs on:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev      # Start the Express + Vite development server
npm run build    # Build backend and frontend for production
npm run start    # Start the production build
npm run preview  # Preview the built frontend
npm run lint     # Run TypeScript checks
npm run clean    # Remove build artifacts
```

## Application Workflow

1. A user submits a procurement request or item description.
2. The system standardizes the description to a catalog-friendly format.
3. It checks for low-confidence matches, budget issues, or other anomalies.
4. A deterministic decision engine evaluates the request.
5. Gemini can add executive reasoning or summarization without overriding core logic.
6. A human reviewer approves or adjusts the decision.
7. Session activity and decisions are tracked for auditability.

## Backend API Highlights

The server exposes procurement and agent APIs such as:

- `GET /api/health` — health check and Gemini configuration status
- `POST /api/gemini/standardize` — standardize raw purchase descriptions
- `POST /api/gemini/explain-anomalies` — explain procurement anomalies
- `POST /api/gemini/test-suite` — validate AI fallback and resilience behavior
- `POST /api/files/upload` — upload spreadsheet or document files
- `GET /api/files` — list uploaded files
- `POST /api/agent/procurement-agent` — execute an agentic procurement session
- `GET /api/agent/sessions` — list agent sessions
- `GET /api/agent/history` — view procurement workflow history
- `POST /api/agent/approval` — process human approval decisions

## Deployment

This project is structured as a full-stack application with both frontend and backend logic in one codebase. It is intended to run in a Node-compatible environment and can be adapted for platforms such as Vercel, Cloud Run, or a custom deployment environment.

## Notes

- If `GEMINI_API_KEY` is missing or invalid, the app falls back to deterministic logic so it remains operational.
- The code includes validation safeguards to handle malformed AI output.
- Firebase configuration files are included, suggesting potential integration with cloud-based data storage and enterprise systems.

## License

No license file is present in the repository at this time.

## Contributing

Contributions are welcome. Suggested areas of improvement include:

- enhancing catalog matching logic
- expanding agent-based procurement workflows
- improving analytics and UI flows
- adding deeper enterprise system integrations

## Project Context

This repository demonstrates a practical approach to using generative AI and agentic workflows in an enterprise procurement setting. It combines:
- deterministic business logic
- AI-assisted analysis
- human oversight
- auditability and workflow tracking

This makes it suitable as a procurement decision support prototype or hackathon solution for modern enterprise operations.
