import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import { Package, Wrench, Users, ArrowDownToLine, ArrowUpFromLine, Search, Plus, LogOut, X, RefreshCw, ChevronDown } from 'lucide-react'
import './index.css'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const ALLOWED_EMAIL = 'htehssssss@gmail.com'
const LOGIN_USERNAME = 'keker'

type Item = { id:string; name:string; spec:string; category:string; unit:string; stock:number; safety_stock:number; location:string; note:string }
type Person = { id:string; name:string; department:string; title:string; active:boolean }
type Movement = { id:string; type:string; date:string; item_id:string; item_name:string; quantity:number; person:string; department:string; source:string; note:string }
type Tool = { id:string; name:string; spec:string; serial:string; holder:string; department:string; issue_date:string; status:string; note:string }
type ToolMovement = { id:string; type:string; date:string; tool_id:string; tool_name:string; serial:string; person:string; department:string; note:string }

type Tab = 'dashboard'|'items'|'out'|'in'|'movements'|'people'|'tools'|'account'

function App(){
  const [session,setSession]=useState<any>(null)
  const [now,setNow]=useState(new Date())
  const [recovering,setRecovering]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [tab,setTab]=useState<Tab>('dashboard')
  const [openMenu,setOpenMenu]=useState<'entry'|'inventory'|'settings'|null>(null)
  const [items,setItems]=useState<Item[]>([])
  const [people,setPeople]=useState<Person[]>([])
  const [movements,setMovements]=useState<Movement[]>([])
  const [tools,setTools]=useState<Tool[]>([])
  const [toolMovements,setToolMovements]=useState<ToolMovement[]>([])
  const [modal,setModal]=useState<string|null>(null)

  const load=async()=>{
    setLoading(true); setError('')
    const [a,b,c,d,e]=await Promise.all([
      supabase.from('items').select('*').order('name'),
      supabase.from('people').select('*').order('name'),
      supabase.from('movements').select('*').order('date',{ascending:false}),
      supabase.from('tools').select('*').order('name'),
      supabase.from('tool_movements').select('*').order('date',{ascending:false})
    ])
    const first=[a,b,c,d,e].find(x=>x.error)
    if(first?.error) setError(first.error.message)
    setItems((a.data||[]) as Item[]); setPeople((b.data||[]) as Person[]); setMovements((c.data||[]) as Movement[]); setTools((d.data||[]) as Tool[]); setToolMovements((e.data||[]) as ToolMovement[])
    setLoading(false)
  }

  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)}); const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{if(event==='PASSWORD_RECOVERY')setRecovering(true);setSession(s)}); return ()=>subscription.unsubscribe() },[])
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(timer)},[])
  useEffect(()=>{ if(session) { if(session.user.email?.toLowerCase()!==ALLOWED_EMAIL) { setError('此帳號沒有系統使用權限'); supabase.auth.signOut(); return } load() } },[session])

  if(recovering) return <ResetPassword onDone={async()=>{await supabase.auth.signOut();setRecovering(false);setSession(null)}}/>
  if(!session) return <Login loading={loading} error={error}/>
  return <div className="appShell">
    <header className="siteNav">
      <div className="brand"><div className="brandMark">管</div><div><b>管理部｜庫存管理</b></div></div>
      <div className="dateTime" aria-label="今日時間"><span>{now.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'})}</span><strong>{now.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}</strong></div>
      <nav className="topNavGroups">
        <button className={tab==='dashboard'?'navGroup topDirect active':'navGroup topDirect'} onClick={()=>{setTab('dashboard');setOpenMenu(null)}}>總覽</button>
        <div className="topNavGroup">
          <button className="navGroup" aria-expanded={openMenu==='entry'} onClick={()=>setOpenMenu(openMenu==='entry'?null:'entry')}><span>登入</span><ChevronDown size={15}/></button>
          {openMenu==='entry'&&<div className="navSection">
            <Nav active={tab==='out'} icon={<ArrowUpFromLine size={18}/>} text="領用" onClick={()=>{setTab('out');setOpenMenu(null)}}/>
            <Nav active={tab==='in'} icon={<ArrowDownToLine size={18}/>} text="退還／入庫" onClick={()=>{setTab('in');setOpenMenu(null)}}/>
          </div>}
        </div>
        <div className="topNavGroup">
          <button className="navGroup" aria-expanded={openMenu==='inventory'} onClick={()=>setOpenMenu(openMenu==='inventory'?null:'inventory')}><span>庫存</span><ChevronDown size={15}/></button>
          {openMenu==='inventory'&&<div className="navSection">
            <Nav active={tab==='items'} icon={<Package size={18}/>} text="文具庫存" onClick={()=>{setTab('items');setOpenMenu(null)}}/>
            <Nav active={tab==='tools'} icon={<Wrench size={18}/>} text="個人工具庫存" onClick={()=>{setTab('tools');setOpenMenu(null)}}/>
          </div>}
        </div>
        <button className={tab==='movements'?'navGroup topDirect active':'navGroup topDirect'} onClick={()=>{setTab('movements');setOpenMenu(null)}}>紀錄查詢</button>
        <div className="topNavGroup">
          <button className="navGroup" aria-expanded={openMenu==='settings'} onClick={()=>setOpenMenu(openMenu==='settings'?null:'settings')}><span>設定</span><ChevronDown size={15}/></button>
          {openMenu==='settings'&&<div className="navSection navSectionRight">
            <Nav active={tab==='people'} icon={<Users size={18}/>} text="人員管理" onClick={()=>{setTab('people');setOpenMenu(null)}}/>
            <Nav active={tab==='account'} icon={<Users size={18}/>} text="帳號管理" onClick={()=>{setTab('account');setOpenMenu(null)}}/>
          </div>}
        </div>
      </nav>
      <button className="ghostBtn navLogout" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/>登出</button>
    </header>
    <main className="main">
      <header className="topbar"><div><h1>{title(tab)}</h1></div><div className="topActions"><button className="iconBtn" onClick={load} title="重新整理"><RefreshCw size={18}/></button>{['items','people','tools','in','out'].includes(tab)&&<button className="primary" onClick={()=>setModal(tab==='items'?'item':tab==='people'?'person':tab==='tools'?'tool':tab==='in'?'in':'issue')}><Plus size={17}/>新增</button>}</div></header>
      {error&&<div className="notice error">{error}</div>}
      {loading?<div className="loading">載入中…</div>:<>
        {tab==='dashboard'&&<Dashboard items={items} people={people} tools={tools} movements={movements} toolMovements={toolMovements}/>} 
        {tab==='items'&&<ItemsPage items={items} onAdd={()=>setModal('item')}/>} 
        {tab==='out'&&<IssuePage items={items} tools={tools} people={people} onDone={load}/>} 
        {tab==='in'&&<ReceivePage items={items} onDone={load}/>} 
        {tab==='movements'&&<MovementsPage movements={movements} toolMovements={toolMovements}/>} 
        {tab==='people'&&<PeoplePage people={people} movements={movements} toolMovements={toolMovements} onAdd={()=>setModal('person')}/>} 
        {tab==='tools'&&<ToolsPage tools={tools} onAdd={()=>setModal('tool')} onDone={load}/>} 
        {tab==='account'&&<AccountPage/>}
      </>}
      {modal==='item'&&<ItemModal onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='person'&&<PersonModal onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='tool'&&<ToolModal people={people} onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='in'&&<ReceiveModal items={items} onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='issue'&&<IssueModal items={items} tools={tools} people={people} onClose={()=>setModal(null)} onDone={load}/>} 
    </main><div className="copyright">© keker</div>
  </div>
}

