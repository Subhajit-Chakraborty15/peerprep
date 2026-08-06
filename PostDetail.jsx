import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get(`/posts/${id}`),
        api.get(`/posts/${id}/comments`),
      ]);
      setPost(postRes.data);
      setComments(commentsRes.data);
    } catch (err) {
      setError("Couldn't load this entry. It may have been removed.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  async function handleUpvote() {
    if (!user) return;
    try {
      const { data } = await api.post(`/posts/${id}/upvote`);
      setPost((prev) => ({ ...prev, upvoteCount: data.upvoteCount, hasUpvoted: data.hasUpvoted }));
    } catch (err) {
      // e.g. self-upvote rejection — button is already disabled for the author, so this is a rare edge case
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { content: commentText });
      setComments((prev) => [...prev, data]);
      setCommentText("");
    } catch (err) {
      setError("Couldn't post your comment. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <div className="empty-state">Loading entry…</div>;
  if (error && !post) return <div className="error-banner">{error}</div>;
  if (!post) return null;

  const isOwnPost = user && post.author && post.author._id === user._id;

  return (
    <div>
      <Link to="/" className="back-link">← Back to the logbook</Link>

      <div className="post-card">
        <div className="post-stub-header">
          <span className="company-tag">{post.company}</span>
          <span>{post.role}</span>
        </div>
        <div className="post-body">
          <span className={`post-type-badge ${post.postType === "referral_request" ? "referral" : ""}`}>
            {post.postType === "referral_request" ? "Referral Request" : "Experience"}
          </span>
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta-row">
            <span>{post.isAnonymous ? "Anonymous" : post.author?.username || "Unknown"}</span>
            <span>·</span>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="post-detail-content">{post.content}</div>
        <div className="post-footer">
          <button
            className={`upvote-btn ${post.hasUpvoted ? "active" : ""}`}
            onClick={handleUpvote}
            disabled={!user || isOwnPost}
            title={isOwnPost ? "You can't upvote your own post" : ""}
          >
            ▲ {post.upvoteCount ?? 0} helpful
          </button>
        </div>
      </div>

      <div className="comments-section">
        <h3>{comments.length} {comments.length === 1 ? "reply" : "replies"}</h3>
        {comments.map((c) => (
          <div key={c._id} className="comment">
            <div className="comment-author">{c.author?.username || "Unknown"} · {new Date(c.createdAt).toLocaleDateString()}</div>
            <div>{c.content}</div>
          </div>
        ))}

        {user ? (
          <form className="comment-form" onSubmit={handleComment}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a reply — e.g. offer help, ask a follow-up…"
              maxLength={1000}
            />
            <button disabled={posting}>{posting ? "Posting…" : "Reply"}</button>
          </form>
        ) : (
          <div className="empty-state"><Link to="/login">Log in</Link> to join the conversation.</div>
        )}
      </div>
    </div>
  );
}
