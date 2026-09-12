
import webpush from "npm:web-push@3.6.7";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});

webpush.setVapidDetails("mailto:pizzadesilva@gmail.com","BB2RAC97nR5edcRLB9Tq-XKg_ioHyCE2WZcvyT4d9z1PPrhJ2CryYoc-h4FoqEIJ3e4-tYqdGlwh8ufRhSvArs0","LcH3Wa3ngUEdg-y_5gPedHXuAY1p2NARnEZF5mc3e9k");

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const body=await req.json();
    if(body?.secret!=="xLQ2aKXZiPKi0REvxtve0VPaBmye-PZb-DQZWb6Uhqw") return json({error:"Forbidden"},403);

    const url=Deno.env.get("SUPABASE_URL");
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!service) return json({error:"Server-Konfiguration fehlt"},500);

    const r=await fetch(`${url}/rest/v1/admin_push_subscriptions?select=*`,{
      headers:{apikey:service,Authorization:`Bearer ${service}`}
    });
    const subs=await r.json();
    if(!r.ok) return json({error:"Abos konnten nicht geladen werden"},500);

    const c=body?.customer||{};
    const nr=body?.order_number??"";
    const total=Number(body?.total||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
    const payload=JSON.stringify({
      title:`🔔 Neue Bestellung #${nr}`,
      body:`${c.type||"Bestellung"} · ${total} · ${c.name||"Kunde"}`,
      orderNumber:nr,
      orderId:body?.order_id||null,
      url:"/admin.html",
      tag:`pds-order-${body?.order_id||nr}`
    });

    let sent=0;
    for(const s of Array.isArray(subs)?subs:[]){
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:3600,urgency:"high"});
        sent++;
      }catch(e:any){
        const code=Number(e?.statusCode||0);
        if(code===404||code===410){
          await fetch(`${url}/rest/v1/admin_push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`,{
            method:"DELETE",headers:{apikey:service,Authorization:`Bearer ${service}`}
          });
        }
      }
    }
    return json({ok:true,sent});
  }catch(e){ return json({error:e instanceof Error?e.message:"Unbekannter Fehler"},500); }
});
