import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      alert("Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background: "linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)"}}>
      {/* Decorative shapes */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-300 rounded-full opacity-30 blur-2xl animate-pulse" style={{zIndex:0}}></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-2xl animate-pulse" style={{zIndex:0}}></div>
      <div className="card w-full max-w-sm shadow-2xl bg-base-100 p-6 rounded-xl relative" style={{zIndex:1}}>
        <h1 className="text-3xl font-bold text-center mb-2 text-indigo-700">Ticket.io</h1>
        <p className="text-center text-gray-500 mb-6">AI-powered Ticket Management System</p>
        <form onSubmit={handleLogin} className="card-body">
          <h2 className="card-title justify-center mb-4">Login</h2>
          <input
            type="text"
            name="identifier"
            placeholder="Username or Email"
            className="input input-bordered mb-3"
            value={form.identifier}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="input input-bordered mb-3"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            className="btn btn-primary w-full mb-2"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <div className="text-center mt-2">
            <span className="text-gray-600">New user? </span>
            <Link to="/signup" className="link link-primary font-semibold">
              Click here to signup
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}