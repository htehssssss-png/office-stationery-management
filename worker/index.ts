export interface Env{DB:D1Database;ASSETS:Fetcher}

const TABLES:{[key:string]:Set<string>}={
  items:new Set(['id','owner_id','item_code','name','spec','category','unit','stock','safety_stock','location','note','created_at']),
  people:new Set(['id','owner_id','name','department','title','active','created_at']),
  movements:new Set(['id','owner_id','type','date','item_id','item_name','quantity','person','department','source','note']),
  tools:new Set(['id','owner_id','item_code','name','spec','category','unit','stock','safety_stock','location','serial','holder','department','issue_date','status','note','created_at']),
  tool_movements:new Set(['id','owner_id','type','date','tool_id','tool_name','serial','quantity','person','department','note'])
}
const json=(data:any,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(status<400?{data}:{error:data}),{status,headers:{'content-type':'application/json;charset=utf-8',...headers}})
const uuid=()=>crypto.randomUUID()
let schemaReady=false
async function ensureSchema(env:Env){if(schemaReady)return;const statements=[
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,username TEXT UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY,owner_id TEXT,item_code TEXT DEFAULT '',name TEXT NOT NULL,spec TEXT DEFAULT '',category TEXT DEFAULT '',unit TEXT DEFAULT '個',stock INTEGER DEFAULT 0,safety_stock INTEGER DEFAULT 0,location TEXT DEFAULT '',note TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY,owner_id TEXT,name TEXT NOT NULL,department TEXT DEFAULT '',title TEXT DEFAULT '',active INTEGER DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY,owner_id TEXT,type TEXT NOT NULL,date TEXT DEFAULT CURRENT_TIMESTAMP,item_id TEXT NOT NULL,item_name TEXT NOT NULL,quantity INTEGER NOT NULL,person TEXT DEFAULT '',department TEXT DEFAULT '',source TEXT DEFAULT '',note TEXT DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS tools (id TEXT PRIMARY KEY,owner_id TEXT,item_code TEXT DEFAULT '',name TEXT NOT NULL,spec TEXT DEFAULT '',category TEXT DEFAULT '',unit TEXT DEFAULT '個',stock INTEGER DEFAULT 0,safety_stock INTEGER DEFAULT 0,location TEXT DEFAULT '',serial TEXT DEFAULT '',holder TEXT DEFAULT '',department TEXT DEFAULT '',issue_date TEXT DEFAULT '',status TEXT DEFAULT '在庫',note TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS tool_movements (id TEXT PRIMARY KEY,owner_id TEXT,type TEXT NOT NULL,date TEXT DEFAULT CURRENT_TIMESTAMP,tool_id TEXT NOT NULL,tool_name TEXT NOT NULL,serial TEXT DEFAULT '',quantity INTEGER DEFAULT 1,person TEXT DEFAULT '',department TEXT DEFAULT '',note TEXT DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS movement_delete_requests (
    id TEXT PRIMARY KEY, movement_table TEXT NOT NULL, movement_id TEXT NOT NULL,
    requester_id TEXT NOT NULL, requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approver_id TEXT, approved_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_movement_delete
    ON movement_delete_requests(movement_table, movement_id) WHERE approved_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS data_delete_requests (
    id TEXT PRIMARY KEY, target_table TEXT NOT NULL, target_id TEXT NOT NULL,
    target_label TEXT NOT NULL, requester_id TEXT NOT NULL,
    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, approver_id TEXT, approved_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_data_delete
    ON data_delete_requests(target_table,target_id) WHERE approved_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date)`,
  `CREATE INDEX IF NOT EXISTS idx_tool_movements_date ON tool_movements(date)`
 ];await env.DB.batch(statements.map(sql=>env.DB.prepare(sql)));schemaReady=true}
const bytesToBase64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes))
const base64ToBytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0))
async function hashPassword(password:string,salt=crypto.getRandomValues(new Uint8Array(16))){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);return {hash:bytesToBase64(new Uint8Array(bits)),salt:bytesToBase64(salt)}}
async function sessionUser(request:Request,env:Env){const cookie=request.headers.get('cookie')||'';const token=/\binventory_session=([^;]+)/.exec(cookie)?.[1];if(!token)return null;return env.DB.prepare(`SELECT u.id,u.email,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>datetime('now')`).bind(token).first<any>()}
async function requireUser(request:Request,env:Env){const user=await sessionUser(request,env);if(!user)throw new Response(JSON.stringify({error:'登入已逾時，請重新登入'}),{status:401,headers:{'content-type':'application/json'}});return user}
function fields(table:string,values:any){const allowed=TABLES[table];if(!allowed)throw new Error('不允許的資料表');const clean:any={};for(const [key,value] of Object.entries(values||{}))if(allowed.has(key))clean[key]=typeof value==='boolean'?(value?1:0):value;return clean}
function filtersSql(table:string,filters:any[]=[]){const allowed=TABLES[table];const parts:string[]=[];const args:any[]=[];for(const f of filters){if(!allowed?.has(f.field))throw new Error('不允許的篩選欄位');if(f.op==='in'){const values=Array.isArray(f.value)?f.value:[];if(!values.length){parts.push('1=0');continue}parts.push(`${f.field} IN (${values.map(()=>'?').join(',')})`);args.push(...values)}else{const op:{[key:string]:string}={eq:'=',neq:'!=',gt:'>'};if(!op[f.op])throw new Error('不允許的篩選條件');parts.push(`${f.field} ${op[f.op]} ?`);args.push(f.value)}}return {sql:parts.length?` WHERE ${parts.join(' AND ')}`:'',args}}
async function query(request:Request,env:Env){const user=await requireUser(request,env);const body:any=await request.json();const table=String(body.table||'');if(!TABLES[table])return json('不允許的資料表',400);const movementTable=table==='movements'||table==='tool_movements';const {sql:where,args}=filtersSql(table,body.filters);if(body.action==='select'){let sql=`SELECT * FROM ${table}${where}`;if(body.order?.field&&TABLES[table].has(body.order.field))sql+=` ORDER BY ${body.order.field} ${body.order.ascending?'ASC':'DESC'}`;const result=await env.DB.prepare(sql).bind(...args).all();const rows=result.results.map((row:any)=>table==='people'?{...row,active:Boolean(row.active)}:row);if(body.one==='single'&&rows.length!==1)return json(rows.length?'找到多筆資料':'找不到資料',406);return json(body.one?rows[0]||null:rows)}
  if(body.action==='insert'){const list=Array.isArray(body.values)?body.values:[body.values];const created:any[]=[];for(const raw of list){const row=fields(table,{id:raw?.id||uuid(),...raw});const keys=Object.keys(row);await env.DB.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>row[k])).run();created.push(row)}return json(body.one?created[0]:created)}
  if(body.action==='update'){const row=fields(table,body.values);if(table==='tools'&&row.status==='已刪除')return json('請先送出刪除申請',403);if(movementTable&&('note' in row)&&(user.role!=='admin'||String(row.note).startsWith(deletedMovementPrefix)))return json('請透過紀錄查詢申請刪除',403);const keys=Object.keys(row);if(!keys.length)return json('沒有可更新的欄位',400);if(body.columns){const result=await env.DB.prepare(`UPDATE ${table} SET ${keys.map(k=>`${k}=?`).join(',')}${where} RETURNING *`).bind(...keys.map(k=>row[k]),...args).all();const rows=result.results;return json(body.one?(rows[0]||null):rows)}await env.DB.prepare(`UPDATE ${table} SET ${keys.map(k=>`${k}=?`).join(',')}${where}`).bind(...keys.map(k=>row[k]),...args).run();return json(null)}
  if(body.action==='delete'){
    if(movementTable||table==='items')return json('請透過紀錄查詢申請刪除',403);
    if(table==='tools'){
      const cleanup=body.filters?.length===1&&body.filters[0].field==='id'&&body.filters[0].op==='eq';
      if(!cleanup)return json('請先送出刪除申請',403);
      await env.DB.prepare(`DELETE FROM tools WHERE id=? AND owner_id=? AND stock=0
        AND coalesce(serial,'')<>'' AND datetime(created_at)>=datetime('now','-5 minutes')
        AND NOT EXISTS (SELECT 1 FROM tool_movements WHERE tool_id=tools.id)`).bind(args[0],user.id).run();
      return json(null);
    }
    await env.DB.prepare(`DELETE FROM ${table}${where}`).bind(...args).run();
    return json(null);
  }
  return json('不支援的操作',400)
}
async function createSession(env:Env,user:any){const id=uuid();await env.DB.prepare(`INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,datetime('now','+30 days'))`).bind(id,user.id).run();return {session:{user:{id:user.id,email:user.email,username:user.username,role:user.role}},cookie:`inventory_session=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`}}
async function auth(request:Request,env:Env,path:string){
  if(path==='/auth/session'){const user=await sessionUser(request,env);return json({session:user?{user}:null})}
  if(path==='/auth/signup'){const operator=await requireUser(request,env);if(operator.role!=='admin')return json('僅系統管理員可新增帳號',403);const {password,username:requestedUsername}=await request.json<any>();if(String(password).length<4)return json('密碼至少需要 4 個字元',400);const id=uuid(),username=String(requestedUsername||'').trim(),email=`${username}@local.invalid`;if(!/^[a-z0-9._-]{3,30}$/i.test(username))return json('個人帳號格式不正確',400);const encoded=await hashPassword(password);try{await env.DB.prepare('INSERT INTO users(id,email,username,password_hash,password_salt,role) VALUES(?,?,?,?,?,?)').bind(id,email,username,encoded.hash,encoded.salt,'user').run()}catch{return json('此帳號已存在',409)}const user=await env.DB.prepare('SELECT id,email,username,role FROM users WHERE id=?').bind(id).first<any>();return json({user,session:null})}
  if(path==='/auth/login'){const {email,password}=await request.json<any>();const login=String(email).trim();const user=await env.DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE OR username=? COLLATE NOCASE').bind(login,login).first<any>();if(!user)return json('帳號或密碼錯誤',401);const encoded=await hashPassword(String(password),base64ToBytes(user.password_salt));if(encoded.hash!==user.password_hash)return json('帳號或密碼錯誤',401);const made=await createSession(env,user);return json({session:made.session},200,{'set-cookie':made.cookie})}
  if(path==='/auth/logout'){const cookie=request.headers.get('cookie')||'';const token=/\binventory_session=([^;]+)/.exec(cookie)?.[1];if(token)await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(token).run();return json(null,200,{'set-cookie':'inventory_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'})}
  if(path==='/auth/password'){const user=await requireUser(request,env);const {password}=await request.json<any>();if(String(password).length<4)return json('密碼至少需要 4 個字元',400);const encoded=await hashPassword(String(password));await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(encoded.hash,encoded.salt,user.id).run();return json({user})}
  return json('找不到登入功能',404)
}
const deletedMovementPrefix = '【已刪除】';

async function movementDeletion(env: Env, user: { id: string; role: string }, approve: boolean, input: any) {
  if (approve && user.role !== 'admin') return json('僅限管理員核准', 403);
  const table = input.p_table;
  const id = input.p_id;
  if ((table !== 'movements' && table !== 'tool_movements') || typeof id !== 'string' || !id) {
    return json('紀錄資料不正確', 400);
  }
  const active = "substr(coalesce(note,''),1,5) <> '【已刪除】'";
  if (!approve) {
    const request = await env.DB.prepare(`INSERT OR IGNORE INTO movement_delete_requests
      (id, movement_table, movement_id, requester_id)
      SELECT ?, ?, id, ? FROM ${table} WHERE id=? AND ${active}`)
      .bind(uuid(), table, user.id, id).run();
    return request.meta.changes ? json(true) : json('紀錄已刪除、找不到紀錄或已有待核准申請', 409);
  }
  const tool = table === 'tool_movements';
  const inventoryTable = tool ? 'tools' : 'items';
  const movement = await env.DB.prepare(`SELECT * FROM ${table} WHERE id=? AND ${active}`).bind(id).first<any>();
  if (!movement) return json('紀錄已刪除或找不到紀錄', 409);
  const inventoryId = tool ? movement.tool_id : movement.item_id;
  const purchase = tool && movement.type !== 'out' && String(movement.note || '').includes('採購入庫');
  const quantity = Number(movement.quantity ?? 1);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return json('紀錄數量不正確', 409);
  const delta = movement.type === 'out' ? quantity : -quantity;
  const laterGuard = purchase
    ? `AND NOT EXISTS (SELECT 1 FROM tool_movements WHERE tool_id=? AND id<>? AND date>=? AND ${active})`
    : '';
  const stockGuard = purchase ? '' : 'AND coalesce(stock,0)+?>=0';
  const stockUpdate = purchase
    ? "stock=0,status='已刪除',holder='',department='',issue_date=''"
    : 'stock=coalesce(stock,0)+?';
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE ${table} SET note=?||coalesce(note,'')
      WHERE id=? AND ${active} AND coalesce(note,'')=?
      AND EXISTS (SELECT 1 FROM movement_delete_requests WHERE movement_table=? AND movement_id=? AND approved_at IS NULL)
      AND EXISTS (SELECT 1 FROM ${inventoryTable} WHERE id=? ${stockGuard}) ${laterGuard}`)
      .bind(deletedMovementPrefix, id, movement.note || '', table, id, inventoryId,
        ...(purchase ? [inventoryId, id, movement.date] : [delta])),
    env.DB.prepare(`UPDATE ${inventoryTable} SET ${stockUpdate} WHERE id=? AND changes()=1`)
      .bind(...(purchase ? [] : [delta]), inventoryId),
    env.DB.prepare(`UPDATE movement_delete_requests SET approver_id=?, approved_at=CURRENT_TIMESTAMP
      WHERE movement_table=? AND movement_id=? AND approved_at IS NULL AND changes()=1`)
      .bind(user.id, table, id),
  ]);
  if (!results[2].meta.changes) {
    return json('無法核准：請確認申請仍待審、庫存足夠，且進貨後沒有其他異動', 409);
  }
  return json(true);
}

