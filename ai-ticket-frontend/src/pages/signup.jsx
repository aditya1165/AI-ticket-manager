import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SignupPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!form.username || form.username.length < 3) {
      errs.username = "Username must be at least 3 characters.";
    }
    if (!form.email) {
      errs.email = "Email is required.";
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      errs.email = "Invalid email format.";
    }
    if (!form.password) {
      errs.password = "Password is required.";
    } else if (form.password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }
    return errs;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
      } else {
        setErrors({ form: data.message || "Signup failed" });
      }
    } catch (err) {
      setErrors({ form: "Something went wrong" });
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
        <form onSubmit={handleSignup} className="card-body">
          <h2 className="card-title justify-center mb-4">Sign Up</h2>
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="input input-bordered mb-1"
            value={form.username}
            onChange={handleChange}
            required
            autoComplete="username"
          />
          {errors.username && <div className="text-red-500 text-xs mb-2">{errors.username}</div>}
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="input input-bordered mb-1"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
          {errors.email && <div className="text-red-500 text-xs mb-2">{errors.email}</div>}
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="input input-bordered mb-1"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
          {errors.password && <div className="text-red-500 text-xs mb-2">{errors.password}</div>}
          {errors.form && <div className="text-red-500 text-xs mb-2">{errors.form}</div>}
          <button
            type="submit"
            className="btn btn-primary w-full mb-2"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
          <div className="text-center mt-2">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="link link-primary font-semibold">
              Click here to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
