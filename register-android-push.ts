const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);

  try{
    const url=Deno.env.get("SUPABASE_URL");
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!service) return json({error:"Server config missing"},500);

    const body=await req.json();
    const token=String(body?.token||"").trim();
    if(token.length<20) return json({error:"Invalid token"},400);

    const r=await fetch(`${url}/rest/v1/android_push_devices`,{
      method:"POST",
      headers:{
        apikey:service,
        Authorization:`Bearer ${service}`,
        "Content-Type":"application/json",
        Prefer:"resolution=merge-duplicates,return=minimal"
      },
      body:JSON.stringify({
        token,
        platform:"android",
        app:"pizza-de-silva-admin",
        updated_at:new Date().toISOString()
      })
    });
    if(!r.ok) return json({error:await r.text()},500);
    return json({ok:true});
  }catch(e){
    return json({error:e instanceof Error?e.message:"unknown"},500);
  }
});
