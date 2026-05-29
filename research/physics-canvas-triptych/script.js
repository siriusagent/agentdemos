(() => {
  'use strict';
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d', { alpha: false });
  const copy = document.getElementById('copy');
  const panel = document.getElementById('panel');
  const menuToggle = document.getElementById('menuToggle');
  const meters = [document.getElementById('m1'), document.getElementById('m2'), document.getElementById('m3')];
  const labels = [document.getElementById('l1'), document.getElementById('l2'), document.getElementById('l3')];
  const DPR = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0, mode = 'pendulum', paused = false, last = performance.now(), simTime = 0;
  const TAU = Math.PI * 2;
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt = n => new Intl.NumberFormat('en-US').format(n);
  const clear = () => { ctx.fillStyle = '#05070d'; ctx.fillRect(0,0,W,H); };
  const fade = (a=.14) => { ctx.globalCompositeOperation='source-over'; ctx.fillStyle=`rgba(3,5,12,${a})`; ctx.fillRect(0,0,W,H); };
  function resize(){ W=innerWidth; H=innerHeight; canvas.width=W*DPR; canvas.height=H*DPR; canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0); reset(); }
  addEventListener('resize', resize);
  function setCopy(title, body){ copy.innerHTML=`<h2>${title}</h2><p>${body}</p>`; }
  function glowLine(x1,y1,x2,y2,color,w=2,blur=14){ ctx.save(); ctx.lineCap='round'; ctx.strokeStyle=color; ctx.lineWidth=w; ctx.shadowColor=color; ctx.shadowBlur=blur; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.restore(); }
  function circle(x,y,r,fill,stroke){ ctx.beginPath(); ctx.arc(x,y,r,0,TAU); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.stroke();} }

  // 1) Triple pendulum: mass-matrix equations solved each substep, integrated with RK4.
  const pend = { y:null, trail:[], energy0:0, maxOmega:0 };
  function solve3(A,b){
    const M=A.map((r,i)=>[...r,b[i]]);
    for(let i=0;i<3;i++){ let p=i; for(let r=i+1;r<3;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r; [M[i],M[p]]=[M[p],M[i]]; const d=M[i][i] || 1e-12; for(let c=i;c<4;c++) M[i][c]/=d; for(let r=0;r<3;r++) if(r!==i){ const f=M[r][i]; for(let c=i;c<4;c++) M[r][c]-=f*M[i][c]; } }
    return [M[0][3],M[1][3],M[2][3]];
  }
  function pendDeriv(y){
    const th=y.slice(0,3), om=y.slice(3), m=[1,1,1], l=[1,1,1], g=9.81;
    const A=Array.from({length:3},()=>[0,0,0]), b=[0,0,0];
    for(let i=0;i<3;i++) for(let k=0;k<3;k++){ let below=0; for(let j=Math.max(i,k);j<3;j++) below+=m[j]; A[i][k]=below*l[i]*l[k]*Math.cos(th[i]-th[k]); }
    for(let i=0;i<3;i++){
      let below=0; for(let j=i;j<3;j++) below+=m[j];
      b[i] = -below*g*l[i]*Math.sin(th[i]);
      for(let k=0;k<3;k++){ let shared=0; for(let j=Math.max(i,k);j<3;j++) shared+=m[j]; b[i] -= shared*l[i]*l[k]*om[k]*om[k]*Math.sin(th[i]-th[k]); }
    }
    const a=solve3(A,b); return [om[0],om[1],om[2],a[0],a[1],a[2]];
  }
  function rk4(y,dt){ const k1=pendDeriv(y), y2=y.map((v,i)=>v+k1[i]*dt/2), k2=pendDeriv(y2), y3=y.map((v,i)=>v+k2[i]*dt/2), k3=pendDeriv(y3), y4=y.map((v,i)=>v+k3[i]*dt), k4=pendDeriv(y4); return y.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6); }
  function pendEnergy(){ const th=pend.y.slice(0,3), om=pend.y.slice(3), m=[1,1,1], l=[1,1,1], g=9.81; let T=0,V=0; for(let j=0;j<3;j++){ let vx=0,vy=0,h=0; for(let i=0;i<=j;i++){ vx += l[i]*om[i]*Math.cos(th[i]); vy += -l[i]*om[i]*Math.sin(th[i]); h += -l[i]*Math.cos(th[i]); } T += .5*m[j]*(vx*vx+vy*vy); V += m[j]*g*h; } return T+V; }
  function pendPts(){ const len=Math.min(W,H)*0.16, ox=W*(panel.classList.contains('hidden')?.5:.34), oy=H*.22; let x=ox,y=oy; const pts=[[x,y]]; for(const th of pend.y.slice(0,3)){ x+=len*Math.sin(th); y+=len*Math.cos(th); pts.push([x,y]); } return pts; }
  function resetPend(){ simTime=0; pend.y=[1.83,1.831,1.84,0,0,0]; pend.trail=[]; pend.energy0=0; pend.maxOmega=0; clear(); setCopy('Triple pendulum chaos', 'RK4 integration now advances by exact fixed substeps instead of over-stepping frames. Energy drift is tracked live, so the chaos comes from sensitivity to initial conditions — not numerical slop.'); labels[0].textContent='sim time'; labels[1].textContent='max ω'; labels[2].textContent='energy drift'; }
  function stepPend(dt){ let left=dt; while(left>0){ const h=Math.min(left,0.0035); pend.y=rk4(pend.y,h); left-=h; simTime+=h; } const pts=pendPts(), tip=pts[3]; pend.maxOmega=Math.max(pend.maxOmega, ...pend.y.slice(3).map(Math.abs)); pend.trail.push([tip[0],tip[1],Math.hypot(pend.y[4],pend.y[5])]); if(pend.trail.length>1400) pend.trail.shift(); fade(.055); ctx.save(); ctx.globalCompositeOperation='lighter'; for(let i=1;i<pend.trail.length;i++){ const a=i/pend.trail.length, sp=clamp(pend.trail[i][2]/10,0,1); glowLine(pend.trail[i-1][0],pend.trail[i-1][1],pend.trail[i][0],pend.trail[i][1],`rgba(${90+165*sp},${150+70*a},255,${.08+.48*a})`,.8+2.2*a,18); } ctx.restore(); glowLine(pts[0][0],pts[0][1],pts[1][0],pts[1][1],'#dfe8ff',3,6); glowLine(pts[1][0],pts[1][1],pts[2][0],pts[2][1],'#bfefff',3,8); glowLine(pts[2][0],pts[2][1],pts[3][0],pts[3][1],'#ff4fd8',3.5,16); pts.slice(1).forEach((p,i)=>circle(p[0],p[1],10-i*1.4,'#f7f9ff','#65f6ff')); circle(pts[0][0],pts[0][1],5,'#65f6ff'); if(!pend.energy0) pend.energy0=pendEnergy(); meters[0].textContent=simTime.toFixed(1)+' s'; meters[1].textContent=pend.maxOmega.toFixed(1); meters[2].textContent=((pendEnergy()-pend.energy0)/Math.abs(pend.energy0)*100).toFixed(3)+'%'; }

  // 2) Galperin pi collisions: exact event-driven elastic impacts in physical space.
  const pi = { x1:0,x2:0,v1:0,v2:0,count:0,events:[],done:false,t:0,m1:1,m2:100, digits:'3.1' };
  function resetPi(){ simTime=0; Object.assign(pi,{x1:1.0,x2:5.6,v1:0,v2:-1.25,count:0,events:[],done:false,t:0,m1:1,m2:100,digits:'0.'}); clear(); setCopy('Pi from exact collisions', 'The collision solver is now event-driven: each animation frame is split at the precise wall/block impact time, so fast repeated collisions cannot tunnel or double-count. Mass ratio 100:1 gives 31 impacts: π as 3.1.'); labels[0].textContent='collisions'; labels[1].textContent='π digits'; labels[2].textContent='state'; }
  function piHit(kind, wallPx, y, xPx){ pi.count++; pi.digits = pi.count >= 10 ? (pi.count/10).toFixed(1) : '0.'; pi.events.push({kind,x:kind==='wall'?wallPx:xPx,y,life:1,n:pi.count}); if(pi.events.length>90) pi.events.shift(); }
  function stepPi(dt){ const floor=H*.70, wall=Math.max(64,W*.08), pxPerM=Math.min(90,Math.max(48,W*.08)), w1=.58, w2=1.28; let remaining=dt*1.4; while(remaining>1e-7 && !pi.done){ const gap=(pi.x2-w2/2)-(pi.x1+w1/2); let tb=Infinity, tw=Infinity; if(pi.v1<0) tw=(w1/2-pi.x1)/pi.v1; const closing=pi.v1-pi.v2; if(closing>0) tb=gap/closing; const te=Math.min(tw,tb,remaining); pi.x1+=pi.v1*te; pi.x2+=pi.v2*te; remaining-=te; simTime+=te; if(te===tw || (tw<=tb && tw<=remaining+te+1e-9)){ pi.x1=w1/2; pi.v1=-pi.v1; piHit('wall',wall,floor-70,wall); }
      else if(te===tb || (tb<tw && tb<=remaining+te+1e-9)){ const u1=pi.v1,u2=pi.v2,m1=pi.m1,m2=pi.m2; pi.v1=((m1-m2)/(m1+m2))*u1+(2*m2/(m1+m2))*u2; pi.v2=(2*m1/(m1+m2))*u1+((m2-m1)/(m1+m2))*u2; pi.x1=pi.x2-(w1+w2)/2; piHit('block',wall,floor-70,wall+pi.x2*pxPerM); }
      if(pi.v1>=0 && pi.v2>=0 && pi.v1<pi.v2) pi.done=true; }
    fade(.22); ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(wall,floor-190); ctx.lineTo(wall,floor); ctx.lineTo(W-58,floor); ctx.stroke(); for(let i=0;i<22;i++){ ctx.strokeStyle=`rgba(101,246,255,${.035+i*.006})`; ctx.beginPath(); ctx.moveTo(wall+i*44,floor+8); ctx.lineTo(wall+i*44-32,floor+38); ctx.stroke(); }
    const sx1=wall+pi.x1*pxPerM, sx2=wall+pi.x2*pxPerM, bw1=w1*pxPerM, bw2=w2*pxPerM; drawBlock(sx1-bw1/2,floor-bw1,bw1,bw1,'#65f6ff','1 kg'); drawBlock(sx2-bw2/2,floor-bw2,bw2,bw2,'#ffb15f','100.000 kg');
    for(const e of pi.events){ e.life-=dt*1.7; if(e.life>0){ circle(e.x,e.y,10+52*(1-e.life),`rgba(255,79,216,${e.life*.18})`,`rgba(255,255,255,${e.life*.52})`); ctx.fillStyle=`rgba(255,255,255,${e.life})`; ctx.font='700 11px ui-monospace,monospace'; ctx.fillText('#'+e.n,e.x+10,e.y-10); }} pi.events=pi.events.filter(e=>e.life>0);
    ctx.fillStyle='rgba(255,255,255,.09)'; ctx.font='800 '+Math.max(70,Math.min(160,W*.13))+'px ui-sans-serif'; ctx.fillText(String(pi.count), wall+42, floor-230); meters[0].textContent=fmt(pi.count); meters[1].textContent=pi.digits; meters[2].textContent=pi.done?'escaped':'colliding'; }
  function drawBlock(x,y,w,h,color,label){ ctx.save(); ctx.shadowColor=color; ctx.shadowBlur=24; ctx.fillStyle=color; ctx.fillRect(x,y,w,h); ctx.shadowBlur=0; ctx.fillStyle='rgba(0,0,0,.46)'; ctx.fillRect(x+5,y+5,Math.max(1,w-10),Math.max(1,h-10)); ctx.fillStyle='#fff'; ctx.font='700 12px ui-monospace,monospace'; ctx.fillText(label,x+8,y+22); ctx.restore(); }

  // 3) Galton board: actual discs under gravity colliding with circular pegs and bin walls.
  const galton = { balls:[], bins:[], rows:13, dropped:0, acc:0, nextId:1 };
  function resetGalton(){ simTime=0; galton.balls=[]; galton.bins=Array(galton.rows+1).fill(0); galton.dropped=0; galton.acc=0; galton.nextId=1; clear(); setCopy('Galton board with collisions', 'The balls are no longer pre-scripted along paths. They are discs accelerated by gravity, deflected by circular pegs with restitution and jitter, then stacked into bins against the theoretical binomial curve.'); labels[0].textContent='settled balls'; labels[1].textContent='center error'; labels[2].textContent='σ observed'; }
  function layout(){ const gap=Math.min(42,Math.max(25,W*.043)), cx=W*(panel.classList.contains('hidden')?.5:.35), top=H*.10, floor=H*.82; return {gap,cx,top,floor,pegR:4.8,ballR:5.2}; }
  function spawnBall(){ const L=layout(); galton.balls.push({id:galton.nextId++, x:L.cx+(Math.random()-.5)*5, y:L.top-34, vx:(Math.random()-.5)*12, vy:0, hue:180+Math.random()*130}); galton.dropped++; }
  function settleBall(b,L){ const idx=clamp(Math.round((b.x-(L.cx-galton.rows*L.gap/2))/L.gap),0,galton.rows); galton.bins[idx]++; b.done=true; }
  function stepBall(b,h,L){ b.vy += 620*h; b.x += b.vx*h; b.y += b.vy*h; const wallL=L.cx-(galton.rows/2+.5)*L.gap, wallR=L.cx+(galton.rows/2+.5)*L.gap; if(b.x<wallL){ b.x=wallL; b.vx=Math.abs(b.vx)*.62; } if(b.x>wallR){ b.x=wallR; b.vx=-Math.abs(b.vx)*.62; }
    for(let r=0;r<galton.rows;r++) for(let c=-r;c<=r;c+=2){ const px=L.cx+c*L.gap/2, py=L.top+r*L.gap; const dx=b.x-px, dy=b.y-py, min=L.pegR+L.ballR, d2=dx*dx+dy*dy; if(d2<min*min && d2>1e-6){ const d=Math.sqrt(d2), nx=dx/d, ny=dy/d; b.x=px+nx*min; b.y=py+ny*min; const vn=b.vx*nx+b.vy*ny; if(vn<0){ b.vx-=1.72*vn*nx; b.vy-=1.72*vn*ny; b.vx += (Math.random()-.5)*18; } } }
    if(b.y>L.floor-8) settleBall(b,L); }
  function stepGalton(dt){ const L=layout(); galton.acc += dt; while(galton.acc>.055 && galton.dropped<2200){ spawnBall(); galton.acc-=.055; } for(let s=0;s<3;s++) for(const b of galton.balls) stepBall(b,dt/3,L); galton.balls=galton.balls.filter(b=>!b.done); fade(.16); ctx.save(); ctx.strokeStyle='rgba(255,255,255,.12)'; for(let i=0;i<=galton.rows+1;i++){ const x=L.cx+(i-(galton.rows+1)/2)*L.gap; ctx.beginPath(); ctx.moveTo(x,L.floor); ctx.lineTo(x,L.floor+72); ctx.stroke(); } ctx.restore(); for(let r=0;r<galton.rows;r++) for(let c=-r;c<=r;c+=2) circle(L.cx+c*L.gap/2,L.top+r*L.gap,L.pegR,'rgba(255,255,255,.76)','rgba(101,246,255,.65)'); for(const b of galton.balls) circle(b.x,b.y,L.ballR,`hsl(${b.hue} 100% 68%)`);
    const max=Math.max(1,...galton.bins), pileH=Math.min(220,H*.24); for(let i=0;i<galton.bins.length;i++){ const x=L.cx+(i-galton.rows/2)*L.gap, h=(galton.bins[i]/max)*pileH; const grd=ctx.createLinearGradient(0,L.floor,0,L.floor-h); grd.addColorStop(0,'rgba(101,246,255,.22)'); grd.addColorStop(1,'rgba(255,79,216,.96)'); ctx.fillStyle=grd; ctx.fillRect(x-L.gap*.42,L.floor-h,L.gap*.84,h); }
    const peakTheo=Math.max(...Array.from({length:galton.rows+1},(_,k)=>binomial(galton.rows,k))); ctx.strokeStyle='rgba(255,177,95,.95)'; ctx.lineWidth=2; ctx.beginPath(); for(let i=0;i<galton.bins.length;i++){ const y=L.floor-(binomial(galton.rows,i)/peakTheo)*pileH, x=L.cx+(i-galton.rows/2)*L.gap; i?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.stroke(); const total=galton.bins.reduce((a,b)=>a+b,0), mean=galton.bins.reduce((a,b,i)=>a+b*i,0)/(total||1), variance=galton.bins.reduce((a,b,i)=>a+b*(i-mean)**2,0)/(total||1); meters[0].textContent=fmt(total); meters[1].textContent=(mean-galton.rows/2).toFixed(2); meters[2].textContent=Math.sqrt(variance).toFixed(2); }
  function binomial(n,k){ let r=1; for(let i=1;i<=k;i++) r=r*(n+1-i)/i; return r/2**n; }

  function reset(){ if(mode==='pendulum') resetPend(); else if(mode==='pi') resetPi(); else resetGalton(); }
  function frame(now){ const dt=clamp((now-last)/1000,0,.033); last=now; if(!paused){ if(mode==='pendulum') stepPend(dt); else if(mode==='pi') stepPi(dt); else stepGalton(dt); } requestAnimationFrame(frame); }
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelector('.tab.active').classList.remove('active'); btn.classList.add('active'); mode=btn.dataset.mode; reset(); }));
  document.getElementById('reset').onclick=reset;
  document.getElementById('pause').onclick=()=>{ paused=!paused; document.getElementById('pause').textContent=paused?'Resume':'Pause'; };
  menuToggle.onclick=()=>{ const hidden=panel.classList.toggle('hidden'); document.body.classList.toggle('menu-hidden',hidden); menuToggle.textContent=hidden?'Show menu':'Hide menu'; menuToggle.setAttribute('aria-expanded', String(!hidden)); reset(); };
  addEventListener('keydown', e=>{ if(e.key.toLowerCase()==='m') menuToggle.click(); if(e.code==='Space'){ e.preventDefault(); document.getElementById('pause').click(); }});
  resize(); requestAnimationFrame(frame);
})();
