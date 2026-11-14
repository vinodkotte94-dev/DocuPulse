
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  // Let the browser set the multipart boundary for file uploads.
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message
        : data || "Something went wrong";

    throw new Error(message);
  }

  if (typeof data === "string" && data.startsWith("<!DOCTYPE")) {
    throw new Error(
      "The server returned an HTML page instead of API data. Check that the backend is running."
    );
  }

  return data;
}
