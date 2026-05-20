"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// ─── Types ────────────────────────────────────────────────────────────────────
type Freq   = "W" | "B" | "M";
type RepId  = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
interface LatLng    { lat: number; lng: number }
interface Customer  { id:string; name:string; lat:number; lng:number; rep:RepId; type:string; days:string[]; freq:Freq }

export const DAYS_EG = ["Sat","Sun","Mon","Tue","Wed","Thu"] as const;

export const REPS_DATA: { id:RepId; name:string; nameAr:string; zone:string; color:string }[] = [
  { id:"R1", name:"Ahmed Hassan",  nameAr:"أحمد حسن",   zone:"Cairo North", color:"#E07B2A" },
  { id:"R2", name:"Mohamed Kamal", nameAr:"محمد كمال",  zone:"Cairo South", color:"#2EA064" },
  { id:"R3", name:"Tarek Samir",   nameAr:"طارق سمير",  zone:"Alexandria",  color:"#7B5EA7" },
  { id:"R4", name:"Karim Hassan",  nameAr:"كريم حسن",   zone:"Delta",       color:"#1A8A8A" },
  { id:"R5", name:"Hossam Fathy",  nameAr:"حسام فتحي",  zone:"Canal Zone",  color:"#C9A84C" },
  { id:"R6", name:"Amr Wael",      nameAr:"عمرو وائل",  zone:"Upper Egypt", color:"#60B8D4" },
];

const REP_COLOR: Record<RepId,string> = {
  R1:"#E07B2A", R2:"#2EA064", R3:"#7B5EA7", R4:"#1A8A8A", R5:"#C9A84C", R6:"#60B8D4",
};

