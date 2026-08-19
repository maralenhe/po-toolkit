import { useState, useRef, useEffect } from "react";

// ── Design tokens — M demand inspired ────────────────────────────
const D = {
  bg: '#F7F7F8',
  sidebar: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F7F7F8',
  border: '#E8E8EC',
  border2: '#D0D0D8',
  text: '#111118',
  text2: '#6B6B80',
  text3: '#A0A0B0',
  green: '#16A34A',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  purpleBorder: '#DDD6FE',
  orange: '#EA580C',
  orangeBg: '#FFF7ED',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  teal: '#0D9488',
  tealBg: '#F0FDFA',
  red: '#DC2626',
  redBg: '#FEF2F2',
  mGreen: '#21C7A3',
  font: 'Inter, -apple-system, system-ui, sans-serif',
  radius: '8px',
  radiusSm: '6px',
  radiusLg: '12px',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
};

// ── Storage ───────────────────────────────────────────────────────
const DB = {
  get(k,d=null){try{const v=localStorage.getItem('potk_'+k);return v?JSON.parse(v):d;}catch{return d;}},
  set(k,v){try{localStorage.setItem('potk_'+k,JSON.stringify(v));}catch{}},
};

// ── AI ────────────────────────────────────────────────────────────
function getKey(){try{return localStorage.getItem('potk_apikey')||'';}catch{return '';}}
function saveKey(k){try{localStorage.setItem('potk_apikey',k);}catch{}}

async function ai(messages, system, max=2000){
  const key = getKey();
  if(!key) throw new Error('NO_KEY');
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "anthropic-version":"2023-06-01",
      "x-api-key": key,
      "anthropic-dangerous-direct-browser-access":"true",
    },
    body: JSON.stringify({model:"claude-sonnet-4-5", max_tokens:max, system, messages}),
  });
  const d = await r.json();
  if(!r.ok) throw new Error(d.error?.message||`Error ${r.status}`);
  const t = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  if(!t) throw new Error("Empty response");
  return t;
}

// ── File reader ───────────────────────────────────────────────────
async function readFile(file){
  if(file.size>3*1024*1024) throw new Error("Max 3MB");
  const ext = file.name.split(".").pop().toLowerCase();
  const sz = (file.size/1024).toFixed(1);
  const txt = ()=>new Promise((ok,err)=>{const r=new FileReader();r.onload=e=>ok(e.target.result);r.onerror=()=>err();r.readAsText(file,"UTF-8");});
  let c = "";
  if(["txt","md","csv","json","xml","js","ts","py","sql"].includes(ext)) c=await txt();
  else{const raw=await txt().catch(()=>"");c=raw.replace(/[^\x20-\x7E\n\r\t\u0400-\u04FF]/g," ").replace(/\s+/g," ").trim()||`[${ext.toUpperCase()} ${sz}KB]`;}
  if(c.length>15000) c=c.slice(0,15000)+"\n[...truncated]";
  return{name:file.name,ext,sz,chars:c.length,content:c};
}

// ── History ───────────────────────────────────────────────────────
function useHistory(){
  const[log,setLog]=useState(()=>DB.get("history",[]));
  function save(e){setLog(p=>{const n=[{id:Date.now(),ts:new Date().toISOString(),...e},...p];DB.set("history",n);return n;});}
  return{log,save};
}

const TLBL={chat:"AI Chat",brain:"Knowledge Brain",morning:"Morning Brief",story:"User Story",prd:"PRD",tfs:"TFS Copilot",ceo:"Stakeholder→IT",rice:"RICE Scoring",sprint:"Sprint Planner",dep:"Dependencies",mtg:"Meeting Notes",tc:"Test Cases",review:"Sprint Review",hist:"History"};
const TEMO={chat:"💬",brain:"🧠",morning:"☀️",story:"📝",prd:"📋",tfs:"⚙️",ceo:"🎯",rice:"📊",sprint:"🏃",dep:"🗺️",mtg:"🗒️",tc:"✅",review:"🎬",hist:"🗂️"};

// ── Export ────────────────────────────────────────────────────────
function dl(content,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();}
const exportMD=(rows,fn)=>dl(rows.map(e=>`# ${TLBL[e.tool]||e.tool}\n_${new Date(e.ts).toLocaleString()}_\n\n**Input**\n\n${e.input}\n\n**Output**\n\n${e.output}\n\n---`).join("\n\n"),fn+".md","text/markdown");
const exportJSON=(rows,fn)=>dl(JSON.stringify(rows,null,2),fn+".json","application/json");
const exportCSV=(rows,fn)=>dl(["ID,Date,Tool,Input,Output"].concat(rows.map(e=>[e.id,e.ts,e.tool,`"${(e.input||"").replace(/"/g,'""')}"`,`"${(e.output||"").replace(/"/g,'""')}"`].join(","))).join("\n"),fn+".csv","text/csv");

// ── Atoms ─────────────────────────────────────────────────────────
const MBadge = ({size=28}) => (
  <div style={{width:size,height:size,borderRadius:Math.round(size*0.22),border:`2px solid ${D.mGreen}`,background:D.surface,display:"grid",placeItems:"center",fontWeight:700,fontSize:size*0.5,letterSpacing:"-.04em",color:D.text,lineHeight:1,flexShrink:0}}>M</div>
);

const Spinner = () => (
  <span style={{display:"inline-flex",gap:3,alignItems:"center"}}>
    {[0,1,2].map(i=><span key={i} style={{width:5,height:5,borderRadius:"50%",background:D.mGreen,animation:"spin 1.2s infinite",animationDelay:`${i*0.2}s`}}/>)}
  </span>
);

function Tag({children, color="gray"}){
  const colors = {
    green:{bg:D.greenBg,c:D.green,border:D.greenBorder},
    purple:{bg:D.purpleBg,c:D.purple,border:D.purpleBorder},
    orange:{bg:D.orangeBg,c:D.orange,border:"#FED7AA"},
    blue:{bg:D.blueBg,c:D.blue,border:"#BFDBFE"},
    gray:{bg:D.surface2,c:D.text2,border:D.border},
  }[color]||{bg:D.surface2,c:D.text2,border:D.border};
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:999,fontSize:11,fontWeight:500,background:colors.bg,color:colors.c,border:`1px solid ${colors.border}`}}>{children}</span>;
}

function CopyBtn({text}){
  const[ok,s]=useState(false);
  return <button onClick={()=>{navigator.clipboard.writeText(text);s(true);setTimeout(()=>s(false),1500)}} style={{fontSize:11,padding:"4px 10px",borderRadius:D.radiusSm,cursor:"pointer",background:ok?D.tealBg:D.surface2,border:`1px solid ${ok?D.teal:D.border}`,color:ok?D.teal:D.text2,fontWeight:500,transition:"all .15s"}}>{ok?"Copied ✓":"Copy"}</button>;
}

