import { useState, useEffect } from "react";
import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

const F1 = "'Cormorant Garamond','Georgia',serif";
const F2 = "'Nunito Sans',sans-serif";
const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Nunito+Sans:wght@300;400;600;700&display=swap";

const C = {
  bg:"#F5EDE3", bgCard:"rgba(255,255,255,0.92)", white:"#FFFFFF",
  brown:"#6B4226", brownLight:"#8B6340", brownDark:"#4A2C17",
  accent:"#C8A882", accentLight:"#E8D5BF", border:"#E0D3C4",
  shadow:"rgba(107,66,38,0.08)", error:"#A04040", errorBg:"#FDEAEA",
  success:"#4A7A5A", successBg:"#E8F3EC", warning:"#B8860B", warningBg:"#FFF3D6",
  info:"#2E7D6F", infoBg:"#E0F2EF",
};

const SUPER_ADMIN_PASSWORD = "superadmin2025";

const ALL_MODULES = [
  {id:"housekeeping",label:"Housekeeping",icon:"🛏️"},
  {id:"spa",label:"Spa & Massages",icon:"💆"},
  {id:"sauna",label:"Sauna",icon:"🧖"},
  {id:"transferts",label:"Transferts",icon:"🚐"},
  {id:"inventaire",label:"Inventaire",icon:"📦"},
  {id:"maintenance",label:"Suivi Technique",icon:"🔧"},
  {id:"notes",label:"Notes & Passation",icon:"📋"},
  {id:"checklists",label:"Checklists",icon:"✅"},
  {id:"feedback",label:"Feedback",icon:"💬"},
  {id:"pdj",label:"Petit-Déjeuner",icon:"☕"},
  {id:"objets",label:"Objets Trouvés",icon:"🎒"},
  {id:"ereputation",label:"E-Réputation",icon:"⭐"},
  {id:"concierge",label:"Conciergerie",icon:"🗺️"},
  {id:"foodcost",label:"Food Cost",icon:"👨‍🍳"},
  {id:"j1",label:"J-1 Arrivées",icon:"📞"},
];

const PLANS = [
  {id:"starter",label:"Starter",color:C.info,price:"79€/mois"},
  {id:"pro",label:"Pro",color:C.success,price:"149€/mois"},
  {id:"enterprise",label:"Enterprise",color:C.warning,price:"Sur devis"},
];

const DEFAULT_HOTELS = [
  {
    id:"maison-soyeuse",
    name:"Maison Soyeuse",
    location:"Briançon",
    url:"https://maison-soyeuse.vercel.app",
    plan:"pro",
    active:true,
    expiresAt:null,
    modules:ALL_MODULES.map(m=>m.id),
    maxUsers:10,
    createdAt:Date.now(),
  }
];

function useResponsive(){
  const[w,setW]=useState(()=>typeof window!=="undefined"?window.innerWidth:390);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return{isMobile:w<640,isTablet:w>=640&&w<1024,isDesktop:w>=1024,pad:w>=1024?"40px":w>=640?"24px":"16px",cols:w>=1024?3:w>=640?2:1,colsMod:w>=768?2:1,maxW:w>=1024?"1000px":"100%"};
}

