import { useState, useRef, useEffect } from "react";

// ── Design tokens ────────────────────────────────────────────────
const M = {
  teal:'#21C7A3', tealDeep:'#0B7A68', tealLight:'#EFFEF9', tealLighter:'#CAFDED',
  ink:'#101010', white:'#fff', bg:'#F2F2F7', bg2:'#E5E5EA',
  text:'rgba(0,0,0,.90)', text2:'rgba(0,0,0,.55)', text3:'rgba(0,0,0,.32)',
  sep:'rgba(0,0,0,.08)', red:'#D80027', blue:'#0058A4', orange:'#F97C16',
  green:'#1A8A2E', purple:'#6B3EBB',
  font:'-apple-system,system-ui,sans-serif',
};

// ── Storage ───────────────────────────────────────────────────────
const DB={
  get(k,d=null){try{const v=localStorage.getItem('potk_'+k);return v?JSON.parse(v):d;}catch{return d;}},
  set(k,v){try{localStorage.setItem('potk_'+k,JSON.stringify(v));}catch{}},
};

// ── AI ────────────────────────────────────────────────────────────
async function ai(messages,system,max=2000){
  const r=await fetch("/api/proxy",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:max,system,messages}),
  });
  const d=await r.json();
  if(!r.ok)throw new Error(d.error?.message||`Error ${r.status}`);
  const t=(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  if(!t)throw new Error("Empty response");
  return t;
}

// ── File reader ───────────────────────────────────────────────────
async function readFile(file){
  if(file.size>3*1024*1024)throw new Error("Max 3MB");
  const ext=file.name.split(".").pop().toLowerCase();
  const sz=(file.size/1024).toFixed(1);
  const txt=()=>new Promise((ok,err)=>{const r=new FileReader();r.onload=e=>ok(e.target.result);r.onerror=()=>err();r.readAsText(file,"UTF-8");});
  let c="";
  if(["txt","md","csv","json","xml","js","ts","py","sql"].includes(ext))c=await txt();
  else{const raw=await txt().catch(()=>"");c=raw.replace(/[^\x20-\x7E\n\r\t\u0400-\u04FF]/g," ").replace(/\s+/g," ").trim()||`[${ext.toUpperCase()} ${sz}KB]`;}
  if(c.length>15000)c=c.slice(0,15000)+"\n[...truncated]";
  return{name:file.name,ext,sz,chars:c.length,content:c};
}

// ── History ───────────────────────────────────────────────────────
function useHistory(){
  const[log,setLog]=useState(()=>DB.get("history",[]));
  function save(e){setLog(p=>{const n=[{id:Date.now(),ts:new Date().toISOString(),...e},...p];DB.set("history",n);return n;});}
  return{log,save};
}

// ── Export ────────────────────────────────────────────────────────
function dl(content,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();}
const exportMD=(rows,fn)=>dl(rows.map(e=>`# ${TLBL[e.tool]||e.tool}\n_${new Date(e.ts).toLocaleString()}_\n\n**Input**\n\n${e.input}\n\n**Output**\n\n${e.output}\n\n---`).join("\n\n"),fn+".md","text/markdown");
const exportJSON=(rows,fn)=>dl(JSON.stringify(rows,null,2),fn+".json","application/json");
const exportCSV=(rows,fn)=>dl(["ID,Date,Tool,Input,Output"].concat(rows.map(e=>[e.id,e.ts,e.tool,`"${(e.input||"").replace(/"/g,'""')}"`,`"${(e.output||"").replace(/"/g,'""')}"`].join(","))).join("\n"),fn+".csv","text/csv");

// ── Tool meta ─────────────────────────────────────────────────────
const TLBL={chat:"AI Chat",brain:"Knowledge Brain",morning:"Morning Briefing",story:"User Story",prd:"PRD",tfs:"TFS Copilot",ceo:"Stakeholder Translator",rice:"RICE Scoring",sprint:"Sprint Planner",dep:"Dependency Map",mtg:"Meeting Notes",tc:"Test Cases",review:"Sprint Review",hist:"History"};
const TEMO={chat:"💬",brain:"🧠",morning:"☀️",story:"📝",prd:"📋",tfs:"⚙️",ceo:"🎯",rice:"📊",sprint:"🏃",dep:"🗺️",mtg:"🗒️",tc:"✅",review:"🎬",hist:"🗂️"};

// ── Atoms ─────────────────────────────────────────────────────────
const Badge=({sz=32})=><div style={{width:sz,height:sz,borderRadius:Math.round(sz*.28),border:`${Math.max(2,Math.round(sz*.07))}px solid ${M.teal}`,background:M.white,display:"grid",placeItems:"center",fontWeight:700,fontSize:sz*.56,letterSpacing:"-.04em",color:M.ink,lineHeight:1,flexShrink:0}}>M</div>;
const Dots=()=><span style={{display:"inline-flex",gap:3,alignItems:"center"}}>{[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:M.teal,animation:"bonce 1.2s infinite",animationDelay:`${i*.2}s`}}/>)}</span>;
function CopyBtn({text}){const[ok,s]=useState(false);return<button onClick={()=>{navigator.clipboard.writeText(text);s(true);setTimeout(()=>s(false),1500)}} style={{fontSize:11,padding:"4px 11px",borderRadius:999,cursor:"pointer",background:ok?M.tealLight:M.bg2,border:"none",color:ok?M.tealDeep:M.text2,fontWeight:600}}>{ok?"Copied ✓":"Copy"}</button>;}
const Card=({children,p="18px 20px",mb=12,style={}})=><div style={{background:M.white,borderRadius:20,border:`1px solid ${M.sep}`,padding:p,marginBottom:mb,...style}}>{children}</div>;
const Lbl=({c,children})=><div style={{fontSize:11,fontWeight:700,color:c||M.text3,letterSpacing:".07em",marginBottom:6}}>{children}</div>;
const FW=({label,children,mb=14})=><div style={{marginBottom:mb}}><Lbl>{label}</Lbl>{children}</div>;
const IB={fontFamily:M.font,fontSize:14,color:M.text,background:M.bg,border:"1.5px solid transparent",borderRadius:14,padding:"11px 14px",outline:"none",boxSizing:"border-box",lineHeight:1.55,transition:"border-color .15s",width:"100%"};
const onF=e=>e.target.style.borderColor=M.teal,onB=e=>e.target.style.borderColor="transparent";
function MIn({value,onChange,placeholder,type="ta",rows=3}){
  if(type==="in")return<input value={value} onChange={onChange} placeholder={placeholder} style={{...IB,height:44}} onFocus={onF} onBlur={onB}/>;
  return<textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{...IB,resize:"vertical"}} onFocus={onF} onBlur={onB}/>;
}
function MSel({value,onChange,options,style}){
  return<select value={value} onChange={onChange} style={{...IB,height:44,cursor:"pointer",...style}}>{options.map(o=><option key={o}>{o}</option>)}</select>;
}
function MBtn({onClick,disabled,children,kind="ink",sm,full,style={}}){
  const BG={ink:M.ink,teal:M.teal,sec:M.bg2,red:M.red,blue:M.blue,purple:M.purple}[kind]||M.ink;
  const FG={ink:M.white,teal:M.white,sec:M.text,red:M.white,blue:M.white,purple:M.white}[kind]||M.white;
  return<button onClick={onClick} disabled={disabled} style={{border:0,fontFamily:M.font,fontWeight:600,fontSize:sm?12:14,padding:sm?"7px 14px":"12px 22px",borderRadius:999,height:sm?34:46,background:disabled?M.bg2:BG,color:disabled?M.text3:FG,width:full?"100%":undefined,cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,opacity:disabled?.6:1,...style}}>{children}</button>;
}

