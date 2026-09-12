
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL");
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!service) return json({error:"Server-Konfiguration fehlt"},500);

    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer ")) return json({error:"Nicht angemeldet"},401);
    const token=auth.slice(7);

    const userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
    if(!userRes.ok) return json({error:"Ungültige Anmeldung"},401);
    const user=await userRes.json();
    const email=String(user?.email||"").toLowerCase();
    if(!email) return json({error:"Kein Benutzer"},401);

    const adminRes=await fetch(`${url}/rest/v1/admin_users?select=email&email=eq.${encodeURIComponent(email)}&limit=1`,{
      headers:{apikey:service,Authorization:`Bearer ${service}`}
    });
    const admins=await adminRes.json();
    if(!adminRes.ok || !Array.isArray(admins) || admins.length!==1) return json({error:"Kein Admin-Zugriff"},403);

    const body=await req.json();
    const sub=body?.subscription;
    const endpoint=sub?.endpoint;
    const p256dh=sub?.keys?.p256dh;
    const authKey=sub?.keys?.auth;
    if(!endpoint||!p256dh||!authKey) return json({error:"Ungültige Push-Anmeldung"},400);

    const save=await fetch(`${url}/rest/v1/admin_push_subscriptions`,{
      method:"POST",
      headers:{apikey:service,Authorization:`Bearer ${service}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({endpoint,p256dh,auth:authKey,user_agent:String(body?.userAgent||""),updated_at:new Date().toISOString()})
    });
    if(!save.ok) return json({error:"Push-Anmeldung konnte nicht gespeichert werden",details:await save.text()},500);
    return json({ok:true});
  }catch(e){ return json({error:e instanceof Error?e.message:"Unbekannter Fehler"},500); }
});
