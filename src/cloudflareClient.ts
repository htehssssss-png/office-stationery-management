type Result<T=any>={data:T|null;error:{message:string;code?:string}|null}
type Listener=(event:string,session:any)=>void

const listeners=new Set<Listener>()
let currentSession:any=null

async function request(path:string,body?:any,method=body===undefined?'GET':'POST',extraHeaders:Record<string,string>={}):Promise<Result>{
  try{
    const response=await fetch(`/api${path}`,{method,credentials:'include',headers:body===undefined?extraHeaders:{'content-type':'application/json',...extraHeaders},body:body===undefined?undefined:JSON.stringify(body)})
    const payload=await response.json().catch(()=>({error:'伺服器回應格式錯誤'}))
    if(!response.ok)return {data:null,error:{message:payload.error||`伺服器錯誤（${response.status}）`,code:payload.code}}
    return {data:payload.data??payload,error:null}
  }catch(error:any){return {data:null,error:{message:error?.message||'無法連線至伺服器'}}}
}

class QueryBuilder implements PromiseLike<Result>{
  private action='select';private payload:any={};private filters:any[]=[];private orderBy:any=null;private one:'single'|'maybe'|null=null
  constructor(private table:string){}
  select(columns='*'){this.payload.columns=columns;return this}
  insert(values:any){this.action='insert';this.payload.values=values;return this}
  update(values:any){this.action='update';this.payload.values=values;return this}
  delete(){this.action='delete';return this}
  eq(field:string,value:any){this.filters.push({op:'eq',field,value});return this}
  neq(field:string,value:any){this.filters.push({op:'neq',field,value});return this}
  gt(field:string,value:any){this.filters.push({op:'gt',field,value});return this}
  in(field:string,value:any[]){this.filters.push({op:'in',field,value});return this}
  order(field:string,options?:{ascending?:boolean}){this.orderBy={field,ascending:options?.ascending!==false};return this}
  single(){this.one='single';return this}
  maybeSingle(){this.one='maybe';return this}
  then<TResult1=Result,TResult2=never>(resolve?:((value:Result)=>TResult1|PromiseLike<TResult1>)|null,reject?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null){
    return request('/query',{table:this.table,action:this.action,values:this.payload.values,columns:this.payload.columns||'*',filters:this.filters,order:this.orderBy,one:this.one}).then(resolve,reject)
  }
}

function notify(event:string,session:any){currentSession=session;for(const listener of listeners)listener(event,session)}

export function createCloudflareClient(options:{persistSession?:boolean}={persistSession:true}){
  const persist=options.persistSession!==false
  return {
    from:(table:string)=>new QueryBuilder(table),
    rpc:(name:string,params:any={})=>request(`/rpc/${name}`,params),
    auth:{
      async getSession(){const result=await request('/auth/session');if(!result.error&&persist)currentSession=result.data?.session||null;return {data:{session:result.data?.session||null},error:result.error}},
      onAuthStateChange(listener:Listener){listeners.add(listener);return {data:{subscription:{unsubscribe:()=>listeners.delete(listener)}}}},
      async signInWithPassword({email,password}:{email:string;password:string}){const result=await request('/auth/login',{email,password});if(!result.error&&persist)notify('SIGNED_IN',result.data?.session||null);return result},
      async signOut(){const result=await request('/auth/logout',{});if(persist)notify('SIGNED_OUT',null);return result},
      async signUp({email,password,username}:{email:string;password:string;username?:string}){const result=await request('/auth/signup',{email,password,username},'POST',persist?{}:{'x-no-session':'1'});if(!result.error&&persist&&result.data?.session)notify('SIGNED_IN',result.data.session);return result},
      async getUser(){if(currentSession?.user)return {data:{user:currentSession.user},error:null};const result=await request('/auth/session');return {data:{user:result.data?.session?.user||null},error:result.error}},
      async updateUser({password}:{password:string}){return request('/auth/password',{password})},
      async resetPasswordForEmail(){return {data:null,error:{message:'請聯絡管理主帳號協助重設密碼'}}}
    }
  }
}

export const cloudflareClient=createCloudflareClient()
