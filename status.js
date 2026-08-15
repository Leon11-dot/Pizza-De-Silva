
const qs=new URLSearchParams(location.search),id=qs.get('id')||localStorage.getItem('pds_last_order');
async function render(){
 const token=localStorage.getItem(`pds_order_token_${id}`)||''; const o=await PDS_BACKEND.getOrder(id,token);if(!o){document.getElementById('title').textContent='Bestellung nicht gefunden';return}
 document.getElementById('title').textContent=`Bestellung #${o.number}`;
 const labels={new:'Wartet auf Bestätigung',accepted:'Angenommen',preparing:'In Zubereitung',ready:'Bereit / unterwegs',done:'Abgeschlossen',cancelled:'Storniert'};
 document.getElementById('summary').textContent=`${labels[o.status]||o.status} • ${new Date(o.createdAt).toLocaleString('de-DE')}`;
 const steps=[['new','Bestellung gesendet','Wir haben deine Bestellung erhalten.'],['accepted','Bestellung angenommen',o.eta?`Ungefähre Zeit: ${o.eta} Minuten`:'Wir bestätigen gleich eine Zeit.'],['preparing','In Zubereitung','Deine Bestellung wird frisch zubereitet.'],['ready',o.customer.type==='Abholung'?'Bereit zur Abholung':'Unterwegs','Fast geschafft.'],['done','Abgeschlossen','Guten Appetit!']];
 const rank={new:0,accepted:1,preparing:2,ready:3,done:4,cancelled:-1},r=rank[o.status];
 document.getElementById('timeline').innerHTML=steps.map((s,i)=>`<div class="step ${r>=i?'active':''}"><span class="dot"></span><div><b>${s[1]}</b><span>${s[2]}</span></div></div>`).join('');
 document.getElementById('detail').innerHTML=o.status==='cancelled'?`<div class="notice" style="margin-top:18px"><b>Bestellung storniert.</b><br>${o.cancelReason||'Die Bestellung konnte nicht angenommen werden.'}</div>`:'';
}
setInterval(render,2000);render();
