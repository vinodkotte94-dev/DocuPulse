
import { useState } from "react";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Reminders from "./pages/Reminders";
import DocumentDetails from "./pages/DocumentDetails";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setActivePage("dashboard");
    setSelectedDocumentId(null);
  };

  const handleViewDetails = (id) => {
    setSelectedDocumentId(id);
    setActivePage("details");
  };

  const handleBackToDocuments = () => {
    setActivePage("documents");
    setSelectedDocumentId(null);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="dashboard">

      <header className="dashboard-header">
        <h1>DocuPulse</h1>

        <button onClick={handleLogout}>
          Logout
        </button>
      </header>

      <nav className="main-navigation">

        <button
          className={activePage === "dashboard" ? "active" : ""}
          onClick={() => setActivePage("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={
            activePage === "documents" || activePage === "details"
              ? "active"
              : ""
          }
          onClick={() => setActivePage("documents")}
        >
          Documents
        </button>

        <button
          className={activePage === "reminders" ? "active" : ""}
          onClick={() => setActivePage("reminders")}
        >
          Reminders
        </button>

      </nav>

      <main>

        {activePage === "dashboard" && (
          <>
            <div className="dashboard-content">
              <h2>Welcome, {user.name || "User"}!</h2>
              <p>Your personal document management system.</p>
            </div>

            <Dashboard />
          </>
        )}

        {activePage === "documents" && (
          <Documents onViewDetails={handleViewDetails} />
        )}

        {activePage === "reminders" && (
          <Reminders />
        )}

        {activePage === "details" && selectedDocumentId && (
          <DocumentDetails
            documentId={selectedDocumentId}
            onBack={handleBackToDocuments}
          />
        )}

      </main>

    </div>
  );
}

export default App;