function Btn({onClick,disabled,children,variant="primary",sm,full}){
  const styles = {
    primary:{bg:D.text,c:"#fff",border:D.text},
    teal:{bg:D.mGreen,c:"#fff",border:D.mGreen},
    sec:{bg:D.surface,c:D.text,border:D.border},
    ghost:{bg:"transparent",c:D.text2,border:"transparent"},
    danger:{bg:D.redBg,c:D.red,border:"#FECACA"},
  }[variant]||{bg:D.text,c:"#fff",border:D.text};
  return <button onClick={onClick} disabled={disabled} style={{border:`1px solid ${disabled?D.border:styles.border}`,fontFamily:D.font,fontWeight:500,fontSize:sm?12:13,padding:sm?"5px 12px":"8px 16px",borderRadius:D.radius,height:sm?30:36,background:disabled?D.surface2:styles.bg,color:disabled?D.text3:styles.c,width:full?"100%":undefined,cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s",boxShadow:disabled?"none":"0 1px 2px rgba(0,0,0,0.05)"}}>{children}</button>;
}

const IB = {fontFamily:D.font,fontSize:13,color:D.text,background:D.surface,border:`1px solid ${D.border}`,borderRadius:D.radius,padding:"7px 11px",outline:"none",boxSizing:"border-box",lineHeight:1.5,transition:"border-color .15s, box-shadow .15s",width:"100%"};
const onF = e=>{e.target.style.borderColor=D.mGreen;e.target.style.boxShadow=`0 0 0 3px ${D.tealBg}`;};
const onB = e=>{e.target.style.borderColor=D.border;e.target.style.boxShadow="none";};

function Input({value,onChange,placeholder,type="ta",rows=3}){
  if(type==="in") return <input value={value} onChange={onChange} placeholder={placeholder} style={{...IB,height:34}} onFocus={onF} onBlur={onB}/>;
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{...IB,resize:"vertical",lineHeight:1.6}} onFocus={onF} onBlur={onB}/>;
}

function Select({value,onChange,options,style={}}){
  return <select value={value} onChange={onChange} style={{...IB,height:34,cursor:"pointer",...style}}>{options.map(o=><option key={o}>{o}</option>)}</select>;
}

function Label({children,required}){
  return <label style={{display:"block",fontSize:12,fontWeight:500,color:D.text2,marginBottom:5,letterSpacing:".01em"}}>{children}{required&&<span style={{color:D.red,marginLeft:2}}>*</span>}</label>;
}

function Field({label,children,required,mb=14}){
  return <div style={{marginBottom:mb}}><Label required={required}>{label}</Label>{children}</div>;
}

function Card({children,p="16px",mb=12,style={}}){
  return <div style={{background:D.surface,borderRadius:D.radiusLg,border:`1px solid ${D.border}`,padding:p,marginBottom:mb,boxShadow:D.shadow,...style}}>{children}</div>;
}

function SectionTitle({children}){
  return <div style={{fontSize:11,fontWeight:600,color:D.text3,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>{children}</div>;
}

function StatCard({label,value,sub,color="green"}){
  const colors={green:{bg:D.greenBg,c:D.green,bc:D.greenBorder},purple:{bg:D.purpleBg,c:D.purple,bc:D.purpleBorder},gray:{bg:D.surface2,c:D.text,bc:D.border},blue:{bg:D.blueBg,c:D.blue,bc:"#BFDBFE"}}[color];
  return(
    <div style={{background:colors.bg,borderRadius:D.radiusLg,border:`1px solid ${colors.bc}`,padding:"14px 16px"}}>
      <div style={{fontSize:11,fontWeight:500,color:colors.c,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</div>
      <div style={{fontSize:28,fontWeight:600,color:D.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:D.text2,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ── Editable dropdown ─────────────────────────────────────────────
function EditBtn({sk,defaults,onChanged}){
  const[open,setOpen]=useState(false);
  const[opts,setOpts]=useState(()=>DB.get(sk,defaults));
  const[nw,setNw]=useState("");
  const ref=useRef();
  useEffect(()=>{DB.set(sk,opts);},[opts,sk]);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  function add(){const t=nw.trim();if(!t||opts.includes(t))return;setOpts([...opts,t]);setNw("");}
  function del(t){const n=opts.filter(x=>x!==t);setOpts(n);onChanged&&n[0]&&onChanged(n[0]);}
  function up(i){if(i===0)return;const a=[...opts];[a[i-1],a[i]]=[a[i],a[i-1]];setOpts(a);}
  return(
    <div style={{position:"relative"}} ref={ref}>
      <button onClick={()=>setOpen(o=>!o)} style={{fontSize:11,background:"transparent",border:`1px solid ${D.border}`,borderRadius:D.radiusSm,color:D.text2,cursor:"pointer",fontWeight:500,padding:"2px 8px"}}>Edit ✎</button>
      {open&&(
        <div style={{position:"absolute",right:0,top:28,background:D.surface,border:`1px solid ${D.border}`,borderRadius:D.radiusLg,padding:"12px",width:260,zIndex:300,boxShadow:D.shadowMd}}>
          <SectionTitle>OPTIONS</SectionTitle>
          <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10,maxHeight:180,overflowY:"auto"}}>
            {opts.map((t,i)=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{flex:1,fontSize:12,background:D.surface2,borderRadius:D.radiusSm,padding:"4px 8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t}</div>
                <button onClick={()=>up(i)} disabled={i===0} style={{width:22,height:22,borderRadius:D.radiusSm,border:`1px solid ${D.border}`,background:D.surface,cursor:i===0?"not-allowed":"pointer",color:D.text2,fontSize:10,display:"grid",placeItems:"center",opacity:i===0?.3:1}}>↑</button>
                <button onClick={()=>del(t)} style={{width:22,height:22,borderRadius:D.radiusSm,border:"none",background:D.redBg,color:D.red,cursor:"pointer",fontSize:12,display:"grid",placeItems:"center"}}>×</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={nw} onChange={e=>setNw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="New option…" style={{flex:1,fontSize:12,...IB,padding:"5px 8px",borderRadius:D.radiusSm}} onFocus={onF} onBlur={onB}/>
            <button onClick={add} style={{background:D.mGreen,border:"none",color:"#fff",fontWeight:600,fontSize:12,borderRadius:D.radiusSm,padding:"5px 10px",cursor:"pointer"}}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── File zone ─────────────────────────────────────────────────────
function FileZone({file,onFile,onClear}){
  const[drag,setDrag]=useState(false);const[err,setErr]=useState("");const ref=useRef();
  async function handle(f){if(!f)return;setErr("");try{onFile(await readFile(f));}catch(e){setErr(e.message);}}
  if(file) return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:D.tealBg,borderRadius:D.radius,border:`1px solid ${D.mGreen}30`,marginBottom:12}}>
      <div style={{width:30,height:30,borderRadius:D.radiusSm,background:D.mGreen,display:"grid",placeItems:"center",color:"#fff",fontSize:14,flexShrink:0}}>📄</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:500,color:D.teal,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
        <div style={{fontSize:11,color:D.text2,marginTop:1}}>{file.sz}KB · {file.chars.toLocaleString()} chars</div>
      </div>
      <button onClick={onClear} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:D.text3,padding:2}}>×</button>
    </div>
  );
  return(
    <div style={{marginBottom:12}}>
      <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}} onClick={()=>ref.current.click()}
        style={{border:`1.5px dashed ${drag?D.mGreen:D.border2}`,borderRadius:D.radius,padding:"12px",textAlign:"center",cursor:"pointer",background:drag?D.tealBg:D.surface2,transition:"all .15s"}}>
        <div style={{fontSize:18,marginBottom:3}}>📎</div>
        <div style={{fontSize:12,fontWeight:500,color:D.text2}}>Attach file or click to browse</div>
        <div style={{fontSize:11,color:D.text3,marginTop:2}}>txt · csv · json · pdf · docx · md · xml</div>
        <input ref={ref} type="file" accept=".txt,.md,.csv,.json,.xml,.pdf,.doc,.docx,.xlsx,.js,.ts,.py,.sql" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
      </div>
      {err&&<div style={{fontSize:11,color:D.red,marginTop:4}}>⚠ {err}</div>}
    </div>
  );
}

function OutBox({value,loading,ph="Output will appear here…"}){
  return(
    <div style={{background:D.surface2,borderRadius:D.radius,border:`1px solid ${D.border}`,padding:"12px 14px",minHeight:110,fontSize:13,lineHeight:1.75,color:loading?D.text3:D.text,whiteSpace:"pre-wrap"}}>
      {loading?<span style={{display:"flex",alignItems:"center",gap:8,color:D.text2}}><Spinner/> Processing with AI…</span>:(value||<span style={{color:D.text3}}>{ph}</span>)}
    </div>
  );
}

// ── API Key Modal ─────────────────────────────────────────────────
function ApiKeyModal({onSave}){
  const[val,setVal]=useState("");
  const[show,setShow]=useState(false);
  const[err,setErr]=useState("");
  function submit(){if(!val.startsWith("sk-")){setErr("Key must start with sk-");return;}saveKey(val);onSave(val);}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{background:D.surface,borderRadius:D.radiusLg,padding:"28px",width:420,maxWidth:"90vw",border:`1px solid ${D.border}`,boxShadow:D.shadowMd}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <MBadge size={36}/>
          <div>
            <div style={{fontSize:16,fontWeight:600,color:D.text}}>PO Toolkit</div>
            <div style={{fontSize:12,color:D.text2,marginTop:1}}>Enter your Anthropic API key to continue</div>
          </div>
        </div>
        <div style={{background:D.surface2,borderRadius:D.radius,padding:"10px 12px",fontSize:12,color:D.text2,marginBottom:14,lineHeight:1.7,border:`1px solid ${D.border}`}}>
          Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" style={{color:D.teal,fontWeight:500}}>console.anthropic.com</a> → API Keys → Create Key<br/>
          <span style={{color:D.text3}}>Stored locally in your browser only</span>
        </div>
        <div style={{position:"relative",marginBottom:err?6:14}}>
          <input type={show?"text":"password"} value={val} onChange={e=>{setVal(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="sk-ant-api03-…" style={{...IB,paddingRight:40,fontFamily:"monospace",fontSize:13,height:38}} onFocus={onF} onBlur={onB} autoFocus/>
          <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:D.text3,fontSize:14}}>{show?"🙈":"👁"}</button>
        </div>
        {err&&<div style={{fontSize:12,color:D.red,marginBottom:12}}>⚠ {err}</div>}
        <Btn onClick={submit} disabled={!val} variant="teal" full>Continue →</Btn>
      </div>
    </div>
  );
}

// ── Morning Briefing ──────────────────────────────────────────────
function MorningPage({onSave}){
  const[name,setName]=useState(()=>DB.get("po_name",""));
  const[sprint,setSprint]=useState(()=>DB.get("po_sprint",""));
  const[status,setStatus]=useState(()=>DB.get("po_status",""));
  const[brief,setBrief]=useState(()=>DB.get("morning_brief",""));
  const[busy,setBusy]=useState(false);
  const brainDocs=DB.get("brain_docs",[]);
  useEffect(()=>{DB.set("po_name",name);},[name]);
  useEffect(()=>{DB.set("po_sprint",sprint);},[sprint]);
  useEffect(()=>{DB.set("po_status",status);},[status]);

  const now=new Date();
  const greeting=now.getHours()<12?"Good morning":now.getHours()<18?"Good afternoon":"Good evening";

  async function generate(){
    setBusy(true);
    try{
      const ctx=brainDocs.slice(0,3).map(d=>`[${d.name}]\n${d.content.slice(0,1500)}`).join("\n\n");
      const sys=`You are an AI Shadow PO for M Bank Mongolia. Generate a concise, structured morning briefing. Be direct and actionable. English only.`;
      const p=`Morning briefing for ${name||"the PO"}.\nSprint: ${sprint||"unknown"}\nYesterday: ${status||"none"}\n${ctx?`Context:\n${ctx}`:""}\n\nFormat:\n## ${greeting}${name?" "+name:""}!\n\n**Yesterday**\n- ...\n\n**Today's Focus**\n- ...\n\n**Risks & Blockers**\n- ...\n\n**AI Recommendations**\n- ...`;
      const r=await ai([{role:"user",content:p}],sys,800);
      setBrief(r);DB.set("morning_brief",r);
      onSave({tool:"morning",input:`Briefing for ${name}`,output:r});
    }catch(e){setBrief("Error: "+e.message);}
    setBusy(false);
  }

  const stats=[
    {label:"Brain Docs",value:brainDocs.length,color:"teal"},
    {label:"History",value:DB.get("history",[]).length,color:"purple"},
    {label:"Sprint",value:sprint||"—",color:"gray"},
  ];

  return(
    <div style={{overflowY:"auto",height:"100%",padding:"20px 24px",background:D.bg}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg, #0F766E 0%, #0D9488 60%, #14B8A6 100%)`,borderRadius:D.radiusLg,padding:"20px 24px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:12,opacity:.8,marginBottom:4}}>{now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
        <div style={{fontSize:22,fontWeight:600,letterSpacing:"-.02em",marginBottom:12}}>{greeting}{name?", "+name:""}!</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {stats.map(s=><div key={s.label} style={{background:"rgba(255,255,255,.15)",borderRadius:D.radius,padding:"6px 12px",fontSize:12}}>
            <span style={{opacity:.8}}>{s.label}: </span><strong>{s.value}</strong>
          </div>)}
        </div>
      </div>

      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Field label="YOUR NAME"><Input type="in" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Maral"/></Field>
          <Field label="CURRENT SPRINT"><Input type="in" value={sprint} onChange={e=>setSprint(e.target.value)} placeholder="e.g. Sprint 14"/></Field>
        </div>
        <Field label="YESTERDAY / CONTEXT (OPTIONAL)">
          <Input value={status} onChange={e=>setStatus(e.target.value)} ph="What happened yesterday? Any blockers or decisions?" rows={3}/>
        </Field>
        <Btn onClick={generate} disabled={busy} variant="teal" full>{busy?<><Spinner/> Generating…</>:"☀️ Generate Morning Briefing"}</Btn>
      </Card>
      {(busy||brief)&&(
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <SectionTitle>TODAY'S BRIEFING</SectionTitle>
            {brief&&<CopyBtn text={brief}/>}
          </div>
          <OutBox value={brief} loading={busy}/>
        </Card>
      )}
    </div>
  );
}

// ── Knowledge Brain ───────────────────────────────────────────────
function BrainPage({onSave}){
  const[docs,setDocs]=useState(()=>DB.get("brain_docs",[]));
  const[q,setQ]=useState("");const[ans,setAns]=useState("");const[busy,setBusy]=useState(false);
  const[addFile,setAddFile]=useState(null);const[addNote,setAddNote]=useState("");const[addName,setAddName]=useState("");
  const[tab,setTab]=useState("ask");
  function saveDoc(d){setDocs(p=>{const n=[...p,d];DB.set("brain_docs",n);return n;});}
  function removeDoc(id){setDocs(p=>{const n=p.filter(d=>d.id!==id);DB.set("brain_docs",n);return n;});}
  async function addDoc(){
    if(!addFile&&!addNote.trim())return;
    saveDoc({id:Date.now(),name:addFile?addFile.name:(addName||"Note "+new Date().toLocaleDateString()),content:addFile?addFile.content:addNote,chars:addFile?addFile.chars:addNote.length,addedAt:new Date().toISOString(),type:addFile?"file":"note"});
    setAddFile(null);setAddNote("");setAddName("");
  }
  async function ask(){
    if(!q.trim()||docs.length===0)return;
    setBusy(true);setAns("");
    try{
      const ctx=docs.map(d=>`### ${d.name}\n${d.content.slice(0,3000)}`).join("\n\n---\n\n");
      const r=await ai([{role:"user",content:`Question: ${q}\n\n${"═".repeat(36)}\n${ctx}\n${"═".repeat(36)}`}],`Answer based ONLY on provided documents. Cite source document name. English only.`,2000);
      setAns(r);onSave({tool:"brain",input:q,output:r});
    }catch(e){setAns("Error: "+e.message);}
    setBusy(false);
  }
  const QUICK=["What are requirements for demand deposit opening?","List all open questions from meetings","What API is used for account balance?","Show all action items and owners"];
  const tabs=[["ask","🔍 Ask Brain"],["docs",`📚 Docs (${docs.length})`],["add","➕ Add Doc"]];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",gap:0,padding:"0 24px",background:D.surface,borderBottom:`1px solid ${D.border}`,flexShrink:0}}>
        {tabs.map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 16px",borderBottom:`2px solid ${tab===id?D.mGreen:"transparent"}`,background:"transparent",color:tab===id?D.teal:D.text2,fontWeight:tab===id?600:400,fontSize:13,cursor:"pointer",fontFamily:D.font,border:"none",borderBottom:`2px solid ${tab===id?D.mGreen:"transparent"}`}}>
            {lbl}
          </button>
        ))}
      </div>
      {tab==="ask"&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px",background:D.bg}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {QUICK.map(q2=><button key={q2} onClick={()=>setQ(q2)} style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:D.radius,color:D.text2,fontSize:12,fontWeight:400,padding:"5px 10px",cursor:"pointer",fontFamily:D.font}}>{q2}</button>)}
        </div>
        {docs.length===0&&<div style={{background:D.orangeBg,border:`1px solid #FED7AA`,borderRadius:D.radius,padding:"10px 14px",fontSize:13,color:D.orange,marginBottom:14}}>⚠ No documents yet — go to Add Doc tab to upload BRDs, SRS, API docs, meeting notes.</div>}
        <Card>
          <Field label="ASK YOUR KNOWLEDGE BASE" required><Input value={q} onChange={e=>setQ(e.target.value)} ph="e.g. What are the acceptance criteria for demand deposit account opening?" rows={3}/></Field>
          <Btn onClick={ask} disabled={busy||!q.trim()||docs.length===0} variant="teal">{busy?<><Spinner/> Searching…</>:"🔍 Ask Brain"}</Btn>
        </Card>
        {(busy||ans)&&<Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><SectionTitle>ANSWER FROM DOCS</SectionTitle>{ans&&<CopyBtn text={ans}/>}</div>
          <OutBox value={ans} loading={busy}/>
        </Card>}
      </div>}
      {tab==="docs"&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px",background:D.bg}}>
        {docs.length===0&&<div style={{textAlign:"center",color:D.text3,fontSize:13,paddingTop:40}}>No documents added yet.</div>}
        {docs.map(d=>(
          <div key={d.id} style={{background:D.surface,borderRadius:D.radius,border:`1px solid ${D.border}`,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10,boxShadow:D.shadow}}>
            <div style={{width:32,height:32,borderRadius:D.radiusSm,background:d.type==="file"?D.tealBg:D.blueBg,display:"grid",placeItems:"center",fontSize:16,flexShrink:0}}>{d.type==="file"?"📄":"📝"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
              <div style={{fontSize:11,color:D.text2,marginTop:1}}>{(d.chars||0).toLocaleString()} chars · {new Date(d.addedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
            </div>
            <Btn sm variant="danger" onClick={()=>removeDoc(d.id)}>Remove</Btn>
          </div>
        ))}
      </div>}
      {tab==="add"&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px",background:D.bg}}>
        <Card>
          <div style={{fontSize:13,color:D.text2,marginBottom:14,lineHeight:1.6}}>Upload any document. The Brain searches all docs when you ask questions.</div>
          <Field label="UPLOAD FILE"><FileZone file={addFile} onFile={setAddFile} onClear={()=>setAddFile(null)}/></Field>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><div style={{flex:1,height:1,background:D.border}}/><span style={{fontSize:11,color:D.text3}}>OR</span><div style={{flex:1,height:1,background:D.border}}/></div>
          <Field label="DOCUMENT NAME"><Input type="in" value={addName} onChange={e=>setAddName(e.target.value)} placeholder="e.g. Demand Deposit BRD v2.1"/></Field>
          <Field label="PASTE TEXT / NOTES"><Input value={addNote} onChange={e=>setAddNote(e.target.value)} ph="Paste BRD, API docs, meeting notes, Finacle specs…" rows={6}/></Field>
          <Btn onClick={addDoc} disabled={!addFile&&!addNote.trim()} variant="teal">➕ Add to Knowledge Brain</Btn>
        </Card>
      </div>}
    </div>
  );
}

// ── Chat ──────────────────────────────────────────────────────────
const SUGG=["Write user story for demand deposit account opening","Explain Finacle ACTOPN transaction","Draft TFS work item for KYC feature","What are best practices for bank PO?"];

function ChatPage({onSave}){
  const SYS=`You are an expert PO assistant for M Bank Mongolia. You know Finacle, TFS, digital banking, user stories, RICE, PRDs. English only.`;
  const[msgs,setMsgs]=useState(()=>DB.get("chat_msgs",[{role:"assistant",content:"Hi! I'm your M Bank PO Assistant.\n\nI know Finacle, TFS, banking products, RICE scoring, user stories and more.\n\nAttach files or ask anything."}]));
  const[inp,setInp]=useState("");const[busy,setBusy]=useState(false);const[sugg,setSugg]=useState(true);const[pf,setPf]=useState(null);
  const bot=useRef();const fref=useRef();
  useEffect(()=>{bot.current?.scrollIntoView({behavior:"smooth"});},[msgs,busy]);
  useEffect(()=>{DB.set("chat_msgs",msgs);},[msgs]);
  async function send(txt){
    const msg=(txt||inp).trim();if(!msg&&!pf)return;if(busy)return;
    setInp("");setSugg(false);const f=pf;setPf(null);
    const disp=f?`📎 ${f.name}${msg?"\n\n"+msg:""}`:msg;
    const hist=[...msgs,{role:"user",content:disp}];setMsgs(hist);setBusy(true);
    try{
      const api=hist.map((m,i)=>{
        if(i===hist.length-1&&f) return{role:"user",content:`File: ${f.name}\n${"─".repeat(36)}\n${f.content}\n${"─".repeat(36)}\n\n${msg||"Summarize key points for a bank PO."}`};
        return{role:m.role,content:m.content};
      });
      const r=await ai(api,SYS);
      const next=[...hist,{role:"assistant",content:r}];setMsgs(next);
      onSave({tool:"chat",input:msg||`[file: ${f?.name}]`,output:r,file:f?.name});
    }catch(e){setMsgs([...hist,{role:"assistant",content:"Error: "+e.message}]);}
    setBusy(false);
  }
  async function attach(f){if(!f)return;try{setPf(await readFile(f));}catch(e){alert(e.message);}}
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px",background:D.bg,display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
            {m.role==="assistant"&&<MBadge size={24}/>}
            <div style={{maxWidth:"76%",padding:"9px 13px",borderRadius:D.radiusLg,borderBottomRightRadius:m.role==="user"?2:D.radiusLg,borderBottomLeftRadius:m.role==="assistant"?2:D.radiusLg,background:m.role==="user"?D.text:D.surface,border:m.role==="assistant"?`1px solid ${D.border}`:"none",color:m.role==="user"?"#fff":D.text,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",boxShadow:D.shadow}}>
              {m.content}
              {m.role==="assistant"&&i>0&&<div style={{marginTop:6}}><CopyBtn text={m.content}/></div>}
            </div>
          </div>
        ))}
        {busy&&<div style={{display:"flex",gap:8,alignItems:"flex-end"}}><MBadge size={24}/><div style={{padding:"9px 13px",borderRadius:D.radiusLg,borderBottomLeftRadius:2,background:D.surface,border:`1px solid ${D.border}`,boxShadow:D.shadow}}><Spinner/></div></div>}
        <div ref={bot}/>
      </div>
      {sugg&&<div style={{padding:"8px 20px",background:D.surface,borderTop:`1px solid ${D.border}`,display:"flex",flexWrap:"wrap",gap:6}}>
        {SUGG.map(s=><button key={s} onClick={()=>send(s)} style={{background:D.surface2,border:`1px solid ${D.border}`,borderRadius:D.radius,color:D.text2,fontSize:12,padding:"4px 10px",cursor:"pointer",fontFamily:D.font}}>{s}</button>)}
      </div>}
      <div style={{background:D.surface,borderTop:`1px solid ${D.border}`,padding:"10px 16px 14px"}}>
        {pf&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"5px 10px",background:D.tealBg,borderRadius:D.radiusSm,fontSize:12}}>
          <span>📎</span><span style={{color:D.teal,fontWeight:500,flex:1}}>{pf.name}</span>
          <button onClick={()=>setPf(null)} style={{background:"none",border:"none",color:D.text3,cursor:"pointer",fontSize:14}}>×</button>
        </div>}
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <button onClick={()=>fref.current.click()} style={{width:34,height:34,borderRadius:D.radius,border:`1px solid ${D.border}`,background:D.surface2,cursor:"pointer",display:"grid",placeItems:"center",fontSize:15,flexShrink:0}}>📎</button>
          <input ref={fref} type="file" style={{display:"none"}} accept=".txt,.md,.csv,.json,.xml,.pdf,.doc,.docx,.xlsx,.js,.ts,.py,.sql" onChange={e=>attach(e.target.files[0])}/>
          <textarea value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask anything… (Enter to send)" rows={1} style={{flex:1,...IB,padding:"8px 12px",resize:"none",maxHeight:88,lineHeight:1.5,height:34}} onFocus={onF} onBlur={onB}/>
          <button onClick={()=>send()} disabled={(!inp.trim()&&!pf)||busy} style={{width:34,height:34,borderRadius:D.radius,border:"none",background:(inp.trim()||pf)&&!busy?D.text:D.surface2,color:(inp.trim()||pf)&&!busy?"#fff":D.text3,cursor:(inp.trim()||pf)&&!busy?"pointer":"not-allowed",display:"grid",placeItems:"center",fontSize:16,flexShrink:0}}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ── Stakeholder Translator ────────────────────────────────────────
function CEOPage({onSave}){
  const SYS=`Bank PO assistant. Translate vague business/executive language into structured IT requirements. Output: Business Goal, Features, Epic, User Stories (3-5), Priority, Risks. English only.`;
  const[v,setV]=useState(()=>DB.get("form_ceo",{}));
  const[out,setOut]=useState("");const[busy,setBusy]=useState(false);
  function set(k,val){const nv={...v,[k]:val};setV(nv);DB.set("form_ceo",nv);}
  async function run(){
    setBusy(true);setOut("");
    try{
      if(!(v.statement||"").trim())throw new Error("Please enter the statement");
      const r=await ai([{role:"user",content:`Translate this statement:\n\n"${v.statement}"\n\nContext: ${v.ctx||"M Bank Mongolia, mobile banking, Finacle core"}\nSpeaker: ${v.role||"CEO"}\nDeadline: ${v.deadline||"not specified"}`}],SYS);
      setOut(r);onSave({tool:"ceo",input:v.statement,output:r});
    }catch(e){setOut("Error: "+e.message);}
    setBusy(false);
  }
  return(
    <div style={{overflowY:"auto",height:"100%",padding:"20px 24px",background:D.bg}}>
      <Card>
        <div style={{background:D.surface2,borderRadius:D.radius,padding:"10px 12px",marginBottom:14,fontSize:13,color:D.text2,lineHeight:1.6,border:`1px solid ${D.border}`}}>
          Paste what your CEO, manager or stakeholder said — in any language. AI translates to structured IT requirements.
        </div>
        <Field label="WHAT DID THEY SAY?" required>
          <Input value={v.statement||""} onChange={e=>set("statement",e.target.value)} ph={'"Merchant-уудад хадгаламжийн бүтээгдэхүүн оруулчих"\n"We need to beat QPay by Q3"\n"Just make it faster and easier"'} rows={4}/>
        </Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}><Label>SPEAKER ROLE</Label><EditBtn sk="sel_ceo_role" defaults={["CEO","CTO","CFO","Head of Digital","Business Owner","Board Member"]} onChanged={nv=>set("role",nv)}/></div>
            <Select value={v.role||(DB.get("sel_ceo_role",["CEO"])||["CEO"])[0]} onChange={e=>set("role",e.target.value)} options={DB.get("sel_ceo_role",["CEO","CTO","CFO","Head of Digital","Business Owner","Board Member"])}/>
          </div>
          <Field label="DEADLINE (OPTIONAL)" mb={0}><Input type="in" value={v.deadline||""} onChange={e=>set("deadline",e.target.value)} placeholder="e.g. Q3 2025, before Naadam"/></Field>
        </div>
        <Field label="ADDITIONAL CONTEXT (OPTIONAL)"><Input value={v.ctx||""} onChange={e=>set("ctx",e.target.value)} ph="e.g. Competing with QPay, Finacle backend, merchant segment" rows={2}/></Field>
        <Btn onClick={run} disabled={busy} variant="teal">{busy?<><Spinner/> Translating…</>:"🎯 Translate to IT Requirements"}</Btn>
      </Card>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><SectionTitle>TRANSLATED REQUIREMENTS</SectionTitle>{out&&<CopyBtn text={out}/>}</div>
        <OutBox value={out} loading={busy} ph="Structured requirements will appear here…"/>
      </Card>
    </div>
  );
}

// ── Generic Tool ──────────────────────────────────────────────────
function ToolPage({toolId,fields,sys,build,cta="Generate",onSave}){
  const[v,setV]=useState(()=>{const s=DB.get(`form_${toolId}`,{});const d={};fields.forEach(f=>{if(f.t==="sel"&&!s[f.k])d[f.k]=(DB.get(f.sk,f.opts)||[])[0]||f.opts[0];});return{...d,...s};});
  const[file,setFile]=useState(null);const[out,setOut]=useState("");const[busy,setBusy]=useState(false);
  function set(k,val){const nv={...v,[k]:val};setV(nv);DB.set(`form_${toolId}`,nv);}
  async function run(){
    setBusy(true);setOut("");
    try{
      let p=build(v);
      if(file)p+=`\n\n${"─".repeat(34)}\nFile: ${file.name}\n${file.content}`;
      const r=await ai([{role:"user",content:p}],sys);
      setOut(r);onSave({tool:toolId,input:p.slice(0,400),output:r,file:file?.name});
    }catch(e){setOut("Error: "+e.message);}
    setBusy(false);
  }
  return(
    <div style={{overflowY:"auto",height:"100%",padding:"20px 24px",background:D.bg}}>
      <Card>
        <Field label="ATTACH FILE (OPTIONAL)">
          <FileZone file={file} onFile={setFile} onClear={()=>setFile(null)}/>
          {file&&<div style={{fontSize:11,color:D.teal,fontWeight:500,marginTop:-8,marginBottom:4}}>✓ File content included</div>}
        </Field>
        {fields.map(f=>(
          <div key={f.k} style={{marginBottom:14}}>
            {f.t==="sel"?(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}><Label>{f.label}</Label><EditBtn sk={f.sk} defaults={f.opts} onChanged={nv=>set(f.k,nv)}/></div>
                <Select value={v[f.k]||(DB.get(f.sk,f.opts)||[])[0]} onChange={e=>set(f.k,e.target.value)} options={DB.get(f.sk,f.opts)||f.opts}/>
              </div>
            ):f.t==="in"?(
              <Field label={f.label} mb={0}><Input type="in" value={v[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}/></Field>
            ):(
              <Field label={f.label} mb={0}><Input value={v[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph} rows={f.rows||3}/></Field>
            )}
          </div>
        ))}
        <Btn onClick={run} disabled={busy} variant="teal">{busy?<><Spinner/> Processing…</>:cta}</Btn>
      </Card>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><SectionTitle>OUTPUT</SectionTitle>{out&&<CopyBtn text={out}/>}</div>
        <OutBox value={out} loading={busy}/>
      </Card>
    </div>
  );
}

// ── RICE ──────────────────────────────────────────────────────────
function RicePage({onSave}){
  const[feats,setFeats]=useState(()=>DB.get("rice_feats","Biometric login\nP2P transfer\nLoyalty points\nFX calculator"));
  const[ctx,setCtx]=useState("");const[file,setFile]=useState(null);
  const[busy,setBusy]=useState(false);const[rows,setRows]=useState([]);const[sum,setSum]=useState("");const[err,setErr]=useState("");
  useEffect(()=>DB.set("rice_feats",feats),[feats]);
  async function run(){
    const list=feats.split("\n").filter(f=>f.trim());if(!list.length)return;
    setBusy(true);setRows([]);setSum("");setErr("");
    try{
      const sys=`Bank PO expert. Reply ONLY with valid JSON:\n{"features":[{"name":"","reach":0,"impact":1,"confidence":50,"effort":1,"rationale":"one sentence"}],"summary":"2-3 sentence recommendation"}`;
      let p=`RICE for M Bank:\nFeatures: ${list.join(", ")}\n${ctx?"Context: "+ctx:"~500K users, retail mobile app"}`;
      if(file)p+=`\n\nFile (${file.name}):\n${file.content}`;
      const raw=await ai([{role:"user",content:p}],sys);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const scored=parsed.features.map(f=>({...f,rice:Math.round((f.reach*f.impact*(f.confidence/100))/f.effort)})).sort((a,b)=>b.rice-a.rice);
      setRows(scored);setSum(parsed.summary||"");
      onSave({tool:"rice",input:list.join(", "),output:parsed.summary||"",file:file?.name});
    }catch(e){setErr("Error: "+e.message);}
    setBusy(false);
  }
  const max=rows[0]?.rice||1;
  const RC=["#16A34A","#2563EB","#EA580C","#7C3AED","#0D9488","#DB2777"];
  const RBG=["#F0FDF4","#EFF6FF","#FFF7ED","#F5F3FF","#F0FDFA","#FDF2F8"];
  return(
    <div style={{overflowY:"auto",height:"100%",padding:"20px 24px",background:D.bg}}>
      <Card>
        <Field label="ATTACH FILE (OPTIONAL)"><FileZone file={file} onFile={setFile} onClear={()=>setFile(null)}/></Field>
        <Field label="FEATURES — ONE PER LINE" required><Input value={feats} onChange={e=>setFeats(e.target.value)} ph="Feature A\nFeature B" rows={6}/></Field>
        <Field label="CONTEXT (OPTIONAL)"><Input value={ctx} onChange={e=>setCtx(e.target.value)} ph="e.g. Retail app, 500K users, Q3 launch" rows={2}/></Field>
        <Btn onClick={run} disabled={busy} variant="teal">{busy?<><Spinner/> Calculating…</>:"Calculate RICE"}</Btn>
      </Card>
      {(busy||rows.length>0||err)&&(
        <Card>
          {busy&&<div style={{display:"flex",alignItems:"center",gap:8,color:D.text2,fontSize:13}}><Spinner/> Analysing features…</div>}
          {err&&<div style={{color:D.red,fontSize:13}}>{err}</div>}
          {rows.length>0&&(
            <>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${D.border}`}}>
                      {["#","Feature","Reach","Impact","Conf","Effort","RICE",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",fontSize:11,fontWeight:600,color:D.text2,letterSpacing:".06em"}}>{h.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r,i)=>(
                      <tr key={i} style={{borderBottom:i<rows.length-1?`1px solid ${D.border}`:"none"}}>
                        <td style={{padding:"10px 10px"}}>
                          <span style={{display:"inline-block",background:RBG[i]||D.surface2,color:RC[i]||D.text2,padding:"2px 8px",borderRadius:999,fontSize:11,fontWeight:600}}>{i+1}</span>
                        </td>
                        <td style={{padding:"10px 10px",fontWeight:500}}>{r.name}</td>
                        <td style={{padding:"10px 10px",color:D.text2}}>{r.reach}%</td>
                        <td style={{padding:"10px 10px",color:D.text2}}>{r.impact}</td>
                        <td style={{padding:"10px 10px",color:D.text2}}>{r.confidence}%</td>
                        <td style={{padding:"10px 10px",color:D.text2}}>{r.effort}</td>
                        <td style={{padding:"10px 10px"}}><span style={{color:RC[i]||D.text2,fontWeight:700,fontSize:15,fontVariantNumeric:"tabular-nums"}}>{r.rice}</span></td>
                        <td style={{padding:"10px 10px",minWidth:90}}>
                          <div style={{height:4,background:D.surface2,borderRadius:999,border:`1px solid ${D.border}`}}>
                            <div style={{height:4,borderRadius:999,background:RC[i]||D.text3,width:`${Math.round((r.rice/max)*100)}%`,transition:"width .5s"}}/>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sum&&<div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${D.border}`,fontSize:13,color:D.text2,lineHeight:1.7}}><SectionTitle>RECOMMENDATION</SectionTitle>{sum}</div>}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────
function HistoryPage({log}){
  const[filter,setFilter]=useState("all");const[search,setSearch]=useState("");
  const[df,setDf]=useState("");const[dt,setDt]=useState("");
  const[expanded,setExpanded]=useState(null);const[fmt,setFmt]=useState("md");
  const tools=["all","morning","chat","brain","ceo","story","prd","tfs","rice","sprint","dep","mtg","tc","review"];
  const shown=log.filter(e=>{
    if(filter!=="all"&&e.tool!==filter)return false;
    if(search&&!(e.input||"").toLowerCase().includes(search.toLowerCase())&&!(e.output||"").toLowerCase().includes(search.toLowerCase()))return false;
    if(df&&e.ts<df)return false;
    if(dt&&e.ts>dt+"T23:59:59")return false;
    return true;
  });
  function fmt2(iso){const d=new Date(iso);return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+" · "+d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});}
  function doExp(){const fn=`po-${filter}-${df||"all"}`;if(fmt==="md")exportMD(shown,fn);else if(fmt==="json")exportJSON(shown,fn);else exportCSV(shown,fn);}
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 24px",background:D.surface,borderBottom:`1px solid ${D.border}`,flexShrink:0}}>
        <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
          {tools.map(t=>(
            <button key={t} onClick={()=>setFilter(t)} style={{fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:999,border:`1px solid ${filter===t?D.text:D.border}`,cursor:"pointer",background:filter===t?D.text:D.surface,color:filter===t?"#fff":D.text2,fontFamily:D.font}}>
              {t==="all"?"All":(TEMO[t]||"")+' '+(TLBL[t]||t)}
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 130px 130px",gap:8,marginBottom:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search history…" style={{...IB,padding:"6px 11px",height:32}} onFocus={onF} onBlur={onB}/>
          <input type="date" value={df} onChange={e=>setDf(e.target.value)} style={{...IB,padding:"6px 10px",height:32,fontSize:12}} title="From"/>
          <input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={{...IB,padding:"6px 10px",height:32,fontSize:12}} title="To"/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:D.text2,fontWeight:500}}>{shown.length} entries</span>
          <div style={{flex:1}}/>
          <Select value={fmt} onChange={e=>setFmt(e.target.value)} options={["md","json","csv"]} style={{width:80,height:30,padding:"4px 8px",fontSize:12}}/>
          <Btn onClick={doExp} variant="sec" sm disabled={shown.length===0}>⬇ Export</Btn>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 24px",background:D.bg}}>
        {shown.length===0&&<div style={{textAlign:"center",color:D.text3,fontSize:13,paddingTop:40}}>No history yet.</div>}
        {shown.map(e=>(
          <div key={e.id} style={{background:D.surface,borderRadius:D.radius,border:`1px solid ${D.border}`,marginBottom:6,overflow:"hidden",boxShadow:D.shadow}}>
            <div onClick={()=>setExpanded(expanded===e.id?null:e.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer"}}>
              <div style={{width:28,height:28,borderRadius:D.radiusSm,background:D.tealBg,display:"grid",placeItems:"center",fontSize:14,flexShrink:0}}>{TEMO[e.tool]||"📄"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11.5,fontWeight:500,color:D.teal,marginBottom:1}}>{TLBL[e.tool]||e.tool}</div>
                <div style={{fontSize:12,color:D.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(e.input||"").slice(0,90)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                <div style={{fontSize:10.5,color:D.text3}}>{fmt2(e.ts)}</div>
                {e.file&&<Tag color="gray">📎 {e.file}</Tag>}
              </div>
              <span style={{fontSize:11,color:D.text3,marginLeft:4}}>{expanded===e.id?"▲":"▼"}</span>
            </div>
            {expanded===e.id&&(
              <div style={{borderTop:`1px solid ${D.border}`,padding:"12px 14px",background:D.bg}}>
                <div style={{marginBottom:10}}>
                  <SectionTitle>INPUT</SectionTitle>
                  <div style={{fontSize:12.5,color:D.text2,background:D.surface,borderRadius:D.radiusSm,padding:"8px 10px",whiteSpace:"pre-wrap",lineHeight:1.6,border:`1px solid ${D.border}`}}>{e.input}</div>
                </div>
                <div>
                  <SectionTitle>OUTPUT</SectionTitle>
                  <div style={{fontSize:12.5,color:D.text,background:D.surface,borderRadius:D.radiusSm,padding:"8px 10px",whiteSpace:"pre-wrap",lineHeight:1.7,border:`1px solid ${D.border}`}}>{e.output}</div>
                </div>
                <div style={{marginTop:8,display:"flex",gap:6}}>
                  <CopyBtn text={e.output}/>
                  <Btn sm variant="sec" onClick={()=>exportMD([e],`entry-${e.id}.md`)}>⬇ .md</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {log.length>0&&(
        <div style={{padding:"8px 24px",borderTop:`1px solid ${D.border}`,background:D.surface,flexShrink:0,display:"flex",gap:12,flexWrap:"wrap",fontSize:11,color:D.text3}}>
          <span>📦 {log.length} total</span>
          {["morning","story","prd","tfs","rice","brain","ceo"].map(t=>log.filter(e=>e.tool===t).length>0&&<span key={t}>{TEMO[t]} {log.filter(e=>e.tool===t).length}</span>)}
        </div>
      )}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────
const NAV=[
  {id:"morning",e:"☀️",l:"Morning Brief",  s:"Start your day",       grp:"ai"},
  {id:"brain",  e:"🧠",l:"Knowledge Brain", s:"Ask your docs",        grp:"ai"},
  {id:"chat",   e:"💬",l:"AI Chat",         s:"Ask anything",         grp:"ai"},
  {id:"ceo",    e:"🎯",l:"Stakeholder→IT",  s:"Translate to reqs",    grp:"ai"},
  {id:"story",  e:"📝",l:"User Story",      s:"Story + AC",           grp:"create"},
  {id:"prd",    e:"📋",l:"PRD",             s:"Requirements doc",     grp:"create"},
  {id:"tfs",    e:"⚙️",l:"TFS Copilot",     s:"Work items",           grp:"create"},
  {id:"rice",   e:"📊",l:"RICE Scoring",    s:"Prioritization",       grp:"plan"},
  {id:"sprint", e:"🏃",l:"Sprint Planner",  s:"Auto plan",            grp:"plan"},
  {id:"dep",    e:"🗺️",l:"Dependencies",    s:"Story map",            grp:"plan"},
  {id:"mtg",    e:"🗒️",l:"Meeting Notes",   s:"Summarize",            grp:"tools"},
  {id:"tc",     e:"✅",l:"Test Cases",      s:"QA testing",           grp:"tools"},
  {id:"review", e:"🎬",l:"Sprint Review",   s:"Demo script",          grp:"tools"},
  {id:"hist",   e:"🗂️",l:"History",         s:"All outputs",          grp:"tools"},
];
const GRPS={ai:"Assistant",create:"Create",plan:"Plan",tools:"Tools"};

// ── App ───────────────────────────────────────────────────────────
export default function App(){
  const[pg,setPg]=useState("morning");
  const{log,save}=useHistory();
  const[apiKey,setApiKey]=useState(()=>getKey());

  if(!apiKey) return <ApiKeyModal onSave={k=>setApiKey(k)}/>;

  const S={
    story:`Bank PO for M Bank Mongolia. Write user stories: "As a [user], I want [goal], so that [benefit]." Then Acceptance Criteria (Given/When/Then). Include Finacle context. English only.`,
    prd:`Bank PO. Write structured PRD: Objective, Target users, Features (MoSCoW), Out of scope, Technical requirements, KPIs, Risks. English only.`,
    tfs:`TFS expert. Generate work items: Type, Title, Description, Acceptance Criteria, Tags, Priority (1-4), Story Points, Child tasks. English only.`,
    mtg:`Bank PO. Structure meeting notes: Summary, Decisions, Action items (task|owner|deadline), Open questions, Next steps. English only.`,
    tc:`Bank QA. Test cases: TC-XXX | Name | Precondition | Steps | Expected result | Priority. Include Finacle errors, security, edge cases. English only.`,
    review:`Bank PO. Non-technical sprint review script. Business value focus. Opening, demos, metrics, next sprint, Q&A. English only.`,
    sprint:`Sprint planning expert. Given backlog + velocity, create optimal sprint plan with table. Consider dependencies. English only.`,
    dep:`Bank architect. Identify dependencies using → arrows. Technical, business, team dependencies + execution order. English only.`,
  };

  const DEFS={
    story:{fields:[
      {k:"desc",label:"Feature Description",ph:"e.g. Merchant can open Demand Deposit account from the app",rows:3},
      {k:"user",label:"User Type",t:"sel",sk:"sel_usertype",opts:["Retail customer","Merchant","Bank staff","Corporate customer","System admin","Auditor","Compliance officer"]},
      {k:"domain",label:"Domain",t:"sel",sk:"sel_domain",opts:["Merchant app","Mobile banking","Finacle core","Transfers & payments","Loans","Card management","KYC & Compliance","Demand deposit","Fixed deposit","Reporting"]},
      {k:"out",label:"Expected Outcome (optional)",ph:"e.g. Faster account opening, reduced manual steps",rows:2},
    ],sys:S.story,cta:"✦ Generate User Story",build:v=>{
      if(!(v.desc||"").trim())throw new Error("Please enter a feature description");
      return `Feature: ${v.desc}\nUser: ${v.user||"Retail customer"}\nDomain: ${v.domain||"Merchant app"}\n${v.out?"Outcome: "+v.out:""}\n\nWrite user story + 5–8 acceptance criteria.`;
    }},
    prd:{fields:[
      {k:"name",label:"Product Name",t:"in",ph:"e.g. Merchant Demand Deposit v1.0"},
      {k:"type",label:"Type",t:"sel",sk:"sel_prd_type",opts:["New banking product","New feature","Feature improvement","Regulatory compliance","MVP launch","Technical debt","Integration"]},
      {k:"brief",label:"Summary",ph:"What does it do? Why? What problem does it solve?",rows:4},
      {k:"users",label:"Target Users",t:"in",ph:"e.g. Merchants, retail customers"},
      {k:"ddl",label:"Timeline",t:"in",ph:"e.g. Q3 2025, Sprint 14-16"},
      {k:"sh",label:"Stakeholders",t:"in",ph:"e.g. CTO, Compliance, Finacle team, UX"},
    ],sys:S.prd,cta:"✦ Generate PRD",build:v=>{
      if(!(v.brief||"").trim())throw new Error("Please enter the summary");
      return `PRD:\nName: ${v.name||"—"}\nType: ${v.type}\nSummary: ${v.brief}\nUsers: ${v.users||"—"}\nTimeline: ${v.ddl||"—"}\nStakeholders: ${v.sh||"—"}`;
    }},
    tfs:{fields:[
      {k:"type",label:"Work Item Type",t:"sel",sk:"sel_tfs_type",opts:["User Story","Bug","Task","Feature","Epic","Test Case","Impediment"]},
      {k:"req",label:"Requirement / Description",ph:"e.g. Merchant can open Demand Deposit using Finacle ACTOPN",rows:4},
      {k:"sprint",label:"Sprint (optional)",t:"in",ph:"e.g. Sprint 14"},
      {k:"tags",label:"Tags (optional)",t:"in",ph:"e.g. Finacle, Mobile, KYC"},
    ],sys:S.tfs,cta:"✦ Generate TFS Work Items",build:v=>{
      if(!(v.req||"").trim())throw new Error("Please enter the requirement");
      const type=v.type||"User Story";
      let p=`Work Item Type: ${type}\nRequirement: ${v.req}\n${v.sprint?"Sprint: "+v.sprint:""}\n${v.tags?"Tags: "+v.tags:""}`;
      if(type==="Epic")p+="\n\nBreak into: Epic + Features + User Stories + Tasks";
      else if(type==="Feature")p+="\n\nBreak into: Feature + User Stories + AC + Tasks";
      else p+="\n\nInclude: Title, Description, AC (Given/When/Then), Story Points, Tags, Child Tasks";
      return p;
    }},
    mtg:{fields:[
      {k:"type",label:"Meeting Type",t:"sel",sk:"sel_mtg_type",opts:["Sprint planning","Sprint review","Stakeholder meeting","Requirement gathering","Retrospective","Architecture review","Finacle workshop","UAT sign-off","Emergency"]},
      {k:"att",label:"Attendees (optional)",t:"in",ph:"e.g. PO, Tech Lead, Finacle BA, QA Lead"},
      {k:"notes",label:"Meeting Notes (leave blank if attaching file)",ph:"Paste raw notes here…",rows:6},
    ],sys:S.mtg,cta:"✦ Process Notes",build:v=>`Meeting: ${v.type}\n${v.att?"Attendees: "+v.att:""}\n\nNotes:\n${v.notes||"(See attached file)"}\n\nStructure: Summary, Decisions, Action items, Open questions, Next steps.`},
    tc:{fields:[
      {k:"feat",label:"Feature Name",t:"in",ph:"e.g. Demand Deposit Account Opening"},
      {k:"crit",label:"Acceptance Criteria (or attach file)",ph:"- Valid merchant can open account\n- Opens in Finacle with scheme DD101\n- Error shown for closed CIF",rows:5},
      {k:"cnt",label:"Number of Tests",t:"sel",sk:"sel_tc_count",opts:["5 tests","10 tests","15 tests","20 tests","30 tests"]},
      {k:"kind",label:"Test Type",t:"sel",sk:"sel_tc_kind",opts:["Happy path + Edge cases","Happy path only","Negative cases only","Full regression","Finacle error scenarios","Security testing","UAT suite"]},
    ],sys:S.tc,cta:"✦ Generate Test Cases",build:v=>{
      if(!(v.crit||"").trim())throw new Error("Please enter acceptance criteria or attach a file");
      return `Feature: ${v.feat||"—"}\nCriteria:\n${v.crit||"(attached)"}\n\nWrite ${v.cnt||"10 tests"} (${v.kind||"Happy path + Edge cases"}).`;
    }},
    review:{fields:[
      {k:"name",label:"Sprint Name",t:"in",ph:"e.g. Sprint 14 — Demand Deposit"},
      {k:"aud",label:"Audience",t:"sel",sk:"sel_spr_aud",opts:["C-level (CEO, CTO)","Business stakeholders","Technical team","Board of directors","Compliance team","Cross-functional teams"]},
      {k:"done",label:"Completed Work (or attach file)",ph:"TFS #1234: Account opening form\nTFS #1235: Finacle ACTOPN integration\nTFS #1236: KYC validation",rows:5},
      {k:"next",label:"Next Sprint (optional)",ph:"Funding flow, Interest calculation…",rows:2},
    ],sys:S.review,cta:"✦ Generate Script",build:v=>{
      if(!(v.done||"").trim())throw new Error("Please enter completed work or attach a file");
      return `Sprint: ${v.name||"—"}\nAudience: ${v.aud}\nCompleted:\n${v.done}\n${v.next?"Next: "+v.next:""}\n\nWrite 3–5 min demo script.`;
    }},
    sprint:{fields:[
      {k:"backlog",label:"Backlog (story — story points)",ph:"Open Account — 8\nFunding — 5\nInterest Calculation — 13\nClose Account — 5",rows:7},
      {k:"velocity",label:"Team Velocity (SP)",t:"in",ph:"30"},
      {k:"sprints",label:"Number of Sprints",t:"in",ph:"e.g. 4"},
      {k:"team",label:"Team Size",t:"in",ph:"e.g. 6 devs"},
      {k:"constraints",label:"Constraints / Notes",ph:"e.g. Open Account before Funding, release Q3",rows:2},
    ],sys:S.sprint,cta:"✦ Plan Sprints",build:v=>{
      if(!(v.backlog||"").trim())throw new Error("Please enter the backlog");
      return `Sprint Planning:\nVelocity: ${v.velocity||30} SP\n${v.sprints?"Sprints: "+v.sprints:""}\n${v.team?"Team: "+v.team:""}\n\nBacklog:\n${v.backlog}\n${v.constraints?"Constraints: "+v.constraints:""}`;
    }},
    dep:{fields:[
      {k:"stories",label:"Stories / Features (one per line)",ph:"Customer Profile\nKYC Verification\nOpen Account\nFunding\nInterest Calculation\nClose Account",rows:7},
      {k:"context",label:"Context (optional)",ph:"e.g. Finacle core, demand deposit product",rows:2},
    ],sys:S.dep,cta:"✦ Generate Dependency Map",build:v=>{
      if(!(v.stories||"").trim())throw new Error("Please enter stories or features");
      return `Dependency map:\n\n${v.stories}\n\n${v.context?"Context: "+v.context:"Banking mobile app"}`;
    }},
  };

  const pages={
    morning:{t:"Morning Briefing",  s:"Your AI Shadow PO",                              c:<MorningPage key="morning" onSave={save}/>},
    brain:  {t:"Knowledge Brain",   s:"Ask questions across all your uploaded documents", c:<BrainPage key="brain" onSave={save}/>},
    chat:   {t:"AI Chat",           s:"Ask anything, attach files, get instant PO help", c:<ChatPage key="chat" onSave={save}/>},
    ceo:    {t:"Stakeholder → IT",  s:"Translate executive language to IT requirements", c:<CEOPage key="ceo" onSave={save}/>},
    story:  {t:"User Story",        s:"Generate stories + acceptance criteria",          c:<ToolPage key="story" toolId="story" {...DEFS.story} onSave={save}/>},
    prd:    {t:"PRD",               s:"Product Requirements Document",                  c:<ToolPage key="prd" toolId="prd" {...DEFS.prd} onSave={save}/>},
    tfs:    {t:"TFS Copilot",       s:"Generate TFS/Azure DevOps work items",            c:<ToolPage key="tfs" toolId="tfs" {...DEFS.tfs} onSave={save}/>},
    rice:   {t:"RICE Scoring",      s:"Feature prioritization with AI",                 c:<RicePage key="rice" onSave={save}/>},
    sprint: {t:"Sprint Planner",    s:"Auto-plan sprints from backlog + velocity",       c:<ToolPage key="sprint" toolId="sprint" {...DEFS.sprint} onSave={save}/>},
    dep:    {t:"Dependencies",      s:"Visualize story and feature dependencies",        c:<ToolPage key="dep" toolId="dep" {...DEFS.dep} onSave={save}/>},
    mtg:    {t:"Meeting Notes",     s:"Summarize and extract action items",              c:<ToolPage key="mtg" toolId="mtg" {...DEFS.mtg} onSave={save}/>},
    tc:     {t:"Test Cases",        s:"Generate from acceptance criteria",               c:<ToolPage key="tc" toolId="tc" {...DEFS.tc} onSave={save}/>},
    review: {t:"Sprint Review",     s:"Non-technical demo script for stakeholders",     c:<ToolPage key="review" toolId="review" {...DEFS.review} onSave={save}/>},
    hist:   {t:"History",           s:"All outputs — filterable by tool, date, keyword", c:<HistoryPage log={log}/>},
  };
  const cur=pages[pg]||pages.morning;
  const grouped=Object.entries(GRPS).map(([g,label])=>({label,items:NAV.filter(n=>n.grp===g)}));
  const brainCount=DB.get("brain_docs",[]).length;

  return(
    <div style={{display:"flex",height:"100vh",background:D.bg,fontFamily:D.font,color:D.text,fontSize:14}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:${D.border2};border-radius:3px}
        ::-webkit-scrollbar-track{background:transparent}
        @keyframes spin{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-3px)}}
        button,textarea,select,input{font-family:inherit}
        textarea::placeholder,input::placeholder{color:${D.text3}}
        a{color:${D.teal}}
      `}</style>

      {/* Sidebar */}
      <div style={{width:220,minWidth:220,background:D.sidebar,borderRight:`1px solid ${D.border}`,display:"flex",flexDirection:"column"}}>
        {/* Logo */}
        <div style={{padding:"16px 16px 14px",borderBottom:`1px solid ${D.border}`,display:"flex",alignItems:"center",gap:10}}>
          <MBadge size={30}/>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:D.text,letterSpacing:"-.01em"}}>PO Toolkit</div>
            <div style={{fontSize:10.5,color:D.text3,marginTop:1}}>M Bank · Product</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"8px 8px",overflowY:"auto"}}>
          {grouped.map(({label,items})=>(
            <div key={label} style={{marginBottom:4}}>
              <div style={{fontSize:10,fontWeight:600,color:D.text3,letterSpacing:".1em",padding:"8px 8px 4px",textTransform:"uppercase"}}>{label}</div>
              {items.map(n=>{
                const on=pg===n.id;
                return(
                  <div key={n.id} onClick={()=>setPg(n.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:D.radius,cursor:"pointer",marginBottom:1,background:on?D.tealBg:"transparent",transition:"background .1s"}}>
                    <span style={{fontSize:13,flexShrink:0}}>{n.e}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:on?600:400,color:on?D.teal:D.text,lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.l}</div>
                      <div style={{fontSize:10.5,color:on?D.teal:D.text3,marginTop:1,opacity:on?.8:1}}>{n.s}</div>
                    </div>
                    {n.id==="hist"&&log.length>0&&<span style={{fontSize:10,fontWeight:600,background:D.text,color:"#fff",padding:"1px 5px",borderRadius:999,flexShrink:0}}>{log.length}</span>}
                    {n.id==="brain"&&brainCount>0&&<span style={{fontSize:10,fontWeight:600,background:D.mGreen,color:"#fff",padding:"1px 5px",borderRadius:999,flexShrink:0}}>{brainCount}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{padding:"10px 10px",borderTop:`1px solid ${D.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",background:D.tealBg,borderRadius:D.radius,border:`1px solid ${D.mGreen}30`,marginBottom:6}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:D.mGreen,boxShadow:`0 0 4px ${D.mGreen}`,flexShrink:0}}/>
            <div>
              <div style={{fontSize:11,fontWeight:500,color:D.teal}}>Claude Sonnet 4.5</div>
              <div style={{fontSize:10,color:D.teal,opacity:.7}}>Connected</div>
            </div>
          </div>
          <button onClick={()=>{localStorage.removeItem('potk_apikey');setApiKey('');}} style={{width:"100%",border:`1px solid ${D.border}`,borderRadius:D.radiusSm,background:"transparent",color:D.text3,fontSize:11,fontWeight:400,padding:"5px",cursor:"pointer",fontFamily:D.font,transition:"all .15s"}} onMouseOver={e=>{e.target.style.color=D.text;e.target.style.borderColor=D.border2;}} onMouseOut={e=>{e.target.style.color=D.text3;e.target.style.borderColor=D.border;}}>
            🔑 Change API Key
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{padding:"12px 24px",borderBottom:`1px solid ${D.border}`,background:D.surface,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:18,fontWeight:600,letterSpacing:"-.02em",color:D.text}}>{cur.t}</div>
            <div style={{fontSize:12,color:D.text2,marginTop:1}}>{cur.s}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:D.text3}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:D.mGreen,display:"inline-block"}}/>
            AI-powered
          </div>
        </div>
        <div style={{flex:1,overflow:"hidden"}}>{cur.c}</div>
      </div>
    </div>
  );
}
