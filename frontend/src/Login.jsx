import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Package, ShieldCheck, UserRound, Pill, Stethoscope, HeartPulse, Activity, Syringe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signIn, signOut } from "./services/api.js";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem("medstock-remembered-user") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentStaff, setCurrentStaff] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("medstock-user")) || null;
    } catch {
      return null;
    }
  });

  function handleSwitchAccount() {
    signOut();
    setCurrentStaff(null);
    setPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(username.trim(), password);
      if (remember) localStorage.setItem("medstock-remembered-user", username.trim());
      else localStorage.removeItem("medstock-remembered-user");
      navigate("/admin/inventory");
    } catch (loginError) {
      if (!loginError.response) {
        setError("Can't connect to MedStock. Confirm the API is running, then try again.");
      } else if (loginError.response.status === 401) {
        setError("The username or password is incorrect.");
      } else {
        setError(loginError.response.data?.message || "Sign-in failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="MedStock information">
        <div className="login-brand">
          <span className="login-brand-mark"><Package size={24} /></span>
          <span>MedStock<small>ENTERPRISE</small></span>
        </div>

        <div className="login-brand-content">
          <span className="login-kicker">PHARMACY WORKSPACE</span>
          <h1>Keep every medicine.<br />Every batch. Every time.</h1>
          <p>Secure inventory management for modern pharmacy teams.</p>
          <div className="login-security-note"><ShieldCheck size={16} /><div><strong>Protected workspace</strong><span>Role-based access and audited stock movements</span></div></div>

        <div className="login-medical-watermark" aria-hidden="true">
          <Pill size={80} className="wm-icon wm-1" />
          <HeartPulse size={72} className="wm-icon wm-2" />
          <Stethoscope size={64} className="wm-icon wm-3" />
          <Activity size={56} className="wm-icon wm-4" />
          <Syringe size={48} className="wm-icon wm-5" />
          <ShieldCheck size={40} className="wm-icon wm-6" />
          <Pill size={36} className="wm-icon wm-7" />
          <HeartPulse size={32} className="wm-icon wm-8" />
        </div>
        </div>

      
      </section>

      <section className="login-form-panel">
        <div className="login-form-watermark" aria-hidden="true">
          <Pill size={96} className="wm-icon wm-1" />
          <HeartPulse size={88} className="wm-icon wm-2" />
          <Stethoscope size={80} className="wm-icon wm-3" />
          <Activity size={72} className="wm-icon wm-4" />
          <Syringe size={64} className="wm-icon wm-5" />
          <ShieldCheck size={56} className="wm-icon wm-6" />
          <Pill size={48} className="wm-icon wm-7" />
          <HeartPulse size={44} className="wm-icon wm-8" />
        </div>
        <button className="login-back" type="button" onClick={() => navigate("/admin/inventory")}><ArrowLeft size={15} /> Back to inventory</button>
        <div className="login-card">
          {currentStaff && (
            <div className="login-active-session">
              <span>Currently signed in as <strong>{currentStaff.username}</strong></span>
              <button type="button" onClick={handleSwitchAccount}>Sign out</button>
            </div>
          )}
          <div className="login-card-heading">
            <span className="login-lock"><LockKeyhole size={18} /></span>
            <div><p>STAFF PORTAL</p><h2>Welcome back</h2></div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Username</span>
              <div><UserRound size={16} /><input name="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" autoComplete="username" required /></div>
            </label>

            <label className="login-field">
              <span>Password</span>
              <div><LockKeyhole size={16} /><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
            </label>

            <div className="login-options">
              <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember username</label>
              <button type="button" onClick={() => setError("Please contact your system administrator to reset your password.")}>Forgot password?</button>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <button className="login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in to workspace"}</button>
          </form>

          <p className="login-support">Need access? <a href="mailto:support@medstock.example">Contact system administrator</a></p>
        </div>
        <p className="login-copyright">© 2026 MedStock Enterprise. Authorized personnel only.</p>
      </section>
    </main>
  );
}
