import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // Redirect happens — no need to clear loading on success
    } catch (err) {
      setError(err.message || "Error al iniciar sesión con Google");
      setLoading(false);
    }
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
        <div className="login-card">
          <div className="kana">ACCESO</div>
          <h2 style={{ fontSize: 24, fontWeight: 600, margin: "8px 0 6px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Bienvenido<span style={{ color: "var(--t-gold)" }}>.</span>
          </h2>
          <p style={{ color: "var(--t-muted)", marginTop: 0, marginBottom: 28, fontSize: 14 }}>
            Inicia sesión con tu cuenta de Google para entrar al sistema.
          </p>

          {error && (
            <div style={{
              padding: "10px 14px", marginBottom: 16, borderRadius: 10, fontSize: 13,
              background: "rgba(161,78,58,0.1)", color: "var(--t-danger)", border: "1px solid rgba(161,78,58,0.2)"
            }}>
              {error}
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            style={{
              width: "100%", padding: "12px 18px", borderRadius: 10,
              background: "#fff", color: "#3a2418",
              border: "1px solid var(--t-line)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              fontSize: 14, fontWeight: 500, cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.2s var(--ease-apple)",
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = "var(--t-bone)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "#fff"; }}
          >
            <GoogleG />
            {loading ? "Conectando con Google..." : "Continuar con Google"}
          </button>

          <p style={{ marginTop: 18, fontSize: 12, color: "var(--t-muted)", lineHeight: 1.55 }}>
            Si es tu primera vez, tu cuenta se creará automáticamente y un administrador
            te asignará tu rol antes de que puedas usar el sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
