/* Original Booked calendar workspace. Chats are local notes, never external messages. */
const CalendarWorkspace=(()=>{
 const zones=['UTC','America/New_York','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Kolkata','Asia/Tokyo','Australia/Sydney'];
 let view=innerWidth<650?'day':'month',zone='UTC',focus=new Date().toISOString().slice(0,10),layers={events:true,tasks:true,memos:true,chats:true},snapshot;
 const addDays=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 const partFormats=new Map(),instantCache=new Map();
 const parts=(seconds,tz)=>{if(!partFormats.has(tz))partFormats.set(tz,new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));return Object.fromEntries(partFormats.get(tz).formatToParts(seconds*1000).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));};
 const dateIn=(seconds,tz=zone)=>{const p=parts(seconds,tz);return `${p.year}-${p.month}-${p.day}`;};
 function instant(day,hour=0,tz=zone){
  const key=tz+'|'+day+'|'+hour;if(instantCache.has(key))return instantCache.get(key);
  const desired=Date.parse(day+`T${String(hour).padStart(2,'0')}:00:00Z`)/1000;let guess=desired;
  for(let i=0;i<5;i++){const p=parts(guess,tz),represented=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`)/1000;guess+=desired-represented;}
  const p=parts(guess,tz),result=`${p.year}-${p.month}-${p.day}`===day&&Number(p.hour)===hour?guess:NaN;instantCache.set(key,result);return result;
 }
 const clock=seconds=>new Intl.DateTimeFormat('en',{timeZone:zone,hour:'numeric',minute:'2-digit',timeZoneName:'shortOffset'}).format(seconds*1000);
 const label=day=>new Intl.DateTimeFormat('en',{dateStyle:'full',timeZone:'UTC'}).format(Date.parse(day+'T12:00:00Z'));
 function dates(){
  if(view==='day')return [focus];
  if(view==='30days')return Array.from({length:30},(_,i)=>addDays(focus,i));
  const start=view==='month'?focus.slice(0,7)+'-01':focus,weekday=(new Date(start+'T12:00:00Z').getUTCDay()+6)%7;
  return Array.from({length:view==='month'?42:7},(_,i)=>addDays(start,i-weekday));
 }
 function items(){
  const result=(snapshot.calendar_items||[]).map(x=>({...x,layer:({block:'events',task:'tasks',memo:'memos',chat:'chats'})[x.type],key:'item-'+x.id}));
  result.push(...snapshot.bookings.filter(x=>!x.cancelled).map(x=>({...x,type:'booking',layer:'events',title:x.event_name,body:`With ${x.name}`,key:'booking-'+x.id})));
  const planning=snapshot.planning;
  if(planning){
   result.push(...planning.meetings.filter(m=>m.status!=='cancelled').map(m=>({...m,type:'planning',layer:'events',key:'planning-'+m.id,body:'Fictional planning event · '+m.attendees.map(a=>planning.attendees.find(p=>p.id===a.attendeeId)?.name+' · '+a.role).join(', ')})));
   result.push(...planning.tasks.map(t=>{const m=planning.meetings.find(m=>m.id===t.meetingId);return {...t,start:m.start,end:m.end,type:'plantask',layer:'tasks',key:'plantask-'+t.id,title:t.title,done:t.status==='done',meetingId:m.id,body:'Linked to '+m.title+' · '+t.status};}).filter(t=>planning.meetings.find(m=>m.id===t.meetingId).status!=='cancelled'));
  }
  if(simulation()){
   const days=dates(),first=addDays(days[0],-1),count=days.length+3;
   for(let n=0;n<count;n++){const day=addDays(first,n),base=Date.parse(day+'T00:00:00Z')/1000;result.push({key:'lunch-'+day,type:'fictional',layer:'events',title:'Lunch · fictional busy time',body:'Static demo busy block. No real calendar is connected.',start:base+12*3600,end:base+13*3600});if(new Date(day+'T12:00:00Z').getUTCDay()===3)result.push({key:'focus-'+day,type:'fictional',layer:'events',title:'Focus · fictional busy time',body:'Static demo busy block.',start:base+14*3600,end:base+15*3600});}
  }
  return result.filter(x=>layers[x.layer]).sort((a,b)=>a.start-b.start||String(a.key).localeCompare(String(b.key)));
 }
 function onDay(day,all){const start=instant(day),end=instant(addDays(day,1));return all.filter(x=>x.start<end&&x.end>start);}
 function chip(x,day){const time=day&&x.start<instant(day)?'Continues from '+dateIn(x.start)+' · '+clock(x.start):clock(x.start);return `<button class="cal-item cal-${x.type} ${x.done?'cal-done':''}" data-cal-item="${esc(x.key)}" aria-label="${esc(x.title)}, ${esc(time)}, ${esc(x.type)}${x.done?', completed':''}"><span>${({planning:'◷',plantask:'□',task:'□',memo:'≡',chat:'◌',block:'▧',booking:'◷',fictional:'◷'})[x.type]}</span><span><strong>${esc(x.title)}</strong><small>${esc(time)}${x.type==='chat'?' · local conversation':''}${x.done?' · completed':''}</small></span></button>`;}
 function html(data){snapshot=data;const days=dates(),all=items(),visible=all.filter(x=>days.some(day=>onDay(day,[x]).length));
  const title=view==='month'?new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(Date.parse(focus+'T12:00:00Z')):view==='day'?label(focus):`${days[0]} — ${days.at(-1)}`;
  const head=`${heading('Your calendar.','Conversations, quiet hours, and little things to remember.','<button class="primary" id="cal-add">＋ Add to calendar</button>')}<section class="calendar-workspace" aria-label="Calendar workspace"><div class="cal-toolbar"><div class="cal-date-nav"><button class="secondary" id="cal-today">Today</button><button class="secondary" id="cal-refresh">Refresh</button><button class="cal-arrow" id="cal-prev" aria-label="Previous calendar period">‹</button><button class="cal-arrow" id="cal-next" aria-label="Next calendar period">›</button><h2>${esc(title)}</h2></div><div class="cal-view-buttons" role="group" aria-label="Calendar view">${[['month','Month'],['30days','30 days'],['week','Week'],['day','Day']].map(([v,t])=>`<button data-cal-view="${v}" aria-pressed="${view===v}">${t}</button>`).join('')}</div></div><div class="cal-settings"><label>Calendar date<input id="cal-date" type="date" min="2020-01-01" max="2099-12-31" value="${focus}"></label><label>View timezone<select id="cal-zone">${zones.map(z=>`<option ${zone===z?'selected':''}>${z}</option>`).join('')}</select></label><fieldset class="cal-layers"><legend>Show layers</legend>${Object.keys(layers).map(k=>`<label><input type="checkbox" data-cal-layer="${k}" ${layers[k]?'checked':''}><span class="layer-dot layer-${k}"></span>${k[0].toUpperCase()+k.slice(1)}</label>`).join('')}</fieldset></div><div class="cal-context">View: <strong>${esc(zone)}</strong> · Blocks are entered in UTC and affect booking, suggestions and rescheduling. Repeated DST hours share a row; item times include their UTC offset. Chats stay ${simulation()?'in this browser':'in this local workspace'}; no message is sent.</div>`;
  let body='';
  if(!Object.values(layers).some(Boolean))body='<div class="cal-empty" role="status"><h3>A quieter view.</h3><p>All layers are hidden. Turn one on to see your calendar items.</p></div>';
  else if(view==='month'||view==='30days'){
   const weekNames=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat('en',{weekday:'short',timeZone:'UTC'}).format(Date.parse(addDays(days[0],i)+'T12:00:00Z')));
   body=`<div class="cal-month-scroll"><div class="cal-month" role="region" aria-label="${view==='month'?'Month':'30-day'} calendar">${weekNames.map(d=>`<div class="cal-weekday">${d}</div>`).join('')}${days.map(day=>{const dayItems=onDay(day,all),today=day===dateIn(Date.now()/1000);return `<section class="cal-cell ${day===focus?'cal-focused':''} ${today?'cal-today':''}" aria-label="${esc(label(day))}"><div class="cal-cell-head"><button data-cal-day="${day}" aria-label="Open ${esc(label(day))}">${Number(day.slice(-2))}${today?'<small>Today</small>':''}</button><button data-cal-new="${day}" aria-label="Add calendar item on ${day}">＋</button></div><div class="cal-cell-items">${dayItems.slice(0,3).map(x=>chip(x,day)).join('')}</div>${dayItems.length>3?`<button class="cal-more" data-cal-day="${day}">＋ ${dayItems.length-3} more</button>`:''}</section>`;}).join('')}</div></div>`;
  }else{
   body=`<div class="cal-agenda-scroll"><div class="cal-agenda ${view==='week'?'cal-week-view':''}">${days.map(day=>`<section class="cal-agenda-day" aria-label="${esc(label(day))}"><header><button data-cal-day="${day}">${esc(new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(Date.parse(day+'T12:00:00Z')))}</button><button data-cal-new="${day}" aria-label="Add calendar item on ${day}">＋</button></header>${Array.from({length:24},(_,hour)=>{const slot=instant(day,hour),here=onDay(day,all).filter(x=>Number(parts(Math.max(x.start,instant(day)),zone).hour)===hour);return `<div class="cal-hour"><button class="cal-hour-add" data-cal-hour="${slot}" ${Number.isFinite(slot)?'':'disabled'} aria-label="Block ${esc(day)} ${String(hour).padStart(2,'0')}:00 in ${esc(zone)}">${String(hour).padStart(2,'0')}:00</button><div>${here.map(x=>chip(x,day)).join('')}${!Number.isFinite(slot)?'<span class="small muted">DST skipped hour</span>':''}</div></div>`;}).join('')}</section>`).join('')}</div></div>`;
  }
  return head+body+`<div class="cal-summary" role="status">${visible.filter(x=>x.type!=='fictional').length?`${visible.filter(x=>x.type!=='fictional').length} item(s) in the visible layers.`:'A little breathing room. No saved items in this date range.'}${simulation()?' Fictional lunch/focus blocks also appear in the Events layer.':''}</div></section>`;
 }
 async function redraw(){await refresh();}
 function form(start=instant(focus,9)){
  if(!Number.isFinite(start))start=Date.parse(focus+'T09:00:00Z')/1000;
  const input=t=>new Date(t*1000).toISOString().slice(0,16);
  showDialog('Make a little room.',`<form id="cal-form" class="fields"><label>Item type<select name="type"><option value="block">Unavailable time block</option><option value="task">Task</option><option value="memo">Memo</option><option value="chat">Local chat</option></select></label><label>Title<input name="title" maxlength="100" required placeholder="A little focus time"></label><div class="form-row"><label>Starts (UTC)<input name="start" type="datetime-local" value="${input(start)}" required></label><label>Ends (UTC)<input name="end" type="datetime-local" value="${input(start+3600)}" required></label></div><label>Details · fictional content only<textarea name="body" maxlength="1000" placeholder="Something worth remembering."></textarea></label><p class="notice">Only time blocks make you unavailable. Tasks, memos and local chats do not reserve time. Chats are local conversation items, never external messages. Existing bookings cannot be overwritten by a block.</p><p class="error" id="cal-error" role="alert"></p><button class="primary">Save calendar item</button></form>`);
  $('#cal-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;try{await api('/api/calendar/items',{type:f.get('type'),title:f.get('title'),body:f.get('body'),start:Date.parse(f.get('start')+'Z')/1000,end:Date.parse(f.get('end')+'Z')/1000});modal.close();await redraw();toast('A little room, saved to your calendar.');}catch(err){$('#cal-error').textContent=err.message;b.disabled=false;}};
 }
 function details(key){const item=items().find(x=>x.key===key);if(!item)return;if(item.type==='planning'||item.type==='plantask'){MeetingWorkspace.html(snapshot);MeetingWorkspace.openEvent(item.type==='planning'?item.id:item.meetingId);return;}const editable=key.startsWith('item-');showDialog(esc(item.title),`<p class="small">${esc(dateTime(item.start,zone))} — ${esc(dateTime(item.end,zone))}<br><strong>${esc(zone)}</strong></p><p class="small muted">UTC: ${esc(dateTime(item.start))} — ${esc(dateTime(item.end))}</p><p>${esc(item.body||'A little moment in your day.')}</p>${item.type==='chat'?'<p class="notice">Local conversation only. No external message was sent.</p>':''}${item.type==='booking'?'<p class="notice">Confirmed booking. Use its private confirmation management link to reschedule or cancel. The calendar reflects those changes automatically.</p>':''}<div class="dialog-actions">${item.type==='task'?`<button class="secondary" id="cal-complete">${item.done?'Mark not done':'Complete task'}</button>`:''}${editable?'<button class="secondary danger" id="cal-delete">Remove item</button>':''}</div>`);for(const [selector,action] of [['#cal-delete','delete'],['#cal-complete','complete']])if($(selector))$(selector).onclick=async()=>{try{await api('/api/calendar/action',{id:item.id,action});modal.close();await redraw();toast(action==='delete'?'Calendar item removed.':'Task updated.');}catch(e){toast(e.message);}};}
 function bind(){
  const repaint=selector=>{render();if(selector)$(selector)?.focus({preventScroll:true});};
  $('#cal-add').onclick=()=>form();$('#cal-refresh').onclick=()=>redraw();$('#cal-today').onclick=()=>{focus=dateIn(Date.now()/1000);repaint('#cal-today');};
  const move=n=>{if(view==='month'){const d=new Date(focus.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);focus=d.toISOString().slice(0,10);}else focus=addDays(focus,n*({week:7,'30days':30,day:1}[view]));render();};$('#cal-prev').onclick=()=>{move(-1);$('#cal-prev').focus({preventScroll:true});};$('#cal-next').onclick=()=>{move(1);$('#cal-next').focus({preventScroll:true});};
  $('#cal-date').onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){focus=e.target.value;render();}};
  $('#cal-zone').onchange=e=>{zone=e.target.value;repaint('#cal-zone');};
  document.querySelectorAll('[data-cal-layer]').forEach(b=>b.onchange=()=>{layers[b.dataset.calLayer]=b.checked;repaint('[data-cal-layer="'+b.dataset.calLayer+'"]');});
  document.querySelectorAll('[data-cal-view]').forEach(b=>b.onclick=()=>{view=b.dataset.calView;repaint('[data-cal-view="'+view+'"]');});
  document.querySelectorAll('[data-cal-day]').forEach(b=>b.onclick=()=>{focus=b.dataset.calDay;view='day';render();});
  document.querySelectorAll('[data-cal-new]').forEach(b=>b.onclick=()=>form(instant(b.dataset.calNew,9)));
  document.querySelectorAll('[data-cal-hour]').forEach(b=>b.onclick=()=>form(Number(b.dataset.calHour)));
  document.querySelectorAll('[data-cal-item]').forEach(b=>b.onclick=()=>details(b.dataset.calItem));
 }
 return {html,bind,dateIn,instant};
})();
