
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./DocumentDetails.css";

function DocumentDetails({ documentId, onBack }) {
  const [doc, setDoc] = useState(null);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadDetails = async () => {
    try {
      const documentData = await apiRequest(`/documents/${documentId}`);
      setDoc(documentData.document);

      const renewalData = await apiRequest(`/renewals/${documentId}`);
      setRenewals(renewalData.renewals || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [documentId]);

  const openFile = async (download = false) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `/api/documents/${documentId}/file${download ? "?download=true" : ""}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Unable to access the uploaded file.");
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      if (download) {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = doc.file?.originalName || "document";
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const newWindow = window.open(fileUrl, "_blank");

        if (!newWindow) {
          throw new Error("Please allow pop-ups to preview the file.");
        }
      }

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleRenewal = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!newExpiryDate) {
      setMessage("Please select the new expiry date.");
      return;
    }

    if (doc.expiryDate &&
        new Date(newExpiryDate) <= new Date(doc.expiryDate)) {
      setMessage("The new expiry date must be later than the current expiry date.");
      return;
    }

    try {
      await apiRequest(`/renewals/${documentId}`, {
        method: "POST",
        body: JSON.stringify({
          newExpiryDate,
          notes
        })
      });

      setMessage("Document renewed successfully!");
      setNewExpiryDate("");
      setNotes("");

      await loadDetails();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (loading) {
    return <p className="details-loading">Loading document details...</p>;
  }

  if (!doc) {
    return (
      <div className="details-page">
        <button className="back-button" onClick={onBack}>
          ← Back to Documents
        </button>
        <p>{message || "Document not found."}</p>
      </div>
    );
  }

  const expiry = doc.expiryDate
    ? new Date(doc.expiryDate).toLocaleDateString()
    : "No expiry date";

  const remainingDays = doc.expiryDate
    ? Math.ceil(
        (new Date(doc.expiryDate).setHours(0, 0, 0, 0) -
          new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="details-page">

      <button className="back-button" onClick={onBack}>
        ← Back to Documents
      </button>

      <div className="details-heading">
        <div>
          <h2>{doc.name}</h2>
          <p>Complete document information and renewal management.</p>
        </div>

        <span className="details-status">
          {doc.expiryStatus || "Not available"}
        </span>
      </div>

      {message && (
        <p className="details-message">{message}</p>
      )}

      <div className="details-grid">

        <section className="details-card">
          <h3>Document Information</h3>

          <div className="detail-row">
            <span>Document Name</span>
            <strong>{doc.name}</strong>
          </div>

          <div className="detail-row">
            <span>Category</span>
            <strong>{doc.category}</strong>
          </div>

          <div className="detail-row">
            <span>Issuer / Organization</span>
            <strong>{doc.issuer || "Not provided"}</strong>
          </div>

          <div className="detail-row">
            <span>Reference Number</span>
            <strong>{doc.referenceNumber || "Not provided"}</strong>
          </div>

          <div className="detail-row">
            <span>Issue Date</span>
            <strong>
              {doc.issueDate
                ? new Date(doc.issueDate).toLocaleDateString()
                : "Not provided"}
            </strong>
          </div>

          <div className="detail-row">
            <span>Expiry Date</span>
            <strong>{expiry}</strong>
          </div>

          <div className="detail-row">
            <span>Document Status</span>
            <strong>{doc.expiryStatus || "Not available"}</strong>
          </div>
        </section>

        <section className="details-card">
          <h3>Expiry Overview</h3>

          <div className="expiry-number">
            {remainingDays === null
              ? "—"
              : remainingDays < 0
              ? Math.abs(remainingDays)
              : remainingDays}
          </div>

          <p>
            {remainingDays === null
              ? "No expiry date set"
              : remainingDays < 0
              ? "Days since expiry"
              : remainingDays === 0
              ? "Expires today"
              : "Days remaining"}
          </p>

          <div className="detail-file-section">
            <h4>Uploaded Certificate</h4>

            {doc.file?.storedName ? (
              <>
                <p>{doc.file.originalName}</p>

                <button
                  className="details-action-button"
                  onClick={() => openFile(false)}
                >
                  View Certificate
                </button>

                <button
                  className="details-download-button"
                  onClick={() => openFile(true)}
                >
                  Download Certificate
                </button>
              </>
            ) : (
              <p>No certificate has been uploaded.</p>
            )}
          </div>
        </section>

      </div>

      <section className="details-card renewal-card">
        <h3>Renew Document</h3>

        <p>Record a renewal when this document receives a new expiry date.</p>

        <form onSubmit={handleRenewal} className="renewal-form">

          <label htmlFor="newExpiryDate">New Expiry Date</label>

          <input
            id="newExpiryDate"
            type="date"
            value={newExpiryDate}
            onChange={(e) => setNewExpiryDate(e.target.value)}
            min={doc.expiryDate
              ? new Date(new Date(doc.expiryDate).getTime() + 86400000)
                  .toISOString()
                  .slice(0, 10)
              : undefined}
            required
          />

          <label htmlFor="renewalNotes">Renewal Notes</label>

          <textarea
            id="renewalNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter optional renewal details..."
            rows="3"
          />

          <button type="submit" className="renewal-submit">
            Save Renewal
          </button>

        </form>
      </section>

      <section className="details-card renewal-history-card">
        <h3>Renewal History</h3>

        {renewals.length === 0 ? (
          <p>No renewal history available yet.</p>
        ) : (
          <div className="renewal-history-list">
            {renewals.map((item) => (
              <div className="renewal-history-item" key={item._id}>
                <div>
                  <strong>Document Renewed</strong>
                  <p>
                    Previous expiry:{" "}
                    {item.oldExpiryDate
                      ? new Date(item.oldExpiryDate).toLocaleDateString()
                      : "Not available"}
                  </p>
                  <p>
                    New expiry:{" "}
                    {item.newExpiryDate
                      ? new Date(item.newExpiryDate).toLocaleDateString()
                      : "Not available"}
                  </p>
                  {item.notes && <p>Notes: {item.notes}</p>}
                </div>

                <span>
                  {item.renewedOn
                    ? new Date(item.renewedOn).toLocaleDateString()
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

export default DocumentDetails;