export default function App() {
  const R = useResponsive();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [hotels, setHotels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [editHotel, setEditHotel] = useState(null);
  const [newHotel, setNewHotel] = useState({name:"",location:"",url:"",plan:"starter",maxUsers:5});

  const showToast = (m,t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),3000); };

  useEffect(()=>{ if(!authed) return;
    (async()=>{
      try {
        const snap = await getDoc(doc(db,"super-admin","hotels"));
        if(snap.exists()) setHotels(JSON.parse(snap.data().value));
        else { setHotels(DEFAULT_HOTELS); await setDoc(doc(db,"super-admin","hotels"),{value:JSON.stringify(DEFAULT_HOTELS)}); }
      } catch(e) { setHotels(DEFAULT_HOTELS); }
    })();
  },[authed]);

  const save = async (updated) => {
    setHotels(updated);
    try { await setDoc(doc(db,"super-admin","hotels"),{value:JSON.stringify(updated)}); }
    catch(e) { console.warn(e); }
  };

  const pushLicense = async (hotel) => {
    try {
      await setDoc(doc(db,"app-data","license"),{
        value: JSON.stringify({hotelId:hotel.id,active:hotel.active,modules:hotel.modules,maxUsers:hotel.maxUsers,plan:hotel.plan,expiresAt:hotel.expiresAt,updatedAt:Date.now()}),
        updatedAt: Date.now()
      });
    } catch(e) { console.warn(e); }
  };

  const toggleModule = (hotelId, moduleId) => {
    const updated = hotels.map(h => {
      if(h.id!==hotelId) return h;
      const mods = h.modules.includes(moduleId)?h.modules.filter(m=>m!==moduleId):[...h.modules,moduleId];
      return {...h,modules:mods};
    });
    save(updated); pushLicense(updated.find(h=>h.id===hotelId)); showToast("Module mis à jour !");
  };

  const toggleHotel = (hotelId) => {
    const updated = hotels.map(h=>h.id===hotelId?{...h,active:!h.active}:h);
    save(updated); pushLicense(updated.find(h=>h.id===hotelId)); showToast("Statut mis à jour !");
  };

  const addHotel = () => {
    if(!newHotel.name.trim()) return;
    const id = newHotel.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-")+"-"+Date.now();
    const hotel = {...newHotel,id,active:true,modules:ALL_MODULES.map(m=>m.id),createdAt:Date.now(),expiresAt:null};
    const updated = [...hotels,hotel];
    save(updated); setShowAddHotel(false); setNewHotel({name:"",location:"",url:"",plan:"starter",maxUsers:5}); showToast("Établissement ajouté !");
  };

  const saveEditHotel = () => {
    if(!editHotel) return;
    const updated = hotels.map(h=>h.id===editHotel.id?{...h,...editHotel}:h);
    save(updated); pushLicense(updated.find(h=>h.id===editHotel.id)); setEditHotel(null); showToast("Paramètres mis à jour !");
  };

  const inp = {width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#FAF6F1",fontFamily:F2,fontSize:14,color:C.brownDark,outline:"none",boxSizing:"border-box"};
  const lbl = {display:"block",fontFamily:F2,fontSize:11,fontWeight:600,color:C.brown,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"};

  if(!authed) return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#F5EDE3,#E8D5BF)`,display:"flex",alignItems:"center",justifyContent:"center",padding:R.pad}}>
      <link href={FONTS_LINK} rel="stylesheet"/>
      <div style={{background:"rgba(255,255,255,0.9)",borderRadius:20,padding:R.isMobile?"28px 20px":"44px 36px",width:"100%",maxWidth:400,boxShadow:`0 8px 40px rgba(107,66,38,0.1)`}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:52,marginBottom:8}}>🏛️</div>
          <h1 style={{fontFamily:F1,fontSize:R.isMobile?24:30,fontWeight:500,color:C.brownDark,margin:0}}>Super Admin</h1>
          <p style={{fontFamily:F2,fontSize:13,color:C.brownLight,marginTop:4}}>Panneau de contrôle centralisé</p>
        </div>
        <div style={{marginBottom:20}}>
          <label style={lbl}>Mot de passe</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){if(password===SUPER_ADMIN_PASSWORD)setAuthed(true);else setError("Mot de passe incorrect");}}}
            placeholder="••••••••" style={inp}/>
        </div>
        {error&&<p style={{fontFamily:F2,fontSize:13,color:C.error,textAlign:"center",marginBottom:12}}>{error}</p>}
        <button onClick={()=>{if(password===SUPER_ADMIN_PASSWORD)setAuthed(true);else setError("Mot de passe incorrect");}}
          style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.brown},${C.brownDark})`,color:"white",fontSize:16,fontFamily:F1,fontWeight:600,cursor:"pointer"}}>
          Accéder
        </button>
      </div>
    </div>
  );

  const selectedHotel = hotels.find(h=>h.id===selected);

  const Modal = ({children,onClose}) => (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:R.isMobile?"flex-end":"center",justifyContent:"center",zIndex:1000,padding:R.isMobile?0:20}}>
      <div style={{background:"white",borderRadius:R.isMobile?"20px 20px 0 0":"20px",padding:R.isMobile?"24px 20px":"28px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F1}}>
      <link href={FONTS_LINK} rel="stylesheet"/>

      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 24px",borderRadius:14,fontFamily:F2,fontSize:13,fontWeight:600,color:"white",background:toast.t==="success"?`linear-gradient(135deg,${C.success},#3d9b6e)`:`linear-gradient(135deg,${C.error},#c04040)`,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>{toast.m}</div>}

      {/* Header */}
      <div style={{background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:R.isMobile?"12px 16px":"16px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {selected&&<button onClick={()=>setSelected(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.brown,padding:"4px 8px"}}>←</button>}
          <div>
            <h1 style={{margin:0,fontFamily:F1,fontSize:R.isMobile?18:22,fontWeight:600,color:C.brownDark}}>🏛️ Super Admin</h1>
            {!R.isMobile&&<p style={{margin:0,fontFamily:F2,fontSize:11,color:C.brownLight}}>{selectedHotel?selectedHotel.name:"Tous les établissements"}</p>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {!selected&&<button onClick={()=>setShowAddHotel(true)} style={{padding:R.isMobile?"7px 12px":"8px 16px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.brown},${C.brownDark})`,color:"white",fontFamily:F2,fontSize:R.isMobile?12:13,fontWeight:600,cursor:"pointer"}}>+ {R.isMobile?"Ajouter":"Établissement"}</button>}
          <button onClick={()=>setAuthed(false)} style={{padding:R.isMobile?"7px 10px":"8px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:R.isMobile?11:13,color:C.brownLight,cursor:"pointer"}}>{R.isMobile?"⬅️":"Déconnexion"}</button>
        </div>
      </div>

      <div style={{padding:R.pad,maxWidth:R.maxW,margin:"0 auto"}}>

        {/* Modal Ajouter */}
        {showAddHotel&&(
          <Modal onClose={()=>setShowAddHotel(false)}>
            <h3 style={{fontFamily:F1,fontSize:20,color:C.brownDark,margin:"0 0 20px"}}>➕ Nouvel établissement</h3>
            <div style={{display:"grid",gap:12,marginBottom:20}}>
              <div><label style={lbl}>Nom *</label><input value={newHotel.name} onChange={e=>setNewHotel(p=>({...p,name:e.target.value}))} placeholder="Ex: Hôtel Le Royal" style={inp}/></div>
              <div><label style={lbl}>Localisation</label><input value={newHotel.location} onChange={e=>setNewHotel(p=>({...p,location:e.target.value}))} placeholder="Ex: Lyon" style={inp}/></div>
              <div><label style={lbl}>URL de l'app</label><input value={newHotel.url} onChange={e=>setNewHotel(p=>({...p,url:e.target.value}))} placeholder="https://..." style={inp}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={lbl}>Plan</label>
                  <select value={newHotel.plan} onChange={e=>setNewHotel(p=>({...p,plan:e.target.value}))} style={inp}>
                    {PLANS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.price}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Max utilisateurs</label><input type="number" value={newHotel.maxUsers} onChange={e=>setNewHotel(p=>({...p,maxUsers:parseInt(e.target.value)||5}))} style={inp}/></div>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAddHotel(false)} style={{flex:1,padding:"12px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:14,cursor:"pointer",color:C.brownLight}}>Annuler</button>
              <button onClick={addHotel} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.brown},${C.brownDark})`,color:"white",fontFamily:F2,fontSize:14,fontWeight:600,cursor:"pointer"}}>Créer</button>
            </div>
          </Modal>
        )}

        {/* Modal Éditer */}
        {editHotel&&(
          <Modal onClose={()=>setEditHotel(null)}>
            <h3 style={{fontFamily:F1,fontSize:20,color:C.brownDark,margin:"0 0 20px"}}>✏️ Modifier — {editHotel.name}</h3>
            <div style={{display:"grid",gap:12,marginBottom:20}}>
              <div><label style={lbl}>Nom</label><input value={editHotel.name} onChange={e=>setEditHotel(p=>({...p,name:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>Localisation</label><input value={editHotel.location||""} onChange={e=>setEditHotel(p=>({...p,location:e.target.value}))} style={inp}/></div>
              <div><label style={lbl}>URL de l'app</label><input value={editHotel.url||""} onChange={e=>setEditHotel(p=>({...p,url:e.target.value}))} style={inp}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={lbl}>Plan</label>
                  <select value={editHotel.plan||"starter"} onChange={e=>setEditHotel(p=>({...p,plan:e.target.value}))} style={inp}>
                    {PLANS.map(p=><option key={p.id} value={p.id}>{p.label} — {p.price}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Max utilisateurs</label><input type="number" value={editHotel.maxUsers||5} onChange={e=>setEditHotel(p=>({...p,maxUsers:parseInt(e.target.value)||5}))} style={inp}/></div>
              </div>
              <div><label style={lbl}>Date d'expiration</label>
                <input type="date" value={editHotel.expiresAt?new Date(editHotel.expiresAt).toISOString().slice(0,10):""} onChange={e=>setEditHotel(p=>({...p,expiresAt:e.target.value?new Date(e.target.value).getTime():null}))} style={inp}/>
                <span style={{fontFamily:F2,fontSize:11,color:C.brownLight,marginTop:4,display:"block"}}>Laisser vide pour pas d'expiration</span>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setEditHotel(null)} style={{flex:1,padding:"12px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:14,cursor:"pointer",color:C.brownLight}}>Annuler</button>
              <button onClick={saveEditHotel} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.brown},${C.brownDark})`,color:"white",fontFamily:F2,fontSize:14,fontWeight:600,cursor:"pointer"}}>💾 Enregistrer</button>
            </div>
          </Modal>
        )}

        {/* Liste des hôtels */}
        {!selected&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${R.cols},1fr)`,gap:16,marginBottom:24}}>
              {[
                {label:"Établissements",value:hotels.length,icon:"🏨",color:C.brownDark},
                {label:"Actifs",value:hotels.filter(h=>h.active).length,icon:"✅",color:C.success},
                {label:"Inactifs",value:hotels.filter(h=>!h.active).length,icon:"⏸️",color:C.error},
              ].map(s=>(
                <div key={s.label} style={{background:"rgba(255,255,255,0.9)",borderRadius:16,padding:"20px",textAlign:"center",boxShadow:`0 2px 10px ${C.shadow}`}}>
                  <div style={{fontSize:28,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontFamily:F2,fontSize:28,fontWeight:700,color:s.color}}>{s.value}</div>
                  <div style={{fontFamily:F2,fontSize:11,color:C.brownLight,marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {hotels.map(h=>{
              const plan = PLANS.find(p=>p.id===h.plan)||PLANS[0];
              const expired = h.expiresAt && Date.now() > h.expiresAt;
              return(
                <div key={h.id} style={{background:"rgba(255,255,255,0.9)",borderRadius:16,padding:R.isMobile?"16px":"20px 24px",marginBottom:12,boxShadow:`0 2px 10px ${C.shadow}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                        <span style={{fontFamily:F1,fontWeight:700,fontSize:R.isMobile?16:18,color:C.brownDark}}>{h.name}</span>
                        <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:plan.color+"20",color:plan.color}}>{plan.label}</span>
                        <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:h.active?C.successBg:C.errorBg,color:h.active?C.success:C.error}}>{h.active?"🟢 Actif":"🔴 Inactif"}</span>
                        {expired&&<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:C.warningBg,color:C.warning}}>⏰ Expiré</span>}
                      </div>
                      <div style={{fontFamily:F2,fontSize:12,color:C.brownLight}}>📍 {h.location} · {h.modules.length} modules · max {h.maxUsers} users</div>
                      {h.expiresAt&&<div style={{fontFamily:F2,fontSize:11,color:expired?C.error:C.brownLight,marginTop:2}}>🗓 Expire le {new Date(h.expiresAt).toLocaleDateString("fr-FR")}</div>}
                      {h.url&&!R.isMobile&&<a href={h.url} target="_blank" rel="noopener noreferrer" style={{fontFamily:F2,fontSize:11,color:C.info,marginTop:4,display:"block"}}>🔗 {h.url}</a>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                      <button onClick={()=>setSelected(h.id)} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:12,fontWeight:600,cursor:"pointer",color:C.brownDark}}>⚙️ {!R.isMobile&&"Gérer"}</button>
                      <button onClick={()=>setEditHotel({...h})} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:12,fontWeight:600,cursor:"pointer",color:C.brownDark}}>✏️ {!R.isMobile&&"Modifier"}</button>
                      <button onClick={()=>toggleHotel(h.id)} style={{padding:"8px 12px",borderRadius:10,border:"none",background:h.active?C.errorBg:C.successBg,color:h.active?C.error:C.success,fontFamily:F2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                        {h.active?"⏸":"▶"}{!R.isMobile&&(h.active?" Suspendre":" Activer")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Détail hôtel — modules */}
        {selected&&selectedHotel&&(
          <>
            <div style={{background:"rgba(255,255,255,0.9)",borderRadius:16,padding:R.isMobile?"16px":"20px 24px",marginBottom:20,boxShadow:`0 2px 10px ${C.shadow}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:R.isMobile?"flex-start":"center",gap:12,marginBottom:16,flexDirection:R.isMobile?"column":"row"}}>
                <div>
                  <h2 style={{fontFamily:F1,fontSize:R.isMobile?20:24,fontWeight:600,color:C.brownDark,margin:0}}>{selectedHotel.name}</h2>
                  <p style={{fontFamily:F2,fontSize:12,color:C.brownLight,margin:"4px 0 0"}}>📍 {selectedHotel.location} · Plan {PLANS.find(p=>p.id===selectedHotel.plan)?.label}</p>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>setEditHotel({...selectedHotel})} style={{padding:"10px 16px",borderRadius:12,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:13,fontWeight:600,cursor:"pointer",color:C.brownDark}}>✏️ Modifier</button>
                  <button onClick={()=>toggleHotel(selectedHotel.id)} style={{padding:"10px 16px",borderRadius:12,border:"none",background:selectedHotel.active?C.errorBg:C.successBg,color:selectedHotel.active?C.error:C.success,fontFamily:F2,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    {selectedHotel.active?"⏸ Suspendre":"▶ Réactiver"}
                  </button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[
                  {label:"Modules actifs",value:selectedHotel.modules.length,color:C.brownDark},
                  {label:"Max utilisateurs",value:selectedHotel.maxUsers,color:C.brownDark},
                  {label:PLANS.find(p=>p.id===selectedHotel.plan)?.label||"",value:"Plan",color:PLANS.find(p=>p.id===selectedHotel.plan)?.color||C.brownDark},
                ].map(s=>(
                  <div key={s.label} style={{textAlign:"center",padding:R.isMobile?"10px 6px":"12px",background:"#FAF6F1",borderRadius:12}}>
                    <div style={{fontFamily:F2,fontSize:R.isMobile?16:20,fontWeight:700,color:s.color}}>{s.value}</div>
                    <div style={{fontFamily:F2,fontSize:R.isMobile?9:10,color:C.brownLight,marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"rgba(255,255,255,0.9)",borderRadius:16,padding:R.isMobile?"16px":"20px 24px",boxShadow:`0 2px 10px ${C.shadow}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
                <h3 style={{fontFamily:F2,fontWeight:700,fontSize:13,color:C.brownDark,margin:0,textTransform:"uppercase",letterSpacing:"0.05em"}}>📦 Modules</h3>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{const u=hotels.map(h=>h.id===selected?{...h,modules:ALL_MODULES.map(m=>m.id)}:h);save(u);pushLicense(u.find(h=>h.id===selected));showToast("Tous activés");}} style={{padding:"6px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:11,cursor:"pointer",color:C.brownDark}}>✅ Tout</button>
                  <button onClick={()=>{const u=hotels.map(h=>h.id===selected?{...h,modules:[]}:h);save(u);pushLicense(u.find(h=>h.id===selected));showToast("Tous désactivés");}} style={{padding:"6px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",fontFamily:F2,fontSize:11,cursor:"pointer",color:C.error}}>⏸ Aucun</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:`repeat(${R.colsMod},1fr)`,gap:8}}>
                {ALL_MODULES.map(m=>{
                  const active = selectedHotel.modules.includes(m.id);
                  return(
                    <div key={m.id} onClick={()=>toggleModule(selectedHotel.id,m.id)} style={{display:"flex",alignItems:"center",gap:10,padding:R.isMobile?"10px 12px":"12px 14px",borderRadius:12,cursor:"pointer",border:`1.5px solid ${active?C.brown:C.border}`,background:active?C.accentLight:"white",transition:"all .15s"}}>
                      <span style={{fontSize:R.isMobile?18:20}}>{m.icon}</span>
                      <span style={{fontFamily:F2,fontSize:R.isMobile?12:13,fontWeight:600,color:active?C.brownDark:C.brownLight,flex:1}}>{m.label}</span>
                      <div style={{width:34,height:19,borderRadius:10,background:active?C.success:C.border,position:"relative",flexShrink:0,transition:"0.2s"}}>
                        <div style={{width:15,height:15,borderRadius:8,background:"white",position:"absolute",top:2,left:active?17:2,transition:"0.2s"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