export const CUSTOMERS: Customer[] = [
  // Cairo North — R1
  {id:"C01",name:"Heliopolis — Al Mokhtar Super",  lat:30.0922,lng:31.3242,rep:"R1",type:"Supermarket",days:["Sat","Tue","Thu"],freq:"W"},
  {id:"C02",name:"Nasr City — Fares Grocery",      lat:30.0626,lng:31.3280,rep:"R1",type:"Grocery",    days:["Sat","Wed"],      freq:"B"},
  {id:"C03",name:"Rehab City — Madinaty Store",    lat:30.0434,lng:31.4868,rep:"R1",type:"Supermarket",days:["Sun","Thu"],      freq:"B"},
  {id:"C04",name:"Ain Shams — Quick Kiosk",        lat:30.1024,lng:31.3167,rep:"R1",type:"Kiosk",      days:["Mon","Wed"],      freq:"B"},
  {id:"C05",name:"Shubra El Kheima — Ramses W/S", lat:30.1167,lng:31.2500,rep:"R1",type:"Wholesale",  days:["Sat"],            freq:"M"},
  // Cairo South — R2
  {id:"C06",name:"Maadi — Seoudi Supermarket",     lat:29.9602,lng:31.2567,rep:"R2",type:"Supermarket",days:["Sat","Tue","Thu"],freq:"W"},
  {id:"C07",name:"Zamalek — Greenland Shop",       lat:30.0626,lng:31.2197,rep:"R2",type:"Grocery",    days:["Sun","Wed"],      freq:"B"},
  {id:"C08",name:"Downtown Cairo — Central Distr", lat:30.0444,lng:31.2357,rep:"R2",type:"Grocery",    days:["Mon","Thu"],      freq:"B"},
  {id:"C09",name:"Garden City — Nile Horeca",      lat:30.0300,lng:31.2500,rep:"R2",type:"Horeca",     days:["Tue","Thu"],      freq:"B"},
  {id:"C10",name:"New Cairo — Mall of Arabia Sup", lat:30.0131,lng:31.4327,rep:"R2",type:"Supermarket",days:["Sat","Wed"],      freq:"W"},
  // Alexandria — R3
  {id:"C11",name:"Montaza — Carrefour Express",    lat:31.2001,lng:29.9187,rep:"R3",type:"Supermarket",days:["Sat","Tue","Thu"],freq:"W"},
  {id:"C12",name:"Smouha — Mediterranean Shop",    lat:31.1975,lng:29.9053,rep:"R3",type:"Grocery",    days:["Sun","Wed"],      freq:"B"},
  {id:"C13",name:"Sidi Bishr — Corniche Store",    lat:31.2156,lng:29.9553,rep:"R3",type:"Grocery",    days:["Mon","Thu"],      freq:"B"},
  {id:"C14",name:"Sporting — Borg Pharmacy",       lat:31.1990,lng:29.8900,rep:"R3",type:"Pharmacy",   days:["Sat","Wed"],      freq:"B"},
  {id:"C15",name:"Raml Station — Delta W/S",       lat:31.2001,lng:29.8753,rep:"R3",type:"Wholesale",  days:["Tue"],            freq:"M"},
  // Delta — R4
  {id:"C16",name:"Tanta — Gharbiya Supermarket",   lat:30.7865,lng:31.0004,rep:"R4",type:"Supermarket",days:["Sat","Tue","Thu"],freq:"W"},
  {id:"C17",name:"Mansoura — Dakahlia Shop",       lat:31.0364,lng:31.3807,rep:"R4",type:"Grocery",    days:["Sun","Wed"],      freq:"B"},
  {id:"C18",name:"Zagazig — Sharqiya Store",       lat:30.5987,lng:31.5018,rep:"R4",type:"Grocery",    days:["Mon","Thu"],      freq:"B"},
  {id:"C19",name:"Kafr El Sheikh — Nile Delta W/S",lat:30.9214,lng:30.8892,rep:"R4",type:"Wholesale",  days:["Sat"],            freq:"M"},
  {id:"C20",name:"Damietta — Port City Grocery",   lat:31.4165,lng:31.8133,rep:"R4",type:"Grocery",    days:["Tue","Thu"],      freq:"B"},
  // Canal Zone — R5
  {id:"C21",name:"Ismailia — Canal Super",         lat:30.5965,lng:32.2715,rep:"R5",type:"Supermarket",days:["Sat","Tue","Thu"],freq:"W"},
  {id:"C22",name:"Suez — Red Sea Shop",            lat:29.9668,lng:32.5498,rep:"R5",type:"Grocery",    days:["Sun","Wed"],      freq:"B"},
  {id:"C23",name:"Port Said — Bahr Shop",          lat:31.2565,lng:32.2841,rep:"R5",type:"Supermarket",days:["Mon","Thu"],      freq:"B"},
  {id:"C24",name:"Ismailia — Forum Mall Kiosk",    lat:30.5880,lng:32.2650,rep:"R5",type:"Kiosk",      days:["Sat","Wed"],      freq:"B"},
  {id:"C25",name:"Suez — Industrial W/S",          lat:29.9700,lng:32.5400,rep:"R5",type:"Wholesale",  days:["Tue"],            freq:"M"},
  // Upper Egypt — R6
  {id:"C26",name:"Assiut — Upper Egypt Super",     lat:27.1809,lng:31.1837,rep:"R6",type:"Supermarket",days:["Sat","Wed"],      freq:"W"},
  {id:"C27",name:"Sohag — Sa'id Grocery",          lat:26.5590,lng:31.6948,rep:"R6",type:"Grocery",    days:["Sun","Thu"],      freq:"B"},
  {id:"C28",name:"Luxor — Nile Supermarket",       lat:25.6872,lng:32.6396,rep:"R6",type:"Supermarket",days:["Mon"],            freq:"B"},
  {id:"C29",name:"Aswan — High Dam City Shop",     lat:24.0889,lng:32.8998,rep:"R6",type:"Grocery",    days:["Tue"],            freq:"B"},
  {id:"C30",name:"Minya — Middle Egypt Store",     lat:28.0871,lng:30.7512,rep:"R6",type:"Supermarket",days:["Sat","Wed"],      freq:"B"},
];

// Default territory polygons (approximate boundaries)
const TERRITORY_INIT: Record<RepId, LatLng[]> = {
  R1:[{lat:30.15,lng:31.20},{lat:30.15,lng:31.55},{lat:29.97,lng:31.55},{lat:29.97,lng:31.20}],
  R2:[{lat:29.97,lng:31.14},{lat:29.97,lng:31.50},{lat:29.85,lng:31.50},{lat:29.85,lng:31.14}],
  R3:[{lat:31.28,lng:29.78},{lat:31.28,lng:30.06},{lat:31.14,lng:30.06},{lat:31.14,lng:29.78}],
  R4:[{lat:31.55,lng:30.72},{lat:31.55,lng:32.20},{lat:30.48,lng:32.20},{lat:30.48,lng:30.72}],
  R5:[{lat:31.35,lng:32.18},{lat:31.35,lng:32.62},{lat:29.88,lng:32.62},{lat:29.88,lng:32.18}],
  R6:[{lat:29.20,lng:30.40},{lat:29.20,lng:33.10},{lat:23.50,lng:33.10},{lat:23.50,lng:30.40}],
};

