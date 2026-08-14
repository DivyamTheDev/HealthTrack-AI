import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginView from './views/LoginView.jsx';
import PatientDashboard from './views/PatientDashboard.jsx';
import ClinicianDashboard from './views/ClinicianDashboard.jsx';
import { RefreshCw } from 'lucide-react';

const DashboardRouter = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center">
        <RefreshCw className="h-10 w-10 text-zinc-700 animate-spin mb-4" />
        <span className="text-zinc-400 font-sans text-xs">Synchronizing credentials...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (user.role === 'clinician') {
    return <ClinicianDashboard />;
  }

  if (user.role === 'patient') {
    return <PatientDashboard />;
  }

  // Fallback
  return <LoginView />;
};

function App() {
  return (
    <AuthProvider>
      <DashboardRouter />
    </AuthProvider>
  );
}

export default App;
