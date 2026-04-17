import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

const FONTS = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@400;500;600&display=swap";

const T = {
  bg: "#141726",
  bgCard: "#1C2035",
  bgHover: "#222740",
  bgActive: "#252A45",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.16)",
  text: "#EEF0FA",
  textMuted: "#6B7490",
  textDim: "#9CA3C0",
  accent: "#6366F1",
  accentLight: "rgba(99,102,241,0.13)",
  accentBorder: "rgba(99,102,241,0.35)",
  green: "#10B981",
  greenLight: "rgba(16,185,129,0.12)",
  red: "#EF4444",
  redLight: "rgba(239,68,68,0.12)",
  amber: "#F59E0B",
  amberLight: "rgba(245,158,11,0.12)",
};

const F = "'DM Sans', sans-serif";
const FM = "'DM Mono', monospace";
const FD = "'Playfair Display', serif";
const PW = "superadmin2025";

const MODULES = [
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
  { id:"starter", label:"Starter", price:"79", color:T.green },
  { id:"pro", label:"Pro", price:"149", color:T.accent },
  { id:"enterprise", label:"Enterprise", price:"—", color:T.amber },
];

const DEFAULT_HOTELS = [{
  id:"maison-soyeuse", name:"Maison Soyeuse", location:"Briançon, France",
  url:"https://maison-soyeuse.vercel.app", plan:"pro", active:true,
  expiresAt:null, modules:MODULES.map(m=>m.id), maxUsers:10, createdAt:Date.now(),
}];

function useW() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => { const h=()=>setW(window.innerWidth); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); }, []);
  return w;
}

function Pill({ children, color, bg }) {
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 9px", borderRadius:6, fontSize:11, fontWeight:600, fontFamily:FM, color, background:bg, letterSpacing:"0.02em", whiteSpace:"nowrap" }}>{children}</span>;
}

function Toggle({ active, onChange }) {
  return (
    <div onClick={e=>{e.stopPropagation();onChange();}} style={{ width:40, height:22, borderRadius:11, cursor:"pointer", position:"relative", background:active?T.accent:"rgba(255,255,255,0.1)", transition:"background 0.2s", flexShrink:0, border:`1px solid ${active?T.accentBorder:T.border}` }}>
      <div style={{ width:16, height:16, borderRadius:8, background:"white", position:"absolute", top:2, left:active?20:2, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }}/>
    </div>
  );
}

