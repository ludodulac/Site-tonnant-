(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('universe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => window.innerWidth < 760;
  const STORE = 'anomalia.atlas.v1';
  const palettes = [
    {sky:'#06091d',deep:'#171333',a:'#bc81f6',b:'#ffadab',c:'#7ce6f2',ground:'#0b0a25'},
    {sky:'#031623',deep:'#073e53',a:'#75e9c6',b:'#f8c188',c:'#82a5f8',ground:'#071d28'},
    {sky:'#10081b',deep:'#3b163f',a:'#fa9abb',b:'#f6b97f',c:'#b5a0ff',ground:'#180d24'},
    {sky:'#051321',deep:'#23315d',a:'#8dbeff',b:'#f6a4e0',c:'#e5bb85',ground:'#0c1533'},
    {sky:'#11101b',deep:'#3d302c',a:'#f5ad74',b:'#fee6b0',c:'#b49cf8',ground:'#211420'},
    {sky:'#050d21',deep:'#15254a',a:'#87a3ff',b:'#56e9dd',c:'#fface3',ground:'#091326'},
    {sky:'#160a22',deep:'#3e1545',a:'#e27fe2',b:'#a6e8dc',c:'#f3b59f',ground:'#1b0b2c'},
    {sky:'#061522',deep:'#134052',a:'#b7f0e1',b:'#ff99b1',c:'#ffe7bc',ground:'#061d28'}
  ];
  const randomNames = [
    'La dernière baleine', 'Là où dort la lumière', 'Le silence bleu',
    'Les jardins du temps', 'Une lune en papier', 'La mémoire des étoiles',
    'Le vent qui se souvient', 'Les océans suspendus', 'Demain, peut-être',
    'Une forêt de cristal', 'Le parfum de l’infini', 'Brest dans mille ans',
    'Les couleurs du silence', 'Le piano des comètes', 'La nuit à l’envers'
  ];
  const prefixes = ['Les jardins de', 'L’écho de', 'Le royaume de', 'L’horizon de',
    'Les îles de', 'La mémoire de', 'Les songes de', 'Le sanctuaire de',
    'Les portes de', 'Au-delà de', 'La lumière de', 'L’orbite de'];
  const loreA = [
    'Ici, les étoiles poussent plus vite que les rêves.',
    'Il paraît que le silence a inventé ce ciel.',
    'On dit que le temps s’y repose entre deux battements.',
    'Les souvenirs y deviennent des paysages.',
    'Ce monde n’existait pas une seconde avant vous.',
    'La nuit y dessine ce que les mots n’osent pas dire.',
    'Les horizons y changent quand on les regarde.',
    'Même les ombres y ont leur propre lumière.',
    'Les constellations y attendent qu’on les invente.',
    'Le vent y garde la trace des idées impossibles.',
    'Il n’y a pas de carte : seulement des chemins à créer.',
    'Chaque aurore y commence par un secret.'
  ];
  const loreB = [
    'Laissez-y une étoile : elle restera pour votre retour.',
    'Touchez le vide, et voyez ce qu’il décide de devenir.',
    'Il suffit d’un geste pour modifier sa nuit.',
    'Ce que vous y semez ne disparaît pas.',
    'Vous êtes sa première légende.',
    'Écoutez : quelque chose essaie de vous répondre.',
    'Ses plus belles découvertes ne portent pas encore de nom.',
    'Aucun autre voyage ne sera exactement identique.',
    'Peut-être y trouverez-vous quelque chose d’oublié.',
    'Le premier explorateur, c’est vous.'
  ];
  const climates = [
    'BRUME MAGNÉTIQUE','PLUIE D’ORBITES','AUBE PERPÉTUELLE',
    'MARÉE STELLAIRE','ÉCLATS DE MINUIT','VENTS LUMINEUX',
    'OCÉAN DE POUSSIÈRE','SAISON DES LUNES','NUIT FLORALE'
  ];
  const signs = ['ÉCHO 07','FRAGMENT 11','SIGNAL 03','ONDE 09','TRACE 21','LUEUR 05','SOUFFLE 13'];
  const starsScale = [0,2,4,7,9];

  let w = window.innerWidth, h = window.innerHeight, dpr = 1;
  let scene = null;
  let activeWord = null;
  let planted = [];
  let atlas = readAtlas();
  let pointer = {x:.5,y:.5,tx:.5,ty:.5,down:null};
  let lastFrame = 0, t = 0, warpUntil = 0, timeToMeteor = 8000;
  let meteors = [], ripples = [], sparks = [];
  let soundOn = false, audio = null, ambient = null;
  let toastTimer = 0, hintTimer = 0, atlasOpen = false, priorFocus = null;

  function hashString(value) {
    let n = 2166136261;
    for (let i=0;i<value.length;i++) { n ^= value.charCodeAt(i); n = Math.imul(n,16777619); }
    return n >>> 0;
  }
  function rngFrom(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let z = a;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rgba(hex, alpha=1) {
    const c = hex.replace('#','');
    return 'rgba(' + parseInt(c.slice(0,2),16) + ',' +
      parseInt(c.slice(2,4),16) + ',' + parseInt(c.slice(4,6),16) + ',' + alpha + ')';
  }
  function lerp(a,b,m){return a+(b-a)*m;}
  function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
  function pad(n,k=2){return String(n).padStart(k,'0');}
  function normalize(text){return text.replace(/\s+/g,' ').trim().slice(0,42);}
  function readAtlas(){
    try {
      const raw=JSON.parse(localStorage.getItem(STORE)||'[]');
      return Array.isArray(raw) ? raw.filter(x=>x&&typeof x.word==='string').slice(0,24) : [];
    } catch(_){return [];}
  }
  function saveAtlas() {
    try { localStorage.setItem(STORE,JSON.stringify(atlas)); }
    catch(_) { /* Storage can be disabled; the experience still works. */ }
    $('atlasCount').textContent=String(atlas.length);
  }
  function createScene(word) {
    const seed=hashString(word.toLocaleLowerCase('fr'));
    const random=rngFrom(seed);
    const palette=palettes[seed % palettes.length];
    const stars=[];
    const amount=mobile()?210:380;
    for(let i=0;i<amount;i++){
      stars.push({x:random(),y:random()*.92,r:.25+random()*1.38,p:random()*6.28,
        s:.22+random()*1.35,z:.18+random()*.82,br:random()});
    }
    const dust=[];
    for(let i=0;i<(mobile()?30:65);i++){
      dust.push({x:random(),y:random(),s:random()*6.28,r:.5+random()*1.7,v:.18+random()*.6});
    }
    const nebula=[];
    for(let i=0;i<7;i++){
      nebula.push({x:random(),y:.09+random()*.71,r:.25+random()*.36,phase:random()*6.28,
        tint:i%3===0?palette.a:(i%3===1?palette.b:palette.c),opacity:.065+random()*.075});
    }
    const planet={
      x:.66 + random()*.11,
      y:.365 + random()*.1,
      size:.88+random()*.27,
      tilt:-.30+(random()-.5)*.3,
      rings:random()>.17,
      bands:Array.from({length:31},()=>({offset:random()*2-1,alpha:.018+random()*.12,
        freq:1+Math.floor(random()*4),phase:random()*6.28,shade:random()>.48}))
    };
    return {seed,random,palette,stars,dust,nebula,planet,
      phases:[random()*7,random()*7,random()*7,random()*7],
      islands:Array.from({length:9},()=>({x:random(),y:random(),size:random(),type:random()}))};
  }
  function fit(){
    w=window.innerWidth;h=window.innerHeight;
    dpr=Math.min(window.devicePixelRatio||1,mobile()?1.55:1.8);
    canvas.width=Math.floor(w*dpr);
    canvas.height=Math.floor(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function pathMountain(y,amp,phase,speed){
    ctx.beginPath();ctx.moveTo(-20,h+20);
    for(let x=-20;x<=w+20;x+=9){
      const u=x/w;
      const a=Math.sin(u*12.3+phase+pointer.x*.09)*.47;
      const b=Math.sin(u*30.8+phase*1.7)*.24;
      const c=Math.sin(u*67.1+phase*.7)*.06;
      const d=Math.sin(u*4.9+phase*.45)*.24;
      const rise=(a+b+c+d)*amp;
      ctx.lineTo(x,y+rise+Math.sin(t*speed+phase)*2);
    }
    ctx.lineTo(w+20,h+20);ctx.closePath();
  }
  function softGlow(x,y,r,color,opacity){
    if(r<=0)return;
    const grad=ctx.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0,rgba(color,opacity));
    grad.addColorStop(.35,rgba(color,opacity*.43));
    grad.addColorStop(1,rgba(color,0));
    ctx.fillStyle=grad;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  function paintSky(s) {
    const p=s.palette;
    const g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,p.sky);g.addColorStop(.48,p.deep);g.addColorStop(1,p.sky);
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const xshift=(pointer.x-.5)*24, yshift=(pointer.y-.5)*15;
    ctx.save();ctx.globalCompositeOperation='screen';
    s.nebula.forEach((n,i)=>{
      const x=n.x*w+xshift*(.45+i*.09)+Math.sin(t*.075+n.phase)*14;
      const y=n.y*h+yshift*.3;
      const r=Math.max(w,h)*n.r;
      softGlow(x,y,r,n.tint,n.opacity);
    });
    ctx.restore();
    const horizon=ctx.createLinearGradient(0,h*.5,0,h);
    horizon.addColorStop(0,rgba(p.b,0));
    horizon.addColorStop(.63,rgba(p.b,.065));
    horizon.addColorStop(1,rgba(p.a,.12));
    ctx.fillStyle=horizon;ctx.fillRect(0,h*.50,w,h*.5);
  }
  function paintAurora(s) {
    const p=s.palette;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let layer=0;layer<3;layer++){
      const top=h*(.17+layer*.082);
      const wave=h*(.045+layer*.019);
      const grd=ctx.createLinearGradient(0,top-wave,0,top+wave*5);
      grd.addColorStop(0,rgba(layer===1?p.c:p.a,0));
      grd.addColorStop(.3,rgba(layer===1?p.c:p.a,.057));
      grd.addColorStop(.55,rgba(p.b,.035));
      grd.addColorStop(1,rgba(p.a,0));
      ctx.beginPath();ctx.moveTo(-30,-30);
      for(let x=-30;x<=w+30;x+=18){
        const nx=x/w;
        const val=Math.sin(nx*5.6+t*.12+s.phases[layer])*.48 +
          Math.sin(nx*11-t*.07+s.phases[0])*.26;
        ctx.lineTo(x,top+wave*val+(pointer.y-.5)*15);
      }
      for(let x=w+30;x>=-30;x-=18){
        const nx=x/w;
        const val=Math.sin(nx*5.6+t*.12+s.phases[layer])*.48 +
          Math.sin(nx*11-t*.07+s.phases[0])*.26;
        ctx.lineTo(x,top+wave*val+wave*(3.2+layer*.4));
      }
      ctx.closePath();ctx.fillStyle=grd;ctx.fill();
    }
    ctx.restore();
  }
  function paintStars(s,warp) {
    const cx=w*.67,cy=h*.42;
    for(const star of s.stars){
      const ox=(pointer.x-.5)*star.z*27,oy=(pointer.y-.5)*star.z*21;
      const x=star.x*w-ox,y=star.y*h-oy;
      if(warp>0){
        const dx=x-cx,dy=y-cy;
        const len=Math.sqrt(dx*dx+dy*dy)||1;
        ctx.strokeStyle=rgba(s.palette.c,.28+warp*.65);
        ctx.lineWidth=Math.max(.35,star.r*.85);
        ctx.beginPath();ctx.moveTo(x,y);
        ctx.lineTo(x+dx/len*(12+star.z*warp*125),y+dy/len*(12+star.z*warp*125));
        ctx.stroke();
      }else{
        const alpha=.27+star.br*.35+Math.max(0,Math.sin(t*star.s+star.p))*.38;
        ctx.fillStyle='rgba(239,235,255,'+alpha+')';
        const size=star.r*(star.br>.95?1.65:1);
        ctx.fillRect(x,y,size,size);
        if(star.br>.986){
          ctx.strokeStyle=rgba(s.palette.c,alpha*.65);ctx.lineWidth=.65;
          ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+6,y);
          ctx.moveTo(x,y-5);ctx.lineTo(x,y+6);ctx.stroke();
        }
      }
    }
  }
  function planetLocation(s){
    const narrow=mobile();
    const pr=s.planet;
    const r=Math.min(w*(narrow?.245:.165),h*(narrow?.173:.26))*pr.size;
    return {x:w*(narrow?.70:pr.x)+(pointer.x-.5)*(narrow?12:23),
      y:h*(narrow?.285:pr.y)+(pointer.y-.5)*(narrow?8:14),r};
  }
  function ellipseRing(x,y,r,rotation,start,end,color,alpha,width){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
    ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=width;
    ctx.beginPath();ctx.ellipse(0,0,r*1.83,r*.37,0,start,end);ctx.stroke();
    ctx.restore();
  }
  function paintPlanet(s){
    const p=s.palette,pl=s.planet,q=planetLocation(s),{x,y,r}=q;
    ctx.save();
    ctx.globalCompositeOperation='screen';
    softGlow(x,y,r*3.2,p.a,.14);
    softGlow(x+r*.22,y-r*.19,r*1.7,p.c,.105);
    ctx.restore();
    if(pl.rings){
      for(let i=0;i<9;i++){
        ellipseRing(x,y,r*(.94+i*.039),pl.tilt,Math.PI,2*Math.PI,
          i%3===0?p.b:p.c,.09+(i%2)*.12,1+i%3*.35);
      }
    }
    const halo=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.19,x,y,r*1.18);
    halo.addColorStop(0,rgba(p.a,.16));halo.addColorStop(.73,rgba(p.a,.015));
    halo.addColorStop(.88,rgba(p.c,.26));halo.addColorStop(1,rgba(p.c,0));
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*1.2,0,Math.PI*2);ctx.fill();
    const surface=ctx.createRadialGradient(x-r*.37,y-r*.45,r*.05,x+r*.2,y+r*.3,r*1.37);
    surface.addColorStop(0,rgba(p.b,.96));
    surface.addColorStop(.21,rgba(p.a,.9));
    surface.addColorStop(.52,rgba(p.deep,1));
    surface.addColorStop(.81,rgba(p.sky,1));
    surface.addColorStop(1,'#02040c');
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=surface;ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,r-.7,0,Math.PI*2);ctx.clip();
    for(let i=0;i<pl.bands.length;i++){
      const b=pl.bands[i];
      const yy=y-r+(i/31)*r*2.2;
      const spread=Math.sqrt(Math.max(0,r*r-(yy-y)*(yy-y)));
      if(spread<1)continue;
      ctx.beginPath();
      for(let k=0;k<=24;k++){
        const xx=x-spread+(spread*2*k/24);
        const lineY=yy+Math.sin(k*.38+b.phase+t*.04)*r*.012+
          Math.sin(k*.8+b.phase)*r*.008;
        if(k===0)ctx.moveTo(xx,lineY);else ctx.lineTo(xx,lineY);
      }
      ctx.strokeStyle=rgba(b.shade?p.c:p.b,b.alpha*.85);
      ctx.lineWidth=.55+r*.007*(b.alpha/.13);
      ctx.stroke();
    }
    const dark=ctx.createLinearGradient(x-r,y-r*.35,x+r,y+r*.75);
    dark.addColorStop(0,'rgba(0,0,0,0)');
    dark.addColorStop(.4,'rgba(0,0,0,.06)');
    dark.addColorStop(1,'rgba(0,0,0,.67)');
    ctx.fillStyle=dark;ctx.fillRect(x-r,y-r,r*2,r*2);
    const spec=ctx.createRadialGradient(x-r*.42,y-r*.6,0,x-r*.42,y-r*.6,r*.78);
    spec.addColorStop(0,'rgba(255,255,250,.34)');
    spec.addColorStop(.24,'rgba(255,240,255,.07)');
    spec.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=spec;ctx.fillRect(x-r,y-r,r*2,r*2);
    ctx.restore();
    ctx.beginPath();ctx.arc(x,y,r+.7,0,Math.PI*2);
    ctx.strokeStyle=rgba(p.c,.45);ctx.lineWidth=1.25;ctx.stroke();
    if(pl.rings){
      for(let i=0;i<11;i++){
        ellipseRing(x,y,r*(.94+i*.032),pl.tilt,0,Math.PI,
          i%3===0?p.b:p.a,.13+(i%3===0?.38:.09),i%4===0?1.9:.65);
      }
      ellipseRing(x,y,r*1.38,pl.tilt,0,Math.PI,p.b,.52,1.2);
    }
    ctx.save();ctx.translate(x,y);ctx.rotate(t*.026);
    ctx.strokeStyle=rgba(p.c,.26);ctx.lineWidth=.75;ctx.setLineDash([2,8]);
    ctx.beginPath();ctx.arc(0,0,r*2.22,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    const orb=t*.13+s.phases[2];
    const sx=Math.cos(orb)*r*2.22,sy=Math.sin(orb)*r*2.22;
    softGlow(sx,sy,r*.22,p.c,.47);
    ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(sx,sy,Math.max(1.6,r*.012),0,Math.PI*2);ctx.fill();
    ctx.restore();
    const moonX=x-r*1.86+Math.sin(t*.045+s.phases[3])*5;
    const moonY=y-r*1.09+Math.cos(t*.063+s.phases[1])*5;
    softGlow(moonX,moonY,r*.3,p.b,.23);
    ctx.fillStyle=p.b;ctx.beginPath();ctx.arc(moonX,moonY,r*.048,0,Math.PI*2);ctx.fill();
  }
  function paintLandscape(s){
    const p=s.palette,pr=planetLocation(s);
    const isSmall=mobile(),base=isSmall?.82:.80;
    ctx.save();
    const fog=ctx.createLinearGradient(0,h*.62,0,h);
    fog.addColorStop(0,rgba(p.b,0));fog.addColorStop(.4,rgba(p.a,.055));
    fog.addColorStop(1,rgba(p.c,.095));
    ctx.fillStyle=fog;ctx.fillRect(0,h*.62,w,h*.38);
    const l=[{y:base-.10,a:.075,c:p.deep,o:.83,phase:s.phases[0],v:.08},
      {y:base-.048,a:.060,c:p.ground,o:.95,phase:s.phases[1],v:.04},
      {y:base+.030,a:.054,c:p.sky,o:1,phase:s.phases[2],v:.03}];
    l.forEach((m,i)=>{
      pathMountain(h*m.y,h*m.a,m.phase,m.v);
      ctx.globalAlpha=m.o;ctx.fillStyle=m.c;ctx.fill();
      ctx.globalAlpha=.15;
      ctx.strokeStyle=i===0?p.c:p.a;ctx.lineWidth=.7;ctx.stroke();
    });
    ctx.globalAlpha=1;
    const floor=ctx.createLinearGradient(0,h*.77,0,h);
    floor.addColorStop(0,rgba(p.ground,0));
    floor.addColorStop(.35,rgba(p.ground,.40));
    floor.addColorStop(1,p.sky);
    ctx.fillStyle=floor;ctx.fillRect(0,h*.78,w,h*.22);
    const lakeGlow=ctx.createLinearGradient(pr.x-pr.r*2.2,h*.9,pr.x+pr.r*2.2,h*.9);
    lakeGlow.addColorStop(0,rgba(p.a,0));
    lakeGlow.addColorStop(.5,rgba(p.a,.36));
    lakeGlow.addColorStop(1,rgba(p.c,0));
    ctx.save();ctx.globalAlpha=.32;
    for(let i=0;i<33;i++){
      const y=h*(.85+i*.006);
      const width=(28+i*7)*Math.min(1,w/900);
      const wobble=Math.sin(t*.3+i*1.6)*7;
      ctx.strokeStyle=lakeGlow;ctx.lineWidth=(i%4===0?1.2:.55);
      ctx.beginPath();ctx.moveTo(pr.x-width+wobble,y);
      ctx.lineTo(pr.x+width+wobble,y);ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }
  function paintDust(s){
    ctx.save();ctx.globalCompositeOperation='screen';
    const p=s.palette;
    s.dust.forEach((d,i)=>{
      const y=((d.y+t*d.v*.009)%1)*h;
      const x=d.x*w+Math.sin(t*.31+d.s)*13;
      const twinkle=.18+Math.max(0,Math.sin(t*.7+d.s))*.3;
      ctx.fillStyle=rgba(i%3===0?p.c:p.a,twinkle);
      ctx.beginPath();ctx.arc(x,y,d.r,0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
  }
  function paintMeteors(dt){
    timeToMeteor-=dt;
    if(timeToMeteor<=0){
      const left=Math.random()>.5;
      meteors.push({x:left?-30:w+30,y:h*(.12+Math.random()*.36),
        vx:(left?1:-1)*(4+Math.random()*3),vy:1.3+Math.random(),
        life:1,max:1,length:100+Math.random()*140});
      timeToMeteor=6500+Math.random()*10500;
    }
    meteors=meteors.filter(m=>m.life>0);
    meteors.forEach(m=>{
      m.x+=m.vx*(dt/16);m.y+=m.vy*(dt/16);m.life-=dt/1800;
      ctx.save();ctx.globalCompositeOperation='screen';
      const tail=ctx.createLinearGradient(m.x-m.vx*24,m.y-m.vy*24,m.x,m.y);
      const color=scene.palette.c;
      tail.addColorStop(0,rgba(color,0));tail.addColorStop(1,rgba(color,.85*m.life));
      ctx.strokeStyle=tail;ctx.lineWidth=1.4;ctx.beginPath();
      ctx.moveTo(m.x-m.vx*24,m.y-m.vy*24);
      ctx.lineTo(m.x,m.y);ctx.stroke();
      ctx.restore();
    });
  }
  function paintPlanted(){
    const color=scene.palette.c;
    ctx.save();
    if(planted.length>1){
      ctx.lineWidth=1;
      for(let i=1;i<planted.length;i++){
        const a=planted[i-1],b=planted[i];
        if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)>.85)continue;
        const gradient=ctx.createLinearGradient(a.x*w,a.y*h,b.x*w,b.y*h);
        gradient.addColorStop(0,rgba(scene.palette.a,.05));
        gradient.addColorStop(.5,rgba(color,.38));
        gradient.addColorStop(1,rgba(color,.17));
        ctx.strokeStyle=gradient;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);
        ctx.lineTo(b.x*w,b.y*h);ctx.stroke();
      }
    }
    planted.forEach((v,i)=>{
      const x=v.x*w,y=v.y*h;
      const phase=Math.sin(t*1.7+i*1.4);
      ctx.fillStyle=rgba('#ffffff',.78+phase*.2);
      ctx.shadowColor=color;ctx.shadowBlur=18;ctx.beginPath();
      ctx.arc(x,y,Math.max(1.6,2.1+(i%3)*.4),0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.strokeStyle=rgba(color,.25+phase*.12);
      ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,8+phase*1.7,0,Math.PI*2);ctx.stroke();
      if(i%4===0){
        ctx.strokeStyle=rgba(scene.palette.b,.28);ctx.beginPath();
        ctx.moveTo(x-12,y);ctx.lineTo(x+12,y);
        ctx.moveTo(x,y-12);ctx.lineTo(x,y+12);ctx.stroke();
      }
    });
    ctx.restore();
    ripples=ripples.filter(r=>r.life>0);
    ripples.forEach(r=>{
      ctx.strokeStyle=rgba(color,r.life*.54);
      ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(r.x*w,r.y*h,12+(1-r.life)*95,0,Math.PI*2);ctx.stroke();
      r.life-=.025;
    });
    sparks=sparks.filter(s=>s.life>0);
    sparks.forEach(s=>{
      s.x+=s.vx;s.y+=s.vy;s.vy+=.013;s.life-=.015;
      ctx.fillStyle=rgba(scene.palette.b,s.life);
      ctx.fillRect(s.x*w,s.y*h,1.5,1.5);
    });
  }
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden||!ctx||!scene)return;
    if(reduceMotion&&now-lastFrame<50)return;
    const dt=lastFrame?Math.min(80,now-lastFrame):16;
    lastFrame=now;t+=dt/1000;
    pointer.x=lerp(pointer.x,pointer.tx,Math.min(1,dt*.005));
    pointer.y=lerp(pointer.y,pointer.ty,Math.min(1,dt*.005));
    ctx.clearRect(0,0,w,h);
    paintSky(scene);
    paintAurora(scene);
    const warp=clamp((warpUntil-now)/900,0,1);
    paintStars(scene,warp);
    paintPlanet(scene);
    paintLandscape(scene);
    paintDust(scene);
    paintMeteors(dt);
    paintPlanted();
  }

  function worldRecord(word){
    return atlas.find(r=>r.word.toLocaleLowerCase('fr')===word.toLocaleLowerCase('fr'));
  }
  function recordWorld(word){
    let rec=worldRecord(word);
    if(!rec){
      rec={word,stars:[],at:Date.now()};
      atlas.unshift(rec);
    }else{
      atlas=atlas.filter(r=>r!==rec);atlas.unshift(rec);
    }
    atlas=atlas.slice(0,24);saveAtlas();
    return rec;
  }
  function formatTitle(word,seed){
    const prefix=prefixes[seed%prefixes.length];
    return prefix+' '+word;
  }
  function updateStarCount(){$('starCount').textContent=pad(planted.length);}
  function setUrl(word){
    try{
      const url=new URL(location.href);
      if(word)url.searchParams.set('monde',word);
      else url.searchParams.delete('monde');
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    }catch(_){}
  }
  function startWorld(raw){
    const word=normalize(raw);
    if(!word){$('worldInput').focus();return;}
    activeWord=word;
    scene=createScene(word);
    const rec=recordWorld(word);
    planted=Array.isArray(rec.stars)?rec.stars.filter(p=>p&&
      Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1).slice(0,60):[];
    meteors=[];ripples=[];sparks=[];timeToMeteor=3500;
    $('worldArchive').textContent=pad(scene.seed%999999,6);
    $('worldTitle').textContent=formatTitle(word,scene.seed);
    $('worldQuote').textContent=loreA[scene.seed%loreA.length]+' '+
      loreB[(scene.seed>>>5)%loreB.length];
    $('worldClimate').textContent=climates[(scene.seed>>>8)%climates.length];
    $('worldFrequency').textContent=signs[(scene.seed>>>13)%signs.length];
    $('worldCoords').textContent=((scene.seed%10000)/100).toFixed(2)+' / '+(((scene.seed>>>9)%10000)/100).toFixed(2);
    $('intro').hidden=true;$('experience').hidden=false;
    document.body.classList.add('is-exploring');
    $('worldInput').blur();updateStarCount();setUrl(word);
    const f=$('flash');f.classList.remove('burst');void f.offsetWidth;f.classList.add('burst');
    $('touchInstruction').style.opacity='1';
    clearTimeout(hintTimer);
    hintTimer=setTimeout(()=>{$('touchInstruction').style.opacity='0';},11000);
    if(soundOn)for(let i=0;i<3;i++)setTimeout(()=>playTone(4+i*2,.16),i*140);
  }
  function backToIntro(){
    closeAtlas();activeWord=null;planted=[];scene=createScene('Horizon');
    $('intro').hidden=false;$('experience').hidden=true;
    document.body.classList.remove('is-exploring');
    setUrl(null);$('worldInput').value='';
  }
  function plantStar(x,y){
    if(!activeWord)return;
    x=clamp(x,0,1);y=clamp(y,0,1);
    if(planted.length>=60){
      showToast('Cette constellation est complète. Créez un autre monde pour continuer.');
      return;
    }
    planted.push({x,y});ripples.push({x,y,life:1});
    for(let i=0;i<20;i++){
      const angle=Math.random()*Math.PI*2;
      const speed=.0004+Math.random()*.0024;
      sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.7+Math.random()*.3});
    }
    const rec=worldRecord(activeWord);
    if(rec)rec.stars=planted.slice();
    saveAtlas();updateStarCount();
    playTone(Math.floor((1-y)*12),.18+Math.min(8,planted.length)*.012);
    if(planted.length===1)showToast('Votre première étoile vient de naître.');
    if(planted.length%7===0){
      showToast(planted.length===7?
        'Vous venez d’inventer une constellation qui n’existait pas. ✦':
        'Votre ciel se souvient maintenant de '+planted.length+' étoiles. ✦');
      warpUntil=performance.now()+1200;
      for(let i=0;i<5;i++)setTimeout(()=>playTone(i*2,.09),i*120);
    }
  }
  function showToast(message){
    const el=$('toast');el.textContent=message;el.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
  }
  function renderAtlas(){
    saveAtlas();
    const el=$('atlasList');el.replaceChildren();
    if(!atlas.length){
      const empty=document.createElement('div');empty.className='atlas-empty';
      const icon=document.createElement('span');icon.className='empty-star';icon.textContent='✳';
      const title=document.createElement('p');title.textContent='L’infini commence ici.';
      const sub=document.createElement('small');sub.textContent='Vos premiers mondes apparaîtront dans cet atlas, avec les étoiles que vous aurez semées.';
      empty.append(icon,title,sub);el.append(empty);return;
    }
    atlas.forEach((rec)=>{
      const seed=hashString(rec.word.toLocaleLowerCase('fr'));
      const p=palettes[seed%palettes.length];
      const button=document.createElement('button');button.type='button';button.className='atlas-card';
      const thumb=document.createElement('span');thumb.className='atlas-thumb';
      thumb.style.setProperty('--thumbA',p.a);thumb.style.setProperty('--thumbB',p.deep);
      const copy=document.createElement('span');copy.className='atlas-card-info';
      const title=document.createElement('h3');title.textContent=formatTitle(rec.word,seed);
      const subtitle=document.createElement('p');
      const d=new Date(rec.at);
      subtitle.textContent=d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})+
        '  ·  '+(Array.isArray(rec.stars)?rec.stars.length:0)+' ÉTOILES';
      copy.append(title,subtitle);
      const arrow=document.createElement('span');arrow.className='atlas-card-arrow';arrow.textContent='↗';
      button.append(thumb,copy,arrow);
      button.addEventListener('click',()=>{closeAtlas();startWorld(rec.word);});
      el.append(button);
    });
  }
  function openAtlas(){
    priorFocus=document.activeElement;renderAtlas();atlasOpen=true;
    $('atlasBackdrop').hidden=false;
    $('atlasPanel').classList.add('open');
    $('atlasPanel').setAttribute('aria-hidden','false');
    $('atlasClose').focus();
  }
  function closeAtlas(){
    if(!atlasOpen)return;atlasOpen=false;
    $('atlasPanel').classList.remove('open');
    $('atlasPanel').setAttribute('aria-hidden','true');
    $('atlasBackdrop').hidden=true;
    if(priorFocus && document.contains(priorFocus))priorFocus.focus({preventScroll:true});
  }

  function ensureAudio(){
    if(audio)return audio;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return null;
    try{ audio=new AudioContext();return audio; }
    catch(_){return null;}
  }
  function playTone(index=0,volume=.18){
    if(!soundOn)return;
    const ac=ensureAudio();if(!ac)return;
    if(ac.state==='suspended')ac.resume().catch(()=>{});
    const scale=[130.81,146.83,164.81,196,220,261.63,293.66,329.63,392,440,523.25,587.33,659.25];
    const freq=scale[((index%scale.length)+scale.length)%scale.length];
    const now=ac.currentTime;
    const osc=ac.createOscillator(),second=ac.createOscillator();
    const gain=ac.createGain(),lp=ac.createBiquadFilter();
    osc.type='sine';osc.frequency.value=freq;
    second.type='triangle';second.frequency.value=freq*1.005;
    lp.type='lowpass';lp.frequency.value=1250;lp.Q.value=.4;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume*.12),now+.035);
    gain.gain.exponentialRampToValueAtTime(.0001,now+1.35);
    osc.connect(lp);second.connect(lp);lp.connect(gain);gain.connect(ac.destination);
    osc.start(now);second.start(now);osc.stop(now+1.4);second.stop(now+1.4);
  }
  function stopAmbient(){
    if(!ambient)return;
    const a=ambient;ambient=null;
    try{
      a.gain.gain.cancelScheduledValues(audio.currentTime);
      a.gain.gain.setTargetAtTime(.00001,audio.currentTime,.22);
      a.nodes.forEach(n=>{n.stop(audio.currentTime+1.4);});
      setTimeout(()=>{try{a.gain.disconnect();}catch(_){}},1800);
    }catch(_){}
  }
  function startAmbient(){
    if(ambient||!audio)return;
    const gain=audio.createGain(),lp=audio.createBiquadFilter();
    lp.type='lowpass';lp.frequency.value=550;
    gain.gain.setValueAtTime(.00001,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.014,audio.currentTime+2);
    lp.connect(gain);gain.connect(audio.destination);
    const nodes=[];
    [65.41,98,130.81].forEach((frequency,i)=>{
      const osc=audio.createOscillator();osc.type=i===1?'triangle':'sine';
      osc.frequency.value=frequency;
      const voice=audio.createGain();voice.gain.value=i===1?.17:.29;
      osc.connect(voice);voice.connect(lp);osc.start();
      nodes.push(osc);
    });
    ambient={gain,nodes};
  }
  async function toggleSound(){
    soundOn=!soundOn;
    if(soundOn){
      const ac=ensureAudio();
      if(!ac){soundOn=false;showToast('Le son n’est pas disponible sur cet appareil.');return;}
      try{await ac.resume();startAmbient();playTone(7,.22);}
      catch(_){soundOn=false;}
    }else stopAmbient();
    $('soundButton').setAttribute('aria-pressed',String(soundOn));
    $('soundIcon').textContent=soundOn?'♫':'◌';
    $('soundLabel').textContent=soundOn?'SON ON':'SON OFF';
    if(soundOn)showToast('Montez doucement le volume : votre monde a une voix.');
  }
  function captureWorld(){
    if(!scene)return;
    try{
      const target=document.createElement('canvas');
      const ratio=Math.min(2,2400/Math.max(canvas.width,1));
      target.width=Math.round(canvas.width*ratio);
      target.height=Math.round(canvas.height*ratio);
      const g=target.getContext('2d');
      g.drawImage(canvas,0,0,target.width,target.height);
      const ww=target.width,hh=target.height;
      const fs=Math.max(18,Math.min(68,ww*.052));
      const fade=g.createLinearGradient(0,hh*.45,0,hh);
      fade.addColorStop(0,'rgba(3,3,13,0)');fade.addColorStop(1,'rgba(3,3,13,.78)');
      g.fillStyle=fade;g.fillRect(0,hh*.4,ww,hh*.6);
      const x=ww*.065;
      g.fillStyle='#f2e9ff';g.font='600 '+Math.max(12,Math.round(ww*.016))+'px sans-serif';
      g.fillText('✳   A N O M A L I A   /   VOTRE UNIVERS',x,hh*.79);
      g.font=Math.round(fs)+'px Georgia, serif';
      const title=activeWord?formatTitle(activeWord,scene.seed):'L’atelier de l’impossible';
      g.fillText(title.slice(0,44),x,hh*.88,ww*.85);
      g.fillStyle='#cabee0';g.font=Math.max(12,Math.round(ww*.013))+'px sans-serif';
      g.fillText('MONDE #'+pad(scene.seed%999999,6)+'  ·  '+pad(planted.length)+' ÉTOILES SEMÉES',x,hh*.94);
      const a=document.createElement('a');a.href=target.toDataURL('image/png');
      a.download='anomalia-'+(activeWord||'univers').toLocaleLowerCase('fr')
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'-').slice(0,38)+'.png';
      document.body.append(a);a.click();a.remove();showToast('Votre monde a été capturé en image.');
    }catch(_){showToast('Impossible de capturer cette image sur cet appareil.');}
  }
  async function shareWorld(){
    if(!activeWord)return;
    const url=new URL(location.href);url.searchParams.set('monde',activeWord);
    const link=url.href;
    if(navigator.share){
      try{await navigator.share({title:'Mon monde ANOMALIA',text:'Voici un monde que j’ai fait naître.',url:link});return;}
      catch(err){if(err&&err.name==='AbortError')return;}
    }
    try{await navigator.clipboard.writeText(link);showToast('Lien du monde copié. Envoyez-le à qui vous voulez !');}
    catch(_){
      const input=document.createElement('textarea');
      input.value=link;document.body.append(input);input.select();
      try{document.execCommand('copy');showToast('Lien du monde copié.');}
      catch(__){window.prompt('Copiez le lien de votre monde :',link);}
      input.remove();
    }
  }
  function randomWorld(){startWorld(randomNames[Math.floor(Math.random()*randomNames.length)]);}

  $('worldForm').addEventListener('submit',event=>{
    event.preventDefault();startWorld($('worldInput').value);
  });
  $('randomIntro').addEventListener('click',randomWorld);
  $('newWorldButton').addEventListener('click',backToIntro);
  $('brandHome').addEventListener('click',event=>{event.preventDefault();backToIntro();});
  $('soundButton').addEventListener('click',toggleSound);
  $('atlasButton').addEventListener('click',openAtlas);
  $('atlasClose').addEventListener('click',closeAtlas);
  $('atlasBackdrop').addEventListener('click',closeAtlas);
  $('atlasCreate').addEventListener('click',backToIntro);
  $('captureButton').addEventListener('click',captureWorld);
  $('shareButton').addEventListener('click',shareWorld);

  canvas.addEventListener('pointermove',event=>{
    pointer.tx=clamp(event.clientX/w,0,1);
    pointer.ty=clamp(event.clientY/h,0,1);
    if(event.pointerType==='mouse'){
      document.body.classList.add('pointer-ready');
      const ring=$('cursorRing');ring.style.left=event.clientX+'px';ring.style.top=event.clientY+'px';
    }
  },{passive:true});
  canvas.addEventListener('pointerdown',event=>{
    pointer.down={x:event.clientX,y:event.clientY};
    $('cursorRing').classList.add('pressed');
    if(event.pointerType==='mouse')document.body.classList.add('pointer-ready');
  });
  canvas.addEventListener('pointerup',event=>{
    $('cursorRing').classList.remove('pressed');
    if(pointer.down){
      const dx=event.clientX-pointer.down.x,dy=event.clientY-pointer.down.y;
      if(dx*dx+dy*dy<196)plantStar(event.clientX/w,event.clientY/h);
    }
    pointer.down=null;
  });
  canvas.addEventListener('pointercancel',()=>{
    pointer.down=null;$('cursorRing').classList.remove('pressed');
  });
  canvas.addEventListener('pointerleave',()=>document.body.classList.remove('pointer-ready'));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&atlasOpen)closeAtlas();
    if(atlasOpen&&event.key==='Tab'){
      const panel=$('atlasPanel');
      const focusables=Array.from(panel.querySelectorAll('button:not([disabled])'));
      if(focusables.length){
        const first=focusables[0],last=focusables[focusables.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    }
    if(event.code==='Space'&&activeWord&&!atlasOpen&&event.target.tagName!=='INPUT'&&event.target.tagName!=='BUTTON'){
      event.preventDefault();warpUntil=performance.now()+950;playTone(9,.1);
    }
  });
  window.addEventListener('resize',fit,{passive:true});
  window.addEventListener('popstate',()=>{
    const word=new URLSearchParams(location.search).get('monde');
    if(word)startWorld(word);else backToIntro();
  });
  document.addEventListener('visibilitychange',()=>{lastFrame=0;});

  fit();saveAtlas();
  const shared=new URLSearchParams(location.search).get('monde');
  if(shared&&normalize(shared))startWorld(shared);
  else{scene=createScene('Horizon');$('intro').hidden=false;$('experience').hidden=true;}
  requestAnimationFrame(frame);
})();