async function dataDeletion(env: Env, user: { id: string; role: string }, action: string, p: any) {
  if (action !== 'request_data_delete' && user.role !== 'admin') return json('僅限管理員審批',403);
  if (action === 'list_data_delete_requests') {
    return json((await env.DB.prepare(
      'SELECT id,target_table,target_label,requested_at FROM data_delete_requests WHERE approved_at IS NULL ORDER BY requested_at'
    ).all()).results);
  }
  if (action === 'request_data_delete') {
    const table = p.p_table;
    if (table !== 'items' && table !== 'tools' && table !== 'users') return json('不支援的刪除類別',400);
    if (table === 'users' && user.role !== 'admin') return json('僅限管理員提出帳號刪除申請',403);
    if (!Array.isArray(p.p_ids) || !p.p_ids.length || p.p_ids.some((id: unknown) => typeof id !== 'string' || !id)) {
      return json('請選擇要申請刪除的資料',400);
    }
    const ids = [...new Set<string>(p.p_ids)];
    if (table === 'users' && ids.includes(user.id)) return json('不可申請刪除自己的帳號',400);
    const label = table === 'users' ? 'coalesce(username,email)' : table === 'tools'
      ? "name || CASE WHEN coalesce(serial,'')='' THEN '' ELSE '／'||serial END" : 'name';
    const guard = table === 'users' ? "AND coalesce(username,'') COLLATE NOCASE <> 'keker' AND email COLLATE NOCASE <> 'htehssssss@gmail.com'"
      : table === 'tools' ? "AND coalesce(status,'') <> '已刪除'" : '';
    const result = await env.DB.prepare(`INSERT OR IGNORE INTO data_delete_requests
      (id,target_table,target_id,target_label,requester_id)
      SELECT lower(hex(randomblob(16))),?,id,${label},? FROM ${table}
      WHERE id IN (SELECT value FROM json_each(?)) ${guard}`)
      .bind(table,user.id,JSON.stringify(ids)).run();
    return result.meta.changes ? json(result.meta.changes) : json('沒有可申請的資料，或已在待核准清單中',409);
  }
  const pending = await env.DB.prepare(
    'SELECT target_table,target_id FROM data_delete_requests WHERE id=? AND approved_at IS NULL'
  ).bind(String(p.p_id || '')).first<{ target_table: string; target_id: string }>();
  if (!pending) return json('找不到待核准申請',409);
  const {target_table: table,target_id: id} = pending;
  if (table !== 'items' && table !== 'tools' && table !== 'users') return json('不支援的刪除類別',400);
  if (table === 'users' && id === user.id) return json('不可核准刪除自己的帳號',403);
  const statement = table === 'tools'
    ? "UPDATE tools SET status='已刪除',stock=0,safety_stock=0,holder='',department='',issue_date='' WHERE id=? AND coalesce(status,'')<>'已刪除'"
    : table === 'users'
      ? "DELETE FROM users WHERE id=? AND coalesce(username,'') COLLATE NOCASE <> 'keker' AND email COLLATE NOCASE <> 'htehssssss@gmail.com'"
      : 'DELETE FROM items WHERE id=?';
  const result = await env.DB.batch([
    env.DB.prepare(statement + ' AND EXISTS (SELECT 1 FROM data_delete_requests WHERE id=? AND approved_at IS NULL)').bind(id,p.p_id),
    env.DB.prepare('UPDATE data_delete_requests SET approver_id=?,approved_at=CURRENT_TIMESTAMP WHERE id=? AND approved_at IS NULL AND changes()=1').bind(user.id,p.p_id),
  ]);
  return result[1].meta.changes ? json(true) : json('資料已異動或申請已處理，請重新整理',409);
}

