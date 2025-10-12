import { useEffect, useState } from "react";

export default function ApplyModerator() {
  const [form, setForm] = useState({ username: "", email: "", skills: "" });
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const API_BASE = (import.meta.env.VITE_SERVER_URL ?? "").toString().trim();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (user) {
      setForm((f) => ({ ...f, username: user.username || user.email, email: user.email }));
      setIsAdmin(user.role === "admin");
    }
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/mod-requests/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.request) setExisting(data.request);
      } catch (e) { console.error(e); }
    })();
  }, [API_BASE]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/mod-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) alert("Application submitted");
      else alert(data.message || "Failed");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Apply to be a Moderator</h2>
      {isAdmin ? (
        <div className="p-4 bg-yellow-50 rounded">Admins cannot apply to be moderators.</div>
      ) : existing ? (
        <div className="p-4 bg-base-200 rounded">You have already applied for the moderator position. We'll contact you once a decision has been made.</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="input input-bordered w-full" required />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="input input-bordered w-full" required />
          <textarea name="skills" value={form.skills} onChange={handleChange} placeholder="Skills (comma separated)" className="textarea textarea-bordered w-full" required />
          <button className="btn btn-primary" disabled={loading}>{loading?"Submitting...":"Submit Application"}</button>
        </form>
      )}
    </div>
  );
}
