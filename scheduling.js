/* Shared fictional planning constraints. No external calendars or authority. */
window.Scheduling=(()=>{
 const hostMeetings=data=>(data?.meetings||[]).filter(m=>m.status!=='cancelled'&&m.attendees.some(a=>a.attendeeId==='rowan'));
 const overlaps=(a,b,gap=0)=>a.start<b.end+gap&&a.end>b.start-gap;
 function hostOpen(start,end,state){const a=state.availability,d=new Date(start*1000),day=d.toISOString().slice(0,10),overrides=typeof a.overrides==='string'?JSON.parse(a.overrides):a.overrides||{},days=typeof a.weekdays==='string'?JSON.parse(a.weekdays):a.weekdays,window=Object.hasOwn(overrides,day)?overrides[day]:(days.includes((d.getUTCDay()+6)%7)?[a.start_hour,a.end_hour]:null),base=Date.parse(day+'T00:00:00Z')/1000;return window&&start>=base+window[0]*3600&&end<=base+window[1]*3600;}
 function fictionalBlocks(start,end){const from=Math.floor(start/86400)*86400,result=[];for(let base=from;base<end;base+=86400){result.push({start:base+43200,end:base+46800,label:'Fictional lunch'});if(new Date(base*1000).getUTCDay()===3)result.push({start:base+50400,end:base+54000,label:'Fictional focus time'});}return result;}
 function conflicts(data,c,state){const working=MeetingModel.validate(data),host=working.attendees.find(x=>x.id==='rowan');if(host){host.availability={timezone:'UTC',weekdays:[1,2,3,4,5,6,7],startMinute:0,endMinute:1440};host.busy=[];}
 const result=MeetingModel.conflicts(working,c);if(!c.attendeeIds.includes('rowan'))return result;
 const add=label=>result.push({attendeeId:'rowan',kind:'host',referenceId:'host',label});
 if(!hostOpen(c.start,c.end,state))add('Outside host UTC availability');
 const gap=(state.availability.buffer_minutes||0)*60;
 for(const b of state.bookings||[])if(!b.cancelled&&overlaps(c,b,gap))add('Confirmed booking: '+b.event_name);
 for(const b of state.calendar_items||[])if(b.type==='block'&&overlaps(c,b))add('Calendar block: '+b.title);
 for(const m of hostMeetings(data))if(m.id!==c.excludeMeetingId&&overlaps(c,m,gap)&&!overlaps(c,m))add('Planning meeting buffer: '+m.title);
 if(state.mode==='browser-simulation')for(const b of fictionalBlocks(c.start,c.end))if(overlaps(c,b))add(b.label);
 return result;
 }
 function suggestedTimes(data,c,state){const result=[],duration=c.durationMinutes*60;for(let start=Math.ceil(c.start/1800)*1800;start+duration<=c.end&&result.length<(c.limit||4);start+=1800){if(!conflicts(data,{...c,start,end:start+duration},state).length)result.push({start,end:start+duration});}return result;}
 function changed(previous,next){return next.meetings.filter(m=>m.status!=='cancelled'&&(()=>{const old=previous?.meetings.find(x=>x.id===m.id);const signature=x=>JSON.stringify([x.start,x.end,x.status,[...x.attendees].sort((a,b)=>a.attendeeId.localeCompare(b.attendeeId))]);return !old||signature(old)!==signature(m);})());}
 return {hostMeetings,hostOpen,fictionalBlocks,conflicts,suggestedTimes,changed,overlaps};
})();