async function rpc(request:Request,env:Env,name:string){const p:any=await request.json();
  if(name==='resolve_login'){const login=String(p.p_login||'').trim();const row=await env.DB.prepare('SELECT email FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE').bind(login,login).first<any>();return json(row?.email||null)} const user=await requireUser(request,env);
  if(name==='register_username'){await env.DB.prepare('UPDATE users SET username=? WHERE id=?').bind(String(p.p_username).toLowerCase(),p.p_user_id).run();return json(true)}
  if (name === 'list_movement_delete_requests') {
    return json((await env.DB.prepare(
      'SELECT movement_table, movement_id FROM movement_delete_requests WHERE approved_at IS NULL'
    ).all()).results);
  }
  if (name === 'request_movement_delete' || name === 'approve_movement_delete') {
    return movementDeletion(env, user, name === 'approve_movement_delete', p);
  }
  if (['request_data_delete','list_data_delete_requests','approve_data_delete'].includes(name)) {
    return dataDeletion(env,user,name,p);
  }
  if(name==='admin_list_accounts'){if(user.role!=='admin')return json('僅限管理主帳號',403);return json((await env.DB.prepare('SELECT id user_id,username,role,created_at FROM users ORDER BY created_at').all()).results)}

if(name==='admin_set_role'){if(user.role!=='admin')return json('僅限系統管理員',403);if(p.p_user_id===user.id)return json('不可修改自己的權限',400);const role=p.p_role==='admin'?'admin':'user';await env.DB.prepare('UPDATE users SET role=? WHERE id=?').bind(role,p.p_user_id).run();return json(true)}
  const now = new Date();
  let issueTimestamp = now.toISOString();
  if (p.p_date !== undefined && (name === 'issue_stationery' || name === 'issue_tool_inventory')) {
    const date = p.p_date;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json('領用日期格式不正確', 400);
    const parsed = new Date(date + 'T00:00:00Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return json('領用日期不正確', 400);
    const taipeiTime = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(11, 23);
    issueTimestamp = new Date(`${date}T${taipeiTime}+08:00`).toISOString();
  }
  if(name==='issue_stationery'||name==='receive_stationery'){const item=await env.DB.prepare('SELECT * FROM items WHERE id=?').bind(p.p_item_id).first<any>();if(!item)return json('找不到文具品項',404);const qty=Math.max(1,Number(p.p_quantity)||1),out=name==='issue_stationery';if(out&&Number(item.stock)<qty)return json('庫存不足',400);const next=Number(item.stock)+(out?-qty:qty);const movement={id:uuid(),owner_id:user.id,type:out?'out':'in',date:issueTimestamp,item_id:item.id,item_name:item.name,quantity:qty,person:p.p_person||'',department:p.p_department||'',source:p.p_source||'',note:p.p_note||''};await env.DB.batch([env.DB.prepare('UPDATE items SET stock=? WHERE id=?').bind(next,item.id),env.DB.prepare('INSERT INTO movements(id,owner_id,type,date,item_id,item_name,quantity,person,department,source,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(...Object.values(movement))]);return json(true)}
  if(['issue_tool_inventory','receive_tool_inventory','move_tool'].includes(name)){const toolId=p.p_tool_id;const tool=await env.DB.prepare('SELECT * FROM tools WHERE id=?').bind(toolId).first<any>();if(!tool)return json('找不到個人工具',404);const out=name==='issue_tool_inventory'||(name==='move_tool'&&p.p_type==='out'),qty=Math.max(1,Number(p.p_quantity)||1);if(out&&Number(tool.stock)<qty)return json('庫存不足',400);const next=Number(tool.stock)+(out?-qty:qty),status=out&&next<=0?'已領用':'在庫';const movement={id:uuid(),owner_id:user.id,type:out?'out':'in',date:issueTimestamp,tool_id:tool.id,tool_name:tool.name,serial:tool.serial||'',quantity:qty,person:p.p_person||'',department:p.p_department||'',note:p.p_note||''};await env.DB.batch([env.DB.prepare('UPDATE tools SET stock=?,status=?,holder=?,department=?,issue_date=? WHERE id=?').bind(next,status,out?(p.p_person||''):'',out?(p.p_department||''):'',out?(p.p_date||issueTimestamp.slice(0,10)):'',tool.id),env.DB.prepare('INSERT INTO tool_movements(id,owner_id,type,date,tool_id,tool_name,serial,quantity,person,department,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(...Object.values(movement))]);return json(true)}
  return json('找不到此功能',404)
}
export default{async fetch(request:Request,env:Env){const url=new URL(request.url);try{if(url.pathname.startsWith('/api/'))await ensureSchema(env);if(url.pathname.startsWith('/api/auth/'))return await auth(request,env,url.pathname.slice(4));if(url.pathname==='/api/query')return await query(request,env);if(url.pathname.startsWith('/api/rpc/'))return await rpc(request,env,url.pathname.slice('/api/rpc/'.length));return env.ASSETS.fetch(request)}catch(error:any){if(error instanceof Response)return error;return json(error?.message||'伺服器發生錯誤',500)}}}