// ── Editable select ───────────────────────────────────────────────
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
      <button onClick={()=>setOpen(o=>!o)} style={{fontSize:11,background:"transparent",border:"none",color:M.tealDeep,cursor:"pointer",fontWeight:600,padding:"2px 6px"}}>Edit ✎</button>
      {open&&<div style={{position:"absolute",right:0,top:24,background:M.white,border:`1px solid ${M.sep}`,borderRadius:14,padding:"12px 14px",width:260,zIndex:300,boxShadow:"0 8px 28px rgba(0,0,0,.12)"}}>
        <Lbl>OPTIONS</Lbl>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10,maxHeight:180,overflowY:"auto"}}>
          {opts.map((t,i)=><div key={t} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{flex:1,fontSize:12.5,background:M.bg,borderRadius:7,padding:"5px 9px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t}</div>
            <button onClick={()=>up(i)} disabled={i===0} style={{width:22,height:22,borderRadius:6,border:`1px solid ${M.sep}`,background:M.white,cursor:i===0?"not-allowed":"pointer",color:M.text2,fontSize:11,display:"grid",placeItems:"center",opacity:i===0?.3:1}}>↑</button>
            <button onClick={()=>del(t)} style={{width:22,height:22,borderRadius:6,border:"none",background:"rgba(216,0,39,.1)",color:M.red,cursor:"pointer",fontSize:13,display:"grid",placeItems:"center"}}>×</button>
          </div>)}
        </div>
        <div style={{display:"flex",gap:6}}>
          <input value={nw} onChange={e=>setNw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="New option…" style={{flex:1,fontSize:12,background:M.bg,border:"1.5px solid transparent",borderRadius:9,padding:"6px 10px",outline:"none",fontFamily:M.font}} onFocus={onF} onBlur={onB}/>
          <button onClick={add} style={{background:M.teal,border:"none",color:M.white,fontWeight:700,fontSize:13,borderRadius:9,padding:"6px 11px",cursor:"pointer"}}>+</button>
        </div>
      </div>}
    </div>
  );
}

// ── File zone ─────────────────────────────────────────────────────
function FileZone({file,onFile,onClear,label}){
  const[drag,setDrag]=useState(false);const[err,setErr]=useState("");const ref=useRef();
  async function handle(f){if(!f)return;setErr("");try{onFile(await readFile(f));}catch(e){setErr(e.message);}}
  if(file)return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:M.tealLight,borderRadius:14,border:`1.5px solid ${M.tealLighter}`,marginBottom:12}}>
      <div style={{width:34,height:34,borderRadius:10,background:M.teal,display:"grid",placeItems:"center",color:M.white,fontSize:16,flexShrink:0}}>📄</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:M.tealDeep,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
        <div style={{fontSize:11,color:M.tealDeep,opacity:.7}}>{file.sz}KB · {file.chars.toLocaleString()} chars</div>
      </div>
      <button onClick={onClear} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:M.tealDeep,opacity:.5,padding:4}}>×</button>
    </div>
  );
  return(
    <div style={{marginBottom:12}}>
      <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}} onClick={()=>ref.current.click()} style={{border:`2px dashed ${drag?M.teal:M.bg2}`,borderRadius:14,padding:"14px",textAlign:"center",cursor:"pointer",background:drag?M.tealLight:M.bg,transition:"all .15s"}}>
        <div style={{fontSize:20,marginBottom:3}}>📎</div>
        <div style={{fontSize:13,fontWeight:600,color:M.text2}}>{label||"Attach file or click"}</div>
        <div style={{fontSize:11,color:M.text3,marginTop:2}}>txt · csv · json · pdf · docx · md · xml · sql</div>
        <input ref={ref} type="file" accept=".txt,.md,.csv,.json,.xml,.pdf,.doc,.docx,.xlsx,.js,.ts,.py,.sql" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
      </div>
      {err&&<div style={{fontSize:12,color:M.red,marginTop:4}}>⚠ {err}</div>}
    </div>
  );
}

const OutBox=({value,loading,ph="Output will appear here…"})=>
  <div style={{background:M.bg,borderRadius:16,padding:"14px 16px",minHeight:120,fontSize:13,lineHeight:1.75,color:loading?M.text3:M.text,whiteSpace:"pre-wrap"}}>
    {loading?<span style={{display:"flex",alignItems:"center",gap:10,color:M.text2}}><Dots/> Processing with AI…</span>:(value||<span style={{color:M.text3}}>{ph}</span>)}
  </div>;

