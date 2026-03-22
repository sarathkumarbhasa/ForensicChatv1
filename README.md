# ForensicChat

ForensicChat is a conversational telecom intelligence web application for field police officers. It allows officers to upload telecom datasets (CDR, IPDR, tower dumps) and query them using natural language.

## Features
- Natural Language Querying (English, Hindi, Telugu)
- Deterministic Analytics (Pandas + NetworkX)
- Zero Hallucination Risk (LLM used only for intent classification)
- Interactive Visualizations (Charts, Tables, Network Graphs)
- Firebase Integration (Session logging, Storage)

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Recharts, Firebase SDK
- **Backend**: FastAPI, Pandas, NetworkX, Gemini API, Firebase Admin SDK

## Setup Instructions

### 1. Firebase Setup
1. Create a Firebase project.
2. Enable Realtime Database and Storage.
3. Get your Web App config and add it to `src/firebase/config.js` or `.env`.
4. Generate a Service Account Key (JSON) from Firebase Settings > Service Accounts.
5. Save it as `firebase-adminsdk.json` in the `/backend` folder.

### 2. Backend Setup (FastAPI)
1. Navigate to the `/backend` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your `GEMINI_API_KEY` in a `.env` file or environment variable.
4. Run the server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### 3. Frontend Setup (React)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment
- **Frontend**: Can be deployed to Vercel, Netlify, or Firebase Hosting.
- **Backend**: Can be deployed to Google Cloud Run, Render, or Railway using the provided `Dockerfile`.
