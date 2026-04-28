import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';

// ============================================================
// TERSO — Reusable UI primitives + icons
// ============================================================


// ---------- Icons (24x24, stroke-based, monoline) ----------
const Icon = ({ name, size = 18, stroke = 1.6, ...rest }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    box: <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
    users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14.5c2.4 0 4.5 1.8 4.5 4"/></>,
    inv: <><path d="M3 6h18"/><path d="M5 6v13a1 1 0 001 1h12a1 1 0 001-1V6"/><path d="M9 10h6"/><path d="M9 14h6"/></>,
    cart: <><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.5 11h11l1.8-7H6.8"/></>,
    truck: <><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></>,
    history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M3 12a9 9 0 0118-0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    minus: <><path d="M5 12h14"/></>,
    x: <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
    check: <><path d="M5 12l4 4 10-10"/></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M14 6l4 4"/></>,
    trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></>,
    download: <><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></>,
    upload: <><path d="M12 20V8"/><path d="M7 13l5-5 5 5"/><path d="M5 4h14"/></>,
    filter: <><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></>,
    chev: <><path d="M9 6l6 6-6 6"/></>,
    chevDown: <><path d="M6 9l6 6 6-6"/></>,
    bell: <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/></>,
    logout: <><path d="M9 4H5v16h4"/><path d="M16 16l4-4-4-4"/><path d="M20 12H10"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 14.6l1.1-.4-.5-2.6-1.2.1a7.6 7.6 0 00-.8-1.9l.8-.9-1.7-2-1 .7a7.5 7.5 0 00-1.9-.8l.1-1.2L11.7 5l-.4 1.1a7.6 7.6 0 00-2 .4l-.7-1-2.2 1.5.5 1A7.6 7.6 0 005.7 9l-1.2-.4-1 2.4 1.1.5a7.6 7.6 0 000 2.1L3.5 14l1 2.4 1.2-.4a7.5 7.5 0 001.4 1.5l-.5 1 2.2 1.5.7-1c.6.2 1.3.4 2 .4l.4 1.1 2.6-.5.1-1.2c.7-.2 1.3-.4 1.9-.8l1 .7 1.7-2-.8-.9c.3-.6.6-1.2.8-1.9z"/></>,
    leaf: <><path d="M5 19c5-2 11-7 14-15-7 1-13 5-14 11"/><path d="M5 19c2-3 5-5 8-7"/></>,
    menu: <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
    sparkle: <><path d="M12 4v6"/><path d="M12 14v6"/><path d="M4 12h6"/><path d="M14 12h6"/></>,
    arrow: <><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></>,
    moon: <><path d="M20 14a8 8 0 11-9-9c-.5 4 3.5 9 9 9z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>,
    coins: <><ellipse cx="9" cy="7" rx="6" ry="2.5"/><path d="M3 7v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7"/><path d="M3 12v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5"/><ellipse cx="17" cy="14" rx="4" ry="1.7"/><path d="M13 14v4c0 .9 1.8 1.6 4 1.6s4-.7 4-1.6v-4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name] || null}
    </svg>
  );
};

// ---------- Button ----------
const Button = ({ children, variant = "primary", size, onClick, disabled, icon, type = "button", className = "", style }) => {
  const cls = ["t-btn"];
  if (variant === "ghost") cls.push("t-btn--ghost");
  if (variant === "gold") cls.push("t-btn--gold");
  if (variant === "danger") cls.push("t-btn--danger");
  if (size === "sm") cls.push("t-btn--sm");
  cls.push(className);
  return (
    <button type={type} className={cls.join(" ")} onClick={onClick} disabled={disabled} style={style}>
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
};

// ---------- Toggle ----------
const Toggle = ({ on, onChange }) => (
  <div className={`t-toggle ${on ? "t-toggle--on" : ""}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} />
);

// ---------- Checkbox ----------
const Check = ({ on, onChange }) => (
  <div className={`t-check ${on ? "on" : ""}`} onClick={() => onChange(!on)} role="checkbox" aria-checked={on} />
);

// ---------- Sheet (modal) ----------
const Sheet = ({ open, title, subtitle, onClose, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="t-sheet-backdrop" onClick={onClose} />
      <div className="t-sheet" style={wide ? { maxWidth: 880, width: "min(880px, calc(100vw - 24px))" } : null} role="dialog">
        <div className="t-sheet__handle" />
        <div className="t-sheet__head">
          <div>
            <h2 className="t-sheet__title">{title}</h2>
            {subtitle && <div className="t-sheet__sub">{subtitle}</div>}
          </div>
          <button className="t-btn t-btn--ghost t-btn--icon" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={16} /></button>
        </div>
        <div className="t-sheet__body">{children}</div>
        {footer && <div className="t-sheet__foot">{footer}</div>}
      </div>
    </>
  );
};

// ---------- Toast ----------
const ToastCtx = createContext(null);
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const push = (msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="t-toast-host">
        {toasts.map((t) => (
          <div key={t.id} className="t-toast">
            <Icon name={t.kind === "ok" ? "check" : t.kind === "warn" ? "bell" : "x"} size={14} />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => useContext(ToastCtx);

// ---------- Segmented control ----------
const Segmented = ({ value, onChange, options }) => (
  <div className="segmented">
    {options.map((o) => (
      <button key={o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
    ))}
  </div>
);

// ---------- Stepper ----------
const Stepper = ({ value, onChange, min = 0, step = 1 }) => (
  <div className="stepper">
    <button onClick={() => onChange(Math.max(min, (value || 0) - step))} aria-label="Restar">−</button>
    <input value={value} onChange={(e) => { const v = parseFloat(e.target.value); onChange(isNaN(v) ? min : Math.max(min, v)); }} />
    <button onClick={() => onChange((value || 0) + step)} aria-label="Sumar">+</button>
  </div>
);

// ---------- Empty state ----------
const Empty = ({ title, body, action }) => (
  <div className="empty">
    <div className="kana" style={{ marginBottom: 16 }}>Sin resultados</div>
    <h3>{title}</h3>
    <p>{body}</p>
    {action}
  </div>
);

// ---------- Page header ----------
const PageHead = ({ eyebrow, title, italic, actions }) => (
  <div className="page-head">
    <div>
      {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
      <h1 className="page-h1">{title}{italic && <em> {italic}</em>}</h1>
    </div>
    {actions && <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>{actions}</div>}
  </div>
);


export { Icon, Button, Toggle, Check, Sheet, ToastProvider, useToast, Segmented, Stepper, Empty, PageHead, ToastCtx };