function title(t:Tab){return ({dashboard:'總覽',items:'文具庫存',out:'領用',in:'退還／入庫',movements:'紀錄查詢',people:'人員管理',tools:'個人工具庫存',account:'帳號管理'} as any)[t]}
function Nav({active,icon,text,onClick}:{active:boolean;icon:any;text:string;onClick:()=>void}){return <button className={active?'nav active':'nav'} onClick={onClick}>{icon}<span>{text}</span></button>}
function Card({label,value,sub}:{label:string;value:any;sub?:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}<i aria-hidden="true"/></div>}
function Dashboard({items,people,tools,movements,toolMovements}:{items:Item[];people:Person[];tools:Tool[];movements:Movement[];toolMovements:ToolMovement[]}){const low=items.filter(x=>x.stock<=x.safety_stock).length; return <div className="content"><div className="grid4"><Card label="文具品項" value={items.length}/><Card label="文具庫存" value={items.reduce((s,x)=>s+Number(x.stock||0),0)}/><Card label="人員" value={people.filter(x=>x.active).length}/><Card label="個人工具" value={tools.length}/></div><div className="panel"><div className="panelTitle"><b>庫存提醒</b><span>{low?`有 ${low} 項低於安全庫存`:'目前沒有低庫存品項'}</span></div>{low?<Table rows={items.filter(x=>x.stock<=x.safety_stock).map(x=><tr key={x.id}><td>{x.name}</td><td>{x.spec}</td><td>{x.stock} {x.unit}</td><td>{x.safety_stock} {x.unit}</td></tr>)} headers={['品項','規格','目前庫存','安全庫存']}/>:<div className="empty">目前庫存狀況正常</div>}</div></div>}
function ItemsPage({items,onAdd}:{items:Item[];onAdd:()=>void}){const [q,setQ]=useState('');const rows=items.filter(x=>(x.name+x.spec+x.category).toLowerCase().includes(q.toLowerCase()));return <div className="content"><Toolbar q={q} setQ={setQ} add={onAdd} label="新增文具"/><Table headers={['品項','規格','類別','庫存','安全庫存','位置']} rows={rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.spec||'-'}</td><td>{x.category||'-'}</td><td>{x.stock} {x.unit}</td><td>{x.safety_stock} {x.unit}</td><td>{x.location||'-'}</td></tr>)}/></div>}
function IssuePage({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){return <div className="content"><IssueForm items={items} tools={tools} people={people} onDone={onDone}/></div>}
function IssueForm({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){const [kind,setKind]=useState<'文具'|'個人工具'>('文具'); const [item,setItem]=useState('');const [tool,setTool]=useState('');const [person,setPerson]=useState('');const [dept,setDept]=useState('');const [qty,setQty]=useState(1);const [note,setNote]=useState('');const [msg,setMsg]=useState(''); const submit=async()=>{setMsg('');if(!person)return setMsg('請選擇領用人員');let r;if(kind==='文具')r=await supabase.rpc('issue_stationery',{p_item_id:item,p_quantity:qty,p_person:person,p_department:dept,p_note:note});else r=await supabase.rpc('move_tool',{p_tool_id:tool,p_type:'out',p_person:person,p_department:dept,p_note:note});if(r.error)setMsg(r.error.message);else{setMsg('領用完成');setItem('');setTool('');setNote('');setQty(1);onDone()}};return <div className="panel formPanel"><h2>快速領用</h2><div className="seg"><button className={kind==='文具'?'selected':''} onClick={()=>setKind('文具')}>文具</button><button className={kind==='個人工具'?'selected':''} onClick={()=>setKind('個人工具')}>個人工具</button></div><div className="formGrid">{kind==='文具'?<><Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}｜{x.spec}｜庫存 {x.stock}</option>)}</select></Field><Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field></>:<Field label="個人工具"><select value={tool} onChange={e=>setTool(e.target.value)}><option value="">請選擇</option>{tools.filter(x=>x.status!=='已領用').map(x=><option key={x.id} value={x.id}>{x.name}｜{x.serial}｜{x.spec}</option>)}</select></Field>}<Field label="領用人員"><select value={person} onChange={e=>{setPerson(e.target.value);const p=people.find(x=>x.name===e.target.value);setDept(p?.department||'')}}><option value="">請選擇</option>{people.filter(x=>x.active).map(x=><option key={x.id} value={x.name}>{x.name}｜{x.department}</option>)}</select></Field><Field label="部門"><input value={dept} onChange={e=>setDept(e.target.value)}/></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{msg&&<div className="notice">{msg}</div>}<button className="primary wide" disabled={!item&&!tool} onClick={submit}>確認領用</button></div>}
function ReceivePage({items,onDone}:{items:Item[];onDone:()=>void}){return <div className="content"><ReceiveForm items={items} onDone={onDone}/></div>}
function ReceiveForm({items,onDone}:{items:Item[];onDone:()=>void}){const [item,setItem]=useState('');const [qty,setQty]=useState(1);const [source,setSource]=useState('');const [note,setNote]=useState('');const [msg,setMsg]=useState('');const submit=async()=>{const r=await supabase.rpc('receive_stationery',{p_item_id:item,p_quantity:qty,p_source:source,p_note:note});setMsg(r.error?.message||'入庫完成');if(!r.error){setItem('');setQty(1);onDone()}};return <div className="panel formPanel"><h2>入庫登記</h2><div className="formGrid"><Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}｜{x.spec}</option>)}</select></Field><Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><Field label="來源"><input value={source} onChange={e=>setSource(e.target.value)} placeholder="採購／退回…"/></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{msg&&<div className="notice">{msg}</div>}<button className="primary wide" disabled={!item} onClick={submit}>確認入庫</button></div>}
function MovementsPage({movements,toolMovements}:{movements:Movement[];toolMovements:ToolMovement[]}){const rows=[...movements.map(x=>({date:x.date,cat:'文具',item:x.item_name,spec:'',qty:x.quantity,person:x.person,dept:x.department,action:x.type==='out'?'領用':'入庫',note:x.note,id:'s'+x.id})),...toolMovements.map(x=>({date:x.date,cat:'個人工具',item:x.tool_name,spec:x.serial,qty:1,person:x.person,dept:x.department,action:x.type==='out'?'領用':'歸還',note:x.note,id:'t'+x.id}))].sort((a,b)=>b.date.localeCompare(a.date));const [q,setQ]=useState('');const filtered=rows.filter(x=>(x.item+x.spec+x.person+x.dept+x.cat).toLowerCase().includes(q.toLowerCase()));return <div className="content"><Toolbar q={q} setQ={setQ}/><Table headers={['日期','類別','品項','規格／序號','數量','人員','部門','動作','備註']} rows={filtered.map(x=><tr key={x.id}><td>{x.date}</td><td>{x.cat}</td><td>{x.item}</td><td>{x.spec||'-'}</td><td>{x.qty}</td><td>{x.person||'-'}</td><td>{x.dept||'-'}</td><td>{x.action}</td><td>{x.note||'-'}</td></tr>)}/></div>}
function PeoplePage({people,movements,toolMovements,onAdd}:{people:Person[];movements:Movement[];toolMovements:ToolMovement[];onAdd:()=>void}){const [q,setQ]=useState('');const [selected,setSelected]=useState('');const p=people.find(x=>x.id===selected);const rows=[...movements.filter(x=>p&&x.person===p.name).map(x=>({date:x.date,cat:'文具',item:x.item_name,spec:'',qty:x.quantity,action:x.type==='out'?'領用':'入庫'})),...toolMovements.filter(x=>p&&x.person===p.name).map(x=>({date:x.date,cat:'個人工具',item:x.tool_name,spec:x.serial,qty:1,action:x.type==='out'?'領用':'歸還'}))];return <div className="content"><Toolbar q={q} setQ={setQ} add={onAdd} label="新增人員"/><Table headers={['姓名','部門','職稱','狀態','領用／異動']}/><div className="panel"><table><thead><tr><th>姓名</th><th>部門</th><th>職稱</th><th>狀態</th><th>操作</th></tr></thead><tbody>{people.filter(x=>(x.name+x.department+x.title).includes(q)).map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.department}</td><td>{x.title}</td><td>{x.active?'在職':'停用'}</td><td><button className="smallBtn" onClick={()=>setSelected(x.id)}>查看領用紀錄</button></td></tr>)}</tbody></table></div>{p&&<div className="panel"><div className="panelTitle"><b>{p.name}｜人員領用紀錄</b></div><Table headers={['日期','類別','品項','規格／序號','數量','動作']} rows={rows.map((x,i)=><tr key={i}><td>{x.date}</td><td>{x.cat}</td><td>{x.item}</td><td>{x.spec||'-'}</td><td>{x.qty}</td><td>{x.action}</td></tr>)}/></div>}</div>}
function ToolsPage({tools,onAdd,onDone}:{tools:Tool[];onAdd:()=>void;onDone:()=>void}){const [q,setQ]=useState('');const move=async(t:Tool,type:'out'|'in')=>{if(type==='out')return;const r=await supabase.rpc('move_tool',{p_tool_id:t.id,p_type:'in',p_person:'',p_department:'',p_note:''});if(!r.error)onDone()};return <div className="content"><Toolbar q={q} setQ={setQ} add={onAdd} label="新增工具"/><Table headers={['工具名稱','規格','序號／編號','保管人','部門','領用日期','狀態','備註']} rows={tools.filter(x=>(x.name+x.spec+x.serial+x.holder+x.department).toLowerCase().includes(q.toLowerCase())).map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.spec}</td><td>{x.serial}</td><td>{x.holder||'-'}</td><td>{x.department||'-'}</td><td>{x.issue_date||'-'}</td><td>{x.status||'在庫'}</td><td>{x.note||'-'} {x.status==='已領用'&&<button className="smallBtn" onClick={()=>move(x,'in')}>歸還</button>}</td></tr>)}/></div>}
function AccountPage(){const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const send=async()=>{setBusy(true);setMsg('');const {error}=await supabase.auth.resetPasswordForEmail(ALLOWED_EMAIL,{redirectTo:window.location.origin});setBusy(false);setMsg(error?'無法寄出重設郵件，請稍後再試':'密碼重設郵件已寄出，請於 60 分鐘內開啟信件中的連結')};return <div className="content"><div className="panel formPanel accountPanel"><h2>帳號管理</h2><div className="accountRow"><span>登入帳號</span><b>{LOGIN_USERNAME}</b></div><div className="accountRow"><span>綁定信箱</span><b>{ALLOWED_EMAIL}</b></div>{msg&&<div className={msg.includes('已寄出')?'notice':'notice error'}>{msg}</div>}<button className="primary" onClick={send} disabled={busy}>{busy?'寄送中…':'寄送密碼重設信'}</button></div></div>}
function Toolbar({q,setQ,add,label='新增'}:{q:string;setQ:(s:string)=>void;add?:()=>void;label?:string}){return <div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋…"/></div>{add&&<button className="primary" onClick={add}><Plus size={17}/>{label}</button>}</div>}
function Field({label,children}:{label:string;children:any}){return <label className="field"><span>{label}</span>{children}</label>}
function Table({headers,rows=[]}:{headers:string[];rows?:any[]}){return <div className="panel tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows:<tr><td colSpan={headers.length} className="empty">沒有資料</td></tr>}</tbody></table></div>}
function Login({loading,error}:{loading:boolean;error:string}){
  const [username,setUsername]=useState(LOGIN_USERNAME)
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const [resetting,setResetting]=useState(false)
  const login=async()=>{
    setMsg('')
    if(username.trim().toLowerCase()!==LOGIN_USERNAME){setMsg('帳號或密碼錯誤');return}
    setBusy(true)
    const r=await supabase.auth.signInWithPassword({email:ALLOWED_EMAIL,password})
    setBusy(false)
    if(r.error){setMsg('帳號或密碼錯誤')}
  }
  const sendReset=async()=>{
    setMsg('');setResetting(true)
    const {error}=await supabase.auth.resetPasswordForEmail(ALLOWED_EMAIL,{redirectTo:window.location.origin})
    setResetting(false)
    setMsg(error?'無法寄出重設郵件，請稍後再試':'密碼重設郵件已寄出，請於 60 分鐘內開啟信件中的連結')
  }
  return <div className="login"><section className="loginHero"><div className="loginBrand"><div className="brandMark big">K</div><div><b>© keker｜庫存管理</b></div></div><div className="officeScene" aria-hidden="true"><div className="sceneShelf"><i/><i/><i/><i/></div><div className="sceneDesk"><span/><b/><em/></div><div className="scenePlant"><i/><i/><i/></div><div className="sceneBox">文具</div></div><div className="heroCopy"><span>SMART OFFICE</span><h2>讓日常用品管理<br/>更簡單、更清楚</h2><p>掌握庫存、領用與工具流向，打造井然有序的工作環境。</p></div></section><section className="loginPanel"><div className="loginCard"><span className="eyebrow">WELCOME BACK</span><h1>登入管理系統</h1><p>請輸入帳號與密碼</p>{error&&<div className="notice error">{error}</div>}<Field label="帳號"><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" disabled={busy}/></Field><Field label="密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')login()}} autoComplete="current-password" disabled={busy}/></Field>{msg&&<div className={msg.includes('已寄出')?'notice':'notice error'}>{msg}</div>}<button className="primary wide" onClick={login} disabled={loading||busy}>{busy?'登入中…':'登入系統'}</button><button className="textBtn" onClick={sendReset} disabled={resetting}>{resetting?'寄送中…':'忘記密碼？'}</button><small>辦公室文具與個人工具管理平台</small></div></section></div>
}
function ResetPassword({onDone}:{onDone:()=>void}){
  const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('')
  const save=async()=>{setMsg('');if(password.length<8)return setMsg('新密碼至少需要 8 個字元');if(password!==confirm)return setMsg('兩次輸入的密碼不一致');setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);if(error)return setMsg(error.message);setMsg('密碼已更新成功');setTimeout(onDone,1200)}
  return <div className="resetScreen"><div className="resetCard"><div className="brandMark big">辦</div><span className="eyebrow">PASSWORD RECOVERY</span><h1>設定新密碼</h1><p>請輸入新的登入密碼，完成後即可使用帳號 keker 登入。</p><Field label="新密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="至少 8 個字元"/></Field><Field label="確認新密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')save()}} autoComplete="new-password"/></Field>{msg&&<div className={msg.includes('成功')?'notice':'notice error'}>{msg}</div>}<button className="primary wide" onClick={save} disabled={busy}>{busy?'更新中…':'更新密碼'}</button></div></div>
}
function Modal({title,children,onClose}:{title:string;children:any;onClose:()=>void}){return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><h2>{title}</h2><button className="iconBtn" onClick={onClose}><X size={19}/></button></div>{children}</div></div>}
function ItemModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({name:'',spec:'',category:'',unit:'個',stock:0,safety_stock:0,location:'',note:''});const save=async()=>{const r=await supabase.from('items').insert({...f,owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增文具" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','spec','category','unit','stock','safety_stock','location','note']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function PersonModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({name:'',department:'',title:'',active:true});const save=async()=>{const r=await supabase.from('people').insert({...f,owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增人員" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','department','title']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function ToolModal({onClose,onDone}:{people:Person[];onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({name:'',spec:'',serial:'',holder:'',department:'',issue_date:'',status:'在庫',note:''});const save=async()=>{const r=await supabase.from('tools').insert({...f,owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增個人工具" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','spec','serial','holder','department','issue_date','status','note']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function ReceiveModal({items,onClose,onDone}:{items:Item[];onClose:()=>void;onDone:()=>void}){const [item,setItem]=useState('');const [qty,setQty]=useState(1);const save=async()=>{const r=await supabase.rpc('receive_stationery',{p_item_id:item,p_quantity:qty,p_source:'',p_note:''});if(!r.error){onClose();onDone()}};return <Modal title="入庫登記" onClose={onClose}><Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><button className="primary wide" onClick={save}>確認入庫</button></Modal>}
function IssueModal({items,tools,people,onClose,onDone}:{items:Item[];tools:Tool[];people:Person[];onClose:()=>void;onDone:()=>void}){return <Modal title="快速領用" onClose={onClose}><IssueForm items={items} tools={tools} people={people} onDone={()=>{onClose();onDone()}}/></Modal>}
function FormFields({f,setF,fields}:{f:any;setF:(x:any)=>void;fields:string[]}){const labels:any={name:'名稱',spec:'規格',category:'類別',unit:'單位',stock:'庫存',safety_stock:'安全庫存',location:'位置',note:'備註',department:'部門',title:'職稱',serial:'序號／編號',holder:'保管人',issue_date:'領用日期',status:'狀態'};return <div className="formGrid">{fields.map(k=><Field key={k} label={labels[k]||k}><input type={['stock','safety_stock'].includes(k)?'number':k==='issue_date'?'date':'text'} value={f[k]??''} onChange={e=>setF({...f,[k]:['stock','safety_stock'].includes(k)?Number(e.target.value):e.target.value})}/></Field>)}</div>}

createRoot(document.getElementById('root')!).render(<App/>)
