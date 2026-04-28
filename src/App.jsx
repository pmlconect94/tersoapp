import React, { useState, useEffect } from 'react';
import TersoStore from './lib/store';
import { supabase } from './lib/supabase';
import { ToastProvider } from './components/ui';
import Login from './components/Login';
import Shell from './components/Shell';

const App = () => {
  const [state, setStateRaw] = useState(() => TersoStore.loadState());
  const [booting, setBooting] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const setState = (updater) => {
    setStateRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      TersoStore.saveState(next);
      return next;
    });
  };

  // Check Supabase auth session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        // Find matching user in state by email
        const match = state.users.find(u => u.email.toLowerCase() === session.user.email.toLowerCase());
        if (match) {
          setState(s => ({ ...s, session: { userId: match.id } }));
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
      if (!session?.user) {
        setState(s => ({ ...s, session: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(t);
  }, []);

  const currentUser = state.session ? state.users.find(u => u.id === state.session.userId) : null;

  const onLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    const match = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (match) {
      setState(s => ({ ...s, session: { userId: match.id } }));
      return match;
    }
    throw new Error('Usuario no encontrado en el sistema');
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    setState(s => ({ ...s, session: null }));
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

  return (
    <ToastProvider>
      {!currentUser ? (
        <Login onLogin={onLogin} />
      ) : (
        <Shell state={state} setState={setState} currentUser={currentUser} onLogout={onLogout} />
      )}
    </ToastProvider>
  );
};

// Error boundary
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
          <button onClick={() => { localStorage.removeItem("terso_requisiciones_v2"); location.reload(); }}
            style={{ marginTop: 16, padding: "10px 18px", background: "#3a2418", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Reset y recargar
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
