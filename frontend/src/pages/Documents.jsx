
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./Documents.css";

function Documents({ onViewDetails }) {
  const emptyForm = {
    name: "",
    category: "",
    issuer: "",
    referenceNumber: "",
    issueDate: "",
    expiryDate: ""
  };

  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Active or Archived view
  const [documentView, setDocumentView] = useState("Active");

  // Load documents
  const loadDocuments = async () => {
    try {
      const data = await apiRequest("/documents");
      setDocuments(data.documents || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Separate active and archived documents
  const activeDocuments = documents.filter(
    (doc) => doc.status !== "Archived"
  );

  const archivedDocuments = documents.filter(
    (doc) => doc.status === "Archived"
  );

  const currentDocuments =
    documentView === "Active"
      ? activeDocuments
      : archivedDocuments;

  // Search and filter documents
  const filteredDocuments = currentDocuments.filter((doc) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      doc.name?.toLowerCase().includes(search) ||
      doc.issuer?.toLowerCase().includes(search) ||
      doc.referenceNumber?.toLowerCase().includes(search);

    const matchesCategory =
      categoryFilter === "All" ||
      doc.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" ||
      doc.expiryStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Form changes
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Only PDF, JPG and PNG files are allowed.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("File size must be less than 10 MB.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setMessage("");
  };

  // Reset form
  const resetForm = () => {
    setForm(emptyForm);
    setSelectedFile(null);
    setEditingId(null);

    const fileInput = document.getElementById("documentFile");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Add or update document
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (editingId) {
        const payload = {
          ...form,
          issueDate: form.issueDate || null,
          expiryDate: form.expiryDate || null
        };

        await apiRequest(`/documents/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });

        if (selectedFile) {
          const formData = new FormData();
          formData.append("documentFile", selectedFile);

          await apiRequest(`/documents/${editingId}/upload`, {
            method: "POST",
            body: formData
          });
        }

        setMessage("Document updated successfully!");

      } else {
        const formData = new FormData();

        Object.entries(form).forEach(([key, value]) => {
          formData.append(key, value);
        });

        if (selectedFile) {
          formData.append("documentFile", selectedFile);
        }

        await apiRequest("/documents", {
          method: "POST",
          body: formData
        });

        setMessage("Document and certificate added successfully!");
      }

      resetForm();
      await loadDocuments();

    } catch (error) {
      setMessage(error.message);
    }
  };

  // Edit document
  const handleEdit = (doc) => {
    setEditingId(doc._id);

    setForm({
      name: doc.name || "",
      category: doc.category || "",
      issuer: doc.issuer || "",
      referenceNumber: doc.referenceNumber || "",
      issueDate: doc.issueDate
        ? doc.issueDate.substring(0, 10)
        : "",
      expiryDate: doc.expiryDate
        ? doc.expiryDate.substring(0, 10)
        : ""
    });

    setSelectedFile(null);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // Archive document
  const handleArchive = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this document?"
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/documents/${id}/archive`, {
        method: "PATCH"
      });

      setMessage("Document archived successfully!");
      await loadDocuments();

    } catch (error) {
      setMessage(error.message);
    }
  };

  // Restore document
  const handleRestore = async (id) => {
    try {
      await apiRequest(`/documents/${id}/restore`, {
        method: "PATCH"
      });

      setMessage("Document restored successfully!");
      await loadDocuments();

    } catch (error) {
      setMessage(error.message);
    }
  };

  // Permanently delete document
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Permanently delete this document and its uploaded certificate? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/documents/${id}`, {
        method: "DELETE"
      });

      setMessage("Document deleted permanently!");
      await loadDocuments();

    } catch (error) {
      setMessage(error.message);
    }
  };

  // View or download certificate
  const openFile = async (doc, download = false) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `/api/documents/${doc._id}/file${
          download ? "?download=true" : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Unable to open the uploaded file.");
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
          URL.revokeObjectURL(fileUrl);
          throw new Error("Please allow pop-ups to preview the file.");
        }
      }

      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);

    } catch (error) {
      setMessage(error.message);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("All");
    setStatusFilter("All");
  };

  // Change document view
  const changeDocumentView = (view) => {
    setDocumentView(view);
    clearFilters();
    setMessage("");
  };

  if (loading) {
    return (
      <p className="documents-loading">
        Loading documents...
      </p>
    );
  }

  return (
    <div className="documents-page">

      <div className="documents-heading">
        <h2>Document Management</h2>

        <p className="documents-subtitle">
          Store, upload and manage your important personal documents.
        </p>
      </div>

      {/* ADD DOCUMENT FORM */}

      {documentView === "Active" && (
        <div className="document-form-card">

          <h3>
            {editingId ? "Edit Document" : "Add New Document"}
          </h3>

          <form onSubmit={handleSubmit} className="document-form">

            <input
              name="name"
              placeholder="Document Name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              <option value="Education">Education</option>
              <option value="Identity">Identity</option>
              <option value="Insurance">Insurance</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Property">Property</option>
              <option value="Warranty">Warranty</option>
              <option value="Subscription">Subscription</option>
              <option value="Other">Other</option>
            </select>

            <input
              name="issuer"
              placeholder="Issuer / Organization"
              value={form.issuer}
              onChange={handleChange}
            />

            <input
              name="referenceNumber"
              placeholder="Reference Number (Optional)"
              value={form.referenceNumber}
              onChange={handleChange}
            />

            <label htmlFor="issueDate">Issue Date</label>

            <input
              id="issueDate"
              type="date"
              name="issueDate"
              value={form.issueDate}
              onChange={handleChange}
            />

            <label htmlFor="expiryDate">Expiry Date</label>

            <input
              id="expiryDate"
              type="date"
              name="expiryDate"
              value={form.expiryDate}
              onChange={handleChange}
            />

            {/* CERTIFICATE UPLOAD */}

            <div className="file-upload-field">

              <label htmlFor="documentFile">
                Upload Certificate / Document
              </label>

              <input
                id="documentFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />

              <small>
                Accepted formats: PDF, JPG, PNG. Maximum size: 10 MB.
              </small>

              {selectedFile && (
                <p className="selected-file">
                  Selected: {selectedFile.name}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      document.getElementById("documentFile").value = "";
                    }}
                  >
                    Remove
                  </button>
                </p>
              )}

              {editingId && (
                <small>
                  Select a new file only if you want to replace the existing attachment.
                </small>
              )}

            </div>

            <div className="form-buttons">

              <button type="submit">
                {editingId ? "Update Document" : "Add Document"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}

            </div>

          </form>

          {message && (
            <p className="document-message">{message}</p>
          )}

        </div>
      )}

      {/* DOCUMENT LIBRARY */}

      <div className="document-list-card">

        <div className="document-list-heading">

          <div>
            <h3>
              {documentView === "Active"
                ? "My Active Documents"
                : "Archived Documents"}
            </h3>

            <p>
              Showing {filteredDocuments.length} of {currentDocuments.length} documents
            </p>
          </div>

          <span className="document-count">
            📁 {documents.length} Total
          </span>

        </div>

        {/* ACTIVE AND ARCHIVED TABS */}

        <div className="document-view-tabs">

          <button
            type="button"
            className={
              documentView === "Active" ? "active-view-tab" : ""
            }
            onClick={() => changeDocumentView("Active")}
          >
            Active Documents ({activeDocuments.length})
          </button>

          <button
            type="button"
            className={
              documentView === "Archived" ? "active-view-tab" : ""
            }
            onClick={() => changeDocumentView("Archived")}
          >
            Archived ({archivedDocuments.length})
          </button>

        </div>

        {/* SEARCH AND FILTERS */}

        <div className="document-filters">

          <input
            type="text"
            placeholder="Search by name, issuer or reference number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Education">Education</option>
            <option value="Identity">Identity</option>
            <option value="Insurance">Insurance</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Property">Property</option>
            <option value="Warranty">Warranty</option>
            <option value="Subscription">Subscription</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Expiry Statuses</option>
            <option value="Valid">Valid</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expires Today">Expires Today</option>
            <option value="Expired">Expired</option>
            <option value="No Expiry Date">No Expiry Date</option>
          </select>

          <button
            type="button"
            className="clear-filters-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

        </div>

        {/* DOCUMENT TABLE */}

        {filteredDocuments.length === 0 ? (

          <p className="empty-documents">
            {currentDocuments.length === 0
              ? documentView === "Active"
                ? "No active documents found. Add your first document above."
                : "No archived documents yet."
              : "No matching documents found. Try changing your filters."}
          </p>

        ) : (

          <div className="document-table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Expiry Date</th>
                  <th>Expiry Status</th>
                  <th>Certificate</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredDocuments.map((doc) => (

                  <tr key={doc._id}>

                    <td>{doc.name}</td>

                    <td>{doc.category}</td>

                    <td>
                      {doc.expiryDate
                        ? new Date(doc.expiryDate).toLocaleDateString()
                        : "No expiry"}
                    </td>

                    <td>
                      <span
                        className={`table-status ${
                          doc.expiryStatus === "Valid"
                            ? "table-valid"
                            : doc.expiryStatus === "Expired"
                            ? "table-expired"
                            : "table-warning"
                        }`}
                      >
                        {doc.expiryStatus || "Not available"}
                      </span>
                    </td>

                    <td>

                      {doc.file?.storedName ? (

                        <div className="uploaded-file">

                          <span>{doc.file.originalName}</span>

                          <button
                            type="button"
                            className="view-button"
                            onClick={() => openFile(doc)}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="download-button"
                            onClick={() => openFile(doc, true)}
                          >
                            Download
                          </button>

                        </div>

                      ) : (

                        <span className="not-uploaded">
                          Not uploaded
                        </span>

                      )}

                    </td>

                    <td className="document-actions">

                      <button
                        type="button"
                        className="view-details-button"
                        onClick={() => onViewDetails?.(doc._id)}
                      >
                        Details
                      </button>

                      {documentView === "Active" ? (
                        <>
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => handleEdit(doc)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="archive-button"
                            onClick={() => handleArchive(doc._id)}
                          >
                            Archive
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="restore-button"
                          onClick={() => handleRestore(doc._id)}
                        >
                          Restore
                        </button>
                      )}

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDelete(doc._id)}
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {message && (
          <p className="document-message">{message}</p>
        )}

      </div>

    </div>
  );
}

export default Documents;