// Haversine distance in km
function hav(a:LatLng, b:LatLng): number {
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
}

// Nearest-neighbor TSP
function nnRoute(stops:LatLng[], depot:LatLng): LatLng[] {
  const rem=[...stops], res:LatLng[]=[]; let cur=depot;
  while(rem.length){ let bi=0,bd=Infinity; rem.forEach((s,i)=>{const d=hav(cur,s);if(d<bd){bd=d;bi=i;}}); cur=rem.splice(bi,1)[0]; res.push(cur); }
  return res;
}
function totalKm(pts:LatLng[], depot:LatLng): number {
  let d=0,prev=depot; pts.forEach(p=>{d+=hav(prev,p);prev=p;}); return Math.round(d);
}

// Dark map style matching app theme
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  {elementType:"geometry",stylers:[{color:"#060B14"}]},
  {elementType:"labels.text.stroke",stylers:[{color:"#0A0E1A"}]},
  {elementType:"labels.text.fill",stylers:[{color:"#9BA3B2"}]},
  {featureType:"road",elementType:"geometry",stylers:[{color:"#0D1424"}]},
  {featureType:"road",elementType:"geometry.stroke",stylers:[{color:"#1C2435"}]},
  {featureType:"road.highway",elementType:"geometry",stylers:[{color:"#1A2840"}]},
  {featureType:"water",elementType:"geometry",stylers:[{color:"#060B14"}]},
  {featureType:"poi",stylers:[{visibility:"off"}]},
  {featureType:"transit",stylers:[{visibility:"off"}]},
  {featureType:"administrative.country",elementType:"geometry.stroke",stylers:[{color:"#1A8A8A"}]},
  {featureType:"administrative.province",elementType:"geometry.stroke",stylers:[{color:"#1C2435"}]},
];

