# HealthTrack AI — Preventive Health Platform Prototype

HealthTrack AI is a preventive-health intelligence platform prototype designed to demonstrate clinical data orchestration, trend analysis, human-in-the-loop AI synthesis, and security auditing. 

The application is structured into a Node.js Express backend connected to MongoDB Atlas and a modern Vite + React frontend styled with Tailwind CSS.

---

##LIVE LINK##
health-track-ai-two.vercel.app

## 🚀 Key Features

1. **Patient / Member Dashboard**
   - Interactive KPI cards for tracked biomarkers: LDL, Vitamin D, and HbA1c.
   - Trend charts displaying chronological measurement progress using Recharts.
   - Comprehensive timeline combining test completions, doctor consults, and health evaluations.

2. **Clinician / Doctor Console**
   - Active patient roster showing assigned patients.
   - Clinical notes manager to append session observations.
   - **AI Synthesis Workspace**: Automated generation of draft summaries (via Groq Llama 3) with inline clinical editors and Approve/Reject controls (Human-in-the-Loop design pattern).
   - Real-time audit log interface showing system access.

3. **External Laboratory Webhook Ingestion**
   - Unauthenticated `POST /api/lab/webhook` endpoint simulating clinical laboratory reports.
   - Validates values, maps biomarkers, saves results, and automatically logs events to the audit trail.

4. **Security & Audit Logging**
   - Role-based Access Control (RBAC) preventing patients from accessing clinician panels or other patients' records.
   - Robust audit service capturing logins, record lookups, note additions, AI evaluations, and webhook ingestions.

---

## 🛠️ Technology Stack

* **Frontend**: React (v18), Vite, Tailwind CSS, Recharts (visualizations), Lucide React (icons).
* **Backend**: Node.js, Express.js, Mongoose (MongoDB ODM), JSON Web Tokens (auth), BCrypt.js (password hashing).
* **Database**: MongoDB Atlas.
* **AI Engine**: Groq Llama 3.1 API.

---

## 📂 Project Structure

```
healthtrack-ai/
├── backend/
│   ├── src/
│   │   ├── models/       # Mongoose Schemas (User, Patient, Clinician, LabResult, Notes, AISummary, AuditLog)
│   │   ├── middleware/   # JWT authentication & role-based route guards
│   │   ├── routes/       # Auth, Patients, Notes, AI, Webhook, and Audit API routes
│   │   ├── services/     # Groq synthesis prompt design and Audit logging services
│   │   ├── db.js         # Connection driver
│   │   └── server.js     # Express application entry
│   ├── .env              # Environment configurations (ignored by git)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/      # AuthContext session state manager
    │   ├── views/        # LoginView, PatientDashboard, ClinicianDashboard
    │   ├── App.jsx
    │   └── index.css
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
- Node.js (v18+)
- npm (v10+)
- A MongoDB Atlas Database or local Mongo daemon.

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `backend/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@your-cluster.mongodb.net/healthtrack-ai?tlsAllowInvalidCertificates=true
   JWT_SECRET=your_jwt_secret_key
   GROQ_API_KEY=your_groq_api_key
   ```
   *(Note: `tlsAllowInvalidCertificates=true` bypasses local TLS handshake validation blocks commonly found in Windows network environments).*
4. Seed the database with clinical mock data:
   ```bash
   npm run seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *(Backend will listen on `http://localhost:5000`)*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React client:
   ```bash
   npm run dev
   ```
   *(Frontend will open on `http://localhost:3000`)*

---

## 🧪 Integration Testing

We have included a complete API test suite script. Once the backend server is running, you can run the test script:
```bash
cd backend
node src/test-api.js
```
The script will programmatically:
1. Log in as a clinician and retrieve a JWT token.
2. Search and pull the patient profile for "Divyam".
3. Add a clinical observation note.
4. Call the Groq AI model to synthesize Divyam's blood trends and notes.
5. Approve the AI evaluation with an addendum.
6. Simulate a lab ingestion webhook for LDL.
7. Retrieve and print the recent security audit log trail.

---

## 🔌 Lab Webhook Ingest Command (Simulation)

To test the event flow representing how external laboratory clinical systems integrate with our platform, trigger a POST request:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/lab/webhook" -Method Post -ContentType "application/json" -Body '{"patientId": "REPLACE_WITH_PATIENT_ID", "test": "LDL", "value": "128", "unit": "mg/dL"}'
```
Once executed, the new record immediately shows up in the patient's Recharts history and timeline logs!
