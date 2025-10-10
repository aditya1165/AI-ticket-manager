import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function TicketComments({ ticket, user }) {
  const { id } = useParams();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setComments(data.comments || []);
    };
    fetchComments();
  }, [id]);

  // Who can comment?
  const canInitiate =
    comments.length === 0 &&
    (user.role === "admin" ||
      (user.role === "moderator" && ticket.assignedTo?._id === user._id));
  const canReply =
    comments.length > 0 &&
    (user.role === "admin" ||
        (user.role === "moderator" && ticket.assignedTo?._id === user._id) ||
        (user.role === "user"));

  // Add comment
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  const token = localStorage.getItem("token");
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets/${id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    setComments(data.comments || []);
    setText("");
    setLoading(false);
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-2">Comments</h3>
      <div className="space-y-2 mb-4">
        {comments.map((c, idx) => (
          <div
            key={idx}
            className={`flex ${c.role === user.role ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-md ${
                c.role === "admin"
                  ? "bg-indigo-100 text-indigo-800"
                  : c.role === "moderator"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <span className="font-semibold">{c.role}</span>: {c.text}
              <div className="text-xs text-gray-500 mt-1">
                {new Date(c.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-gray-500">No comments yet.</div>
        )}
      </div>
      {(canInitiate || canReply) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            disabled={loading}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}