// ─── Component Props ──────────────────────────────────────────────────────────
interface GoogleMapsPanelProps {
  mode: "territory" | "beat" | "route";
  lang?: "en" | "ar";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GoogleMapsPanel({ mode, lang = "en" }: GoogleMapsPanelProps) {
  const mapRef   = useRef<HTMLDivElement>(null);
  const mapObj   = useRef<google.maps.Map | null>(null);
  const mrkList  = useRef<google.maps.Marker[]>([]);
  const polyList = useRef<Partial<Record<RepId, google.maps.Polygon>>>({});
  const routeLines = useRef<google.maps.Polyline[]>([]);
  const dmRef    = useRef<google.maps.drawing.DrawingManager | null>(null);

  const [loaded,      setLoaded]      = useState(false);
  const [loadError,   setLoadError]   = useState<string|null>(null);
  const [drawing,     setDrawing]     = useState(false);
  const [selectedRep, setSelectedRep] = useState<RepId>("R1");
  const [filterDay,   setFilterDay]   = useState<string|null>(null);
  const [routeView,   setRouteView]   = useState<"before"|"after">("before");
  const [territories, setTerritories] = useState<Record<RepId,LatLng[]>>(TERRITORY_INIT);
  const [saveTip,     setSaveTip]     = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // ── Load Google Maps API ───────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey || apiKey === "YOUR_KEY_HERE") {
      setLoadError("Add your Google Maps API key to .env.local → NEXT_PUBLIC_GOOGLE_MAPS_KEY");
      return;
    }
    setOptions({ key: apiKey, v:"weekly" });
    importLibrary("maps").then(()=>setLoaded(true)).catch((e:Error)=>setLoadError(e.message));
  }, [apiKey]);

  // ── Clear overlays ─────────────────────────────────────────────────────────
  const clearMarkers = useCallback(() => {
    mrkList.current.forEach(m=>m.setMap(null)); mrkList.current=[];
  },[]);
  const clearRoutes = useCallback(() => {
    routeLines.current.forEach(l=>l.setMap(null)); routeLines.current=[];
  },[]);
  const clearPolygons = useCallback(() => {
    Object.values(polyList.current).forEach(p=>p?.setMap(null)); polyList.current={};
  },[]);

  // ── Draw territory polygons ────────────────────────────────────────────────
  const drawTerritories = useCallback((map:google.maps.Map, terr:Record<RepId,LatLng[]>) => {
    clearPolygons();
    REPS_DATA.forEach(rep => {
      const coords = terr[rep.id];
      if (!coords?.length) return;
      const poly = new google.maps.Polygon({
        paths: coords,
        fillColor: rep.color,
        fillOpacity: 0.12,
        strokeColor: rep.color,
        strokeWeight: 2,
        editable: false,
        map,
      });
      polyList.current[rep.id] = poly;
      // Click to select rep
      poly.addListener("click", () => setSelectedRep(rep.id as RepId));
    });
  },[clearPolygons]);

  // ── Draw customer markers ──────────────────────────────────────────────────
  const drawMarkers = useCallback((map:google.maps.Map, customers:Customer[]) => {
    clearMarkers();
    customers.forEach(c => {
      const rep = REPS_DATA.find(r=>r.id===c.rep);
      const color = rep?.color ?? "#C9A84C";
      const marker = new google.maps.Marker({
        position: {lat:c.lat, lng:c.lng},
        map,
        title: c.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: "#0A0E1A",
          strokeWeight: 1.5,
          scale: c.type==="Supermarket"?8:c.type==="Wholesale"?9:6,
        },
      });
      // Info window
      const iw = new google.maps.InfoWindow({
        content: `<div style="background:#0D1424;color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;min-width:160px">
          <div style="font-weight:700;color:${color};margin-bottom:4px">${c.name}</div>
          <div style="color:#9BA3B2;font-size:10px">${c.type} · ${c.freq==="W"?"Weekly":c.freq==="B"?"Bi-weekly":"Monthly"}</div>
          <div style="color:#9BA3B2;font-size:10px;margin-top:3px">Days: ${c.days.join(", ")}</div>
        </div>`,
      });
      marker.addListener("click", () => iw.open(map, marker));
      mrkList.current.push(marker);
    });
  },[clearMarkers]);

  // ── Draw route lines ───────────────────────────────────────────────────────
  const drawRoute = useCallback((map:google.maps.Map, pts:LatLng[], color:string) => {
    const line = new google.maps.Polyline({
      path: pts,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 3,
      geodesic: true,
      map,
    });
    routeLines.current.push(line);
  },[]);

  // ── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    const isRoute  = mode === "route";
    const isBeat   = mode === "beat";
    const center   = isRoute ? {lat:30.09,lng:31.35} : {lat:27.5,lng:31.0};
    const zoom     = isRoute ? 11 : 6;

    const map = new google.maps.Map(mapRef.current, {
      center, zoom,
      mapTypeId:"roadmap",
      styles: DARK_STYLE,
      mapTypeControl:false,
      streetViewControl:false,
      fullscreenControl:true,
      zoomControl:true,
    });
    mapObj.current = map;

    if (!isRoute) {
      drawTerritories(map, territories);
      drawMarkers(map, CUSTOMERS);
    } else {
      // Route mode: Cairo North customers
      const cNorth = CUSTOMERS.filter(c=>c.rep==="R1");
      drawMarkers(map, cNorth);
      const depot: LatLng = {lat:30.05,lng:31.28};
      const pts: LatLng[] = cNorth.map(c=>({lat:c.lat,lng:c.lng}));
      const beforePts = [depot, ...pts, depot];
      const afterPts  = [depot, ...nnRoute(pts, depot), depot];
      drawRoute(map, routeView==="before"?beforePts:afterPts, routeView==="before"?"#EF5350":"#4CAF50");
    }

    return () => { clearMarkers(); clearRoutes(); clearPolygons(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loaded, mode]);

  // ── Update markers when day filter changes ────────────────────────────────
  useEffect(() => {
    if (!mapObj.current || mode==="route") return;
    const filtered = filterDay
      ? CUSTOMERS.filter(c=>c.days.includes(filterDay))
      : CUSTOMERS;
    drawMarkers(mapObj.current, filtered);
  },[filterDay, drawMarkers, mode]);

  // ── Update route when view changes ────────────────────────────────────────
  useEffect(() => {
    if (!mapObj.current || mode!=="route") return;
    clearRoutes();
    const depot: LatLng = {lat:30.05,lng:31.28};
    const pts  = CUSTOMERS.filter(c=>c.rep==="R1").map(c=>({lat:c.lat,lng:c.lng}));
    const beforePts = [depot, ...pts, depot];
    const afterPts  = [depot, ...nnRoute(pts, depot), depot];
    drawRoute(mapObj.current, routeView==="before"?beforePts:afterPts, routeView==="before"?"#EF5350":"#4CAF50");
  },[routeView, clearRoutes, drawRoute, mode]);

  // ── Drawing Manager: start ─────────────────────────────────────────────────
  const startDrawing = useCallback(() => {
    if (!mapObj.current || !loaded) return;
    const repColor = REP_COLOR[selectedRep];
    if (dmRef.current) { dmRef.current.setMap(null); }
    const dm = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      polygonOptions: {
        fillColor:   repColor,
        fillOpacity: 0.18,
        strokeColor: repColor,
        strokeWeight: 2.5,
        editable:  true,
        draggable: true,
      },
    });
    dm.setMap(mapObj.current);
    dmRef.current = dm;
    setDrawing(true);

    google.maps.event.addListener(dm, "polygoncomplete", (newPoly: google.maps.Polygon) => {
      // Remove old polygon for this rep
      polyList.current[selectedRep]?.setMap(null);
      polyList.current[selectedRep] = newPoly;
      newPoly.addListener("click", () => setSelectedRep(selectedRep));
      // Save coordinates
      const coords = newPoly.getPath().getArray().map(ll=>({lat:ll.lat(),lng:ll.lng()}));
      setTerritories(prev=>({...prev,[selectedRep]:coords}));
      dm.setMap(null); dm.setDrawingMode(null);
      setDrawing(false);
      setSaveTip(true); setTimeout(()=>setSaveTip(false),3000);
    });
  },[loaded, selectedRep]);

  const stopDrawing = useCallback(() => {
    dmRef.current?.setMap(null); dmRef.current=null; setDrawing(false);
  },[]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const r1Cust  = CUSTOMERS.filter(c=>c.rep==="R1");
  const depot: LatLng = {lat:30.05,lng:31.28};
  const r1Pts   = r1Cust.map(c=>({lat:c.lat,lng:c.lng}));
  const kmBefore = totalKm([depot,...r1Pts,depot], depot);
  const kmAfter  = totalKm([depot,...nnRoute([...r1Pts],depot),depot], depot);
  const pctSave  = Math.round((1-kmAfter/kmBefore)*100);

  // ── Error / No-key state ──────────────────────────────────────────────────
  if (loadError) return (
    <div style={{ width:"100%", height:480, background:"rgba(239,83,80,0.05)", border:"1px solid rgba(239,83,80,0.3)",
      borderRadius:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:24 }}>
      <div style={{ fontSize:28 }}>🗺️</div>
      <div style={{ fontSize:13, fontWeight:700, color:"#EF5350" }}>Google Maps API Key Required</div>
      <div style={{ fontSize:11, color:"#9BA3B2", textAlign:"center", maxWidth:400 }}>{loadError}</div>
      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 16px", fontFamily:"monospace", fontSize:11, color:"#C9A84C" }}>
        NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...
      </div>
    </div>
  );

  if (!loaded) return (
    <div style={{ width:"100%", height:480, background:"var(--bg-card)", borderRadius:10,
      display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
      <div style={{ width:28, height:28, border:"3px solid #E07B2A", borderTopColor:"transparent",
        borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
      <span style={{ color:"var(--text-muted)", fontSize:13 }}>Loading Google Maps…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Route Mode UI ─────────────────────────────────────────────────────────
  if (mode === "route") return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Controls */}
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:"var(--text-muted)" }}>Ahmed Hassan · Cairo North route:</span>
        {(["before","after"] as const).map(v=>(
          <button key={v} onClick={()=>setRouteView(v)} style={{
            padding:"5px 14px", fontSize:11, fontWeight:700, cursor:"pointer", borderRadius:6,
            border:`1px solid ${v===routeView?(v==="before"?"#EF5350":"#4CAF50"):"rgba(255,255,255,0.1)"}`,
            background: v===routeView?(v==="before"?"rgba(239,83,80,0.12)":"rgba(76,175,80,0.12)"):"transparent",
            color: v===routeView?(v==="before"?"#EF5350":"#4CAF50"):"var(--text-muted)",
          }}>
            {v==="before"?"🔴 Before Optimization":"🟢 After Optimization"}
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:16 }}>
          {[
            {l:"Before",v:`${kmBefore} km`,c:"#EF5350"},
            {l:"After", v:`${kmAfter} km`,c:"#4CAF50"},
            {l:"Saving",v:`${pctSave}%`,  c:"#C9A84C"},
          ].map(s=>(
            <div key={s.l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:9, color:"var(--text-muted)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Map */}
      <div ref={mapRef} style={{ width:"100%", height:460, borderRadius:10,
        border:"1px solid rgba(201,168,76,0.15)", overflow:"hidden" }} />
    </div>
  );

  // ── Territory / Beat Mode UI ──────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>

        {/* Rep selector */}
        <span style={{ fontSize:11, color:"var(--text-muted)", marginRight:4 }}>Rep:</span>
        {REPS_DATA.map(r=>(
          <button key={r.id} onClick={()=>setSelectedRep(r.id as RepId)} style={{
            padding:"4px 10px", fontSize:10, fontWeight:700, borderRadius:5, cursor:"pointer",
            border:`1px solid ${r.id===selectedRep?r.color:r.color+"44"}`,
            background: r.id===selectedRep?`${r.color}1A`:"transparent",
            color: r.id===selectedRep?r.color:"var(--text-muted)",
          }}>{r.name.split(" ")[0]}</button>
        ))}

        {/* Divider */}
        <div style={{ width:1, height:20, background:"rgba(255,255,255,0.1)", margin:"0 4px" }} />

        {/* Day filter */}
        <span style={{ fontSize:11, color:"var(--text-muted)" }}>Day:</span>
        <button onClick={()=>setFilterDay(null)} style={{
          padding:"4px 9px", fontSize:10, fontWeight:700, borderRadius:5, cursor:"pointer",
          border:`1px solid ${!filterDay?"#C9A84C":"rgba(201,168,76,0.25)"}`,
          background:!filterDay?"rgba(201,168,76,0.12)":"transparent",
          color:!filterDay?"#C9A84C":"var(--text-muted)",
        }}>All</button>
        {DAYS_EG.map(d=>(
          <button key={d} onClick={()=>setFilterDay(filterDay===d?null:d)} style={{
            padding:"4px 9px", fontSize:10, fontWeight:700, borderRadius:5, cursor:"pointer",
            border:`1px solid ${filterDay===d?"#1A8A8A":"rgba(26,138,138,0.25)"}`,
            background:filterDay===d?"rgba(26,138,138,0.12)":"transparent",
            color:filterDay===d?"#1A8A8A":"var(--text-muted)",
          }}>{d}</button>
        ))}

        {/* Draw / Stop buttons */}
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          {saveTip && <span style={{ fontSize:10, color:"#4CAF50" }}>✓ Territory saved!</span>}
          {drawing
            ? <button onClick={stopDrawing} style={{
                padding:"6px 14px", fontSize:11, fontWeight:700, borderRadius:6, cursor:"pointer",
                border:"1px solid #EF5350", background:"rgba(239,83,80,0.12)", color:"#EF5350",
              }}>✕ Cancel Drawing</button>
            : <button onClick={startDrawing} style={{
                padding:"6px 14px", fontSize:11, fontWeight:700, borderRadius:6, cursor:"pointer",
                border:`1px solid ${REP_COLOR[selectedRep]}`,
                background:`${REP_COLOR[selectedRep]}1A`,
                color:REP_COLOR[selectedRep],
              }}>✏️ Draw Territory ({REPS_DATA.find(r=>r.id===selectedRep)?.name.split(" ")[0]})</button>
          }
        </div>
      </div>

      {drawing && (
        <div style={{ padding:"8px 14px", background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.2)",
          borderRadius:7, fontSize:11, color:"#C9A84C" }}>
          🖊️ Click on the map to add polygon vertices. Double-click to close the territory boundary.
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        {REPS_DATA.map(r=>(
          <div key={r.id} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:r.color, opacity:0.8 }} />
            <span style={{ fontSize:10, color:"var(--text-muted)" }}>{r.name.split(" ")[0]} — {r.zone}</span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#C9A84C" }} />
          <span style={{ fontSize:10, color:"var(--text-muted)" }}>Supermarket / Wholesale</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#9BA3B2" }} />
          <span style={{ fontSize:10, color:"var(--text-muted)" }}>Other stores</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ width:"100%", height:520, borderRadius:10,
        border:"1px solid rgba(201,168,76,0.15)", overflow:"hidden" }} />

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
        {REPS_DATA.map(r=>{
          const cnt = CUSTOMERS.filter(c=>c.rep===r.id && (!filterDay || c.days.includes(filterDay))).length;
          return (
            <div key={r.id} style={{ background:"var(--bg-card)", borderRadius:7, padding:"8px 10px",
              border:`1px solid ${r.color}22`, borderTop:`3px solid ${r.color}` }}>
              <div style={{ fontSize:18, fontWeight:800, color:r.color }}>{cnt}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--text)" }}>{r.name.split(" ")[0]}</div>
              <div style={{ fontSize:9, color:"var(--text-muted)" }}>{r.zone}</div>
              {filterDay && <div style={{ fontSize:8, color:"#1A8A8A", marginTop:2 }}>📅 {filterDay}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
