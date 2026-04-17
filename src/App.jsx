import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── DESIGN SYSTEM ───
const FONTS = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@400;500;600&display=swap";

const theme = {
  bg: "#0A0B0F",
  bgCard: "#111318",
  bgHover: "#1A1D26",
  bgActive: "#1E2235",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  text: "#F0F2F8",
  textMuted: "#6B7280",
  textDim: "#9CA3AF",
  accent: "#6366F1",
  accentLight: "rgba(99,102,241,0.12)",
  accentBorder: "rgba(99,102,241,0.3)",
  green: "#10B981",
  greenLight: "rgba(16,185,129,0.1)",
  red: "#EF4444",
  redLight: "rgba(239,68,68,0.1)",
  amber: "#F59E0B",
  amberLight: "rgba(245,158,11,0.1)",
  white: "#FFFFFF",
};

const F = "'DM Sans', sans-serif";
const FM = "'DM Mono', monospace";
const FD = "'Playfair Display', serif";

const SUPER_ADMIN_PASSWORD = "superadmin2025";

const ALL_MODULES = [
  { id:"housekeeping", label:"Housekeeping", icon:"🛏️", desc:"Gestion des chambres" },
  { id:"spa", label:"Spa & Massages", icon:"💆", desc:"Soins & réservations" },
  { id:"sauna", label:"Sauna", icon:"🧖", desc:"Créneaux & privatisation" },
  { id:"transferts", label:"Transferts", icon:"🚐", desc:"Courses & chauffeurs" },
  { id:"inventaire", label:"Inventaire", icon:"📦", desc:"Stocks & commandes" },
  { id:"maintenance", label:"Maintenance", icon:"🔧", desc:"Suivi technique" },
  { id:"notes", label:"Notes", icon:"📋", desc:"Journal de bord" },
  { id:"checklists", label:"Checklists", icon:"✅", desc:"Procédures" },
  { id:"feedback", label:"Feedback", icon:"💬", desc:"Retours équipe" },
  { id:"pdj", label:"Petit-Déjeuner", icon:"☕", desc:"Réservations PDJ" },
  { id:"objets", label:"Objets Trouvés", icon:"🎒", desc:"Registre objets" },
  { id:"ereputation", label:"E-Réputation", icon:"⭐", desc:"Avis clients" },
  { id:"concierge", label:"Conciergerie", icon:"🗺️", desc:"Partenaires & activités" },
  { id:"foodcost", label:"Food Cost", icon:"👨‍🍳", desc:"Coûts restauration" },
  { id:"j1", label:"J-1 Arrivées", icon:"📞", desc:"Préparation arrivées" },
];

const PLANS = [
  { id:"starter", label:"Starter", price:"79", color:theme.green },
  { id:"pro", label:"Pro", price:"149", color:theme.accent },
  { id:"enterprise", label:"Enterprise", price:"Sur devis", color:theme.amber },
];

const DEFAULT_HOTELS = [{
  id:"maison-soyeuse", name:"Maison Soyeuse", location:"Briançon, France",
  url:"https://maison-soyeuse.vercel.app", plan:"pro", active:true,
  expiresAt:null, modules:ALL_MODULES.map(m=>m.id), maxUsers:10, createdAt:Date.now(),
}];

function useResponsive() {
  const [w, setW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { w, isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024 };
}

function Badge({ children, color, bg }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", padding:"2px 8px",
      borderRadius:6, fontSize:11, fontWeight:600, fontFamily:FM,
      color, background:bg, letterSpacing:"0.02em",
    }}>{children}</span>
  );
}

