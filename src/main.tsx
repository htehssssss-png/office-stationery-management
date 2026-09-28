import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { Package, Wrench, Users, ArrowDownToLine, ArrowUpFromLine, Search, Plus, LogOut, X, RefreshCw, ChevronDown } from 'lucide-react'
import './index.css'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const registrationClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const ALLOWED_EMAIL = 'htehssssss@gmail.com'
const LOGIN_USERNAME = 'keker'

function confirmDialog(message:string){return new Promise<boolean>(resolve=>{const backdrop=document.createElement('div');backdrop.className='confirmBackdrop';const box=document.createElement('div');box.className='confirmBox';const title=document.createElement('h3');title.textContent='小蓉包 說';const text=document.createElement('p');text.textContent=message;const actions=document.createElement('div');actions.className='confirmActions';const cancel=document.createElement('button');cancel.className='smallBtn';cancel.textContent='取消';const ok=document.createElement('button');ok.className='primary';ok.textContent='確定';const finish=(value:boolean)=>{document.removeEventListener('keydown',onKey);backdrop.remove();resolve(value)};const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')finish(false)};cancel.onclick=()=>finish(false);ok.onclick=()=>finish(true);backdrop.onclick=e=>{if(e.target===backdrop)finish(false)};actions.append(cancel,ok);box.append(title,text,actions);backdrop.append(box);document.body.append(backdrop);document.addEventListener('keydown',onKey);ok.focus()})}

type Item = { id:string; item_code?:string; name:string; spec:string; category:string; unit:string; stock:number; safety_stock:number; location:string; note:string }
type Person = { id:string; name:string; department:string; title:string; active:boolean; created_at?:string }
type Movement = { id:string; type:string; date:string; item_id:string; item_name:string; quantity:number; person:string; department:string; source:string; note:string }
type Tool = { id:string; item_code?:string; name:string; spec:string; category:string; unit:string; stock:number; safety_stock:number; location:string; serial:string; holder:string; department:string; issue_date:string; status:string; note:string }
type ToolMovement = { id:string; type:string; date:string; tool_id:string; tool_name:string; serial:string; person:string; department:string; note:string; quantity?:number }

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
  const workEnd=new Date(now); workEnd.setHours(17,0,0,0)
  const remaining=Math.max(0,workEnd.getTime()-now.getTime())
  const countdown=remaining>0
    ? `${String(Math.floor(remaining/3600000)).padStart(2,'0')}:${String(Math.floor((remaining%3600000)/60000)).padStart(2,'0')}:${String(Math.floor((remaining%60000)/1000)).padStart(2,'0')}`
    : '我要下班啦 ~~~'

  const load=async()=>{
    setLoading(true); setError('')
    const [a,b,c,d,e]=await Promise.all([
      supabase.from('items').select('*').order('name'),
      supabase.from('people').select('*').order('created_at',{ascending:false}),
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
      <div className="dateTime" aria-label="今日時間"><span>{now.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'})}</span><strong>{now.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}</strong><em>下班倒數：{countdown}</em></div>
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
      <header className="topbar"><div><h1>{title(tab)}</h1></div><div className="topActions"><button className="iconBtn" onClick={load} title="重新整理"><RefreshCw size={18}/></button>{tab==='people'&&<button className="primary" onClick={()=>setModal('person')}><Plus size={17}/>新增</button>}</div></header>
      {error&&<div className="notice error">{error}</div>}
      {loading?<div className="loading">載入中…</div>:<>
        {tab==='dashboard'&&<Dashboard items={items} people={people} tools={tools} movements={movements} toolMovements={toolMovements}/>} 
        {tab==='items'&&<ItemsInventoryPage items={items} onAdd={()=>setModal('item')} onDone={load}/>} 
        {tab==='out'&&<MultiIssuePage items={items} tools={tools} people={people} onDone={load}/>} 
        {tab==='in'&&<MultiReceivePage items={items} tools={tools} people={people} onDone={load}/>} 
        {tab==='movements'&&<MovementsPage movements={movements} toolMovements={toolMovements} onDone={load}/>} 
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
function Dashboard({items,tools}:{items:Item[];people:Person[];tools:Tool[];movements:Movement[];toolMovements:ToolMovement[]}){
 const [query,setQuery]=useState('');
 const lowStock=[...items.map(x=>({...x,kind:'文具'})),...tools.map(x=>({...x,kind:'個人工具'}))].filter(x=>Number(x.safety_stock)>0&&Number(x.stock)<Number(x.safety_stock));
 const filtered=lowStock.filter(x=>`${x.item_code||''} ${x.name} ${x.kind} ${x.spec||''}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="content"><div className="toolbar dashboardSearch"><div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入料號、品項、類別或規格，自動篩選"/></div></div><div className="panel"><div className="panelTitle"><b>庫存提醒</b><span>{lowStock.length?`顯示 ${filtered.length} 項（共 ${lowStock.length} 項低於安全庫存）`:'目前沒有低庫存品項'}</span></div>{filtered.length?<Table rows={filtered.map(x=><tr key={`${x.kind}-${x.id}`}><td>{x.item_code||'-'}</td><td><b>{x.name}</b></td><td>{x.kind}</td><td>{x.spec||'-'}</td><td>{x.stock} {x.unit||'個'}</td><td>{x.safety_stock} {x.unit||'個'}</td></tr>)} headers={['商品編號／料號','品項','類別','規格','目前庫存','安全庫存']}/>:<div className="empty">{lowStock.length?'找不到符合條件的品項':'目前庫存狀況正常'}</div>}</div></div>
}
async function readCsvText(file:File){const buffer=await file.arrayBuffer();const bytes=new Uint8Array(buffer);if(bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)return new TextDecoder('utf-8').decode(buffer).replace(/^\ufeff/,'');try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch{return new TextDecoder('big5').decode(buffer)}}
const stationeryImportHeaders=['商品編號','名稱','規格','類別','單位','庫存','安全庫存','位置','備註']
const toolImportHeaders=['料號','名稱','規格','管理編號','類別','單位','庫存','安全庫存','位置','備註']
const inventoryHeaderAliases=[['料號','商品編號／料號','商品編號'],['名稱','品項','品名'],['規格'],['類別','分類'],['單位'],['庫存','數量'],['安全庫存','庫存安全','安全庫存量'],['位置','存放位置'],['備註'],['管理編號','管理編號／序號','序號／編號','序號']]
async function readInventoryFile(file:File){const lower=file.name.toLowerCase();let workbook:XLSX.WorkBook;if(lower.endsWith('.csv')){workbook=XLSX.read(await readCsvText(file),{type:'string'})}else if(lower.endsWith('.xlsx')||lower.endsWith('.xls')){workbook=XLSX.read(await file.arrayBuffer(),{type:'array'})}else throw new Error('請選擇 Excel（.xlsx／.xls）或 CSV 檔案');const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet)throw new Error('檔案中找不到工作表');const rows=XLSX.utils.sheet_to_json<any[]>(sheet,{header:1,defval:'',raw:false});if(rows.length<2)throw new Error('檔案內沒有可匯入的資料');const headers=rows[0].map(x=>String(x).replace(/^\ufeff/,'').trim().replace(/\s+/g,''));const indexes=inventoryHeaderAliases.map(names=>headers.findIndex(h=>names.includes(h)));if(indexes[1]<0)throw new Error('找不到「名稱」欄位，請依序使用：料號、名稱、規格、類別、單位、庫存、安全庫存、位置、備註');return rows.slice(1).map(row=>indexes.map(i=>i<0?'':String(row[i]??'').trim())).filter(row=>row[1])}
function downloadInventoryTemplate(filename:string,headers:string[],example:string[]){const sheet=XLSX.utils.aoa_to_sheet([headers,example]);sheet['!cols']=[16,18,16,16,10,10,12,14,24].map(w=>({wch:w}));const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'庫存匯入');XLSX.writeFile(workbook,filename)}
function expandSerialRange(value:string){const text=value.trim();if(!text)return [''];const match=text.match(/^([^\d]*)(\d+)\s*[~～]\s*([^\d]*)(\d+)$/);if(!match)return [text];const [,leftPrefix,startText,rightPrefix,endText]=match;if(rightPrefix&&rightPrefix!==leftPrefix)return [text];const start=Number(startText),end=Number(endText);if(!Number.isInteger(start)||!Number.isInteger(end)||end<start||end-start>499)return [text];const width=Math.max(startText.length,endText.length);return Array.from({length:end-start+1},(_,i)=>`${leftPrefix}${String(start+i).padStart(width,'0')}`)}
function ItemsPage({items,onDone}:{items:Item[];onDone:()=>void}){
  const [q,setQ]=useState('');const [msg,setMsg]=useState('');const [selected,setSelected]=useState<string[]>([]);const [editing,setEditing]=useState<Item|null>(null)
  const rows=items.filter(x=>((x.item_code||'')+x.name+x.spec+x.category).toLowerCase().includes(q.toLowerCase()))
  const template=()=>downloadInventoryTemplate('文具批次新增範本.xlsx',stationeryImportHeaders,['TEST-888','原子筆','0.5mm','書寫用品','支','100','20','A-01','藍色'])
  const importFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setMsg('');try{const rows=await readInventoryFile(file);const data=rows.map(c=>({item_code:c[0]||'',name:c[1],spec:c[2]||'',category:c[3]||'',unit:c[4]||'個',stock:Number(c[5]||0),safety_stock:Number(c[6]||0),location:c[7]||'',note:c[8]||''}));const user=(await supabase.auth.getUser()).data.user;const {error}=await supabase.from('items').insert(data.map(x=>({...x,owner_id:user!.id})));setMsg(error?error.message:`已批次新增 ${data.length} 筆文具`);if(!error)onDone()}catch(error:any){setMsg(error.message||'檔案無法讀取')}finally{e.target.value=''}}
  const removeSelected=async()=>{if(!selected.length)return;if(!await confirmDialog(`確定刪除已勾選的 ${selected.length} 筆文具？`))return;const {error}=await supabase.from('items').delete().in('id',selected);setMsg(error?error.message:`已刪除 ${selected.length} 筆文具`);if(!error){setSelected([]);onDone()}}
  const toggle=(id:string)=>setSelected(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id])
  const allSelected=rows.length>0&&rows.every(x=>selected.includes(x.id));const toggleAll=()=>setSelected(allSelected?selected.filter(id=>!rows.some(x=>x.id===id)):[...new Set([...selected,...rows.map(x=>x.id)])])
  return <div className="content"><div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋…"/></div><button className="smallBtn dangerBtn" onClick={removeSelected} disabled={!selected.length}>批次刪除{selected.length?`（${selected.length}）`:''}</button><button className="smallBtn" onClick={template}>下載 Excel 範本</button><label className="primary uploadBtn">批次新增<input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={importFile}/></label></div>{msg&&<div className={msg.includes('已')?'notice':'notice error'}>{msg}</div>}<Table headers={[<label className="selectAll"><input className="rowCheck" type="checkbox" checked={allSelected} onChange={toggleAll}/>全選</label>,'商品編號／料號','品項','規格','類別','庫存','安全庫存','位置','操作']} rows={rows.map(x=><tr key={x.id}><td><input className="rowCheck" type="checkbox" checked={selected.includes(x.id)} onChange={()=>toggle(x.id)}/></td><td>{x.item_code||'-'}</td><td><b>{x.name}</b></td><td>{x.spec||'-'}</td><td>{x.category||'-'}</td><td>{x.stock} {x.unit}</td><td>{x.safety_stock} {x.unit}</td><td>{x.location||'-'}</td><td><button className="smallBtn" onClick={()=>setEditing(x)}>編輯</button></td></tr>)}/>{editing&&<InventoryEditModal kind="item" record={editing} onClose={()=>setEditing(null)} onDone={()=>{setEditing(null);onDone()}}/>}</div>
}
function IssuePage({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){return <div className="content"><IssueForm items={items} tools={tools} people={people} onDone={onDone}/></div>}
function IssueForm({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){const [kind,setKind]=useState<'文具'|'個人工具'>('文具'); const [item,setItem]=useState('');const [tool,setTool]=useState('');const [person,setPerson]=useState('');const [dept,setDept]=useState('');const [qty,setQty]=useState(1);const [note,setNote]=useState('');const [msg,setMsg]=useState('');const selected=kind==='文具'?items.find(x=>x.id===item):tools.find(x=>x.id===tool); const submit=async()=>{setMsg('');if(!person)return setMsg('請選擇領用人員');let r;if(kind==='文具')r=await supabase.rpc('issue_stationery',{p_item_id:item,p_quantity:qty,p_person:person,p_department:dept,p_note:note});else r=await supabase.rpc('move_tool',{p_tool_id:tool,p_type:'out',p_person:person,p_department:dept,p_note:`${note}${note?'；':''}數量：${qty}`});if(r.error)setMsg(r.error.message);else{setMsg('領用完成');setItem('');setTool('');setNote('');setQty(1);onDone()}};return <div className="panel formPanel"><h2>領用</h2><div className="seg"><button className={kind==='文具'?'selected':''} onClick={()=>{setKind('文具');setTool('')}}>文具</button><button className={kind==='個人工具'?'selected':''} onClick={()=>{setKind('個人工具');setItem('')}}>個人工具</button></div><div className="formGrid">{kind==='文具'?<Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.item_code?`${x.item_code}｜`:''}{x.name}</option>)}</select></Field>:<Field label="個人工具"><select value={tool} onChange={e=>setTool(e.target.value)}><option value="">請選擇</option>{tools.filter(x=>x.status!=='已領用').map(x=><option key={x.id} value={x.id}>{x.item_code?`${x.item_code}｜`:''}{x.name}</option>)}</select></Field>}<Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><Field label="領用人員"><select value={person} onChange={e=>{setPerson(e.target.value);const p=people.find(x=>x.name===e.target.value);setDept(p?.department||'')}}><option value="">請選擇</option>{people.filter(x=>x.active).map(x=><option key={x.id} value={x.name}>{x.name}｜{x.department}</option>)}</select></Field><Field label="部門"><input value={dept} onChange={e=>setDept(e.target.value)}/></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{selected&&<Table headers={['商品編號／料號','品項','規格','目前庫存']} rows={[<tr key={selected.id}><td>{selected.item_code||'-'}</td><td>{selected.name}</td><td>{selected.spec||'-'}</td><td>{Number(selected.stock||0)} {selected.unit||'個'}</td></tr>]}/>} {msg&&<div className="notice">{msg}</div>}<button className="primary wide" disabled={!item&&!tool} onClick={submit}>確認領用</button></div>}
function ReceivePage({items,onDone}:{items:Item[];onDone:()=>void}){return <div className="content"><ReceiveForm items={items} onDone={onDone}/></div>}
function ReceiveForm({items,onDone}:{items:Item[];onDone:()=>void}){const [item,setItem]=useState('');const [qty,setQty]=useState(1);const [source,setSource]=useState('');const [note,setNote]=useState('');const [msg,setMsg]=useState('');const selected=items.find(x=>x.id===item);const submit=async()=>{const r=await supabase.rpc('receive_stationery',{p_item_id:item,p_quantity:qty,p_source:source,p_note:note});setMsg(r.error?.message||'入庫完成');if(!r.error){setItem('');setQty(1);onDone()}};return <div className="panel formPanel"><h2>入庫登記</h2><div className="formGrid"><Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.item_code?`${x.item_code}｜`:''}{x.name}</option>)}</select></Field><Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><Field label="來源"><input value={source} onChange={e=>setSource(e.target.value)} placeholder="採購／退回…"/></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{selected&&<Table headers={['商品編號／料號','品項','規格','目前庫存']} rows={[<tr key={selected.id}><td>{selected.item_code||'-'}</td><td>{selected.name}</td><td>{selected.spec||'-'}</td><td>{selected.stock} {selected.unit}</td></tr>]}/>} {msg&&<div className="notice">{msg}</div>}<button className="primary wide" disabled={!item} onClick={submit}>確認入庫</button></div>}
function MovementsPage({movements,toolMovements,onDone}:{movements:Movement[];toolMovements:ToolMovement[];onDone:()=>void}){
 const deletedMark='【已刪除】';
 const rows=[...movements.map(x=>({date:x.date,cat:'文具',item:x.item_name,spec:'',qty:x.quantity,person:x.person,dept:x.department,action:x.type==='out'?'領用':'入庫',note:x.note||'',id:'s'+x.id,rawId:x.id,table:'movements',inventoryTable:'items',inventoryId:x.item_id})),...toolMovements.map(x=>({date:x.date,cat:'個人工具',item:x.tool_name,spec:x.serial,qty:x.quantity||1,person:x.person,dept:x.department,action:x.type==='out'?'領用':'歸還',note:x.note||'',id:'t'+x.id,rawId:x.id,table:'tool_movements',inventoryTable:'tools',inventoryId:x.tool_id}))].sort((a,b)=>b.date.localeCompare(a.date));
 const blank={date:'',cat:'',item:'',person:'',dept:'',action:''};
 const [draft,setDraft]=useState(blank);
 const [filters,setFilters]=useState(blank);
 const [page,setPage]=useState(1);
 const [msg,setMsg]=useState('');
 const filtered=rows.filter(x=>(!filters.date||x.date.slice(0,10)===filters.date)&&(!filters.cat||x.cat===filters.cat)&&(!filters.item||`${x.item} ${x.spec}`.toLowerCase().includes(filters.item.toLowerCase()))&&(!filters.person||x.person.toLowerCase().includes(filters.person.toLowerCase()))&&(!filters.dept||x.dept.toLowerCase().includes(filters.dept.toLowerCase()))&&(!filters.action||x.action===filters.action));
 const totalPages=Math.ceil(filtered.length/20);
 const currentPage=Math.min(page,Math.max(1,totalPages));
 const pageRows=filtered.slice((currentPage-1)*20,currentPage*20);
 useEffect(()=>setPage(1),[filters]);
 const change=(key:keyof typeof blank,value:string)=>setDraft({...draft,[key]:value});
 const markDeleted=async(x:typeof rows[number])=>{
  if(x.note.startsWith(deletedMark))return;
  if(!await confirmDialog('確定標示刪除並還原這筆紀錄造成的庫存變動？原始紀錄仍會保留。'))return;
  setMsg('');
  const stockResult=await supabase.from(x.inventoryTable).select('stock').eq('id',x.inventoryId).single();
  if(stockResult.error)return setMsg(`無法取得目前庫存：${stockResult.error.message}`);
  const currentStock=Number(stockResult.data?.stock||0);
  const nextStock=currentStock+(x.action==='領用'?Number(x.qty):-Number(x.qty));
  if(nextStock<0)return setMsg(`無法刪除：還原後庫存會變成 ${nextStock}`);
  const inventoryUpdate=await supabase.from(x.inventoryTable).update({stock:nextStock}).eq('id',x.inventoryId).eq('stock',currentStock).select('id').maybeSingle();
  if(inventoryUpdate.error)return setMsg(`庫存還原失敗：${inventoryUpdate.error.message}`);
  if(!inventoryUpdate.data)return setMsg('庫存剛被其他人更新，請重新整理後再試');
  const movementUpdate=await supabase.from(x.table).update({note:`${deletedMark}${x.note}`}).eq('id',x.rawId).select('id').maybeSingle();
  if(movementUpdate.error||!movementUpdate.data){const rollback=await supabase.from(x.inventoryTable).update({stock:currentStock}).eq('id',x.inventoryId).eq('stock',nextStock);return setMsg(rollback.error?'紀錄標示失敗，且庫存無法自動回復，請通知管理員':`紀錄標示失敗：${movementUpdate.error?.message||'找不到紀錄'}`)}
  setMsg(`已標示刪除，庫存由 ${currentStock} 還原為 ${nextStock}`);onDone();
 };
 return <div className="content"><div className="panel movementFilters"><div className="movementFilterGrid"><Field label="日期"><input type="date" value={draft.date} onChange={e=>change('date',e.target.value)}/></Field><Field label="類別"><select value={draft.cat} onChange={e=>change('cat',e.target.value)}><option value="">全部</option><option>文具</option><option>個人工具</option></select></Field><Field label="品項／規格"><input value={draft.item} onChange={e=>change('item',e.target.value)} placeholder="輸入品項或規格"/></Field><Field label="人員"><input value={draft.person} onChange={e=>change('person',e.target.value)} placeholder="輸入人員"/></Field><Field label="部門"><input value={draft.dept} onChange={e=>change('dept',e.target.value)} placeholder="輸入部門"/></Field><Field label="動作"><select value={draft.action} onChange={e=>change('action',e.target.value)}><option value="">全部</option><option>領用</option><option>入庫</option><option>歸還</option></select></Field></div><div className="filterActions"><button className="smallBtn" onClick={()=>{setDraft(blank);setFilters(blank)}}>清除</button><button className="primary" onClick={()=>setFilters(draft)}><Search size={17}/>搜尋</button></div></div>{msg&&<div className={msg.includes('已標示')?'notice':'notice error'}>{msg}</div>}<Table headers={['日期','類別','品項','規格／序號','數量','人員','部門','動作','備註','操作']} rows={pageRows.map(x=>{const deleted=x.note.startsWith(deletedMark);const shownNote=x.note.replace(deletedMark,'');return <tr key={x.id} className={deleted?'deletedRecord':''}><td>{x.date}</td><td>{x.cat}</td><td>{x.item}</td><td>{x.spec||'-'}</td><td>{x.qty}</td><td>{x.person||'-'}</td><td>{x.dept||'-'}</td><td>{x.action}</td><td>{shownNote||'-'}{deleted&&<span className="deletedBadge">已刪除</span>}</td><td><button className="smallBtn dangerBtn" disabled={deleted} onClick={()=>markDeleted(x)}>{deleted?'已刪除':'刪除'}</button></td></tr>})}/><div className="pagination"><button className="pageBtn" disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>上一頁</button><div className="pageNumbers">{Array.from({length:totalPages},(_,i)=>i+1).map(n=><button key={n} className={n===currentPage?'pageBtn active':'pageBtn'} onClick={()=>setPage(n)}>{n}</button>)}</div><button className="pageBtn" disabled={currentPage>=totalPages} onClick={()=>setPage(currentPage+1)}>下一頁</button><span>共 {totalPages} 頁</span></div></div>
}
function PeoplePage({people,onAdd,onDone}:{people:Person[];movements:Movement[];toolMovements:ToolMovement[];onAdd:()=>void;onDone:()=>void}){const [q,setQ]=useState('');const [editing,setEditing]=useState(false);const rows=people.filter(x=>(x.name+x.department).includes(q)).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));return <div className="content"><div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋…"/></div><button className="smallBtn" onClick={()=>setEditing(true)}>編輯人員</button><button className="primary" onClick={onAdd}><Plus size={17}/>新增人員</button></div><Table headers={['姓名','部門','狀態','到職日']} rows={rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.department||'-'}</td><td>{x.active?'在職':'停用'}</td><td>{x.created_at?new Date(x.created_at).toLocaleDateString('zh-TW'):'-'}</td></tr>)}/>{editing&&<BulkEditPeopleModal people={people} onClose={()=>setEditing(false)} onDone={()=>{setEditing(false);onDone()}}/>}</div>}
function ToolsPage({tools,onAdd,onDone}:{tools:Tool[];onAdd:()=>void;onDone:()=>void}){const [q,setQ]=useState('');const move=async(t:Tool,type:'out'|'in')=>{if(type==='out')return;const r=await supabase.rpc('move_tool',{p_tool_id:t.id,p_type:'in',p_person:'',p_department:'',p_note:''});if(!r.error)onDone()};return <div className="content"><Toolbar q={q} setQ={setQ} add={onAdd} label="新增工具"/><Table headers={['工具名稱','規格','序號／編號','保管人','部門','領用日期','狀態','備註']} rows={tools.filter(x=>(x.name+x.spec+x.serial+x.holder+x.department).toLowerCase().includes(q.toLowerCase())).map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.spec}</td><td>{x.serial}</td><td>{x.holder||'-'}</td><td>{x.department||'-'}</td><td>{x.issue_date||'-'}</td><td>{x.status||'在庫'}</td><td>{x.note||'-'} {x.status==='已領用'&&<button className="smallBtn" onClick={()=>move(x,'in')}>歸還</button>}</td></tr>)}/></div>}
function AccountPage(){const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const apply=async()=>{setMsg('');if(!email.includes('@'))return setMsg('請輸入有效 Email');if(password.length<8)return setMsg('密碼至少需要 8 個字元');if(password!==confirm)return setMsg('兩次輸入的密碼不一致');setBusy(true);const {error}=await registrationClient.auth.signUp({email:email.trim().toLowerCase(),password});setBusy(false);if(error)return setMsg(error.message);setMsg('帳號申請完成，請通知申請人至信箱確認');setEmail('');setPassword('');setConfirm('')};return <div className="content"><div className="panel formPanel accountPanel"><h2>人員帳號申請</h2><p className="accountHint">供人員申請管理平台帳號，申請後需至信箱完成確認。</p><div className="formGrid"><Field label="申請人 Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></Field><Field label="設定密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 個字元"/></Field><Field label="確認密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field></div>{msg&&<div className={msg.includes('完成')?'notice':'notice error'}>{msg}</div>}<button className="primary" onClick={apply} disabled={busy}>{busy?'申請中…':'送出帳號申請'}</button></div></div>}
function Toolbar({q,setQ,add,label='新增'}:{q:string;setQ:(s:string)=>void;add?:()=>void;label?:string}){return <div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋…"/></div>{add&&<button className="primary" onClick={add}><Plus size={17}/>{label}</button>}</div>}
function Field({label,children}:{label:any;children:any}){return <label className="field"><span>{label}</span>{children}</label>}
function Table({headers,rows=[]}:{headers:any[];rows?:any[]}){return <div className="panel tableWrap"><table><thead><tr>{headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.length?rows:<tr><td colSpan={headers.length} className="empty">沒有資料</td></tr>}</tbody></table></div>}
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
    if(r.error){const reason=(r.error as any).code||r.error.message;setMsg(reason==='email_not_confirmed'||r.error.message.includes('Email not confirmed')?'此帳號尚未完成 Email 確認，請聯絡管理員':'帳號或密碼錯誤')}
  }
  const apply=async()=>{setMsg('');const account=personalAccount.trim().toLowerCase();if(!/^[a-z0-9._-]{3,30}$/.test(account))return setMsg('個人帳號請使用 3～30 個英數字、點、底線或連字號');if(!username.includes('@'))return setMsg('申請帳號請輸入有效 Email');if(password.length<8)return setMsg('密碼至少需要 8 個字元');if(password!==confirm)return setMsg('兩次輸入的密碼不一致');setBusy(true);const result=await registrationClient.auth.signUp({email:username.trim().toLowerCase(),password});if(!result.error&&result.data.user){const mapped=await registrationClient.rpc('register_username',{p_user_id:result.data.user.id,p_username:account});if(mapped.error){setBusy(false);return setMsg(mapped.error.message)}}setBusy(false);if(result.error)return setMsg(result.error.message);setMsg('申請完成，現在可使用個人帳號或 Email 登入')}
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
function BulkEditPeopleModal({people,onClose,onDone}:{people:Person[];onClose:()=>void;onDone:()=>void}){const [rows,setRows]=useState(people.map(x=>({...x,hireDate:x.created_at?x.created_at.slice(0,10):''})));const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const change=(id:string,patch:Partial<(typeof rows)[number]>)=>setRows(rows.map(x=>x.id===id?{...x,...patch}:x));const save=async()=>{setMsg('');setBusy(true);for(const x of rows){const update:any={name:x.name.trim(),department:x.department.trim(),active:x.active};if(x.hireDate)update.created_at=`${x.hireDate}T00:00:00`;const {error}=await supabase.from('people').update(update).eq('id',x.id);if(error){setBusy(false);return setMsg(error.message)}}setBusy(false);onDone()};return <Modal title="編輯所有人員資料" onClose={onClose}><div className="bulkPeople"><div className="bulkPeopleHead"><span>姓名</span><span>部門</span><span>狀態</span><span>到職日</span></div>{[...rows].sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')).map(x=><div className="bulkPersonRow" key={x.id}><input value={x.name} onChange={e=>change(x.id,{name:e.target.value})}/><input value={x.department||''} onChange={e=>change(x.id,{department:e.target.value})}/><select value={x.active?'active':'inactive'} onChange={e=>change(x.id,{active:e.target.value==='active'})}><option value="active">在職</option><option value="inactive">停用</option></select><input type="date" value={x.hireDate} onChange={e=>change(x.id,{hireDate:e.target.value})}/></div>)}</div>{msg&&<div className="notice error">{msg}</div>}<button className="primary wide" onClick={save} disabled={busy}>{busy?'儲存中…':'儲存全部修改'}</button></Modal>}
function ItemModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({item_code:'',name:'',spec:'',category:'',unit:'個',stock:0,safety_stock:0,location:'',note:''});const save=async()=>{const r=await supabase.from('items').insert({...f,owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增文具" onClose={onClose}><FormFields f={f} setF={setF} fields={['item_code','name','spec','category','unit','stock','safety_stock','location','note']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function PersonModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){const today=new Date().toISOString().slice(0,10);const [f,setF]=useState({name:'',department:'',active:true,hireDate:today});const [msg,setMsg]=useState('');const save=async()=>{setMsg('');if(!f.name.trim())return setMsg('請輸入姓名');const r=await supabase.from('people').insert({name:f.name.trim(),department:f.department.trim(),active:f.active,created_at:`${f.hireDate}T00:00:00`,title:'',owner_id:(await supabase.auth.getUser()).data.user!.id});if(r.error)return setMsg(r.error.message);onClose();onDone()};return <Modal title="新增人員" onClose={onClose}><div className="formGrid"><Field label="姓名"><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><Field label="部門"><input value={f.department} onChange={e=>setF({...f,department:e.target.value})}/></Field><Field label="狀態"><select value={f.active?'active':'inactive'} onChange={e=>setF({...f,active:e.target.value==='active'})}><option value="active">在職</option><option value="inactive">停用</option></select></Field><Field label="到職日"><input type="date" value={f.hireDate} onChange={e=>setF({...f,hireDate:e.target.value})}/></Field></div>{msg&&<div className="notice error">{msg}</div>}<button className="primary wide" onClick={save}>儲存</button></Modal>}
function ToolModal({onClose,onDone}:{people:Person[];onClose:()=>void;onDone:()=>void}){const [f,setF]=useState({name:'',spec:'',serial:'',holder:'',department:'',issue_date:'',status:'在庫',note:''});const save=async()=>{const r=await supabase.from('tools').insert({...f,owner_id:(await supabase.auth.getUser()).data.user!.id});if(!r.error){onClose();onDone()}};return <Modal title="新增個人工具" onClose={onClose}><FormFields f={f} setF={setF} fields={['name','spec','serial','holder','department','issue_date','status','note']}/><button className="primary wide" onClick={save}>儲存</button></Modal>}
function ReceiveModal({items,onClose,onDone}:{items:Item[];onClose:()=>void;onDone:()=>void}){const [item,setItem]=useState('');const [qty,setQty]=useState(1);const save=async()=>{const r=await supabase.rpc('receive_stationery',{p_item_id:item,p_quantity:qty,p_source:'',p_note:''});if(!r.error){onClose();onDone()}};return <Modal title="入庫登記" onClose={onClose}><Field label="文具"><select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="數量"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><button className="primary wide" onClick={save}>確認入庫</button></Modal>}
function IssueModal({items,tools,people,onClose,onDone}:{items:Item[];tools:Tool[];people:Person[];onClose:()=>void;onDone:()=>void}){return <Modal title="快速領用" onClose={onClose}><IssueForm items={items} tools={tools} people={people} onDone={()=>{onClose();onDone()}}/></Modal>}
function FormFields({f,setF,fields}:{f:any;setF:(x:any)=>void;fields:string[]}){const labels:any={item_code:'商品編號／料號',name:'名稱',spec:'規格',category:'類別',unit:'單位',stock:'庫存',safety_stock:'安全庫存',location:'位置',note:'備註',department:'部門',title:'職稱',serial:'管理編號／序號',holder:'保管人',issue_date:'領用日期',status:'狀態'};return <div className="formGrid">{fields.map(k=><Field key={k} label={k==='serial'?<>{labels[k]} <em className="requiredMark">必填</em></>:labels[k]||k}><input className={k==='serial'?'requiredInput':undefined} required={k==='serial'} aria-required={k==='serial'} placeholder={k==='serial'?'例如：SB01（每件工具使用不同編號）':undefined} type={['stock','safety_stock'].includes(k)?'number':k==='issue_date'?'date':'text'} value={f[k]??''} onChange={e=>setF({...f,[k]:['stock','safety_stock'].includes(k)?Number(e.target.value):e.target.value})}/></Field>)}</div>}

function ItemsInventoryPage({items,onAdd,onDone}:{items:Item[];onAdd:()=>void;onDone:()=>void}){
  return <><div className="inventoryAddRow"><button className="primary" onClick={onAdd}><Plus size={17}/>新增</button></div><ItemsPage items={items} onDone={onDone}/></>
}

function ToolsInventoryPage({tools,onAdd,onDone}:{tools:Tool[];onAdd:()=>void;onDone:()=>void}){
  const [q,setQ]=useState('')
  const [msg,setMsg]=useState('')
  const [selected,setSelected]=useState<string[]>([])
  const [editing,setEditing]=useState<Tool|null>(null)
  const [expanded,setExpanded]=useState<string[]>([])
  const rows=tools.filter(x=>((x.item_code||'')+x.name+(x.spec||'')+(x.category||'')+(x.serial||'')).toLowerCase().includes(q.toLowerCase()))
  const groups=Object.values(rows.reduce((all,tool)=>{const key=`${tool.item_code||''}|${tool.name}|${tool.spec||''}|${tool.category||''}|${tool.unit||''}`;(all[key]??={key,tools:[] as Tool[]}).tools.push(tool);return all},{} as Record<string,{key:string;tools:Tool[]}>))
  const template=()=>downloadInventoryTemplate('個人工具批次新增範本.xlsx',toolImportHeaders,['TEST-999','安全帶','標準型','SB01～SB26','安全防護','條','1','0','T-01','逐件管理'])
  const importFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setMsg('');try{const rows=await readInventoryFile(file);const missing=rows.findIndex(c=>!String(c[9]||'').trim());if(missing>=0)throw new Error(`第 ${missing+2} 列缺少必填的「管理編號」`);const data=rows.flatMap(c=>{const serials=expandSerialRange(c[9]);return serials.map(serial=>({item_code:c[0]||'',name:c[1],spec:c[2]||'',category:c[3]||'',unit:c[4]||'個',stock:serials.length>1?1:Number(c[5]||1),safety_stock:Number(c[6]||0),location:c[7]||'',note:c[8]||'',serial,holder:'',department:'',issue_date:'',status:'在庫'}))});const user=(await supabase.auth.getUser()).data.user;const {error}=await supabase.from('tools').insert(data.map(x=>({...x,owner_id:user!.id})));setMsg(error?error.message:`已批次新增 ${data.length} 筆個人工具`);if(!error)onDone()}catch(error:any){setMsg(error.message||'檔案無法讀取')}finally{e.target.value=''}}
  const exportReport=()=>{const data=rows.map(x=>({'料號':x.item_code||'','管理編號':x.serial||'','名稱':x.name,'規格':x.spec||'','單位':x.unit||'個','工務所庫存':Number(x.stock||0),'辦公室庫存':'','庫存總量':'','ERP數量':'','差異量':'','位置':x.location||'','備註':x.note||''}));const sheet=XLSX.utils.json_to_sheet(data);sheet['!cols']=[14,14,22,18,10,14,14,14,12,12,14,24].map(w=>({wch:w}));const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'個人工具庫存');XLSX.writeFile(workbook,`個人工具庫存報表_${new Date().toISOString().slice(0,10)}.xlsx`)}
  const toggle=(id:string)=>setSelected(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id])
  const toggleGroup=(group:{tools:Tool[]})=>{const ids=group.tools.map(x=>x.id);const checked=ids.every(id=>selected.includes(id));setSelected(checked?selected.filter(id=>!ids.includes(id)):[...new Set([...selected,...ids])])}
  const removeSelected=async()=>{if(!selected.length)return;if(!await confirmDialog(`確定刪除已勾選的 ${selected.length} 筆個人工具？`))return;const {error}=await supabase.from('tools').delete().in('id',selected);setMsg(error?error.message:`已刪除 ${selected.length} 筆個人工具`);if(!error){setSelected([]);onDone()}}
  const allSelected=rows.length>0&&rows.every(x=>selected.includes(x.id));const toggleAll=()=>setSelected(allSelected?selected.filter(id=>!rows.some(x=>x.id===id)):[...new Set([...selected,...rows.map(x=>x.id)])])
  const groupedRows=groups.flatMap(group=>{const first=group.tools[0];const open=expanded.includes(group.key)||Boolean(q.trim());const ids=group.tools.map(x=>x.id);const groupSelected=ids.length>0&&ids.every(id=>selected.includes(id));const totalStock=group.tools.reduce((sum,x)=>sum+Number(x.stock||0),0);const totalSafety=group.tools.reduce((sum,x)=>sum+Number(x.safety_stock||0),0);const locations=[...new Set(group.tools.map(x=>x.location).filter(Boolean))];return [<tr key={`group-${group.key}`} className="toolGroupRow">
    <td><input className="rowCheck" type="checkbox" checked={groupSelected} onChange={()=>toggleGroup(group)}/></td><td>{first.item_code||'-'}</td><td><button className="groupToggle" onClick={()=>setExpanded(open?expanded.filter(x=>x!==group.key):[...expanded,group.key])}><ChevronDown size={16} className={open?'open':''}/><b>{group.tools.length} 個管理編號</b></button></td><td><b>{first.name}</b></td><td>{first.spec||'-'}</td><td>{first.category||'-'}</td><td>{totalStock} {first.unit||'個'}</td><td>{totalSafety} {first.unit||'個'}</td><td>{locations.length===1?locations[0]:locations.length?'多個位置':'-'}</td><td><button className="smallBtn" onClick={()=>setExpanded(open?expanded.filter(x=>x!==group.key):[...expanded,group.key])}>{open?'收合':'展開管理'}</button></td>
  </tr>,...(open?group.tools.map(x=><tr key={x.id} className="toolChildRow">
    <td><input className="rowCheck" type="checkbox" checked={selected.includes(x.id)} onChange={()=>toggle(x.id)}/></td><td><span className="childGuide">↳</span></td><td className="serialCell"><b>{x.serial||'尚未設定'}</b></td><td>{x.name}</td><td>{x.spec||'-'}</td><td>{x.category||'-'}</td><td>{Number(x.stock||0)} {x.unit||'個'}</td><td>{Number(x.safety_stock||0)} {x.unit||'個'}</td><td>{x.location||'-'}</td><td><button className="smallBtn" onClick={()=>setEditing(x)}>編輯此編號</button></td>
  </tr>):[])]})
  return <div className="content">
    <div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋…"/></div><button className="smallBtn dangerBtn" onClick={removeSelected} disabled={!selected.length}>批次刪除{selected.length?`（${selected.length}）`:''}</button><button className="smallBtn" onClick={exportReport}>匯出報表</button><button className="smallBtn" onClick={template}>下載 Excel 範本</button><label className="primary uploadBtn">批次新增<input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={importFile}/></label><button className="primary" onClick={onAdd}><Plus size={17}/>新增</button></div>
    {msg&&<div className={msg.includes('已')?'notice':'notice error'}>{msg}</div>}
    <Table headers={[<label className="selectAll"><input className="rowCheck" type="checkbox" checked={allSelected} onChange={toggleAll}/>全選</label>,'料號',<span className="requiredCol">附屬管理編號</span>,'品項','規格','類別','庫存','安全庫存','位置','操作']} rows={groupedRows}/>
    {editing&&<InventoryEditModal kind="tool" record={editing} onClose={()=>setEditing(null)} onDone={()=>{setEditing(null);onDone()}}/>}
  </div>
}

function InventoryToolModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){
  const [f,setF]=useState({item_code:'',name:'',spec:'',category:'',unit:'個',stock:1,safety_stock:0,location:'',note:'',serial:'',holder:'',department:'',issue_date:'',status:'在庫'})
  const [msg,setMsg]=useState('')
  const save=async()=>{
    if(!f.name.trim())return setMsg('請輸入品項名稱')
    if(!f.serial.trim())return setMsg('請輸入必填的管理編號／序號')
    const user=(await supabase.auth.getUser()).data.user
    const {error}=await supabase.from('tools').insert({...f,owner_id:user!.id})
    if(error)setMsg(error.message);else{onClose();onDone()}
  }
  return <Modal title="新增個人工具" onClose={onClose}><FormFields f={f} setF={setF} fields={['item_code','serial','name','spec','category','unit','stock','safety_stock','location','note']}/>{msg&&<div className="notice error">{msg}</div>}<button className="primary wide" onClick={save}>儲存</button></Modal>
}

function InventoryEditModal({kind,record,onClose,onDone}:{kind:'item'|'tool';record:Item|Tool;onClose:()=>void;onDone:()=>void}){
  const [f,setF]=useState({item_code:record.item_code||'',name:record.name||'',spec:record.spec||'',category:record.category||'',unit:record.unit||'個',stock:Number(record.stock||0),safety_stock:Number(record.safety_stock||0),location:record.location||'',note:record.note||'',...(kind==='tool'?{serial:(record as Tool).serial||''}:{})})
  const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false)
  const save=async()=>{setMsg('');if(!f.name.trim())return setMsg('請輸入品項名稱');if(kind==='tool'&&!String((f as any).serial||'').trim())return setMsg('請輸入必填的管理編號／序號');setBusy(true);const {error}=await supabase.from(kind==='item'?'items':'tools').update(f).eq('id',record.id);setBusy(false);if(error)return setMsg(error.message);onDone()}
  return <Modal title={`編輯${kind==='item'?'文具':'個人工具'}`} onClose={onClose}><FormFields f={f} setF={setF} fields={['item_code',...(kind==='tool'?['serial']:[]),'name','spec','category','unit','stock','safety_stock','location','note']}/>{msg&&<div className="notice error">{msg}</div>}<button className="primary wide" onClick={save} disabled={busy}>{busy?'儲存中…':'儲存修改'}</button></Modal>
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
    if(!await confirmDialog(`確定刪除帳號「${a.username||a.email}」？刪除後將無法登入。`))return
    const r=await supabase.rpc('admin_delete_account',{p_user_id:a.user_id})
    setMsg(r.error?r.error.message:'帳號已刪除')
    if(!r.error)loadAccounts()
  }
  return <div className="content"><div className="panel formPanel accountPanel"><h2>新增人員帳號</h2><p className="accountHint">設定個人帳號後，可使用個人帳號或 Email 登入。</p><div className="formGrid"><Field label="個人帳號"><input value={personalAccount} onChange={e=>setPersonalAccount(e.target.value)} placeholder="例如 wang.xiaoming"/></Field><Field label="申請人 Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></Field><Field label="設定密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 個字元"/></Field><Field label="確認密碼"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field></div>{msg&&<div className={msg.includes('完成')||msg.includes('刪除')?'notice':'notice error'}>{msg}</div>}<button className="primary" onClick={apply} disabled={busy}>{busy?'申請中…':'新增帳號'}</button></div><div className="panel"><div className="panelTitle"><b>人員帳號管理</b><span>僅主帳號可查看及刪除</span></div><Table headers={['個人帳號','Email','建立日期','操作']} rows={accounts.map(a=><tr key={a.user_id}><td><b>{a.email.toLowerCase()===ALLOWED_EMAIL?'keker':a.username||'-'}</b></td><td>{a.email}</td><td>{a.created_at?new Date(a.created_at).toLocaleDateString('zh-TW'):'-'}</td><td>{a.email.toLowerCase()===ALLOWED_EMAIL?<span>主帳號</span>:<button className="smallBtn dangerBtn" onClick={()=>remove(a)}>刪除帳號</button>}</td></tr>)}/></div></div>
}

type InventoryLine={key:number;kind:'文具'|'個人工具';itemId:string;itemQuery:string;qty:number}
const newLine=(kind:'文具'|'個人工具'='文具'):InventoryLine=>({key:Date.now()+Math.random(),kind,itemId:'',itemQuery:'',qty:1})
function InventoryLines({lines,setLines,items,tools}:{lines:InventoryLine[];setLines:(v:InventoryLine[])=>void;items:Item[];tools:Tool[]}){
  const update=(key:number,patch:Partial<InventoryLine>)=>setLines(lines.map(x=>x.key===key?{...x,...patch}:x))
  return <div className="multiLines">{lines.map((line,index)=>{const source=line.kind==='文具'?items:tools.filter(x=>Boolean(x.serial));const choices=source.map(x=>({id:x.id,label:`${x.item_code?`${x.item_code}｜`:''}${x.name}${'serial' in x&&x.serial?`｜管理編號 ${x.serial}`:''}`}));const selected=source.find(x=>x.id===line.itemId);const isSingleTool=line.kind==='個人工具'&&selected&&'serial' in selected&&Boolean(selected.serial);const listId=`inventory-options-${line.key}`;return <div className="multiLine" key={line.key}>
    <span className="lineNumber">{index+1}</span>
    <Field label="類型"><select value={line.kind} onChange={e=>update(line.key,{kind:e.target.value as '文具'|'個人工具',itemId:'',itemQuery:''})}><option>文具</option><option>個人工具</option></select></Field>
    <Field label={line.kind==='個人工具'?'品項／附屬管理編號':'品項'}><input list={listId} value={line.itemQuery} placeholder={line.kind==='個人工具'?'輸入品項或管理編號搜尋':'輸入品項名稱或料號搜尋'} onChange={e=>{const value=e.target.value;const match=choices.find(x=>x.label===value);update(line.key,{itemQuery:value,itemId:match?.id||''})}}/><datalist id={listId}>{choices.map(x=><option key={x.id} value={x.label}/>)}</datalist></Field>
    <Field label="料號"><input value={selected?.item_code||''} placeholder="選擇後顯示" readOnly/></Field>
    <Field label="規格"><input value={selected?.spec||''} placeholder="選擇後顯示" readOnly/></Field>
    <Field label="庫存"><input value={selected?`${Number(selected.stock||0)} ${selected.unit||'個'}`:''} placeholder="選擇後顯示" readOnly/></Field>
    <Field label="數量"><input type="number" min="1" max={isSingleTool?1:undefined} value={isSingleTool?1:line.qty} onChange={e=>update(line.key,{qty:isSingleTool?1:Math.max(1,Number(e.target.value))})}/></Field>
    <button className="smallBtn lineRemove" onClick={()=>setLines(lines.filter(x=>x.key!==line.key))} disabled={lines.length===1}>移除</button>
  </div>})}</div>
}

function MultiIssuePage({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){
  const [lines,setLines]=useState<InventoryLine[]>([newLine()])
  const [person,setPerson]=useState('');const [dept,setDept]=useState('');const [note,setNote]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false)
  const submit=async()=>{setMsg('');const valid=lines.filter(x=>x.itemId);if(!person)return setMsg('請選擇領用人員');if(!valid.length)return setMsg('請至少選擇一筆品項');setBusy(true);for(const line of valid){const r=line.kind==='文具'?await supabase.rpc('issue_stationery',{p_item_id:line.itemId,p_quantity:line.qty,p_person:person,p_department:dept,p_note:note}):await supabase.rpc('issue_tool_inventory',{p_tool_id:line.itemId,p_quantity:line.qty,p_person:person,p_department:dept,p_note:note});if(r.error){setBusy(false);return setMsg(r.error.message)}}setBusy(false);setMsg(`已完成 ${valid.length} 筆領用`);setLines([newLine()]);setNote('');onDone()}
  return <div className="content"><div className="panel formPanel"><InventoryLines lines={lines} setLines={setLines} items={items} tools={tools}/><button className="smallBtn addLineBtn" onClick={()=>setLines([...lines,newLine()])}><Plus size={16}/>加入品項</button><div className="formGrid multiMeta"><Field label="領用人員"><input list="issue-people" value={person} onChange={e=>{const value=e.target.value;setPerson(value);setDept(people.find(x=>x.name===value)?.department||'')}} placeholder="輸入姓名或搜尋"/><datalist id="issue-people">{people.filter(x=>x.active).map(x=><option key={x.id} value={x.name}>{x.department}</option>)}</datalist></Field><Field label="部門"><input value={dept} onChange={e=>setDept(e.target.value)}/></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{msg&&<div className={msg.includes('完成')?'notice':'notice error'}>{msg}</div>}<button className="primary wide" onClick={submit} disabled={busy}>{busy?'處理中…':'確認領用'}</button></div></div>
}

function MultiReceivePage({items,tools,people,onDone}:{items:Item[];tools:Tool[];people:Person[];onDone:()=>void}){
  const [lines,setLines]=useState<InventoryLine[]>([newLine()]);const [source,setSource]=useState('退還');const [returnPerson,setReturnPerson]=useState('');const [note,setNote]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false)
  const submit=async()=>{setMsg('');const valid=lines.filter(x=>x.itemId);if(!valid.length)return setMsg('請至少選擇一筆品項');if(source==='退還'&&!returnPerson.trim())return setMsg('請輸入退還人員');const fullNote=[returnPerson.trim()?`退還人員：${returnPerson.trim()}`:'',note.trim()].filter(Boolean).join('；');setBusy(true);for(const line of valid){const r=line.kind==='文具'?await supabase.rpc('receive_stationery',{p_item_id:line.itemId,p_quantity:line.qty,p_source:source,p_note:fullNote}):await supabase.rpc('receive_tool_inventory',{p_tool_id:line.itemId,p_quantity:line.qty,p_note:fullNote||source});if(r.error){setBusy(false);return setMsg(r.error.message)}}setBusy(false);setMsg(`已完成 ${valid.length} 筆退還／入庫`);setLines([newLine()]);setReturnPerson('');setNote('');onDone()}
  return <div className="content"><div className="panel formPanel"><InventoryLines lines={lines} setLines={setLines} items={items} tools={tools}/><button className="smallBtn addLineBtn" onClick={()=>setLines([...lines,newLine()])}><Plus size={16}/>加入退還／入庫品項</button><div className="formGrid multiMeta"><Field label="來源／動作"><select value={source} onChange={e=>setSource(e.target.value)}><option value="退還">退還</option><option value="採購入庫">採購入庫</option><option value="盤點調整">盤點調整</option></select></Field><Field label="退還人員"><input list="return-people" value={returnPerson} onChange={e=>setReturnPerson(e.target.value)} placeholder="輸入姓名或搜尋"/><datalist id="return-people">{people.map(x=><option key={x.id} value={x.name}>{x.department}</option>)}</datalist></Field><Field label="備註"><input value={note} onChange={e=>setNote(e.target.value)}/></Field></div>{msg&&<div className={msg.includes('完成')?'notice':'notice error'}>{msg}</div>}<button className="primary wide" onClick={submit} disabled={busy}>{busy?'處理中…':'確認退還／入庫'}</button></div></div>
}

createRoot(document.getElementById('root')!).render(<App/>)