export default function App() {
  const w = useW();
  const mob = w < 640;
  const tab = w >= 640 && w < 1024;
  const desk = w >= 1024;

  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const showToast = useCallback((m, t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),3000); }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const s = await getDoc(doc(db,"super-admin","hotels"));
        if (s.exists()) setHotels(JSON.parse(s.data().value));
        else { setHotels(DEFAULT_HOTELS); await setDoc(doc(db,"super-admin","hotels"),{value:JSON.stringify(DEFAULT_HOTELS)}); }
      } catch(e) { setHotels(DEFAULT_HOTELS); }
    })();
  }, [authed]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:${T.bg};-webkit-tap-highlight-color:transparent;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      @keyframes modalIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      input:focus,select:focus{border-color:${T.accent}!important;outline:none;}
      input[type=date]{color-scheme:dark;}
      ::-webkit-scrollbar{width:3px;}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const save = async (u) => { setHotels(u); try{ await setDoc(doc(db,"super-admin","hotels"),{value:JSON.stringify(u)}); }catch(e){} };
  const pushLic = async (h) => { try{ await setDoc(doc(db,"app-data","license"),{value:JSON.stringify({hotelId:h.id,active:h.active,modules:h.modules,maxUsers:h.maxUsers,plan:h.plan,expiresAt:h.expiresAt,updatedAt:Date.now()}),updatedAt:Date.now()}); }catch(e){} };

  const toggleMod = (hid, mid) => {
    const u = hotels.map(h => h.id!==hid?h:{...h,modules:h.modules.includes(mid)?h.modules.filter(m=>m!==mid):[...h.modules,mid]});
    save(u); pushLic(u.find(h=>h.id===hid)); showToast("Module mis à jour");
  };
  const toggleHotel = (hid) => {
    const u = hotels.map(h=>h.id===hid?{...h,active:!h.active}:h);
    save(u); pushLic(u.find(h=>h.id===hid));
    showToast(u.find(h=>h.id===hid).active?"Accès activé":"Accès suspendu");
  };
  const saveForm = () => {
    if (!form.name?.trim()) return;
    let u;
    if (modal==="add") {
      const id = form.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-")+"-"+Date.now();
      u = [...hotels,{...form,id,active:true,modules:MODULES.map(m=>m.id),createdAt:Date.now()}];
    } else {
      u = hotels.map(h=>h.id===form.id?{...h,...form}:h);
      pushLic(u.find(h=>h.id===form.id));
    }
    save(u); setModal(null); showToast(modal==="add"?"Établissement ajouté":"Paramètres enregistrés");
  };

  const inp = { width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${T.border}`, background:"rgba(255,255,255,0.05)", fontFamily:F, fontSize:14, color:T.text };
  const lbl = { display:"block", fontFamily:FM, fontSize:10, fontWeight:500, color:T.textMuted, marginBottom:6, letterSpacing:"0.07em", textTransform:"uppercase" };
  const sh = selected ? hotels.find(h=>h.id===selected) : null;

  // ── LOGIN ──
  if (!authed) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:F }}>
      <link href={FONTS} rel="stylesheet"/>
      <div style={{ width:"100%", maxWidth:360 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:68, height:68, borderRadius:20, background:`linear-gradient(135deg,${T.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px", boxShadow:`0 0 48px rgba(99,102,241,0.35)` }}>🏛️</div>
          <h1 style={{ fontFamily:FD, fontSize:26, fontWeight:500, color:T.text, marginBottom:6 }}>Control Panel</h1>
          <p style={{ fontFamily:F, fontSize:13, color:T.textMuted }}>Accès super administrateur</p>
        </div>
        <div style={{ background:T.bgCard, borderRadius:16, padding:24, border:`1px solid ${T.border}` }}>
          <label style={lbl}>Mot de passe</label>
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setPwErr(false);}}
            onKeyDown={e=>{if(e.key==="Enter"){if(pw===PW)setAuthed(true);else setPwErr(true);}}}
            placeholder="••••••••••" style={{...inp, marginBottom:pwErr?8:16, border:`1px solid ${pwErr?T.red:T.border}`, letterSpacing:pw?"0.18em":"0"}}/>
          {pwErr && <p style={{ fontFamily:F, fontSize:12, color:T.red, marginBottom:14 }}>Mot de passe incorrect</p>}
          <button onClick={()=>{if(pw===PW)setAuthed(true);else setPwErr(true);}} style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${T.accent},#818CF8)`, color:"white", fontSize:15, fontFamily:F, fontWeight:600, cursor:"pointer", letterSpacing:"0.01em", boxShadow:`0 4px 24px rgba(99,102,241,0.3)` }}>
            Accéder
          </button>
        </div>
      </div>
    </div>
  );

  const modCols = mob ? "1fr" : tab ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:F }}>
      <link href={FONTS} rel="stylesheet"/>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, left:mob?16:"auto", zIndex:9999, padding:"12px 18px", borderRadius:12, fontFamily:F, fontSize:13, fontWeight:500, color:T.text, background:toast.t==="success"?"rgba(16,185,129,0.18)":"rgba(239,68,68,0.18)", border:`1px solid ${toast.t==="success"?"rgba(16,185,129,0.35)":"rgba(239,68,68,0.35)"}`, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", animation:"slideIn 0.25s ease", display:"flex", alignItems:"center", gap:8 }}>
          <span>{toast.t==="success"?"✓":"✕"}</span>{toast.m}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(10px)", display:"flex", alignItems:mob?"flex-end":"center", justifyContent:"center", zIndex:1000, padding:mob?0:20 }}>
          <div style={{ background:T.bgCard, borderRadius:mob?"20px 20px 0 0":"16px", padding:mob?"24px 20px 36px":"32px", width:"100%", maxWidth:480, border:`1px solid ${T.border}`, animation:"modalIn 0.25s ease", maxHeight:mob?"92vh":"auto", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ fontFamily:FD, fontSize:20, fontWeight:500, color:T.text }}>{modal==="add"?"Nouvel établissement":`Modifier — ${form.name}`}</h2>
              <button onClick={()=>setModal(null)} style={{ background:"none", border:`1px solid ${T.border}`, color:T.textMuted, width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
            <div style={{ display:"grid", gap:14, marginBottom:24 }}>
              <div><label style={lbl}>Nom *</label><input value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Hôtel Le Sommet" style={inp}/></div>
              <div><label style={lbl}>Localisation</label><input value={form.location||""} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Ex: Annecy, France" style={inp}/></div>
              <div><label style={lbl}>URL de l'application</label><input value={form.url||""} onChange={e=>setForm(p=>({...p,url:e.target.value}))} placeholder="https://..." style={{...inp,fontFamily:FM,fontSize:12}}/></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Plan</label>
                  <select value={form.plan||"starter"} onChange={e=>setForm(p=>({...p,plan:e.target.value}))} style={{...inp,cursor:"pointer"}}>
                    {PLANS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.price}{p.price!=="—"?"€/mois":""}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Max users</label><input type="number" min="1" value={form.maxUsers||5} onChange={e=>setForm(p=>({...p,maxUsers:parseInt(e.target.value)||5}))} style={inp}/></div>
              </div>
              <div><label style={lbl}>Expiration (optionnel)</label>
                <input type="date" value={form.expiresAt?new Date(form.expiresAt).toISOString().slice(0,10):""} onChange={e=>setForm(p=>({...p,expiresAt:e.target.value?new Date(e.target.value).getTime():null}))} style={inp}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setModal(null)} style={{ flex:1, padding:"11px", borderRadius:10, border:`1px solid ${T.border}`, background:"none", fontFamily:F, fontSize:14, cursor:"pointer", color:T.textMuted }}>Annuler</button>
              <button onClick={saveForm} style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${T.accent},#818CF8)`, color:"white", fontFamily:F, fontSize:14, fontWeight:600, cursor:"pointer" }}>
                {modal==="add"?"Créer":"Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div style={{ background:T.bgCard, borderBottom:`1px solid ${T.border}`, padding:mob?"12px 16px":"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          {selected && <button onClick={()=>setSelected(null)} style={{ background:"none", border:`1px solid ${T.border}`, color:T.textMuted, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>←</button>}
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${T.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>🏛️</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:FD, fontSize:mob?14:16, fontWeight:500, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {sh ? sh.name : "Control Panel"}
              </div>
              {!mob && <div style={{ fontFamily:FM, fontSize:10, color:T.textMuted }}>{sh?"Gestion des modules":`${hotels.filter(h=>h.active).length} actif(s)`}</div>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexShrink:0 }}>
          {!selected && <button onClick={()=>{setForm({name:"",location:"",url:"",plan:"starter",maxUsers:5,expiresAt:null});setModal("add");}} style={{ padding:mob?"8px 12px":"9px 16px", borderRadius:8, border:"none", background:T.accent, color:"white", fontFamily:F, fontSize:mob?12:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
            {mob?"+" : "+ Établissement"}
          </button>}
          <button onClick={()=>setAuthed(false)} style={{ padding:"9px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:"none", fontFamily:FM, fontSize:11, color:T.textMuted, cursor:"pointer" }}>⬅</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding:mob?"12px":"24px 28px", maxWidth:1100, margin:"0 auto" }}>

        {/* LISTE HOTELS */}
        {!selected && (<>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)", gap:10, marginBottom:20 }}>
            {[
              { label:"Établissements", value:hotels.length, color:T.text },
              { label:"Actifs", value:hotels.filter(h=>h.active).length, color:T.green },
              { label:"Suspendus", value:hotels.filter(h=>!h.active).length, color:T.red },
              { label:"Modules dispo.", value:MODULES.length, color:T.accent },
            ].map((s,i)=>(
              <div key={i} style={{ background:T.bgCard, borderRadius:12, padding:mob?"14px":"18px 20px", border:`1px solid ${T.border}`, animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
                <div style={{ fontFamily:FM, fontSize:10, color:T.textMuted, marginBottom:6, letterSpacing:"0.07em", textTransform:"uppercase" }}>{s.label}</div>
                <div style={{ fontFamily:FD, fontSize:mob?26:32, color:s.color, lineHeight:1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Cards */}
          {hotels.map((h,i) => {
            const plan = PLANS.find(p=>p.id===h.plan)||PLANS[0];
            const expired = h.expiresAt && Date.now()>h.expiresAt;
            return (
              <div key={h.id} style={{ background:T.bgCard, borderRadius:14, padding:mob?"14px":"18px 22px", marginBottom:10, border:`1px solid ${T.border}`, animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
                {/* Top row */}
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg,${plan.color}25,${plan.color}45)`, border:`1px solid ${plan.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏨</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FD, fontSize:mob?15:17, fontWeight:500, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{h.name}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <Pill color={plan.color} bg={plan.color+"18"}>{plan.label}</Pill>
                      <Pill color={h.active?T.green:T.red} bg={h.active?T.greenLight:T.redLight}>{h.active?"● Actif":"● Suspendu"}</Pill>
                      {expired && <Pill color={T.amber} bg={T.amberLight}>Expiré</Pill>}
                    </div>
                  </div>
                </div>
                {/* Meta */}
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12, paddingLeft:52 }}>
                  {h.location && <span style={{ fontFamily:F, fontSize:12, color:T.textMuted }}>📍 {h.location}</span>}
                  <span style={{ fontFamily:FM, fontSize:11, color:T.textMuted }}>{h.modules.length}/{MODULES.length} modules</span>
                  <span style={{ fontFamily:FM, fontSize:11, color:T.textMuted }}>max {h.maxUsers} users</span>
                  {h.expiresAt && <span style={{ fontFamily:FM, fontSize:11, color:expired?T.red:T.textMuted }}>exp. {new Date(h.expiresAt).toLocaleDateString("fr-FR")}</span>}
                </div>
                {/* Actions */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingLeft:52 }}>
                  <button onClick={()=>setSelected(h.id)} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${T.border}`, background:"none", fontFamily:F, fontSize:12, fontWeight:500, cursor:"pointer", color:T.text }}>⚙ Modules</button>
                  <button onClick={()=>{setForm({...h});setModal("edit");}} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${T.border}`, background:"none", fontFamily:F, fontSize:12, fontWeight:500, cursor:"pointer", color:T.text }}>✏ Modifier</button>
                  <button onClick={()=>toggleHotel(h.id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:h.active?T.redLight:T.greenLight, fontFamily:F, fontSize:12, fontWeight:600, cursor:"pointer", color:h.active?T.red:T.green }}>
                    {h.active?"⏸ Suspendre":"▶ Activer"}
                  </button>
                </div>
              </div>
            );
          })}
        </>)}

        {/* DETAIL MODULES */}
        {selected && sh && (<>
          {/* Info card */}
          <div style={{ background:T.bgCard, borderRadius:14, padding:mob?"14px":"20px 24px", marginBottom:16, border:`1px solid ${T.border}`, animation:"fadeUp 0.25s ease" }}>
            <div style={{ display:"flex", flexDirection:mob?"column":"row", justifyContent:"space-between", alignItems:mob?"flex-start":"center", gap:12, marginBottom:16 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ fontFamily:FD, fontSize:mob?18:22, fontWeight:500, color:T.text }}>{sh.name}</span>
                  <Pill color={PLANS.find(p=>p.id===sh.plan)?.color||T.accent} bg={(PLANS.find(p=>p.id===sh.plan)?.color||T.accent)+"18"}>{PLANS.find(p=>p.id===sh.plan)?.label}</Pill>
                  <Pill color={sh.active?T.green:T.red} bg={sh.active?T.greenLight:T.redLight}>{sh.active?"● Actif":"● Suspendu"}</Pill>
                </div>
                {sh.location && <div style={{ fontFamily:F, fontSize:12, color:T.textMuted }}>📍 {sh.location}</div>}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={()=>{setForm({...sh});setModal("edit");}} style={{ padding:"8px 14px", borderRadius:9, border:`1px solid ${T.border}`, background:"none", fontFamily:F, fontSize:13, cursor:"pointer", color:T.text }}>✏ Modifier</button>
                <button onClick={()=>toggleHotel(sh.id)} style={{ padding:"8px 14px", borderRadius:9, border:"none", background:sh.active?T.redLight:T.greenLight, fontFamily:F, fontSize:13, fontWeight:600, cursor:"pointer", color:sh.active?T.red:T.green }}>
                  {sh.active?"⏸ Suspendre":"▶ Réactiver"}
                </button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { label:"Modules actifs", value:`${sh.modules.length}/${MODULES.length}`, color:T.accent },
                { label:"Max utilisateurs", value:sh.maxUsers, color:T.green },
                { label:"Statut accès", value:sh.active?"Actif":"Suspendu", color:sh.active?T.green:T.red },
              ].map(s=>(
                <div key={s.label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:mob?"10px 12px":"12px 16px", border:`1px solid ${T.border}` }}>
                  <div style={{ fontFamily:FM, fontSize:10, color:T.textMuted, marginBottom:4, letterSpacing:"0.07em", textTransform:"uppercase" }}>{s.label}</div>
                  <div style={{ fontFamily:FD, fontSize:mob?18:22, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div style={{ background:T.bgCard, borderRadius:14, padding:mob?"14px":"20px 24px", border:`1px solid ${T.border}`, animation:"fadeUp 0.3s ease 0.05s both" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontFamily:FM, fontSize:10, color:T.textMuted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:2 }}>Modules</div>
                <div style={{ fontFamily:F, fontSize:12, color:T.textDim }}>{sh.modules.length} actif{sh.modules.length>1?"s":""} / {MODULES.length} disponibles</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{const u=hotels.map(h=>h.id===selected?{...h,modules:MODULES.map(m=>m.id)}:h);save(u);pushLic(u.find(h=>h.id===selected));showToast("Tous activés");}} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${T.border}`, background:"none", fontFamily:FM, fontSize:11, cursor:"pointer", color:T.green }}>✓ Tout</button>
                <button onClick={()=>{const u=hotels.map(h=>h.id===selected?{...h,modules:[]}:h);save(u);pushLic(u.find(h=>h.id===selected));showToast("Tous désactivés");}} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${T.border}`, background:"none", fontFamily:FM, fontSize:11, cursor:"pointer", color:T.red }}>✕ Aucun</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:modCols, gap:8 }}>
              {MODULES.map((m,i) => {
                const active = sh.modules.includes(m.id);
                return (
                  <div key={m.id} onClick={()=>toggleMod(sh.id,m.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px", borderRadius:10, cursor:"pointer", border:`1px solid ${active?T.accentBorder:T.border}`, background:active?T.accentLight:"rgba(255,255,255,0.02)", transition:"all 0.15s", animation:`fadeUp 0.3s ease ${i*0.02}s both` }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{m.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:F, fontSize:13, fontWeight:600, color:active?T.text:T.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.label}</div>
                      {!mob && <div style={{ fontFamily:F, fontSize:11, color:T.textMuted, marginTop:1 }}>{m.desc}</div>}
                    </div>
                    <Toggle active={active} onChange={()=>toggleMod(sh.id,m.id)}/>
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