// ══════════════════════════════════════════════════════════════════
// ☀️  MORNING BRIEFING — AI Shadow PO
// ══════════════════════════════════════════════════════════════════
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

  async function generate(){
    setBusy(true);
    try{
      const ctx=brainDocs.slice(0,3).map(d=>`[${d.name}]\n${d.content.slice(0,1500)}`).join("\n\n");
      const sys=`You are an AI Shadow PO assistant for M Bank Mongolia. Generate a concise, actionable morning briefing. Be direct and practical. Use emojis sparingly for status. English only.`;
      const p=`Generate a morning briefing for ${name||"the PO"}.

Current sprint: ${sprint||"unknown"}
Yesterday's status / notes:
${status||"(none provided)"}

${ctx?`Knowledge base context:\n${ctx}\n`:""}

Format exactly as:
## Good morning${name?" "+name:""}! ☀️

**Yesterday**
- [2-3 bullet points of what was completed or key events]

**Today's Focus**
- [3-4 prioritized action items with context]

**Risks & Blockers**
- [any risks detected from context, or "None detected"]

**Recommendations**
- [1-2 AI recommendations for today]

**Quick Stats**
- Sprint: [sprint name/number]
- Brain documents: ${brainDocs.length} loaded
- History entries: ${DB.get("history",[]).length}`;
      const r=await ai([{role:"user",content:p}],sys,800);
      setBrief(r);DB.set("morning_brief",r);
      onSave({tool:"morning",input:`Morning briefing for ${name}`,output:r});
    }catch(e){setBrief("Error: "+e.message);}
    setBusy(false);
  }

  const now=new Date();
  const greeting=now.getHours()<12?"Good morning":now.getHours()<18?"Good afternoon":"Good evening";

  return(
    <div style={{overflowY:"auto",height:"100%",padding:"14px 18px",background:M.bg}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg, ${M.tealDeep} 0%, #0d5c4f 100%)`,borderRadius:20,padding:"20px 24px",marginBottom:14,color:M.white}}>
        <div style={{fontSize:12,opacity:.7,marginBottom:4}}>{now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
        <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",marginBottom:2}}>{greeting}{name?", "+name:""}!</div>
        <div style={{fontSize:13,opacity:.8}}>Your AI Shadow PO is ready.</div>
        <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
          <div style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"8px 14px",fontSize:12}}>🧠 {brainDocs.length} docs in Brain</div>
          <div style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"8px 14px",fontSize:12}}>🗂️ {DB.get("history",[]).length} history entries</div>
          <div style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"8px 14px",fontSize:12}}>⚙️ TFS ready</div>
        </div>
      </div>

      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><Lbl>YOUR NAME</Lbl><MIn type="in" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Maral"/></div>
          <div><Lbl>CURRENT SPRINT</Lbl><MIn type="in" value={sprint} onChange={e=>setSprint(e.target.value)} placeholder="e.g. Sprint 14"/></div>
        </div>
        <FW label="YESTERDAY / CONTEXT (OPTIONAL)">
          <MIn value={status} onChange={e=>setStatus(e.target.value)} ph="What happened yesterday? Any blockers, decisions, updates? (leave blank for general briefing)" rows={3}/>
        </FW>
        <MBtn onClick={generate} disabled={busy} kind="teal" full>{busy?<><Dots/> Generating briefing…</>:"☀️ Generate Morning Briefing"}</MBtn>
      </Card>

      {(busy||brief)&&<Card p="18px 20px" mb={0}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Lbl>TODAY'S BRIEFING</Lbl>
          {brief&&<CopyBtn text={brief}/>}
        </div>
        <OutBox value={brief} loading={busy}/>
      </Card>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🧠  KNOWLEDGE BRAIN
// ══════════════════════════════════════════════════════════════════
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
      const sys=`You are the M Bank PO Knowledge Brain. Answer based ONLY on the provided documents. Always cite the source document name. If not found in docs, say so clearly.`;
      const r=await ai([{role:"user",content:`Question: ${q}\n\n${"═".repeat(38)}\nKNOWLEDGE BASE:\n\n${ctx}\n${"═".repeat(38)}`}],sys,2000);
      setAns(r);onSave({tool:"brain",input:q,output:r});
    }catch(e){setAns("Error: "+e.message);}
    setBusy(false);
  }
  const QUICK=["What are the requirements for demand deposit account opening?","List all open questions from meeting notes","What API/transaction is used for account balance inquiry?","What are the KYC requirements for new customers?","Show all action items and owners"];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:M.bg}}>
      <div style={{display:"flex",gap:0,padding:"10px 18px 0",background:M.white,borderBottom:`1px solid ${M.sep}`,flexShrink:0}}>
        {[["ask","🔍 Ask Brain"],["docs","📚 Docs ("+docs.length+")"],["add","➕ Add"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 16px",borderRadius:"10px 10px 0 0",border:`1px solid ${tab===id?M.sep:"transparent"}`,borderBottom:tab===id?`2px solid ${M.teal}`:"1px solid transparent",background:tab===id?M.white:"transparent",color:tab===id?M.tealDeep:M.text2,fontWeight:tab===id?700:500,fontSize:13,cursor:"pointer",fontFamily:M.font,marginBottom:"-1px"}}>
            {lbl}
          </button>
        ))}
      </div>
      {tab==="ask"&&<div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{QUICK.map(q2=><button key={q2} onClick={()=>setQ(q2)} style={{background:M.white,border:`1px solid ${M.sep}`,borderRadius:999,color:M.text2,fontSize:11.5,fontWeight:500,padding:"5px 11px",cursor:"pointer"}}>{q2}</button>)}</div>
        {docs.length===0&&<div style={{background:"rgba(249,124,22,.08)",border:`1px solid rgba(249,124,22,.2)`,borderRadius:14,padding:"12px 16px",fontSize:13,color:"#8B4A00",marginBottom:14}}>⚠ No documents yet — go to <b>Add</b> tab to upload BRDs, SRS, API docs, meeting notes, Finacle docs.</div>}
        <Card>
          <FW label="ASK YOUR KNOWLEDGE BASE"><MIn value={q} onChange={e=>setQ(e.target.value)} ph="e.g. What are the acceptance criteria for demand deposit account opening?" rows={3}/></FW>
          <MBtn onClick={ask} disabled={busy||!q.trim()||docs.length===0} kind="teal">{busy?<><Dots/> Searching…</>:"🔍 Ask Brain"}</MBtn>
        </Card>
        {(busy||ans)&&<Card p="14px 16px" mb={0}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lbl>ANSWER</Lbl>{ans&&<CopyBtn text={ans}/>}</div>
          <OutBox value={ans} loading={busy} ph="Answer from your documents…"/>
        </Card>}
      </div>}
      {tab==="docs"&&<div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {docs.length===0&&<div style={{textAlign:"center",color:M.text3,fontSize:13,paddingTop:40}}>No documents added yet.</div>}
        {docs.map(d=>(
          <div key={d.id} style={{background:M.white,borderRadius:14,border:`1px solid ${M.sep}`,padding:"12px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:d.type==="file"?M.tealLight:"rgba(0,88,164,.1)",display:"grid",placeItems:"center",fontSize:18,flexShrink:0}}>{d.type==="file"?"📄":"📝"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:M.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
              <div style={{fontSize:11,color:M.text2,marginTop:2}}>{(d.chars||0).toLocaleString()} chars · {new Date(d.addedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
            </div>
            <MBtn sm kind="sec" onClick={()=>removeDoc(d.id)}>Remove</MBtn>
          </div>
        ))}
      </div>}
      {tab==="add"&&<div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        <Card>
          <div style={{fontSize:13,color:M.text2,marginBottom:14,lineHeight:1.6}}>Upload any document to your Knowledge Brain. The Brain searches across all docs when you ask questions.</div>
          <FW label="UPLOAD FILE"><FileZone file={addFile} onFile={setAddFile} onClear={()=>setAddFile(null)} label="Upload BRD, SRS, API doc, meeting notes, Finacle doc…"/></FW>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><div style={{flex:1,height:1,background:M.sep}}/><span style={{fontSize:12,color:M.text3}}>OR</span><div style={{flex:1,height:1,background:M.sep}}/></div>
          <FW label="DOCUMENT NAME"><MIn type="in" value={addName} onChange={e=>setAddName(e.target.value)} placeholder="e.g. Demand Deposit BRD v2.1"/></FW>
          <FW label="PASTE TEXT / NOTES"><MIn value={addNote} onChange={e=>setAddNote(e.target.value)} ph="Paste BRD, API docs, requirements, meeting notes, Finacle specs…" rows={6}/></FW>
          <MBtn onClick={addDoc} disabled={!addFile&&!addNote.trim()} kind="teal">➕ Add to Knowledge Brain</MBtn>
        </Card>
        <div style={{fontSize:12,color:M.text3,marginTop:8,lineHeight:1.7,padding:"0 4px"}}><b style={{color:M.text2}}>Supported:</b> BRD · SRS · API contracts · Finacle FIXML · Meeting notes · TFS exports · User stories · Test cases · Confluence pages</div>
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🎯  STAKEHOLDER TRANSLATOR  (CEO → IT)
// ══════════════════════════════════════════════════════════════════
function CEOPage({onSave}){
  const SYS=`You are a bank PO assistant. Translate vague business/executive language into structured IT requirements. Output: Business Goal, Features list, Epic name, User Stories (3-6), Priority order, and any risks. English only.`;
  const[v,setV]=useState(()=>DB.get("form_ceo",{}));
  const[out,setOut]=useState("");const[busy,setBusy]=useState(false);
  function set(k,val){const nv={...v,[k]:val};setV(nv);DB.set("form_ceo",nv);}
  async function run(){
    setBusy(true);setOut("");
    try{
      if(!(v.statement||"").trim())throw new Error("Please enter the statement");
      const p=`Translate this executive/stakeholder statement into structured IT requirements:\n\n"${v.statement}"\n\nContext: ${v.ctx||"M Bank Mongolia, mobile banking, Finacle core system"}\nSpeaker role: ${v.role||"CEO"}\nDeadline pressure: ${v.deadline||"not specified"}`;
      const r=await ai([{role:"user",content:p}],SYS);
      setOut(r);onSave({tool:"ceo",input:v.statement,output:r});
    }catch(e){setOut("Error: "+e.message);}
    setBusy(false);
  }
  return(
    <div style={{overflowY:"auto",height:"100%",padding:"14px 18px",background:M.bg}}>
      <Card>
        <div style={{background:M.bg,borderRadius:14,padding:"12px 14px",marginBottom:16,fontSize:13,color:M.text2,lineHeight:1.6}}>
          Paste what your CEO, manager or stakeholder said — in any language, vague or clear. AI translates it into proper IT requirements.
        </div>
        <FW label='WHAT DID THEY SAY?'>
          <MIn value={v.statement||""} onChange={e=>set("statement",e.target.value)} ph={`"Merchant-уудад хадгаламжийн бүтээгдэхүүн оруулчих"\n"We need to beat QPay by Q3"\n"Just make it faster and easier"`} rows={4}/>
        </FW>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><Lbl>SPEAKER ROLE</Lbl><EditBtn sk="sel_ceo_role" defaults={["CEO","CTO","CFO","Head of Digital","Business Owner","Board Member","Compliance Officer"]} onChanged={nv=>set("role",nv)}/></div>
            <MSel value={v.role||(DB.get("sel_ceo_role",["CEO"])||["CEO"])[0]} onChange={e=>set("role",e.target.value)} options={DB.get("sel_ceo_role",["CEO","CTO","CFO","Head of Digital","Business Owner","Board Member","Compliance Officer"])}/>
          </div>
          <div><Lbl>DEADLINE / PRESSURE</Lbl><MIn type="in" value={v.deadline||""} onChange={e=>set("deadline",e.target.value)} placeholder="e.g. Q3 2025, before Naadam"/></div>
        </div>
        <FW label="ADDITIONAL CONTEXT (OPTIONAL)"><MIn value={v.ctx||""} onChange={e=>set("ctx",e.target.value)} ph="e.g. Competing with QPay, Finacle backend, merchant segment" rows={2}/></FW>
        <MBtn onClick={run} disabled={busy} kind="teal">{busy?<><Dots/> Translating…</>:"🎯 Translate to IT Requirements"}</MBtn>
      </Card>
      <Card p="14px 16px" mb={0}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lbl>TRANSLATED REQUIREMENTS</Lbl>{out&&<CopyBtn text={out}/>}</div>
        <OutBox value={out} loading={busy} ph="Structured requirements will appear here…"/>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// GENERIC TOOL PAGE
// ══════════════════════════════════════════════════════════════════
function ToolPage({toolId,fields,sys,build,cta="Generate",onSave}){
  const[v,setV]=useState(()=>{const s=DB.get(`form_${toolId}`,{});const d={};fields.forEach(f=>{if(f.t==="sel"&&!s[f.k])d[f.k]=(DB.get(f.sk,f.opts)||[])[0]||f.opts[0];});return{...d,...s};});
  const[file,setFile]=useState(null);const[out,setOut]=useState("");const[busy,setBusy]=useState(false);
  function set(k,val){const nv={...v,[k]:val};setV(nv);DB.set(`form_${toolId}`,nv);}
  async function run(){
    setBusy(true);setOut("");
    try{
      let p=build(v);
      if(file)p+=`\n\n${"─".repeat(36)}\nFile: ${file.name}\n${file.content}`;
      const r=await ai([{role:"user",content:p}],sys);
      setOut(r);onSave({tool:toolId,input:p.slice(0,500),output:r,file:file?.name});
    }catch(e){setOut("Error: "+e.message);}
    setBusy(false);
  }
  return(
    <div style={{overflowY:"auto",height:"100%",padding:"14px 18px",background:M.bg}}>
      <Card>
        <FW label="ATTACH FILE (OPTIONAL)">
          <FileZone file={file} onFile={setFile} onClear={()=>setFile(null)}/>
          {file&&<div style={{fontSize:11,color:M.tealDeep,fontWeight:500,marginTop:-6,marginBottom:4}}>✓ File content included in prompt</div>}
        </FW>
        {fields.map(f=>(
          <div key={f.k} style={{marginBottom:14}}>
            {f.t==="sel"?(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><Lbl>{f.label.toUpperCase()}</Lbl><EditBtn sk={f.sk} defaults={f.opts} onChanged={nv=>set(f.k,nv)}/></div>
                <MSel value={v[f.k]||(DB.get(f.sk,f.opts)||[])[0]} onChange={e=>set(f.k,e.target.value)} options={DB.get(f.sk,f.opts)||f.opts}/>
              </div>
            ):f.t==="in"?(<FW label={f.label.toUpperCase()} mb={0}><MIn type="in" value={v[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}/></FW>
            ):(<FW label={f.label.toUpperCase()} mb={0}><MIn value={v[f.k]||""} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph} rows={f.rows||3}/></FW>)}
          </div>
        ))}
        <MBtn onClick={run} disabled={busy}>{busy?<><Dots/> Processing…</>:cta}</MBtn>
      </Card>
      <Card p="14px 16px" mb={0}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lbl>OUTPUT</Lbl>{out&&<CopyBtn text={out}/>}</div>
        <OutBox value={out} loading={busy}/>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 📊 RICE
// ══════════════════════════════════════════════════════════════════
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
  const RC=[M.teal,M.ink,M.orange,M.blue,M.purple,"#9B59B6"];
  const RB=[M.tealLight,"rgba(16,16,16,.08)","rgba(249,124,22,.1)","rgba(0,88,164,.1)"];
  return(
    <div style={{overflowY:"auto",height:"100%",padding:"14px 18px",background:M.bg}}>
      <Card>
        <FW label="ATTACH FILE (OPTIONAL)"><FileZone file={file} onFile={setFile} onClear={()=>setFile(null)}/></FW>
        <FW label="FEATURES — ONE PER LINE"><MIn value={feats} onChange={e=>setFeats(e.target.value)} ph="Feature A\nFeature B" rows={6}/></FW>
        <FW label="CONTEXT (OPTIONAL)"><MIn value={ctx} onChange={e=>setCtx(e.target.value)} ph="e.g. Retail app, 500K users, Q3 launch" rows={2}/></FW>
        <MBtn onClick={run} disabled={busy}>{busy?<><Dots/> Calculating…</>:"Calculate RICE"}</MBtn>
      </Card>
      {(busy||rows.length>0||err)&&<Card p="14px 16px" mb={0}>
        {busy&&<div style={{display:"flex",alignItems:"center",gap:9,color:M.text2,fontSize:13}}><Dots/> Analysing…</div>}
        {err&&<div style={{color:M.red,fontSize:13}}>{err}</div>}
        {rows.length>0&&<>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{borderBottom:`1.5px solid ${M.sep}`}}>{["#","Feature","Reach","Impact","Conf","Effort","RICE",""].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",fontSize:11,fontWeight:700,color:M.text3,letterSpacing:".06em"}}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r,i)=><tr key={i} style={{borderBottom:i<rows.length-1?`1px solid ${M.sep}`:"none"}}>
                <td style={{padding:"10px 8px"}}><span style={{background:RB[i]||M.bg,color:RC[i]||M.text2,padding:"2px 8px",borderRadius:999,fontSize:11,fontWeight:700}}>{i+1}</span></td>
                <td style={{padding:"10px 8px",fontWeight:600}}>{r.name}</td>
                <td style={{padding:"10px 8px",color:M.text2}}>{r.reach}%</td>
                <td style={{padding:"10px 8px",color:M.text2}}>{r.impact}</td>
                <td style={{padding:"10px 8px",color:M.text2}}>{r.confidence}%</td>
                <td style={{padding:"10px 8px",color:M.text2}}>{r.effort}</td>
                <td style={{padding:"10px 8px"}}><span style={{color:RC[i]||M.text2,fontWeight:700,fontSize:15}}>{r.rice}</span></td>
                <td style={{padding:"10px 8px",minWidth:80}}><div style={{height:5,background:M.bg2,borderRadius:999}}><div style={{height:5,borderRadius:999,background:RC[i]||M.text3,width:`${Math.round((r.rice/max)*100)}%`,transition:"width .5s"}}/></div></td>
              </tr>)}</tbody>
            </table>
          </div>
          {sum&&<div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${M.sep}`,fontSize:13,color:M.text2,lineHeight:1.7}}><Lbl>RECOMMENDATION</Lbl>{sum}</div>}
        </>}
      </Card>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 💬 CHAT
// ══════════════════════════════════════════════════════════════════
const SUGG=["Write user story for demand deposit account opening","Explain Finacle ACTOPN transaction","Draft TFS work item for KYC feature","What are best practices for bank PO?","Translate: 'QPay-аас хурдан болгочих' into requirements"];
function ChatPage({onSave}){
  const SYS=`You are an expert PO assistant for M Bank Mongolia. You know Finacle core banking, TFS/Azure DevOps, digital banking, FIXML, user stories, RICE, PRDs. English only. Be concise and practical.`;
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
        if(i===hist.length-1&&f)return{role:"user",content:`File: ${f.name}\n${"─".repeat(36)}\n${f.content}\n${"─".repeat(36)}\n\n${msg||"Summarize key points for a bank PO."}`};
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
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:M.bg}}>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
            {m.role==="assistant"&&<Badge sz={26}/>}
            <div style={{maxWidth:"76%",padding:"10px 14px",borderRadius:16,borderBottomRightRadius:m.role==="user"?3:16,borderBottomLeftRadius:m.role==="assistant"?3:16,background:m.role==="user"?M.ink:M.white,border:m.role==="assistant"?`1px solid ${M.sep}`:"none",color:m.role==="user"?M.white:M.text,fontSize:13.5,lineHeight:1.72,whiteSpace:"pre-wrap"}}>
              {m.content}
              {m.role==="assistant"&&i>0&&<div style={{marginTop:7}}><CopyBtn text={m.content}/></div>}
            </div>
          </div>
        ))}
        {busy&&<div style={{display:"flex",gap:8,alignItems:"flex-end"}}><Badge sz={26}/><div style={{padding:"10px 14px",borderRadius:16,borderBottomLeftRadius:3,background:M.white,border:`1px solid ${M.sep}`}}><Dots/></div></div>}
        <div ref={bot}/>
      </div>
      {sugg&&<div style={{padding:"0 18px 8px",display:"flex",flexWrap:"wrap",gap:6}}>{SUGG.map(s=><button key={s} onClick={()=>send(s)} style={{background:M.white,border:`1px solid ${M.sep}`,borderRadius:999,color:M.text2,fontSize:11.5,fontWeight:500,padding:"5px 11px",cursor:"pointer"}}>{s}</button>)}</div>}
      <div style={{background:"rgba(255,255,255,.9)",backdropFilter:"blur(16px)",borderTop:`1px solid ${M.sep}`,padding:"8px 14px 16px"}}>
        {pf&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,padding:"6px 10px",background:M.tealLight,borderRadius:10,fontSize:12}}>
          <span>📎</span><span style={{color:M.tealDeep,fontWeight:600,flex:1}}>{pf.name}</span>
          <button onClick={()=>setPf(null)} style={{background:"none",border:"none",color:M.text2,cursor:"pointer",fontSize:16}}>×</button>
        </div>}
        <div style={{display:"flex",gap:7,alignItems:"flex-end"}}>
          <button onClick={()=>fref.current.click()} style={{width:40,height:40,borderRadius:12,border:`1.5px solid ${M.bg2}`,background:M.white,cursor:"pointer",display:"grid",placeItems:"center",fontSize:17,flexShrink:0}}>📎</button>
          <input ref={fref} type="file" style={{display:"none"}} accept=".txt,.md,.csv,.json,.xml,.pdf,.doc,.docx,.xlsx,.js,.ts,.py,.sql" onChange={e=>attach(e.target.files[0])}/>
          <textarea value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask anything… (Enter to send)" rows={1} style={{flex:1,...IB,padding:"9px 13px",resize:"none",maxHeight:90,borderRadius:12}} onFocus={onF} onBlur={onB}/>
          <button onClick={()=>send()} disabled={(!inp.trim()&&!pf)||busy} style={{width:40,height:40,borderRadius:12,border:"none",background:(inp.trim()||pf)&&!busy?M.ink:M.bg2,color:(inp.trim()||pf)&&!busy?M.white:M.text3,cursor:(inp.trim()||pf)&&!busy?"pointer":"not-allowed",display:"grid",placeItems:"center",fontSize:17,flexShrink:0}}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 🗂️ HISTORY
// ══════════════════════════════════════════════════════════════════
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
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:M.bg}}>
      <div style={{padding:"10px 18px",background:M.white,borderBottom:`1px solid ${M.sep}`,flexShrink:0}}>
        <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
          {tools.map(t=><button key={t} onClick={()=>setFilter(t)} style={{fontSize:10.5,fontWeight:600,padding:"4px 9px",borderRadius:999,border:"none",cursor:"pointer",background:filter===t?M.ink:M.bg2,color:filter===t?M.white:M.text2}}>
            {t==="all"?"All":(TEMO[t]||"")+' '+(TLBL[t]||t)}
          </button>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 130px 130px",gap:7,marginBottom:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{...IB,padding:"7px 12px",borderRadius:10,fontSize:13}}/>
          <input type="date" value={df} onChange={e=>setDf(e.target.value)} style={{...IB,padding:"7px 10px",borderRadius:10,fontSize:12}} title="From"/>
          <input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={{...IB,padding:"7px 10px",borderRadius:10,fontSize:12}} title="To"/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:M.text2,fontWeight:500}}>{shown.length} entries</span>
          <div style={{flex:1}}/>
          <MSel value={fmt} onChange={e=>setFmt(e.target.value)} options={["md","json","csv"]} style={{width:80,height:34,padding:"5px 10px",fontSize:12,borderRadius:9}}/>
          <MBtn onClick={doExp} kind="ink" sm disabled={shown.length===0}>⬇ Export</MBtn>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 18px"}}>
        {shown.length===0&&<div style={{textAlign:"center",color:M.text3,fontSize:13,paddingTop:40}}>No history yet.</div>}
        {shown.map(e=>(
          <div key={e.id} style={{background:M.white,borderRadius:16,border:`1px solid ${M.sep}`,marginBottom:8,overflow:"hidden"}}>
            <div onClick={()=>setExpanded(expanded===e.id?null:e.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer"}}>
              <div style={{width:30,height:30,borderRadius:9,background:M.tealLight,display:"grid",placeItems:"center",fontSize:15,flexShrink:0}}>{TEMO[e.tool]||"📄"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11.5,fontWeight:700,color:M.tealDeep,marginBottom:1}}>{TLBL[e.tool]||e.tool}</div>
                <div style={{fontSize:12,color:M.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(e.input||"").slice(0,90)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                <div style={{fontSize:10,color:M.text3}}>{fmt2(e.ts)}</div>
                {e.file&&<div style={{fontSize:9.5,background:M.bg2,padding:"1px 6px",borderRadius:999,color:M.text2}}>📎 {e.file}</div>}
                <div style={{fontSize:11,color:M.text3}}>{expanded===e.id?"▲":"▼"}</div>
              </div>
            </div>
            {expanded===e.id&&<div style={{borderTop:`1px solid ${M.sep}`,padding:"12px 14px"}}>
              <div style={{marginBottom:10}}><Lbl>INPUT</Lbl><div style={{fontSize:12.5,color:M.text2,background:M.bg,borderRadius:10,padding:"9px 12px",whiteSpace:"pre-wrap",lineHeight:1.6}}>{e.input}</div></div>
              <div><Lbl>OUTPUT</Lbl><div style={{fontSize:12.5,color:M.text,background:M.bg,borderRadius:10,padding:"9px 12px",whiteSpace:"pre-wrap",lineHeight:1.7}}>{e.output}</div></div>
              <div style={{marginTop:9,display:"flex",gap:6}}>
                <CopyBtn text={e.output}/>
                <MBtn sm kind="sec" onClick={()=>exportMD([e],`entry-${e.id}.md`)}>⬇ .md</MBtn>
              </div>
            </div>}
          </div>
        ))}
      </div>
      {log.length>0&&<div style={{padding:"8px 18px",borderTop:`1px solid ${M.sep}`,background:M.white,flexShrink:0,display:"flex",gap:12,flexWrap:"wrap",fontSize:11,color:M.text3}}>
        <span>📦 {log.length} total</span>
        {["morning","story","prd","tfs","rice","brain","ceo"].map(t=>log.filter(e=>e.tool===t).length>0&&<span key={t}>{TEMO[t]} {log.filter(e=>e.tool===t).length}</span>)}
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NAV + APP
// ══════════════════════════════════════════════════════════════════
const NAV=[
  {id:"morning",e:"☀️",l:"Morning Briefing",s:"Start your day",       grp:"ai"},
  {id:"brain",  e:"🧠",l:"Knowledge Brain",  s:"Ask your docs",        grp:"ai"},
  {id:"chat",   e:"💬",l:"AI Chat",          s:"Ask anything",         grp:"ai"},
  {id:"ceo",    e:"🎯",l:"Stakeholder →IT",  s:"Translate to reqs",    grp:"ai"},
  {id:"story",  e:"📝",l:"User Story",       s:"Story + AC",           grp:"create"},
  {id:"prd",    e:"📋",l:"PRD",              s:"Requirements doc",     grp:"create"},
  {id:"tfs",    e:"⚙️",l:"TFS Copilot",      s:"Work items",           grp:"create"},
  {id:"rice",   e:"📊",l:"RICE Scoring",     s:"Prioritization",       grp:"plan"},
  {id:"sprint", e:"🏃",l:"Sprint Planner",   s:"Auto plan",            grp:"plan"},
  {id:"dep",    e:"🗺️",l:"Dependency Map",   s:"Story dependencies",   grp:"plan"},
  {id:"mtg",    e:"🗒️",l:"Meeting Notes",    s:"Summarize",            grp:"tools"},
  {id:"tc",     e:"✅",l:"Test Cases",       s:"QA testing",           grp:"tools"},
  {id:"review", e:"🎬",l:"Sprint Review",    s:"Demo script",          grp:"tools"},
  {id:"hist",   e:"🗂️",l:"History",          s:"All outputs",          grp:"tools"},
];
const GRPS={ai:"AI Assistant",create:"Create",plan:"Plan",tools:"Tools"};

export default function App(){
  const[pg,setPg]=useState("morning");
  const{log,save}=useHistory();

  const S={
    story:`Bank PO assistant for M Bank Mongolia. Write user stories: "As a [user], I want [goal], so that [benefit]." Then Acceptance Criteria (Given/When/Then). Include Finacle-specific details if relevant. English only.`,
    prd:`Bank PO assistant. Write structured PRD in English: Objective, Target users, Features (MoSCoW), Out of scope, Technical requirements (Finacle APIs if relevant), KPIs, Risks.`,
    tfs:`TFS/Azure DevOps expert for M Bank. Generate structured work items in English: Work Item Type, Title, Description, Acceptance Criteria, Tags, Priority (1-4), Story Points, Child tasks.`,
    mtg:`Bank PO assistant. Structure meeting notes: Summary, Decisions, Action items (task|owner|deadline), Open questions, Next steps. English only.`,
    tc:`Bank QA assistant. Test cases: TC-XXX | Name | Precondition | Steps | Expected result | Priority (P1/P2/P3). Include Finacle error codes, security, edge cases. English only.`,
    review:`Bank PO assistant. Non-technical sprint review script. Focus on business value, not technical details. Structure: opening, feature demos, metrics, next sprint, Q&A. English only.`,
    sprint:`Sprint planning expert. Given backlog + velocity, create optimal sprint plan with table. Consider dependencies and priority. English only.`,
    dep:`Bank system architect. Identify dependencies between stories/features using → arrows. Include: technical, business, team dependencies and suggested execution order. English only.`,
  };

  const DEFS={
    story:{fields:[
      {k:"desc",label:"Feature description",ph:"e.g. Merchant can open Demand Deposit account from the app",rows:3},
      {k:"user",label:"User type",t:"sel",sk:"sel_usertype",opts:["Retail customer","Merchant","Bank staff","Corporate customer","System admin","Auditor","Compliance officer"]},
      {k:"domain",label:"Domain",t:"sel",sk:"sel_domain",opts:["Merchant app","Mobile banking","Finacle core","Transfers & payments","Loans","Card management","KYC & Compliance","Demand deposit","Fixed deposit","Reporting"]},
      {k:"out",label:"Expected outcome (optional)",ph:"e.g. Faster account opening, reduced manual steps",rows:2},
    ],sys:S.story,cta:"Generate User Story",build:v=>{
      if(!(v.desc||"").trim())throw new Error("Please enter a feature description");
      return `Feature: ${v.desc}\nUser: ${v.user||"Retail customer"}\nDomain: ${v.domain||"Merchant app"}\n${v.out?"Outcome: "+v.out:""}\n\nWrite user story + 5–8 acceptance criteria. Include Finacle context if relevant.`;
    }},
    prd:{fields:[
      {k:"name",label:"Product name",t:"in",ph:"e.g. Merchant Demand Deposit v1.0"},
      {k:"type",label:"Type",t:"sel",sk:"sel_prd_type",opts:["New banking product","New feature","Feature improvement","Regulatory compliance","MVP launch","Technical debt","Integration","API development"]},
      {k:"brief",label:"Summary / key idea",ph:"What does it do? Why? What problem does it solve?",rows:4},
      {k:"users",label:"Target users",t:"in",ph:"e.g. Merchants, retail customers"},
      {k:"ddl",label:"Timeline",t:"in",ph:"e.g. Q3 2025, Sprint 14-16"},
      {k:"sh",label:"Stakeholders",t:"in",ph:"e.g. CTO, Compliance, Finacle team, UX"},
    ],sys:S.prd,cta:"Generate PRD",build:v=>{
      if(!(v.brief||"").trim())throw new Error("Please enter the summary");
      return `PRD:\nName: ${v.name||"—"}\nType: ${v.type}\nSummary: ${v.brief}\nUsers: ${v.users||"—"}\nTimeline: ${v.ddl||"—"}\nStakeholders: ${v.sh||"—"}`;
    }},
    tfs:{fields:[
      {k:"type",label:"Work item type",t:"sel",sk:"sel_tfs_type",opts:["User Story","Bug","Task","Feature","Epic","Test Case","Impediment"]},
      {k:"req",label:"Requirement / description",ph:"e.g. Merchant can open Demand Deposit from app using Finacle ACTOPN",rows:4},
      {k:"sprint",label:"Sprint (optional)",t:"in",ph:"e.g. Sprint 14"},
      {k:"tags",label:"Tags (optional)",t:"in",ph:"e.g. Finacle, Mobile, KYC"},
    ],sys:S.tfs,cta:"Generate TFS Work Items",build:v=>{
      if(!(v.req||"").trim())throw new Error("Please enter the requirement");
      const type=v.type||"User Story";
      let p=`Work Item Type: ${type}\nRequirement: ${v.req}\n${v.sprint?"Sprint: "+v.sprint:""}\n${v.tags?"Tags: "+v.tags:""}`;
      if(type==="Epic")p+="\n\nBreak down into: Epic + Features + User Stories + Tasks";
      else if(type==="Feature")p+="\n\nBreak down into: Feature + User Stories + Acceptance Criteria + Tasks";
      else p+="\n\nInclude: Title, Description, Acceptance Criteria (Given/When/Then), Story Points, Tags, Child Tasks";
      return p;
    }},
    mtg:{fields:[
      {k:"type",label:"Meeting type",t:"sel",sk:"sel_mtg_type",opts:["Sprint planning","Sprint review","Stakeholder meeting","Requirement gathering","Retrospective","Architecture review","Finacle workshop","Vendor meeting","UAT sign-off","Emergency"]},
      {k:"att",label:"Attendees (optional)",t:"in",ph:"e.g. PO, Tech Lead, Finacle BA, QA Lead"},
      {k:"notes",label:"Meeting notes (or attach file)",ph:"Paste raw notes here…",rows:6},
    ],sys:S.mtg,cta:"Process Notes",build:v=>`Meeting: ${v.type}\n${v.att?"Attendees: "+v.att:""}\n\nNotes:\n${v.notes||"(See attached file)"}\n\nStructure: Summary, Decisions, Action items, Open questions, Next steps.`},
    tc:{fields:[
      {k:"feat",label:"Feature name",t:"in",ph:"e.g. Demand Deposit Account Opening"},
      {k:"crit",label:"Acceptance criteria (or attach file)",ph:"- Valid merchant can open account\n- Opens in Finacle with scheme DD101\n- Error shown for closed CIF",rows:5},
      {k:"cnt",label:"Number of tests",t:"sel",sk:"sel_tc_count",opts:["5 tests","10 tests","15 tests","20 tests","30 tests"]},
      {k:"kind",label:"Test type",t:"sel",sk:"sel_tc_kind",opts:["Happy path + Edge cases","Happy path only","Negative cases only","Full regression","Finacle error scenarios","Security testing","UAT suite"]},
    ],sys:S.tc,cta:"Generate Test Cases",build:v=>{
      if(!(v.crit||"").trim())throw new Error("Please enter acceptance criteria or attach a file");
      return `Feature: ${v.feat||"—"}\nCriteria:\n${v.crit||"(attached)"}\n\nWrite ${v.cnt||"10 tests"} (${v.kind||"Happy path + Edge cases"}).`;
    }},
    review:{fields:[
      {k:"name",label:"Sprint name",t:"in",ph:"e.g. Sprint 14 — Demand Deposit"},
      {k:"aud",label:"Audience",t:"sel",sk:"sel_spr_aud",opts:["C-level (CEO, CTO)","Business stakeholders","Technical team","Board of directors","Compliance team","Cross-functional teams"]},
      {k:"done",label:"Completed work (or attach file)",ph:"TFS #1234: Account opening form\nTFS #1235: Finacle ACTOPN integration\nTFS #1236: KYC validation",rows:5},
      {k:"next",label:"Next sprint (optional)",ph:"Funding flow, Interest calculation…",rows:2},
    ],sys:S.review,cta:"Generate Script",build:v=>{
      if(!(v.done||"").trim())throw new Error("Please enter completed work or attach a file");
      return `Sprint: ${v.name||"—"}\nAudience: ${v.aud}\nCompleted:\n${v.done}\n${v.next?"Next: "+v.next:""}\n\nWrite 3–5 min demo script.`;
    }},
    sprint:{fields:[
      {k:"backlog",label:"Backlog (story — story points)",ph:"Open Account — 8\nFunding — 5\nInterest Calculation — 13\nClose Account — 5\nCustomer Profile — 3",rows:7},
      {k:"velocity",label:"Team velocity (SP)",t:"in",ph:"30"},
      {k:"sprints",label:"Number of sprints",t:"in",ph:"e.g. 4"},
      {k:"team",label:"Team size",t:"in",ph:"e.g. 6 devs"},
      {k:"constraints",label:"Constraints / notes",ph:"e.g. Open Account before Funding, release Q3",rows:2},
    ],sys:S.sprint,cta:"Plan Sprints",build:v=>{
      if(!(v.backlog||"").trim())throw new Error("Please enter the backlog");
      return `Sprint Planning:\nVelocity: ${v.velocity||30} SP\n${v.sprints?"Sprints: "+v.sprints:""}\n${v.team?"Team: "+v.team:""}\n\nBacklog:\n${v.backlog}\n${v.constraints?"Constraints: "+v.constraints:""}`;
    }},
    dep:{fields:[
      {k:"stories",label:"Stories / features (one per line)",ph:"Customer Profile\nKYC Verification\nOpen Account\nFunding\nInterest Calculation\nClose Account",rows:7},
      {k:"context",label:"Context (optional)",ph:"e.g. Finacle core banking, demand deposit product",rows:2},
    ],sys:S.dep,cta:"Generate Dependency Map",build:v=>{
      if(!(v.stories||"").trim())throw new Error("Please enter stories or features");
      return `Dependency map:\n\n${v.stories}\n\n${v.context?"Context: "+v.context:"Banking mobile app"}`;
    }},
  };

  const pages={
    morning:{t:"Morning Briefing",  s:"Your AI Shadow PO — start every day here",          c:<MorningPage key="morning" onSave={save}/>},
    brain:  {t:"Knowledge Brain",   s:"Ask questions across all your uploaded documents",   c:<BrainPage key="brain" onSave={save}/>},
    chat:   {t:"AI Chat",           s:"Ask anything, attach files, get instant PO help",    c:<ChatPage key="chat" onSave={save}/>},
    ceo:    {t:"Stakeholder → IT",  s:"Translate executive language to IT requirements",    c:<CEOPage key="ceo" onSave={save}/>},
    story:  {t:"User Story",        s:"Generate stories + acceptance criteria",             c:<ToolPage key="story" toolId="story" {...DEFS.story} onSave={save}/>},
    prd:    {t:"PRD",               s:"Product Requirements Document",                     c:<ToolPage key="prd" toolId="prd" {...DEFS.prd} onSave={save}/>},
    tfs:    {t:"TFS Copilot",       s:"Generate TFS/Azure DevOps work items",               c:<ToolPage key="tfs" toolId="tfs" {...DEFS.tfs} onSave={save}/>},
    rice:   {t:"RICE Scoring",      s:"Feature prioritization with AI",                    c:<RicePage key="rice" onSave={save}/>},
    sprint: {t:"Sprint Planner",    s:"Auto-plan sprints from backlog + velocity",          c:<ToolPage key="sprint" toolId="sprint" {...DEFS.sprint} onSave={save}/>},
    dep:    {t:"Dependency Map",    s:"Visualize story and feature dependencies",           c:<ToolPage key="dep" toolId="dep" {...DEFS.dep} onSave={save}/>},
    mtg:    {t:"Meeting Notes",     s:"Summarize and extract action items",                 c:<ToolPage key="mtg" toolId="mtg" {...DEFS.mtg} onSave={save}/>},
    tc:     {t:"Test Cases",        s:"Generate from acceptance criteria",                  c:<ToolPage key="tc" toolId="tc" {...DEFS.tc} onSave={save}/>},
    review: {t:"Sprint Review",     s:"Non-technical demo script for stakeholders",        c:<ToolPage key="review" toolId="review" {...DEFS.review} onSave={save}/>},
    hist:   {t:"History",           s:"All outputs — filterable by tool, date, keyword",   c:<HistoryPage log={log}/>},
  };
  const cur=pages[pg]||pages.morning;
  const grouped=Object.entries(GRPS).map(([g,label])=>({label,items:NAV.filter(n=>n.grp===g)}));
  const brainCount=DB.get("brain_docs",[]).length;

  return(
    <div style={{display:"flex",height:"100vh",background:M.bg,fontFamily:M.font,color:M.text,fontSize:14}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:2px}@keyframes bonce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}button,textarea,select,input{font-family:inherit}textarea::placeholder,input::placeholder{color:rgba(0,0,0,.28)}`}</style>

      {/* ── Sidebar ── */}
      <div style={{width:215,minWidth:215,background:M.white,borderRight:`1px solid ${M.sep}`,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"15px 14px 12px",borderBottom:`1px solid ${M.sep}`,display:"flex",alignItems:"center",gap:10}}>
          <Badge sz={32}/>
          <div>
            <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.02em",color:M.ink}}>PO Toolkit</div>
            <div style={{fontSize:9.5,color:M.text3,marginTop:1}}>M Bank · AI Product OS</div>
          </div>
        </div>
        <nav style={{flex:1,padding:"6px 8px",overflowY:"auto"}}>
          {grouped.map(({label,items})=>(
            <div key={label}>
              <div style={{fontSize:9,fontWeight:700,color:M.text3,letterSpacing:".1em",padding:"9px 9px 3px",textTransform:"uppercase"}}>{label}</div>
              {items.map(n=>{
                const on=pg===n.id;
                return(
                  <div key={n.id} onClick={()=>setPg(n.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:11,cursor:"pointer",marginBottom:1,background:on?M.tealLight:"transparent",transition:"background .12s"}}>
                    <span style={{fontSize:14}}>{n.e}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:on?700:500,color:on?M.tealDeep:M.text,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.l}</div>
                      <div style={{fontSize:9.5,color:on?M.tealDeep:M.text3,marginTop:.5}}>{n.s}</div>
                    </div>
                    {n.id==="hist"&&log.length>0&&<span style={{fontSize:9,fontWeight:700,background:M.ink,color:M.white,padding:"1px 5px",borderRadius:999,flexShrink:0}}>{log.length}</span>}
                    {n.id==="brain"&&brainCount>0&&<span style={{fontSize:9,fontWeight:700,background:M.teal,color:M.white,padding:"1px 5px",borderRadius:999,flexShrink:0}}>{brainCount}</span>}
                    {on&&n.id!=="hist"&&n.id!=="brain"&&<div style={{width:5,height:5,borderRadius:"50%",background:M.teal,flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{padding:"8px 10px",borderTop:`1px solid ${M.sep}`}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",background:M.tealLight,borderRadius:10}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:M.teal,boxShadow:`0 0 5px ${M.teal}`,flexShrink:0}}/>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:M.tealDeep}}>Claude Sonnet 4</div>
              <div style={{fontSize:9.5,color:M.tealDeep,opacity:.7}}>Ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"11px 22px",borderBottom:`1px solid ${M.sep}`,background:M.white,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,letterSpacing:"-.015em",color:M.ink}}>{cur.t}</div>
            <div style={{fontSize:11,color:M.text3,marginTop:1}}>{cur.s}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:M.text3}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:M.teal,display:"inline-block"}}/>AI-powered
          </div>
        </div>
        <div style={{flex:1,overflow:"hidden"}}>{cur.c}</div>
      </div>
    </div>
  );
}
