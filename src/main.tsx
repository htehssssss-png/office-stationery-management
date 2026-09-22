import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import { Package, Wrench, Users, ArrowDownToLine, ArrowUpFromLine, Search, Plus, LogOut, X, RefreshCw, ChevronDown } from 'lucide-react'
import './index.css'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const registrationClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const ALLOWED_EMAIL = 'htehssssss@gmail.com'
const LOGIN_USERNAME = 'keker'

type Item = { id:string; name:string; spec:string; category:string; unit:string; stock:number; safety_stock:number; location:string; note:string }
type Person = { id:string; name:string; department:string; title:string; active:boolean }
type Movement = { id:string; type:string; date:string; item_id:string; item_name:string; quantity:number; person:string; department:string; source:string; note:string }
type Tool = { id:string; name:string; spec:string; category:string; unit:string; stock:number; safety_stock:number; location:string; serial:string; holder:string; department:string; issue_date:string; status:string; note:string }
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
  const isAdmin=session?.user?.email?.toLowerCase()===ALLOWED_EMAIL

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
  useEffect(()=>{ if(session) load() },[session])

  if(recovering) return <ResetPassword onDone={async()=>{await supabase.auth.signOut();setRecovering(false);setSession(null)}}/>
  if(!session) return <Login loading={loading} error={error}/>
  return <div className="appShell">
    <header className="siteNav">
      <div className="brand"><div className="brandMark">HT</div><div><b>管理部｜庫存管理</b></div></div>
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
            {isAdmin&&<Nav active={tab==='account'} icon={<Users size={18}/>} text="帳號管理" onClick={()=>{setTab('account');setOpenMenu(null)}}/>}
          </div>}
        </div>
      </nav>
      <button className="accountChip" onClick={()=>setModal('password')} title="修改自己的密碼">{isAdmin?'keker':session.user.email}</button>
      <button className="ghostBtn navLogout" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/>登出</button>
    </header>
    <main className="main">
      <header className="topbar"><div><h1>{title(tab)}</h1></div><div className="topActions"><button className="iconBtn" onClick={load} title="重新整理"><RefreshCw size={18}/></button>{['people','in','out'].includes(tab)&&<button className="primary" onClick={()=>setModal(tab==='people'?'person':tab==='in'?'in':'issue')}><Plus size={17}/>新增</button>}</div></header>
      {error&&<div className="notice error">{error}</div>}
      {loading?<div className="loading">載入中…</div>:<>
        {tab==='dashboard'&&<Dashboard items={items} people={people} tools={tools} movements={movements} toolMovements={toolMovements}/>} 
        {tab==='items'&&<ItemsInventoryPage items={items} onAdd={()=>setModal('item')} onDone={load}/>} 
        {tab==='out'&&<IssuePage items={items} tools={tools} people={people} onDone={load}/>} 
        {tab==='in'&&<ReceivePage items={items} onDone={load}/>} 
        {tab==='movements'&&<MovementsPage movements={movements} toolMovements={toolMovements}/>} 
        {tab==='people'&&<PeoplePage people={people} movements={movements} toolMovements={toolMovements} onAdd={()=>setModal('person')} onDone={load}/>} 
        {tab==='tools'&&<ToolsInventoryPage tools={tools} onAdd={()=>setModal('tool')} onDone={load}/>} 
        {tab==='account'&&isAdmin&&<AdminAccountsPage/>}
      </>}
      {modal==='item'&&<ItemModal onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='person'&&<PersonModal onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='tool'&&<InventoryToolModal onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='in'&&<ReceiveModal items={items} onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='issue'&&<IssueModal items={items} tools={tools} people={people} onClose={()=>setModal(null)} onDone={load}/>} 
      {modal==='password'&&<PasswordModal email={session.user.email} onClose={()=>setModal(null)}/>} 
    </main><div className="copyright">© keker</div>
  </div>
}

