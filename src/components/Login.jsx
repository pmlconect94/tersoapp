import React, { useState } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button } from './ui';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tryLogin = async () => {
    if (!email.trim() || !pw.trim()) {
      setShaking(true); setTimeout(() => setShaking(false), 480);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin(email.trim(), pw);
    } catch (err) {
      setError(err.message === "Invalid login credentials" 
        ? "Credenciales incorrectas. Verifica tu correo y contraseña."
        : err.message || "Error al iniciar sesión");
      setShaking(true); 
      setTimeout(() => setShaking(false), 480);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") tryLogin();
  };

  return (
    <div className="login-shell fade-in">
      <div className="login-art">
        <div>
          <div className="kana" style={{ color: "rgba(237,230,211,0.55)" }}>EST. 2026 · GESTIÓN</div>
          <img src="/assets/terso-logo-cream.png" alt="Terso" style={{ height: 96, marginTop: 36, marginLeft: -10 }} />
          <div style={{ marginTop: 28, fontSize: 22, lineHeight: 1.35, fontWeight: 500, maxWidth: 460, letterSpacing: "-0.01em" }}>
            Inventario y <span style={{ color: "var(--t-gold-soft)" }}>requisiciones</span> de cocina, barra y piso.
          </div>
          <div style={{ marginTop: 20, opacity: 0.7, maxWidth: 440, fontSize: 14, lineHeight: 1.6 }}>
            Sistema interno para capturar inventarios, generar requisiciones de compra y consolidar pedidos por proveedor.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div className="kana" style={{ color: "rgba(237,230,211,0.5)" }}>NARRAR HISTORIAS<br/>DESPERTAR LOS SENTIDOS</div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, opacity: 0.5, letterSpacing: "0.2em", textTransform: "uppercase" }}>v1.0 · México</div>
        </div>
        <img src="/assets/illust-04.png" alt="" style={{ position: "absolute", bottom: -20, right: -40, width: 320, opacity: 0.13, filter: "invert(1)", pointerEvents: "none" }} />
      </div>

      <div className="login-form-wrap">
        <div className="login-card" style={shaking ? { animation: "shake 0.42s var(--ease-apple)" } : null}>
          <div className="kana">ACCESO</div>
          <h2 style={{ fontSize: 24, fontWeight: 600, margin: "8px 0 6px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Bienvenido<span style={{ color: "var(--t-gold)" }}>.</span>
          </h2>
          <p style={{ color: "var(--t-muted)", marginTop: 0, marginBottom: 28, fontSize: 14 }}>
            Ingresa con tu correo y contraseña.
          </p>

          {error && (
            <div style={{ 
              padding: "10px 14px", marginBottom: 16, borderRadius: 10, fontSize: 13, 
              background: "rgba(161,78,58,0.1)", color: "var(--t-danger)", border: "1px solid rgba(161,78,58,0.2)" 
            }}>
              {error}
            </div>
          )}

          <label className="t-label">Correo</label>
          <input className="t-input" placeholder="tucorreo@terso.mx" value={email} 
            onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown}
            style={{ marginBottom: 12 }} autoFocus />
          <label className="t-label">Contraseña</label>
          <input className="t-input" type="password" placeholder="•••••••" value={pw} 
            onChange={(e) => setPw(e.target.value)} onKeyDown={handleKeyDown}
            style={{ marginBottom: 18 }} />

          <Button onClick={tryLogin} icon="arrow" disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Verificando..." : "Entrar al sistema"}
          </Button>
        </div>
      </div>

      <style>{`@keyframes shake { 10%,90% { transform: translateX(-1px); } 20%,80% { transform: translateX(2px); } 30%,50%,70% { transform: translateX(-4px); } 40%,60% { transform: translateX(4px); } }`}</style>
    </div>
  );
};

export default Login;
