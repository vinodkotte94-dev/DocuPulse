
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import "./Reminders.css";

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [generatingId, setGeneratingId] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  const loadData = async () => {
    try {
      const [reminderData, documentData] = await Promise.all([
        apiRequest("/reminders"),
        apiRequest("/documents")
      ]);

      setReminders(reminderData.reminders || []);
      setDocuments(documentData.documents || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeDocuments = documents.filter(
    (doc) => doc.status !== "Archived" && doc.expiryDate
  );

  const unreadCount = reminders.filter(
    (reminder) => !reminder.isRead
  ).length;

  const readCount = reminders.length - unreadCount;

  const filteredReminders = useMemo(() => {
    let result = [...reminders];

    if (filter === "unread") {
      result = result.filter((reminder) => !reminder.isRead);
    } else if (filter === "read") {
      result = result.filter((reminder) => reminder.isRead);
    }

    return result.sort(
      (a, b) =>
        new Date(a.scheduledDate) - new Date(b.scheduledDate)
    );
  }, [reminders, filter]);

  const generateReminders = async (documentId) => {
    setGeneratingId(documentId);
    setMessage("");

    try {
      const data = await apiRequest(
        `/reminders/generate/${documentId}`,
        { method: "POST" }
      );

      setMessage(data.message || "Reminders generated successfully!");
      await loadData();
    } catch (error) {
      setMessage(error.message || "Could not generate reminders.");
    } finally {
      setGeneratingId(null);
    }
  };

  const markAsRead = async (reminderId) => {
    setMarkingId(reminderId);
    setMessage("");

    try {
      await apiRequest(`/reminders/${reminderId}/read`, {
        method: "PATCH"
      });

      setReminders((previous) =>
        previous.map((reminder) =>
          reminder._id === reminderId
            ? { ...reminder, isRead: true }
            : reminder
        )
      );

      setMessage("Reminder marked as read.");
    } catch (error) {
      setMessage(error.message || "Could not update reminder.");
    } finally {
      setMarkingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return <p className="reminder-loading">Loading reminders...</p>;
  }

  return (
    <div className="reminders-page">
      <div className="reminders-heading">
        <div>
          <h2>Notification Center</h2>
          <p className="reminder-subtitle">
            Manage your document expiry reminders in one place.
          </p>
        </div>

        <button className="refresh-reminders" onClick={loadData}>
          Refresh
        </button>
      </div>

      {message && (
        <p className="reminder-message" role="status">
          {message}
        </p>
      )}

      <div className="reminder-stat-grid">
        <div className="reminder-stat-card">
          <span>Total Reminders</span>
          <h3>{reminders.length}</h3>
        </div>

        <div className="reminder-stat-card unread-stat">
          <span>Unread</span>
          <h3>{unreadCount}</h3>
        </div>

        <div className="reminder-stat-card read-stat">
          <span>Read</span>
          <h3>{readCount}</h3>
        </div>

        <div className="reminder-stat-card">
          <span>Active Documents</span>
          <h3>{activeDocuments.length}</h3>
        </div>
      </div>

      <div className="reminder-card">
        <div className="reminder-section-heading">
          <div>
            <h3>Generate Expiry Reminders</h3>
            <p>
              Create reminders 30, 7 and 1 day before a document expires.
            </p>
          </div>
        </div>

        {activeDocuments.length === 0 ? (
          <p className="empty-reminders">
            No active documents with expiry dates are available.
          </p>
        ) : (
          <div className="generate-list">
            {activeDocuments.map((doc) => (
              <div className="generate-item" key={doc._id}>
                <div className="generate-document-info">
                  <strong>{doc.name}</strong>
                  <p>{doc.category}</p>
                  <small>Expires: {formatDate(doc.expiryDate)}</small>
                </div>

                <button
                  onClick={() => generateReminders(doc._id)}
                  disabled={generatingId !== null}
                >
                  {generatingId === doc._id
                    ? "Generating..."
                    : "Generate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="reminder-card">
        <div className="reminder-section-heading">
          <div>
            <h3>My Notifications</h3>
            <p>Track and manage your document expiry alerts.</p>
          </div>

          <span className="notification-count">
            {unreadCount} unread
          </span>
        </div>

        <div className="reminder-filters">
          <button
            className={filter === "all" ? "selected" : ""}
            onClick={() => setFilter("all")}
          >
            All ({reminders.length})
          </button>

          <button
            className={filter === "unread" ? "selected" : ""}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </button>

          <button
            className={filter === "read" ? "selected" : ""}
            onClick={() => setFilter("read")}
          >
            Read ({readCount})
          </button>
        </div>

        {filteredReminders.length === 0 ? (
          <div className="empty-reminders">
            <h4>No notifications found</h4>
            <p>
              {filter === "unread"
                ? "You have no unread reminders."
                : filter === "read"
                ? "You have not read any reminders yet."
                : "Generate reminders above to see notifications here."}
            </p>
          </div>
        ) : (
          <div className="reminder-list">
            {filteredReminders.map((reminder) => (
              <div
                className={`reminder-item ${
                  reminder.isRead ? "reminder-read" : "reminder-unread"
                }`}
                key={reminder._id}
              >
                <div className="reminder-item-info">
                  <div className="reminder-title-row">
                    <h4>
                      {reminder.document?.name || "Document"}
                    </h4>

                    <span
                      className={
                        reminder.isRead
                          ? "read-status"
                          : "unread-status"
                      }
                    >
                      {reminder.isRead ? "Read" : "Unread"}
                    </span>
                  </div>

                  <p className="reminder-description">
                    Expiry reminder: {reminder.daysBefore} days before expiry.
                  </p>

                  <p className="reminder-date">
                    Scheduled date: {formatDate(reminder.scheduledDate)}
                  </p>
                </div>

                {!reminder.isRead && (
                  <button
                    className="mark-read-button"
                    onClick={() => markAsRead(reminder._id)}
                    disabled={markingId !== null}
                  >
                    {markingId === reminder._id
                      ? "Updating..."
                      : "Mark as Read"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reminders;
