
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Load dashboard information
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [statsData, documentsData] = await Promise.all([
        apiRequest("/dashboard/stats"),
        apiRequest("/documents")
      ]);

      setStats(statsData.statistics);
      setDocuments(documentsData.documents || []);

    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <h3>Loading DocuPulse Dashboard...</h3>
        <p>Please wait while we fetch your documents.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Unable to load dashboard</h3>
        <p>{error}</p>

        <button onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  // Separate active and archived documents
  const activeDocuments = documents.filter(
    (doc) => doc.status !== "Archived"
  );

  // Statistics cards
  const cards = [
    {
      title: "Total Documents",
      value: stats?.totalDocuments ?? 0,
      icon: "📁",
      color: "blue",
      description: "All your documents"
    },
    {
      title: "Active Documents",
      value: stats?.activeDocuments ?? 0,
      icon: "📄",
      color: "green",
      description: "Currently in use"
    },
    {
      title: "Expired Documents",
      value: stats?.expiredDocuments ?? 0,
      icon: "⚠️",
      color: "red",
      description: "Need renewal"
    },
    {
      title: "Expiring Soon",
      value: stats?.expiringSoon ?? 0,
      icon: "⏰",
      color: "orange",
      description: "Within 7 days"
    },
    {
      title: "Upcoming Documents",
      value: stats?.upcomingDocuments ?? 0,
      icon: "📅",
      color: "purple",
      description: "Within 30 days"
    },
    {
      title: "Archived Documents",
      value: stats?.archivedDocuments ?? 0,
      icon: "🗄️",
      color: "gray",
      description: "Stored in archive"
    }
  ];

  // Latest five active documents
  const recentDocuments = [...activeDocuments]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    )
    .slice(0, 5);

  // Documents that need attention
  const attentionDocuments = activeDocuments
    .filter((doc) =>
      [
        "Expired",
        "Expires Today",
        "Expiring Soon",
        "Upcoming"
      ].includes(doc.expiryStatus)
    )
    .sort((a, b) => {
      const dateA = a.expiryDate
        ? new Date(a.expiryDate).getTime()
        : Infinity;

      const dateB = b.expiryDate
        ? new Date(b.expiryDate).getTime()
        : Infinity;

      return dateA - dateB;
    })
    .slice(0, 5);

  // Format dates
  const formatDate = (date) => {
    if (!date) return "No expiry date";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Status styling
  const getStatusClass = (status) => {
    switch (status) {
      case "Valid":
        return "status-valid";

      case "Expired":
        return "status-expired";

      case "Expires Today":
        return "status-today";

      case "Expiring Soon":
        return "status-soon";

      case "Upcoming":
        return "status-upcoming";

      default:
        return "status-default";
    }
  };

  return (
    <div className="dashboard-page">

      {/* DASHBOARD HEADER */}

      <div className="dashboard-heading">

        <div>
          <span className="dashboard-label">
            PERSONAL DOCUMENT MANAGEMENT
          </span>

          <h2>Dashboard Overview</h2>

          <p>
            Manage your documents and stay ahead of expiry dates.
          </p>
        </div>

        <div className="dashboard-date">
          <span>📅</span>

          {new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
          })}
        </div>

      </div>

      {/* STATISTICS */}

      <div className="stats-section-heading">
        <h3>Document Statistics</h3>
        <p>Overview of your personal document collection.</p>
      </div>

      <div className="stats-grid">

        {cards.map((card) => (
          <div
            className={`stats-card ${card.color}`}
            key={card.title}
          >

            <div className="stats-card-top">

              <span className="stats-title">
                {card.title}
              </span>

              <span className="stats-icon">
                {card.icon}
              </span>

            </div>

            <h3>{card.value}</h3>

            <p>{card.description}</p>

          </div>
        ))}

      </div>

      {/* DOCUMENT SECTIONS */}

      <div className="dashboard-sections">

        {/* RECENT DOCUMENTS */}

        <section className="dashboard-panel">

          <div className="panel-heading">

            <div>
              <h3>Recent Documents</h3>
              <p>Your latest added active documents.</p>
            </div>

            <span className="panel-icon">📂</span>

          </div>

          {recentDocuments.length === 0 ? (

            <p className="empty-state">
              No active documents added yet.
            </p>

          ) : (

            <div className="dashboard-document-list">

              {recentDocuments.map((doc) => (

                <div
                  className="dashboard-document"
                  key={doc._id}
                >

                  <div className="document-icon">
                    📄
                  </div>

                  <div className="document-details">

                    <h4>{doc.name}</h4>

                    <p>{doc.category}</p>

                  </div>

                  <span
                    className={`document-status ${getStatusClass(
                      doc.expiryStatus
                    )}`}
                  >
                    {doc.expiryStatus || "Unknown"}
                  </span>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* EXPIRY OVERVIEW */}

        <section className="dashboard-panel">

          <div className="panel-heading">

            <div>
              <h3>Expiry Overview</h3>
              <p>Documents that need your attention.</p>
            </div>

            <span className="panel-icon">⏳</span>

          </div>

          {attentionDocuments.length === 0 ? (

            <p className="empty-state">
              Great! No active documents currently need attention.
            </p>

          ) : (

            <div className="dashboard-document-list">

              {attentionDocuments.map((doc) => (

                <div
                  className="dashboard-document"
                  key={doc._id}
                >

                  <div className="document-icon">
                    📅
                  </div>

                  <div className="document-details">

                    <h4>{doc.name}</h4>

                    <p>
                      Expires: {formatDate(doc.expiryDate)}
                    </p>

                  </div>

                  <span
                    className={`document-status ${getStatusClass(
                      doc.expiryStatus
                    )}`}
                  >
                    {doc.expiryStatus}
                  </span>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>

      {/* DASHBOARD INFORMATION */}

      <div className="dashboard-info">

        <div className="info-icon">
          🛡️
        </div>

        <div>

          <h3>Your Documents, One Place.</h3>

          <p>
            DocuPulse helps you organize certificates, identity
            documents, insurance policies, warranties and
            subscriptions. Track expiry dates, manage renewals
            and keep your important documents organized.
          </p>

        </div>

      </div>

      {/* REFRESH */}

      <div className="dashboard-refresh">

        <button
          type="button"
          onClick={loadDashboard}
        >
          ↻ Refresh Dashboard
        </button>

      </div>

    </div>
  );
}

export default Dashboard;
