/* Static-only simulation. No shared state, server enforcement, or real calendars. */
const Demo = (() => {
  const key='booked-fictional-demo-v1';
  const initial=()=>({events:[
    {id:1,name:'A little introduction',duration:30,description:'A good conversation starts here. Let’s meet, share a few ideas, and see what grows.',color:'peach'},
    {id:2,name:'Make room for big ideas',duration:60,description:'An unhurried working session for the ideas that deserve a little more room.',color:'lavender'},
    {id:3,name:'The quick catch-up',duration:15,description:'A small pocket of time to reconnect, unblock, and keep things moving.',color:'green'}],links:[],bookings:[],proposals:[],availability:{start_hour:9,end_hour:17,weekdays:'[0,1,2,3,4]',notice_minutes:60,horizon_days:60,buffer_minutes:0,overrides:{}},mode:'browser-simulation'});
  let state;
  try {state=JSON.parse(localStorage.getItem(key))||initial();} catch {state=initial();}
  state.availability={notice_minutes:60,horizon_days:60,buffer_minutes:0,overrides:{},...state.availability};
  state.proposals.forEach(p=>p.status=p.status||'pending');
  state.calendar_items=state.calendar_items||[];
  const save=()=>{localStorage.setItem(key,JSON.stringify(state));};
  const id=()=>Date.now()+Math.floor(Math.random()*10000);
  const now=()=>Date.now()/1000;
  const valid=(token)=>{
    const link=state.links.find(x=>x.token===token);
    if(!link)throw Error('This simulated link is only available in the browser that created it. Create a demo link here first.');
    if(link.revoked)throw Error('This simulated link has been revoked.');
    if(link.expires&&link.expires<=now())throw Error('This simulated link has expired.');
    if(link.max_uses&&link.uses>=link.max_uses)throw Error('This simulated link has reached its use limit.');
    return link;
  };
  const open=(start,duration)=>{
    const date=new Date(start*1000),a=state.availability;
    const day=date.toISOString().slice(0,10),window=Object.hasOwn(a.overrides,day)?a.overrides[day]:(JSON.parse(a.weekdays).includes((date.getUTCDay()+6)%7)?[a.start_hour,a.end_hour]:null);
    return start>=now()+a.notice_minutes*60&&start<=now()+a.horizon_days*86400&&start%1800===0&&window&&date.getUTCHours()*60+date.getUTCMinutes()>=window[0]*60&&date.getUTCHours()*60+date.getUTCMinutes()+duration<=window[1]*60;
  };
  // Fictional lunch and focus blocks demonstrate unavailable times.
  const busy=(start,end,except)=>{
    const d=new Date(start*1000),h=d.getUTCHours()+d.getUTCMinutes()/60;
    const gap=state.availability.buffer_minutes*60;
    return Scheduling.hostMeetings(state.planning).some(x=>x.start<end+gap&&x.end>start-gap)||(h<13&&h+(end-start)/3600>12)||(d.getUTCDay()===3&&h<15&&h+(end-start)/3600>14)||state.bookings.some(x=>!x.cancelled&&x.id!==except&&x.start<end+gap&&x.end>start-gap)||state.calendar_items.some(x=>x.type==='block'&&x.start<end&&x.end>start);
  };
  return {async request(path,body){
    // Re-read for changes made by another demo tab. Static storage is still not multi-user atomic authority.
    try {const latest=JSON.parse(localStorage.getItem(key));if(latest)state=latest;}catch{}
    state.calendar_items=state.calendar_items||[];
    state.planning_revision=state.planning_revision||0;
    const url=new URL(path,'http://demo.local'),p=url.pathname;
    if(p==='/api/planning'||p==='/api/planning/undo'){
      if(!Number.isInteger(body.expected_revision)||body.expected_revision!==state.planning_revision)throw Error('Planning changed. Refresh before saving this edit.');
      if(p.endsWith('/undo')&&!state.planning_previous)throw Error('No planning change to undo.');
      const next=MeetingModel.validate(p.endsWith('/undo')?state.planning_previous:body.data);
      if(state.planning)for(const m of Scheduling.changed(state.planning,next)){
        const hits=Scheduling.conflicts(next,{start:m.start,end:m.end,attendeeIds:m.attendees.map(x=>x.attendeeId),excludeMeetingId:m.id},state);
        if(hits.length)throw Error('Planning conflict: '+hits[0].label);
      }
      const previous=state.planning;state.planning=next;state.planning_revision++;state.planning_previous=p.endsWith('/undo')?null:previous||null;state.planning_can_undo=!!state.planning_previous;
      save();return {saved:true,revision:state.planning_revision};
    }
    if(p==='/api/state')return structuredClone({...state,now:now()});
    if(p==='/api/calendar/items'){
      if(!['block','task','memo','chat'].includes(body.type)||!String(body.title||'').trim()||body.title.length>100||!Number.isFinite(body.start)||!Number.isFinite(body.end)||body.start>=body.end||body.end-body.start>7*86400||body.start<1577836800||body.end>4133980800)throw Error('Choose a title and valid UTC interval, at most seven days long.');
      const gap=state.availability.buffer_minutes*60;
      if(body.type==='block'&&(Scheduling.hostMeetings(state.planning).some(x=>x.start<body.end+gap&&x.end>body.start-gap)||state.bookings.some(x=>!x.cancelled&&x.start<body.end+gap&&x.end>body.start-gap)||state.calendar_items.some(x=>x.type==='block'&&x.start<body.end&&x.end>body.start)))throw Error('This block overlaps a booking, meeting gap, or time block.');
      const item={...body,title:body.title.trim(),body:String(body.body||'').slice(0,1000),id:id(),done:0};state.calendar_items.push(item);save();return {id:item.id,saved:true};
    }
    if(p==='/api/calendar/action'){
      const item=state.calendar_items.find(x=>x.id===body.id);if(!item)throw Error('Calendar item not found.');
      if(body.action==='delete')state.calendar_items=state.calendar_items.filter(x=>x.id!==body.id);
      else if(body.action==='complete'&&item.type==='task')item.done=!item.done;else throw Error('Choose a valid calendar action.');save();return {saved:true};
    }
    if(p==='/api/events'){const e={...body,id:id()};state.events.push(e);save();return e;}
    if(p==='/api/availability'){if(body.start_hour>=body.end_hour||!body.weekdays.length||body.notice_minutes<0||body.notice_minutes>10080||body.horizon_days<1||body.horizon_days>365||body.buffer_minutes<0||body.buffer_minutes>120)throw Error('Choose valid hours, notice, horizon, buffer and at least one weekday.');state.availability={...body,weekdays:JSON.stringify(body.weekdays)};save();return {saved:true};}
    if(p==='/api/links'){
      const token=crypto.randomUUID(),link={id:id(),token,event_id:body.event_id,expires:body.hours?now()+body.hours*3600:null,max_uses:body.max_uses,uses:0,revoked:0,created:now()};
      state.links.push(link);save();return {...link,path:'?book='+token};
    }
    if(p.startsWith('/api/slots/')||p.startsWith('/api/manage-slots/')||p.startsWith('/api/preview-slots/')){
      const manage=p.includes('manage-slots'),token=p.split('/').pop();
      const booking=manage?state.bookings.find(x=>x.cancel_token===token&&!x.cancelled):null;
      if(manage&&!booking)throw Error('Active simulated booking not found.');
      const link=p.includes('preview-slots')?{event_id:Number(token)}:manage?{event_id:booking.event_id}:valid(token),event=state.events.find(x=>x.id===link.event_id);if(!event)throw Error('Event type not found.');
      const midnight=Date.parse(url.searchParams.get('day')+'T00:00:00Z')/1000,slots=[],unavailable=[];
      for(let i=0;i<48;i++){const start=midnight+i*1800,isBusy=busy(start,start+event.duration*60,booking?.id);if(open(start,event.duration)&&!isBusy)slots.push(start);else if(i>=18&&i<34)unavailable.push({start,reason:isBusy?'Fictional busy time':'Outside host availability or notice window'});}
      return {event,slots,unavailable,expires:link.expires,remaining:link.max_uses?link.max_uses-link.uses:null,timezone:'UTC',horizon_days:state.availability.horizon_days};
    }
    if(p.startsWith('/api/book/')){
      const token=p.split('/').pop(),candidate=state.links.find(x=>x.token===token),previous=body.request_key&&state.bookings.find(x=>x.link_id===candidate?.id&&x.request_key===body.request_key);
      if(previous){if(previous.request_hash!==JSON.stringify([body.start,body.name,body.email,body.notes||'']))throw Error('This retry key belongs to different booking details.');return {...previous,message:'Original simulated booking retrieved. No duplicate was created.'};}
      const link=valid(token),event=state.events.find(x=>x.id===link.event_id),end=body.start+event.duration*60;
      if(!open(body.start,event.duration)||busy(body.start,end))throw Error('That time is unavailable. Choose another time.');
      const b={...body,request_hash:JSON.stringify([body.start,body.name,body.email,body.notes||'']),id:id(),link_id:link.id,event_id:event.id,event_name:event.name,event:event.name,end,cancel_token:crypto.randomUUID(),cancelled:0};
      state.bookings.push(b);link.uses++;save();return {...b,message:'Saved in this browser only. No email or real calendar event was created.'};
    }
    if(p==='/api/revoke'){const link=state.links.find(x=>x.id===body.id);if(link)link.revoked=1;save();return {revoked:true};}
    if(p==='/api/propose'){const link=valid(body.token);state.proposals.push({...body,link_id:link.id,status:'pending',id:id(),created:now()});save();return {message:'Suggestion saved in this browser. No message was sent and no time was reserved.'};}
    if(p==='/api/proposals/resolve'){
      const proposal=state.proposals.find(x=>x.id===body.id);
      if(!proposal||proposal.status!=='pending')throw Error('This suggestion has already been reviewed or is missing.');
      if(body.action==='reject'){proposal.status='rejected';save();return {status:'rejected',message:'Suggestion declined in this browser. No notification was sent.'};}
      const link=state.links.find(x=>x.id===proposal.link_id),event=state.events.find(x=>x.id===link.event_id);valid(link.token);
      const end=proposal.suggested+event.duration*60;
      if(!open(proposal.suggested,event.duration)||busy(proposal.suggested,end))throw Error('Suggested time is unavailable. Suggestion remains pending.');
      const b={id:id(),link_id:link.id,event_id:event.id,event:event.name,event_name:event.name,start:proposal.suggested,end,name:proposal.name,email:proposal.email,notes:proposal.note,cancel_token:crypto.randomUUID(),cancelled:0};
      state.bookings.push(b);link.uses++;proposal.status='accepted';proposal.booking_id=b.id;save();return {...b,status:'accepted',message:'Suggestion booked in this browser. No invitation was sent.'};
    }
    if(p==='/api/cancel'||p==='/api/reschedule'){
      const booking=state.bookings.find(x=>x.cancel_token===body.token&&!x.cancelled);
      if(!booking)throw Error('Active simulated booking not found.');
      if(p.endsWith('/cancel'))booking.cancelled=1;
      else {const e=state.events.find(x=>x.id===booking.event_id),end=body.start+e.duration*60;if(!open(body.start,e.duration)||busy(body.start,end,booking.id))throw Error('That time is unavailable. Your original booking is unchanged.');booking.start=body.start;booking.end=end;}
      save();return {...booking,message:'Updated in this browser only. No notification was sent.'};
    }
    throw Error('Demo action not supported.');
  }};
})();