function title(t:Tab){return ({dashboard:'總覽',items:'文具庫存',out:'領用',in:'退還／入庫',movements:'紀錄查詢',people:'人員管理',tools:'個人工具庫存',account:'帳號管理'} as any)[t]}
function Nav({active,icon,text,onClick}:{active:boolean;icon:any;text:string;onClick:()=>void}){return <button className={active?'nav active':'nav'} onClick={onClick}>{icon}<span>{text}</span></button>}
function Card({label,value,sub}:{label:string;value:any;sub?:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}<i aria-hidden="true"/></div>}
function Dashboard({items}:{items:Item[];people:Person[];tools:Tool[];movements:Movement[];toolMovements:ToolMovement[]}){const low=items.filter(x=>x.stock<=x.safety_stock).length; return <div className="content"><div className="grid2"><Card label="文具品項" value={items.length}/><Card label="文具庫存" value={items.reduce((s,x)=>s+Number(x.stock||0),0)}/></div><div className="panel"><div className="panelTitle"><b>庫存提醒</b><span>{low?`有 ${low} 項低於安全庫存`:'目前沒有低庫存品項'}</span></div>{low?<Table rows={items.filter(x=>x.stock<=x.safety_stock).map(x=><tr key={x.id}><td>{x.name}</td><td>{x.spec}</td><td>{x.stock} {x.unit}</td><td>{x.safety_stock} {x.unit}</td></tr>)} headers={['品項','規格','目前庫存','安全庫存']}/>:<div className="empty">目前庫存狀況正常</div>}</div></div>}
function ItemsPage({items,onDone}:{items:Item[];onDone:()=>void}){const [q,setQ]=useState('');const [msg,setMsg]=useState('');const rows=items.filter(x=>(x.name+x.spec+x.category).toLowerCase().includes(q.toLowerCase()));const template=()=>{const csv='名稱,規格,類別,單位,庫存,安全庫存,位置,備註\n原子筆,0.5mm,書寫用品,支,100,20,A-01,藍色';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='文具批次新增範本.csv';a.click();URL.revokeObjectURL(a.href)};const importFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setMsg('');if(!file.name.toLowerCase().endsWith('.csv')){setMsg('請使用下載的 Excel 相容 CSV 範本');return}const text=await file.text();const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(Boolean);const data=lines.slice(1).map(line=>{const c=line.split(',').map(x=>x.trim());return {name:c[0],spec:c[1]||'',category:c[2]||'',unit:c[3]||'個',stock:Number(c[4]||0),safety_stock:Number(c[5]||0),location:c[6]||'',note:c[7]||''}}).filter(x=>x.name);if(!data.length){setMsg('檔案內沒有可匯入的資料');return}const user=(await supabase.auth.getUser()).data.user;const {error}=await supabase.from('items').insert(data.map(x=>({...x,owner_id:user!.id})));setMsg(error?error.message:`已批次新增 ${data.length} 筆文具`);if(!error)onDone();e.target.value=''};const receive=async(x:Item)=>{const raw=window.prompt(`請輸入「${x.name}」進貨數量`,'1');if(raw===null)return;const qty=Number(raw);if(!Number.isFinite(qty)||qty<=0)return setMsg('請輸入正確的進貨數量');const r=await supabase.rpc('receive_stationery',{p_item_id:x.id,p_quantity:qty,p_source:'進貨',p_note:''});setMsg(r.error?.message||`${x.name} 已進貨 ${qty} ${x.unit}`);if(!r.error)onDone()};return <div className="content"><div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋…"/></div><button className="smallBtn" onClick={template}>下載 Excel 範本</button><label className="primary uploadBtn">批次新增<input type="file" accept=".csv,text/csv" onChange={importFile}/></label></div>{msg&&<div className={msg.includes('已')?'notice':'notice error'}>{msg}</div>}<Table headers={['品項','規格','類別','庫存','安全庫存','位置','操作']} rows={rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.spec||'-'}</td><td>{x.category||'-'}</td><td>{x.stock} {x.unit}</td><td>{x.safety_stock} {x.unit}</td><td>{x.location||'-'}</td><td><button className="smallBtn" onClick={()=>receive(x)}>進貨</button></td></tr>)}/></div>}
function IssuePage({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){return <div className="content"><IssueForm items={items} tools={tools} people={people} onDone={onDone}/></div>}
function IssueForm({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){const [kind,setKind]=useState<'文具'|'個人工具'>('文具'); const [item,setItem]=useState('');const [tool,setTool]=useState('');const [person,setPerson]=useState('');const [dept,setDept]=useState('');const [qty,setQty]=useState(1);const [note,setNote]=useState('');const [msg,setMsg]=useState(''); const submit=async()=>{setMsg('');if(!person)return setMsg('請選擇領用人員');let r;if(kind==='文具')r=await supabase.rpc('issue_stationery',{p_item_id:item,p_quantity:qty,p_person:person,p_department:dept,p_note:note});else r=await supabase.rpc('move_tool',{p_tool_id:tool,p_type:'out',p_person:person,p_department:dept,p_note:`${note}${note?'；':''}數量：${qty}`});if(r.error)setMsg(r.error.message);else{setMsg('領用完成');setItem('');setTool('');setNote('');setQty(1);onDone()}};return <div className="panel formPanel"><h2>領用</h2><div className="seg"><button className={kind==='文具'?'selected':''} onClick={()=>setKind('文具')}>文具</button><button className={kind==='個人工具'?'selected':''} onClick={()=>setKind('個人工具')}>個人工具</button></div><div className="formGrid">{kind==='文具'?<Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}｜{x.spec}｜庫存 {x.stock}</option>)}</select></Field>:<Field label="個人工具"><select value={tool} onChange={e=>setTool(e.target.value)}><option value="">請選擇</option>{tools.filter(x=>x.status!=='已領用').map(x=><option key={x.id} value={x.id}>{x.name}｜{x.serial}｜{x.spec}</option>)}</select></Field>}<Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><Field label="領用人員"><select value={person} onChange={e=>{setPerson(e.target.value);const p=people.find(x=>x.name===e.target.value);setDept(p?.department||'')}}><option value="">請選擇</option>{people.filter(x=>x.active).map(x=><option key={x.id} value={x.name}>{x.name}｜{x.department}</option>)}</select></Field><Field label="部門"><input value={dept} onChange={e=>setDept(e.target.value)}/></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{msg&&<div className="notice">{msg}</div>}<button className="primary wide" disabled={!item&&!tool} onClick={submit}>確認領用</button></div>}
function ReceivePage({items,onDone}:{items:Item[];onDone:()=>void}){return <div className="content"><ReceiveForm items={items} onDone={onDone}/></div>}
function ReceiveForm({items,onDone}:{items:Item[];onDone:()=>void}){const [item,setItem]=useState('');const [qty,setQty]=useState(1);const [source,setSource]=useState('');const [note,setNote]=useState('');const [msg,setMsg]=useState('');const submit=async()=>{const r=await supabase.rpc('receive_stationery',{p_item_id:item,p_quantity:qty,p_source:source,p_note:note});setMsg(r.error?.message||'入庫完成');if(!r.error){setItem('');setQty(1);onDone()}};return <div className="panel formPanel"><h2>入庫登記</h2><div className="formGrid"><Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}｜{x.spec}</option>)}</select></Field><Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><Field label="來源"><input value={source} onChange={e=>setSource(e.target.value)} placeholder="採購／退回…"/></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{msg&&<div className="notice">{msg}</div>}<button className="primary wide" disabled={!item} onClick={submit}>確認入庫</button></div>}
function MovementsPage({movements,toolMovements}:{movements:Movement[];toolMovements:ToolMovement[]}){const rows=[...movements.map(x=>({date:x.date,cat:'文具',item:x.item_name,spec:'',qty:x.quantity,person:x.person,dept:x.department,action:x.type==='out'?'領用':'入庫',note:x.note,id:'s'+x.id})),...toolMovements.map(x=>({date:x.date,cat:'個人工具',item:x.tool_name,spec:x.serial,qty:1,person:x.person,dept:x.department,action:x.type==='out'?'領用':'歸還',note:x.note,id:'t'+x.id}))].sort((a,b)=>b.date.localeCompare(a.date));const [q,setQ]=useState('');const filtered=rows.filter(x=>(x.item+x.spec+x.person+x.dept+x.cat).toLowerCase().includes(q.toLowerCase()));return <div className="content"><Toolbar q={q} setQ={setQ}/><Table headers={['日期','類別','品項','規格／序號','數量','人員','部門','動作','備註']} rows={filtered.map(x=><tr key={x.id}><td>{x.date}</td><td>{x.cat}</td><td>{x.item}</td><td>{x.spec||'-'}</td><td>{x.qty}</td><td>{x.person||'-'}</td><td>{x.dept||'-'}</td><td>{x.action}</td><td>{x.note||'-'}</td></tr>)}/></div>}
function PeoplePage({people,onAdd,onDone}:{people:Person[];movements:Movement[];toolMovements:ToolMovement[];onAdd:()=>void;onDone:()=>void}){const [q,setQ]=useState('');const [editing,setEditing]=useState<Person|null>(null);return <div className="content"><Toolbar q={q} setQ={setQ} add={onAdd} label="新增人員"/><Table headers={['姓名','部門','狀態','操作']} rows={people.filter(x=>(x.name+x.department).includes(q)).map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.department||'-'}</td><td>{x.active?'在職':'停用'}</td><td><button className="smallBtn" onClick={()=>setEditing(x)}>編輯人員資料</button></td></tr>)}/>{editing&&<EditPersonModal person={editing} onClose={()=>setEditing(null)} onDone={()=>{setEditing(null);onDone()}}/>}</div>}
function ToolsPage({tools,onAdd,onDone}:{tools:Tool[];onAdd:()=>void;onDone:()=>void}){const [q,setQ]=useState('');const move=async(t:Tool,type:'out'|'in')=>{if(type==='out')return;const r=await supabase.rpc('move_tool',{p_tool_id:t.id,p_type:'in',p_person:'',p_department:'',p_note:''});if(!r.error)onDone()};return <div className="content"><Toolbar q={q} setQ={setQ} add={onAdd} label="新增工具"/><Table headers={['工具名稱','規格','序號／編號','保管人','部門','領用日期','狀態','備註']} rows={tools.filter(x=>(x.name+x.spec+x.serial+x.holder+x.department).toLowerCase().includes(q.toLowerCase())).map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.spec}</td><td>{x.serial}</td><td>{x.holder||'-'}</td><td>{x.department||'-'}</td><td>{x.issue_date||'-'}</td><td>{x.status||'在庫'}</td><td>{x.note||'-'} {x.status==='已領用'&&<button className="smallBtn" onClick={()=>move(x,'in')}>歸還</button>}</td></tr>)}/></div>}
function AccountPage(){const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const apply=async()=>{setMsg('');if(!email.includes('@'))return setMsg('請輸入有效 Email');if(password.length<8)return setMsg('密碼至少需要 8 個字元');if(password!==confirm)return setMsg('兩次輸入的密碼不一致');setBusy(true);const {error}=await registrationClient.auth.signUp({email:email.trim().toLowerCase(),password});setBusy(false);if(error)return setMsg(error.message);setMsg('帳號申請完成，請通知申請人至信箱確認');setEmail('');setPassword('');setConfirm('')};return <div className="content"><div className="panel formPanel accountPanel"><h2>人員帳號申請</h2><p className="accountHint">供人員申請管理平台帳號，申請後需至信箱完成確認。</p><div className="formGrid"><Field label="申請人 Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></Field><Field label="設定密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 個字元"/></Field><Field label="確認密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field></div>{msg&&<div className={msg.includes('完成')?'notice':'notice error'}>{msg}</div>}<button className="primary" onClick={apply} disabled={busy}>{busy?'申請中…':'送出帳號申請'}</button></div></div>}
function Toolbar({q,setQ,add,label='新增'}:{q:string;setQ:(s:string)=>void;add?:()=>void;label?:string}){return <div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋…"/></div>{add&&<button className="primary" onClick={add}><Plus size={17}/>{label}</button>}</div>}
function Field({label,children}:{label:string;children:any}){return <label className="field"><span>{label}</span>{children}</label>}
function Table({headers,rows=[]}:{headers:string[];rows?:any[]}){return <div className="panel tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows:<tr><td colSpan={headers.length} className="empty">沒有資料</td></tr>}</tbody></table></div>}
function Login({loading,error}:{loading:boolean;error:string}){
  const [username,setUsername]=useState('')
  const [personalAccount,setPersonalAccount]=useState('')
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [signup,setSignup]=useState(false)
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const [resetting,setResetting]=useState(false)
  const login=async()=>{
    setMsg('')
    let email=username.trim().toLowerCase()===LOGIN_USERNAME?ALLOWED_EMAIL:username.trim().toLowerCase()
    if(!email.includes('@')){
      const resolved=await supabase.rpc('resolve_login',{p_login:email})
      email=resolved.data||''
    }
    if(!email.includes('@')){setMsg('找不到此個人帳號');return}
    setBusy(true)
    const r=await supabase.auth.signInWithPassword({email,password})
    setBusy(false)
    if(r.error){setMsg('帳號或密碼錯誤')}
  }
  const apply=async()=>{setMsg('');const account=personalAccount.trim().toLowerCase();if(!/^[a-z0-9._-]{3,30}$/.test(account))return setMsg('個人帳號請使用 3～30 個英數字、點、底線或連字號');if(!username.includes('@'))return setMsg('申請帳號請輸入有效 Email');if(password.length<8)return setMsg('密碼至少需要 8 個字元');if(password!==confirm)return setMsg('兩次輸入的密碼不一致');setBusy(true);const result=await registrationClient.auth.signUp({email:username.trim().toLowerCase(),password});if(!result.error&&result.data.user){const mapped=await registrationClient.rpc('register_username',{p_user_id:result.data.user.id,p_username:account});if(mapped.error){setBusy(false);return setMsg(mapped.error.message)}}setBusy(false);if(result.error)return setMsg(result.error.message);setMsg('申請完成，之後可使用個人帳號或 Email 登入')}
  const sendReset=async()=>{
    setMsg('');let email=username.trim().toLowerCase()===LOGIN_USERNAME?ALLOWED_EMAIL:username.trim().toLowerCase();if(!email.includes('@')){email=(await supabase.rpc('resolve_login',{p_login:email})).data||''}if(!email.includes('@'))return setMsg('請先輸入申請時使用的 Email 或個人帳號');setResetting(true)
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin})
    setResetting(false)
    setMsg(error?'無法寄出重設郵件，請稍後再試':'密碼重設郵件已寄出，請於 60 分鐘內開啟信件中的連結')
  }
  return <div className="login">
    <section className="loginHero"><div className="loginBrand"><div className="brandMark big">HT</div><div><b>管理部｜庫存管理</b></div></div><div className="officeScene" aria-hidden="true"><div className="sceneShelf"><i/><i/><i/><i/></div><div className="sceneDesk"><span/><b/><em/></div><div className="scenePlant"><i/><i/><i/></div><div className="sceneBox">文具</div></div><div className="heroCopy"><h2>啊 － 尼蒿 。</h2></div></section>
    <section className="loginPanel"><div className="loginCard"><span className="eyebrow">WELCOME BACK</span><h1>{signup?'申請管理帳號':'登入管理系統'}</h1><p>{signup?'設定個人帳號並填寫 Email':'請輸入個人帳號、Email 與密碼'}</p>{error&&<div className="notice error">{error}</div>}
      {signup&&<Field label="個人帳號"><input type="text" value={personalAccount} onChange={e=>setPersonalAccount(e.target.value)} autoComplete="username" disabled={busy} placeholder="例如 wang.xiaoming"/></Field>}
      <Field label={signup?'Email':'帳號／Email'}><input type={signup?'email':'text'} value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" disabled={busy} placeholder={signup?'name@company.com':'個人帳號或 Email'}/></Field>
      <Field label="密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!signup)login()}} autoComplete={signup?'new-password':'current-password'} disabled={busy}/></Field>
      {signup&&<Field label="確認密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')apply()}} autoComplete="new-password" disabled={busy}/></Field>}
      {msg&&<div className={msg.includes('完成')||msg.includes('已寄出')?'notice':'notice error'}>{msg}</div>}<button className="primary wide" onClick={signup?apply:login} disabled={loading||busy}>{busy?'處理中…':signup?'申請帳號':'登入系統'}</button>{!signup&&<button className="textBtn" onClick={sendReset} disabled={resetting}>{resetting?'寄送中…':'忘記密碼？'}</button>}<button className="textBtn" onClick={()=>{setSignup(v=>!v);setMsg('');setPassword('');setConfirm('')}}>{signup?'返回登入':'申請新帳號'}</button><small>管理部管理平台</small>
    </div></section>
  </div>
}
function ResetPassword({onDone}:{onDone:()=>void}){
  const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('')
  const save=async()=>{setMsg('');if(password.length<8)return setMsg('新密碼至少需要 8 個字元');if(password!==confirm)return setMsg('兩次輸入的密碼不一致');setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);if(error)return setMsg(error.message);setMsg('密碼已更新成功');setTimeout(onDone,1200)}
  return <div className="resetScreen"><div className="resetCard"><div className="brandMark big">HT</div><span className="eyebrow">PASSWORD RECOVERY</span><h1>設定新密碼</h1><p>請輸入新的登入密碼，完成後即可使用申請的 Email 登入。</p><Field label="新密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="至少 8 個字元"/></Field><Field label="確認新密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')save()}} autoComplete="new-password"/></Field>{msg&&<div className={msg.includes('成功')?'notice':'notice error'}>{msg}</div>}<button className="primary wide" onClick={save} disabled={busy}>{busy?'更新中…':'更新密碼'}</button></div></div>
}
function Modal({title,children,onClose}:{title:string;children:any;onClose:()=>void}){return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><h2>{title}</h2><button className="iconBtn" onClick={onClose}><X size={19}/></button></div>{children}</div></div>}
function PasswordModal({email,onClose}:{email:string;onClose:()=>void}){const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const save=async()=>{setMsg('');if(password.length<8)return setMsg('密碼至少需要 8 個字元');if(password!==confirm)return setMsg('兩次輸入的密碼不一致');setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);setMsg(error?error.message:'密碼已更新成功')};return <Modal title="我的帳號" onClose={onClose}><div className="accountRow"><span>登入帳號</span><b>{email}</b></div><div className="formGrid passwordFields"><Field label="新密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 個字元"/></Field><Field label="確認新密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field></div>{msg&&<div className={msg.includes('成功')?'notice':'notice error'}>{msg}</div>}<button className="primary wide" onClick={save} disabled={busy}>{busy?'更新中…':'修改密碼'}</button></Modal>}
function EditPersonModal({person,onClose,onDone}:{person:Person;onClose:()=>void;onDone:()=>void}){const [department,setDepartment]=useState(person.department||'');const [active,setActive]=useState(person.active);const [msg,setMsg]=useState('');const save=async()=>{const {error}=await supabase.from('people').update({department,active}).eq('id',person.id);if(error)setMsg(error.message);else onDone()};return <Modal title={`編輯人員｜${person.name}`} onClose={onClose}><div className="formGrid"><Field label="姓名"><input value={person.name} disabled/></Field><Field label="部門"><input value={department} onChange={e=>setDepartment(e.target.value)}/></Field><Field label="狀態"><select value={active?'active':'inactive'} onChange={e=>setActive(e.target.value==='active')}><option value="active">在職</option><option value="inactive">停用</option></select></Field></div>{msg&&<div className="notice error">{msg}</div>}<button className="primary wide" onClick={save}>儲存修改</button></Modal>}
function ItemModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({name:'',spec:'',category:'',unit:'個',stock:0,safety_stock:0,location:'',note:''});const save=async()=>{const r=await supabase.from('items').insert({...f,owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增文具" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','spec','category','unit','stock','safety_stock','location','note']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function PersonModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({name:'',department:'',active:true});const save=async()=>{const r=await supabase.from('people').insert({...f,title:'',owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增人員" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','department']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function ToolModal({onClose,onDone}:{people:Person[];onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({name:'',spec:'',serial:'',holder:'',department:'',issue_date:'',status:'在庫',note:''});const save=async()=>{const r=await supabase.from('tools').insert({...f,owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增個人工具" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','spec','serial','holder','department','issue_date','status','note']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function ReceiveModal({items,onClose,onDone}:{items:Item[];onClose:()=>void;onDone:()=>void}){const [item,setItem]=useState('');const [qty,setQty]=useState(1);const save=async()=>{const r=await supabase.rpc('receive_stationery',{p_item_id:item,p_quantity:qty,p_source:'',p_note:''});if(!r.error){onClose();onDone()}};return <Modal title="入庫登記" onClose={onClose}><Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><button className="primary wide" onClick={save}>確認入庫</button></Modal>}
function IssueModal({items,tools,people,onClose,onDone}:{items:Item[];tools:Tool[];people:Person[];onClose:()=>void;onDone:()=>void}){return <Modal title="快速領用" onClose={onClose}><IssueForm items={items} tools={tools} people={people} onDone={()=>{onClose();onDone()}}/></Modal>}
function FormFields({f,setF,fields}:{f:any;setF:(x:any)=>void;fields:string[]}){const labels:any={name:'名稱',spec:'規格',category:'類別',unit:'單位',stock:'庫存',safety_stock:'安全庫存',location:'位置',note:'備註',department:'部門',title:'職稱',serial:'序號／編號',holder:'保管人',issue_date:'領用日期',status:'狀態'};return <div className="formGrid">{fields.map(k=><Field key={k} label={labels[k]||k}><input type={['stock','safety_stock'].includes(k)?'number':k==='issue_date'?'date':'text'} value={f[k]??''} onChange={e=>setF({...f,[k]:['stock','safety_stock'].includes(k)?Number(e.target.value):e.target.value})}/></Field>)}</div>}

function ItemsInventoryPage({items,onAdd,onDone}:{items:Item[];onAdd:()=>void;onDone:()=>void}){
  return <><div className="inventoryAddRow"><button className="primary" onClick={onAdd}><Plus size={17}/>新增</button></div><ItemsPage items={items} onDone={onDone}/></>
}

function ToolsInventoryPage({tools,onAdd,onDone}:{tools:Tool[];onAdd:()=>void;onDone:()=>void}){
  const [q,setQ]=useState('')
  const [msg,setMsg]=useState('')
  const rows=tools.filter(x=>(x.name+(x.spec||'')+(x.category||'')).toLowerCase().includes(q.toLowerCase()))
  const receive=async(x:Tool)=>{
    const raw=window.prompt(`請輸入「${x.name}」進貨數量`,'1')
    if(raw===null)return
    const qty=Number(raw)
    if(!Number.isFinite(qty)||qty<=0)return setMsg('請輸入正確的進貨數量')
    const {error}=await supabase.from('tools').update({stock:Number(x.stock||0)+qty,status:'在庫'}).eq('id',x.id)
    setMsg(error?error.message:`${x.name} 已進貨 ${qty} ${x.unit||'個'}`)
    if(!error)onDone()
  }
  return <div className="content">
    <Toolbar q={q} setQ={setQ} add={onAdd} label="新增"/>
    {msg&&<div className={msg.includes('已')?'notice':'notice error'}>{msg}</div>}
    <Table headers={['品項','規格','類別','庫存安全','庫存','位置','操作']} rows={rows.map(x=><tr key={x.id}>
      <td><b>{x.name}</b></td><td>{x.spec||'-'}</td><td>{x.category||'-'}</td><td>{Number(x.safety_stock||0)} {x.unit||'個'}</td><td>{Number(x.stock||0)} {x.unit||'個'}</td><td>{x.location||'-'}</td><td><button className="smallBtn" onClick={()=>receive(x)}>進貨</button></td>
    </tr>)}/>
  </div>
}

function InventoryToolModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){
  const [f,setF]=useState({name:'',spec:'',category:'',unit:'個',stock:0,safety_stock:0,location:'',note:'',serial:'',holder:'',department:'',issue_date:'',status:'在庫'})
  const [msg,setMsg]=useState('')
  const save=async()=>{
    if(!f.name.trim())return setMsg('請輸入品項名稱')
    const user=(await supabase.auth.getUser()).data.user
    const {error}=await supabase.from('tools').insert({...f,owner_id:user!.id})
    if(error)setMsg(error.message);else{onClose();onDone()}
  }
  return <Modal title="新增個人工具" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','spec','category','unit','stock','safety_stock','location','note']}/>{msg&&<div className="notice error">{msg}</div>}<button className="primary wide" onClick={save}>儲存</button></Modal>
}

type ManagedAccount={user_id:string;email:string;username:string|null;created_at:string}
function AdminAccountsPage(){
  const [accounts,setAccounts]=useState<ManagedAccount[]>([])
  const [email,setEmail]=useState('')
  const [personalAccount,setPersonalAccount]=useState('')
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const loadAccounts=async()=>{const r=await supabase.rpc('admin_list_accounts');if(r.error)setMsg(r.error.message);else setAccounts(r.data||[])}
  useEffect(()=>{loadAccounts()},[])
  const apply=async()=>{
    setMsg('');const account=personalAccount.trim().toLowerCase()
    if(!/^[a-z0-9._-]{3,30}$/.test(account))return setMsg('個人帳號請使用 3～30 個英數字、點、底線或連字號')
    if(!email.includes('@'))return setMsg('請輸入有效 Email')
    if(password.length<8)return setMsg('密碼至少需要 8 個字元')
    if(password!==confirm)return setMsg('兩次輸入的密碼不一致')
    setBusy(true)
    const result=await registrationClient.auth.signUp({email:email.trim().toLowerCase(),password})
    if(!result.error&&result.data.user){const mapped=await registrationClient.rpc('register_username',{p_user_id:result.data.user.id,p_username:account});if(mapped.error){setBusy(false);return setMsg(mapped.error.message)}}
    setBusy(false)
    if(result.error)return setMsg(result.error.message)
    setMsg('帳號申請完成');setEmail('');setPersonalAccount('');setPassword('');setConfirm('');loadAccounts()
  }
  const remove=async(a:ManagedAccount)=>{
    if(a.email.toLowerCase()===ALLOWED_EMAIL)return setMsg('主帳號不可刪除')
    if(!window.confirm(`確定刪除帳號「${a.username||a.email}」？刪除後將無法登入。`))return
    const r=await supabase.rpc('admin_delete_account',{p_user_id:a.user_id})
    setMsg(r.error?r.error.message:'帳號已刪除')
    if(!r.error)loadAccounts()
  }
  return <div className="content"><div className="panel formPanel accountPanel"><h2>新增人員帳號</h2><p className="accountHint">設定個人帳號後，可使用個人帳號或 Email 登入。</p><div className="formGrid"><Field label="個人帳號"><input value={personalAccount} onChange={e=>setPersonalAccount(e.target.value)} placeholder="例如 wang.xiaoming"/></Field><Field label="申請人 Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></Field><Field label="設定密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 個字元"/></Field><Field label="確認密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field></div>{msg&&<div className={msg.includes('完成')||msg.includes('刪除')?'notice':'notice error'}>{msg}</div>}<button className="primary" onClick={apply} disabled={busy}>{busy?'申請中…':'新增帳號'}</button></div><div className="panel"><div className="panelTitle"><b>人員帳號管理</b><span>僅主帳號可查看及刪除</span></div><Table headers={['個人帳號','Email','建立日期','操作']} rows={accounts.map(a=><tr key={a.user_id}><td><b>{a.email.toLowerCase()===ALLOWED_EMAIL?'keker':a.username||'-'}</b></td><td>{a.email}</td><td>{a.created_at?new Date(a.created_at).toLocaleDateString('zh-TW'):'-'}</td><td>{a.email.toLowerCase()===ALLOWED_EMAIL?<span>主帳號</span>:<button className="smallBtn dangerBtn" onClick={()=>remove(a)}>刪除帳號</button>}</td></tr>)}/></div></div>
}

createRoot(document.getElementById('root')!).render(<App/>)