function Toggle({ active, onChange }) {
  return (
    <div onClick={onChange} style={{
      width:44, height:24, borderRadius:12, cursor:"pointer", position:"relative",
      background: active ? theme.accent : "rgba(255,255,255,0.08)",
      transition:"background 0.2s", flexShrink:0,
      border: `1px solid ${active ? theme.accentBorder : theme.border}`,
    }}>
      <div style={{
        width:18, height:18, borderRadius:9, background:theme.white,
        position:"absolute", top:2, left: active ? 22 : 2,
        transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
      }}/>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position:"fixed", top:24, right:24, zIndex:9999,
      padding:"14px 20px", borderRadius:12, fontFamily:F, fontSize:13, fontWeight:500,
      color:theme.text, backdropFilter:"blur(20px)",
      background: toast.t === "success"
        ? `rgba(16,185,129,0.15)` : `rgba(239,68,68,0.15)`,
      border: `1px solid ${toast.t === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
      boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
      display:"flex", alignItems:"center", gap:10,
      animation:"slideIn 0.3s ease",
    }}>
      <span style={{fontSize:16}}>{toast.t === "success" ? "✓" : "✕"}</span>
      {toast.m}
    </div>
  );
}

export default function App() {
  const R = useResponsive();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // "add" | "edit"
  const [editData, setEditData] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = useCallback((m, t = "success") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "super-admin", "hotels"));
        if (snap.exists()) setHotels(JSON.parse(snap.data().value));
        else { setHotels(DEFAULT_HOTELS); await setDoc(doc(db,"super-admin","hotels"),{value:JSON.stringify(DEFAULT_HOTELS)}); }
      } catch(e) { setHotels(DEFAULT_HOTELS); }
    })();
  }, [authed]);

  const save = async (updated) => {
    setHotels(updated);
    try { await setDoc(doc(db,"super-admin","hotels"),{value:JSON.stringify(updated)}); }
    catch(e) { console.warn(e); }
  };

  const pushLicense = async (hotel) => {
    try {
      await setDoc(doc(db,"app-data","license"), {
        value: JSON.stringify({ hotelId:hotel.id, active:hotel.active, modules:hotel.modules, maxUsers:hotel.maxUsers, plan:hotel.plan, expiresAt:hotel.expiresAt, updatedAt:Date.now() }),
        updatedAt: Date.now()
      });
    } catch(e) { console.warn(e); }
  };

  const toggleModule = (hotelId, moduleId) => {
    const updated = hotels.map(h => {
      if (h.id !== hotelId) return h;
      const mods = h.modules.includes(moduleId) ? h.modules.filter(m=>m!==moduleId) : [...h.modules, moduleId];
      return { ...h, modules: mods };
    });
    save(updated);
    pushLicense(updated.find(h => h.id === hotelId));
    showToast("Module mis à jour");
  };

  const toggleHotel = (hotelId) => {
    const updated = hotels.map(h => h.id === hotelId ? { ...h, active: !h.active } : h);
    save(updated);
    pushLicense(updated.find(h => h.id === hotelId));
    showToast(updated.find(h=>h.id===hotelId).active ? "Accès activé" : "Accès suspendu");
  };

  const saveHotel = () => {
    if (!editData.name?.trim()) return;
    let updated;
    if (modal === "add") {
      const id = editData.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-")+"-"+Date.now();
      const hotel = { ...editData, id, active:true, modules:ALL_MODULES.map(m=>m.id), createdAt:Date.now() };
      updated = [...hotels, hotel];
    } else {
      updated = hotels.map(h => h.id === editData.id ? { ...h, ...editData } : h);
      pushLicense(updated.find(h => h.id === editData.id));
    }
    save(updated);
    setModal(null);
    showToast(modal === "add" ? "Établissement ajouté" : "Paramètres enregistrés");
  };

  // ── CSS injected ──
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${theme.bg}; }
      @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      input, select { transition: border-color 0.15s; }
      input:focus, select:focus { border-color: ${theme.accent} !important; outline: none; }
      ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      .hotel-card:hover { border-color: ${theme.borderHover} !important; background: ${theme.bgHover} !important; }
      .mod-card:hover { border-color: rgba(255,255,255,0.15) !important; }
      .btn-ghost:hover { background: rgba(255,255,255,0.05) !important; }
      .nav-item:hover { background: rgba(255,255,255,0.04) !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const inp = {
    width:"100%", padding:"10px 14px", borderRadius:8,
    border:`1px solid ${theme.border}`, background:"rgba(255,255,255,0.04)",
    fontFamily:F, fontSize:14, color:theme.text, outline:"none",
  };
  const lbl = { display:"block", fontFamily:FM, fontSize:11, fontWeight:500, color:theme.textMuted, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" };

  // ── Login ──
  if (!authed) return (
    <div style={{ minHeight:"100vh", background:theme.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:F }}>
      <link href={FONTS} rel="stylesheet"/>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${theme.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 20px", boxShadow:`0 0 40px rgba(99,102,241,0.3)` }}>🏛️</div>
          <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:500, color:theme.text, marginBottom:8 }}>Control Panel</h1>
          <p style={{ fontFamily:F, fontSize:13, color:theme.textMuted }}>Super Admin — Accès restreint</p>
        </div>
        <div style={{ background:theme.bgCard, borderRadius:16, padding:28, border:`1px solid ${theme.border}` }}>
          <label style={lbl}>Mot de passe</label>
          <input type="password" value={password}
            onChange={e => { setPassword(e.target.value); setPwError(false); }}
            onKeyDown={e => { if(e.key==="Enter") { if(password===SUPER_ADMIN_PASSWORD) setAuthed(true); else setPwError(true); }}}
            placeholder="••••••••••••" style={{ ...inp, marginBottom:pwError?8:20,
              border:`1px solid ${pwError?theme.red:theme.border}`, letterSpacing:password?"0.2em":"0" }}/>
          {pwError && <p style={{ fontFamily:F, fontSize:12, color:theme.red, marginBottom:16 }}>Mot de passe incorrect</p>}
          <button onClick={() => { if(password===SUPER_ADMIN_PASSWORD) setAuthed(true); else setPwError(true); }}
            style={{ width:"100%", padding:"12px", borderRadius:10, border:"none",
              background:`linear-gradient(135deg,${theme.accent},#818CF8)`,
              color:"white", fontSize:14, fontFamily:F, fontWeight:600, cursor:"pointer",
              boxShadow:`0 4px 20px rgba(99,102,241,0.3)`, letterSpacing:"0.01em" }}>
            Accéder au panneau
          </button>
        </div>
        <p style={{ textAlign:"center", fontFamily:FM, fontSize:11, color:theme.textMuted, marginTop:24 }}>v2.0 · Maison Soyeuse Group</p>
      </div>
    </div>
  );

  const selectedHotel = hotels.find(h => h.id === selected);
  const activeCount = hotels.filter(h => h.active).length;

  // ── Main Layout ──
  return (
    <div style={{ minHeight:"100vh", background:theme.bg, fontFamily:F, display:"flex", flexDirection:"column" }}>
      <link href={FONTS} rel="stylesheet"/>
      <Toast toast={toast}/>

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", display:"flex", alignItems:R.isMobile?"flex-end":"center", justifyContent:"center", zIndex:1000, padding:R.isMobile?0:20 }}>
          <div style={{ background:theme.bgCard, borderRadius:R.isMobile?"20px 20px 0 0":"16px", padding:R.isMobile?"24px 20px 32px":"32px", width:"100%", maxWidth:500, border:`1px solid ${theme.border}`, animation:"fadeUp 0.25s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
              <h2 style={{ fontFamily:FD, fontSize:22, fontWeight:500, color:theme.text }}>
                {modal==="add" ? "Nouvel établissement" : `Modifier — ${editData.name}`}
              </h2>
              <button onClick={()=>setModal(null)} className="btn-ghost" style={{ background:"none", border:`1px solid ${theme.border}`, color:theme.textMuted, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
            <div style={{ display:"grid", gap:16, marginBottom:28 }}>
              <div>
                <label style={lbl}>Nom de l'établissement *</label>
                <input value={editData.name||""} onChange={e=>setEditData(p=>({...p,name:e.target.value}))} placeholder="Ex: Hôtel Le Sommet" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Localisation</label>
                <input value={editData.location||""} onChange={e=>setEditData(p=>({...p,location:e.target.value}))} placeholder="Ex: Annecy, France" style={inp}/>
              </div>
              <div>
                <label style={lbl}>URL de l'application</label>
                <input value={editData.url||""} onChange={e=>setEditData(p=>({...p,url:e.target.value}))} placeholder="https://..." style={{...inp,fontFamily:FM,fontSize:13}}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Plan</label>
                  <select value={editData.plan||"starter"} onChange={e=>setEditData(p=>({...p,plan:e.target.value}))} style={{ ...inp, cursor:"pointer" }}>
                    {PLANS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.price}€/mois</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Max utilisateurs</label>
                  <input type="number" value={editData.maxUsers||5} onChange={e=>setEditData(p=>({...p,maxUsers:parseInt(e.target.value)||5}))} style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Expiration (optionnel)</label>
                <input type="date" value={editData.expiresAt?new Date(editData.expiresAt).toISOString().slice(0,10):""} onChange={e=>setEditData(p=>({...p,expiresAt:e.target.value?new Date(e.target.value).getTime():null}))} style={{...inp,colorScheme:"dark"}}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setModal(null)} className="btn-ghost" style={{ flex:1, padding:"11px", borderRadius:10, border:`1px solid ${theme.border}`, background:"none", fontFamily:F, fontSize:14, cursor:"pointer", color:theme.textMuted }}>Annuler</button>
              <button onClick={saveHotel} style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${theme.accent},#818CF8)`, color:"white", fontFamily:F, fontSize:14, fontWeight:600, cursor:"pointer" }}>
                {modal==="add" ? "Créer l'établissement" : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={{ background:theme.bgCard, borderBottom:`1px solid ${theme.border}`, padding:R.isMobile?"12px 16px":"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(20px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {selected && (
            <button onClick={()=>setSelected(null)} className="btn-ghost" style={{ background:"none", border:`1px solid ${theme.border}`, color:theme.textMuted, width:34, height:34, borderRadius:8, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${theme.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🏛️</div>
            <div>
              <div style={{ fontFamily:FD, fontSize:R.isMobile?15:17, fontWeight:500, color:theme.text }}>
                {selectedHotel ? selectedHotel.name : "Control Panel"}
              </div>
              {!R.isMobile && <div style={{ fontFamily:FM, fontSize:10, color:theme.textMuted }}>{selectedHotel ? "Gestion des modules" : `${activeCount} établissement${activeCount>1?"s":""} actif${activeCount>1?"s":""}`}</div>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {!selected && (
            <button onClick={()=>{ setEditData({name:"",location:"",url:"",plan:"starter",maxUsers:5,expiresAt:null}); setModal("add"); }}
              style={{ padding:R.isMobile?"8px 12px":"9px 16px", borderRadius:8, border:"none", background:theme.accent, color:"white", fontFamily:F, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {R.isMobile?"+" : "+ Établissement"}
            </button>
          )}
          <button onClick={()=>setAuthed(false)} className="btn-ghost" style={{ padding:"9px 14px", borderRadius:8, border:`1px solid ${theme.border}`, background:"none", fontFamily:FM, fontSize:12, color:theme.textMuted, cursor:"pointer" }}>
            {R.isMobile?"⬅":"Déconnexion"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:R.isMobile?"16px":"28px", maxWidth:1100, width:"100%", margin:"0 auto" }}>

        {/* Hotels list */}
        {!selected && (<>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:R.isMobile?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:28 }}>
            {[
              { label:"Total", value:hotels.length, sub:"établissements", color:theme.text },
              { label:"Actifs", value:activeCount, sub:"en ligne", color:theme.green },
              { label:"Suspendus", value:hotels.filter(h=>!h.active).length, sub:"hors ligne", color:theme.red },
              { label:"Modules", value:ALL_MODULES.length, sub:"disponibles", color:theme.accent },
            ].map((s,i) => (
              <div key={i} style={{ background:theme.bgCard, borderRadius:12, padding:"18px 20px", border:`1px solid ${theme.border}`, animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
                <div style={{ fontFamily:FM, fontSize:11, color:theme.textMuted, marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>{s.label}</div>
                <div style={{ fontFamily:FD, fontSize:32, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontFamily:F, fontSize:12, color:theme.textMuted, marginTop:4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Hotel cards */}
          <div style={{ display:"grid", gap:10 }}>
            {hotels.map((h,i) => {
              const plan = PLANS.find(p=>p.id===h.plan)||PLANS[0];
              const expired = h.expiresAt && Date.now() > h.expiresAt;
              return (
                <div key={h.id} className="hotel-card" style={{ background:theme.bgCard, borderRadius:14, padding:R.isMobile?"16px":"20px 24px", border:`1px solid ${theme.border}`, transition:"all 0.2s", animation:`fadeUp 0.3s ease ${i*0.06}s both`, cursor:"default" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:R.isMobile?12:20, flexWrap:R.isMobile?"wrap":"nowrap" }}>
                    {/* Avatar */}
                    <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${plan.color}22,${plan.color}44)`, border:`1px solid ${plan.color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      🏨
                    </div>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontFamily:FD, fontSize:R.isMobile?16:18, fontWeight:500, color:theme.text }}>{h.name}</span>
                        <Badge color={plan.color} bg={plan.color+"18"}>{plan.label}</Badge>
                        <Badge color={h.active?theme.green:theme.red} bg={h.active?theme.greenLight:theme.redLight}>
                          {h.active?"● Actif":"● Suspendu"}
                        </Badge>
                        {expired && <Badge color={theme.amber} bg={theme.amberLight}>⏰ Expiré</Badge>}
                      </div>
                      <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:F, fontSize:12, color:theme.textMuted }}>📍 {h.location}</span>
                        <span style={{ fontFamily:FM, fontSize:11, color:theme.textMuted }}>{h.modules.length}/{ALL_MODULES.length} modules</span>
                        <span style={{ fontFamily:FM, fontSize:11, color:theme.textMuted }}>max {h.maxUsers} users</span>
                        {h.expiresAt && <span style={{ fontFamily:FM, fontSize:11, color:expired?theme.red:theme.textMuted }}>exp. {new Date(h.expiresAt).toLocaleDateString("fr-FR")}</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:R.isMobile?"wrap":"nowrap" }}>
                      <button onClick={()=>setSelected(h.id)} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${theme.border}`, background:"none", fontFamily:F, fontSize:12, fontWeight:500, cursor:"pointer", color:theme.text, whiteSpace:"nowrap" }}>
                        ⚙ Modules
                      </button>
                      <button onClick={()=>{ setEditData({...h}); setModal("edit"); }} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${theme.border}`, background:"none", fontFamily:F, fontSize:12, fontWeight:500, cursor:"pointer", color:theme.text }}>
                        ✏ {!R.isMobile && "Modifier"}
                      </button>
                      <button onClick={()=>toggleHotel(h.id)} style={{ padding:"8px 14px", borderRadius:8, border:"none", background:h.active?theme.redLight:theme.greenLight, fontFamily:F, fontSize:12, fontWeight:600, cursor:"pointer", color:h.active?theme.red:theme.green, whiteSpace:"nowrap" }}>
                        {h.active?"⏸ Suspendre":"▶ Activer"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* Hotel detail — modules */}
        {selected && selectedHotel && (<>
          {/* Header card */}
          <div style={{ background:theme.bgCard, borderRadius:14, padding:R.isMobile?"16px":"24px", border:`1px solid ${theme.border}`, marginBottom:20, animation:"fadeUp 0.25s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexDirection:R.isMobile?"column":"row", marginBottom:20 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <h2 style={{ fontFamily:FD, fontSize:R.isMobile?20:26, fontWeight:500, color:theme.text }}>{selectedHotel.name}</h2>
                  <Badge color={PLANS.find(p=>p.id===selectedHotel.plan)?.color||theme.accent} bg={(PLANS.find(p=>p.id===selectedHotel.plan)?.color||theme.accent)+"18"}>{PLANS.find(p=>p.id===selectedHotel.plan)?.label}</Badge>
                </div>
                <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:F, fontSize:13, color:theme.textMuted }}>📍 {selectedHotel.location}</span>
                  {selectedHotel.url && <a href={selectedHotel.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:FM, fontSize:12, color:theme.accent }}>{selectedHotel.url}</a>}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={()=>{ setEditData({...selectedHotel}); setModal("edit"); }} className="btn-ghost" style={{ padding:"9px 16px", borderRadius:9, border:`1px solid ${theme.border}`, background:"none", fontFamily:F, fontSize:13, fontWeight:500, cursor:"pointer", color:theme.text }}>✏ Modifier</button>
                <button onClick={()=>toggleHotel(selectedHotel.id)} style={{ padding:"9px 16px", borderRadius:9, border:"none", background:selectedHotel.active?theme.redLight:theme.greenLight, fontFamily:F, fontSize:13, fontWeight:600, cursor:"pointer", color:selectedHotel.active?theme.red:theme.green }}>
                  {selectedHotel.active?"⏸ Suspendre":"▶ Réactiver"}
                </button>
              </div>
            </div>
            {/* Stats row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { label:"Modules actifs", value:`${selectedHotel.modules.length}/${ALL_MODULES.length}`, color:theme.accent },
                { label:"Max utilisateurs", value:selectedHotel.maxUsers, color:theme.green },
                { label:"Statut", value:selectedHotel.active?"Actif":"Suspendu", color:selectedHotel.active?theme.green:theme.red },
              ].map(s=>(
                <div key={s.label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"12px 16px", border:`1px solid ${theme.border}` }}>
                  <div style={{ fontFamily:FM, fontSize:10, color:theme.textMuted, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>{s.label}</div>
                  <div style={{ fontFamily:FD, fontSize:22, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Modules grid */}
          <div style={{ background:theme.bgCard, borderRadius:14, padding:R.isMobile?"16px":"24px", border:`1px solid ${theme.border}`, animation:"fadeUp 0.3s ease 0.05s both" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontFamily:FM, fontSize:11, color:theme.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:2 }}>Modules</div>
                <div style={{ fontFamily:F, fontSize:13, color:theme.textDim }}>{selectedHotel.modules.length} actif{selectedHotel.modules.length>1?"s":""} sur {ALL_MODULES.length}</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{ const u=hotels.map(h=>h.id===selected?{...h,modules:ALL_MODULES.map(m=>m.id)}:h);save(u);pushLicense(u.find(h=>h.id===selected));showToast("Tous activés"); }} className="btn-ghost" style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${theme.border}`, background:"none", fontFamily:FM, fontSize:11, cursor:"pointer", color:theme.green }}>✓ Tout activer</button>
                <button onClick={()=>{ const u=hotels.map(h=>h.id===selected?{...h,modules:[]}:h);save(u);pushLicense(u.find(h=>h.id===selected));showToast("Tous désactivés"); }} className="btn-ghost" style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${theme.border}`, background:"none", fontFamily:FM, fontSize:11, cursor:"pointer", color:theme.red }}>✕ Tout désactiver</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:R.isMobile?"1fr":R.isTablet?"1fr 1fr":"1fr 1fr 1fr", gap:8 }}>
              {ALL_MODULES.map((m,i) => {
                const active = selectedHotel.modules.includes(m.id);
                return (
                  <div key={m.id} className="mod-card" onClick={()=>toggleModule(selectedHotel.id,m.id)} style={{
                    display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, cursor:"pointer",
                    border:`1px solid ${active?theme.accentBorder:theme.border}`,
                    background:active?theme.accentLight:"rgba(255,255,255,0.02)",
                    transition:"all 0.15s", animation:`fadeUp 0.3s ease ${i*0.02}s both`,
                  }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{m.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:active?theme.text:theme.textMuted }}>{m.label}</div>
                      <div style={{ fontFamily:F, fontSize:11, color:theme.textMuted, marginTop:1 }}>{m.desc}</div>
                    </div>
                    <Toggle active={active} onChange={()=>toggleModule(selectedHotel.id,m.id)}/>
                  </div>
                );
              })}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
