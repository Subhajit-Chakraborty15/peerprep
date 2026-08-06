import { useState, useEffect, useCallback } from "react";
import api from "../api";
import PostCard from "../components/PostCard";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [postType, setPostType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (companyFilter) params.company = companyFilter;
      if (postType) params.postType = postType;
      const { data } = await api.get("/posts", { params });
      setPosts(data.posts);
    } catch (err) {
      setError("Couldn't load posts. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [companyFilter, postType]);

  useEffect(() => {
    const timeout = setTimeout(loadPosts, 300); // debounce the company search
    return () => clearTimeout(timeout);
  }, [loadPosts]);

  function handleUpvoteChange(postId, updatedPost) {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, upvoteCount: updatedPost.upvoteCount, hasUpvoted: updatedPost.hasUpvoted } : p))
    );
  }

  return (
    <div>
      <h1 className="page-title">The logbook</h1>

      <div className="filter-bar">
        <input
          placeholder="Filter by company (e.g. Deloitte, TCS)…"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        />
        <select value={postType} onChange={(e) => setPostType(e.target.value)}>
          <option value="">All posts</option>
          <option value="experience">Experiences only</option>
          <option value="referral_request">Referral requests only</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && <div className="empty-state">Loading entries…</div>}

      {!loading && posts.length === 0 && !error && (
        <div className="empty-state">
          No entries yet{companyFilter ? ` for "${companyFilter}"` : ""}. Be the first to file one.
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post._id} post={post} onUpvoteChange={handleUpvoteChange} />
      ))}
    </div>
  );
}
