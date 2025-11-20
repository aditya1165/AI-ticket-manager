import { useEffect, useState } from "react";
import Navbar from "../components/navbar";

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
        if (res.ok && data.cooldownHours) setExisting((r) => ({ ...(r || {}), cooldownHours: data.cooldownHours }));
      } catch (e) { console.error(e); }
    })();
  }, [API_BASE]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const rawSkills = (form.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
      const normalized = Array.from(new Set(rawSkills.map((s) => s.toLowerCase().replace(/\s+/g, ' '))));
      const payload = { ...form, skills: normalized.join(",") };

      const res = await fetch(`${API_BASE}/mod-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) alert("Application submitted successfully!");
      else alert(data.message || "Failed to submit application");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Apply for Moderator</h1>
            <p className="text-slate-400 text-sm">Share your skills and expertise to help our community</p>
          </div>

          {isAdmin ? (
            <div className="card-elevated p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Admin Account</h3>
                  <p className="text-slate-400 text-sm">Administrators cannot apply for moderator roles. You already have full access to the platform.</p>
                </div>
              </div>
            </div>
          ) : existing ? (
            existing.cooldownHours ? (
              <div className="card-elevated p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Cooldown Period</h3>
                    <p className="text-slate-400 text-sm">Your previous application was declined. Please wait <span className="text-white font-medium">{existing.cooldownHours} more hour(s)</span> before reapplying.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-elevated p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Application Pending</h3>
                    <p className="text-slate-400 text-sm">Your moderator application is currently under review. We'll notify you once a decision has been made.</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="card-elevated p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                  <input 
                    name="username" 
                    value={form.username} 
                    onChange={handleChange} 
                    placeholder="Username" 
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed" 
                    required 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input 
                    name="email" 
                    value={form.email} 
                    onChange={handleChange} 
                    placeholder="Email" 
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed" 
                    required 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Skills</label>
                  <textarea 
                    name="skills" 
                    value={form.skills} 
                    onChange={handleChange} 
                    placeholder="e.g., React, Node.js, MongoDB, JavaScript" 
                    rows="4"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none" 
                    required 
                  />
                  <p className="text-xs text-slate-500 mt-2">Separate skills with commas. They will be normalized automatically.</p>
                </div>
                <button 
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all" 
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

