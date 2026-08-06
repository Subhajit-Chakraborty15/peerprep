import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function CreatePost() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [postType, setPostType] = useState("experience");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/posts", {
        company,
        role,
        postType,
        title,
        content,
        isAnonymous,
      });
      navigate(`/posts/${data._id}`);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(
        apiErrors ? apiErrors.map((e) => e.msg).join(" ") : err.response?.data?.error || "Failed to create post."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-card" style={{ maxWidth: 600 }}>
      <h1>File a new entry</h1>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Post type</label>
          <select value={postType} onChange={(e) => setPostType(e.target.value)}>
            <option value="experience">Interview experience</option>
            <option value="referral_request">Referral request</option>
          </select>
        </div>
        <div className="field">
          <label>Company</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="e.g. Deloitte USI" />
        </div>
        <div className="field">
          <label>Role</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} required placeholder="e.g. Systems Engineer" />
        </div>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={150} />
        </div>
        <div className="field">
          <label>
            {postType === "referral_request" ? "What are you looking for?" : "Your experience"}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            minLength={20}
            maxLength={5000}
            placeholder={
              postType === "referral_request"
                ? "e.g. Applied for the SDE-1 role, req #12345. Would appreciate a referral or any insight into the process."
                : "Describe the rounds, questions asked, and how it went…"
            }
          />
        </div>
        <label className="checkbox-field">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          Post anonymously (your username won't be shown to other users)
        </label>
        <button className="btn-primary" disabled={loading}>
          {loading ? "Filing…" : "File entry"}
        </button>
      </form>
    </div>
  );
}
