import React, { useState, useEffect, useRef } from 'react';
import TersoStore from './lib/store';
import { supabase } from './lib/supabase';
import { ToastProvider } from './components/ui';
import Login from './components/Login';
import Shell from './components/Shell';

const App = () => {
  const [state, setStateRaw] = useState(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [booting, setBooting] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Cola simple para serializar saves contra Supabase
  const saveQueue = useRef(Promise.resolve());

  const setState = (updater) => {
    setStateRaw(prev => {
      if (prev == null) return prev;
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveQueue.current = saveQueue.current
        .then(() => TersoStore.saveState(prev, next))
        .catch(err => console.error('[App] saveState failed:', err));
      return next;
    });
  };

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user || null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
      if (!session?.user) {
        setStateRaw(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar estado de Supabase tras login
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    setStateLoading(true);
    setLoadError(null);
    TersoStore.loadState()
      .then(s => {
        if (cancelled) return;
        setStateRaw(s);
        setStateLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[App] loadState failed:', err);
        setLoadError(err.message || String(err));
        setStateLoading(false);
      });
    return () => { cancelled = true; };
  }, [authUser]);

  // Vincular session.userId al usuario logueado cuando ya cargó el estado
  useEffect(() => {
    if (!authUser || !state || state.session?.userId) return;
    const match = state.users.find(u =>
      (u.email || '').toLowerCase() === (authUser.email || '').toLowerCase()
    );
    if (match) {
      // local-only — no persistir session a Supabase
      setStateRaw(s => ({ ...s, session: { userId: match.id } }));
    }
  }, [authUser, state]);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(t);
  }, []);

  const currentUser = state?.session
    ? state.users.find(u => u.id === state.session.userId)
    : null;

  const onLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    setStateRaw(null);
  };

  if (booting || authLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-cream)", flexDirection: "column", gap: 24 }}>
        <img src="/assets/terso-mark.png" alt="" style={{ width: 64, opacity: 0.85, animation: "pulse 1.6s ease-in-out infinite" }} />
        <div className="kana" style={{ color: "var(--t-muted)" }}>Iniciando sistema</div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    );
  }

  if (!authUser) {
    return (
      <ToastProvider>
        <Login onLogin={onLogin} />
      </ToastProvider>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 32, fontFamily: "ui-monospace, monospace", color: "#3a2418", background: "#fef3e0", minHeight: "100vh", lineHeight: 1.6 }}>
        <h2 style={{ fontSize: 24 }}>No se pudo cargar tu información</h2>
        <div style={{ marginTop: 8, color: "#a04e2e" }}>{loadError}</div>
        <button onClick={() => location.reload()}
          style={{ marginTop: 16, padding: "10px 18px", background: "#3a2418", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Recargar
        </button>
        <button onClick={onLogout}
          style={{ marginTop: 16, marginLeft: 12, padding: "10px 18px", background: "transparent", color: "#3a2418", border: "1px solid #3a2418", borderRadius: 6, cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (stateLoading || !state) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-cream)", flexDirection: "column", gap: 24 }}>
        <img src="/assets/terso-mark.png" alt="" style={{ width: 64, opacity: 0.85, animation: "pulse 1.6s ease-in-out infinite" }} />
        <div className="kana" style={{ color: "var(--t-muted)" }}>Cargando datos</div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ padding: 32, fontFamily: "ui-monospace, monospace", color: "#3a2418", background: "#fef3e0", minHeight: "100vh", lineHeight: 1.6 }}>
        <h2 style={{ fontSize: 24 }}>Tu correo no está registrado en el sistema</h2>
        <div style={{ marginTop: 8, color: "#a04e2e" }}>
          Iniciaste sesión como <strong>{authUser.email}</strong>, pero no encontramos un usuario activo con ese correo.
          Pídele a un admin que te dé de alta.
        </div>
        <button onClick={onLogout}
          style={{ marginTop: 16, padding: "10px 18px", background: "#3a2418", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Shell state={state} setState={setState} currentUser={currentUser} onLogout={onLogout} />
    </ToastProvider>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error("[Terso] App crashed:", error, info);
    this.setState({ error, info });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#3a2418", background: "#fef3e0", minHeight: "100vh", lineHeight: 1.6 }}>
          <h2 style={{ fontSize: 28, marginBottom: 12 }}>Algo se rompió</h2>
          <div style={{ marginBottom: 16, color: "#a04e2e" }}>{String(this.state.error?.message || this.state.error)}</div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, opacity: 0.7, background: "rgba(0,0,0,0.04)", padding: 12, borderRadius: 6 }}>{this.state.error?.stack}</pre>
          <button onClick={() => location.reload()}
            style={{ marginTop: 16, padding: "10px 18px", background: "#3a2418", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
