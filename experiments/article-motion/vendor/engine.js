/* ============================================================
   动效引擎 Motion v1.1 · 2026-09-01
   一键网页动画 的动作动词正本（文档C第七章的可执行形态）。

   v1.1：增加编辑物理动词 burstScatter / extractOne / pileStack /
   coverPush / reorderFlip / bandTear。它们只提供物理关系，不绑定纸张、
   配色、字体或具体版面。

   复用规则（文档C第十章）：
   1. 本文件是唯一正本。默认由流水线把本文件【原样复制】到动画目录，
      在 GSAP 后引用；真正单文件交付时才原样内联。两种方式都必须保留
      本头注释与版本号，不得改动实现。
   2. 技术AI只允许：调用动词并传参；不允许在片内重写同名逻辑。
   3. 新技法先进本引擎（加动词+版本号递增），再到
      丝滑技法样例.html 加演示卡，最后才允许在片中使用。
   4. 依赖：GSAP 3.x 已加载。无其他依赖。

   命名空间：window.Motion
   通用约定：多数动词接受 opts.tl 与 opts.at ——
     传入 tl 时把动作排进该 timeline 的 at 位置并返回 tl；
     不传时立即执行并返回 tween/timeline。
   ============================================================ */
(function(){
  'use strict';
  if(window.Motion){console.warn('Motion already loaded', window.Motion.version);return;}
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 内部工具 ---------- */
  const toArr = t => gsap.utils.toArray(t);
  function place(anim, opts){          /* 统一处理 tl/at 排布 */
    if(opts && opts.tl){ opts.tl.add(anim, opts.at ?? '+=0'); return opts.tl; }
    return anim;
  }
  function parseColor(c){
    c=String(c).trim();
    if(c[0]==='#'){const h=c.slice(1);const f=h.length===3?h.split('').map(x=>x+x).join(''):h;
      return [parseInt(f.slice(0,2),16),parseInt(f.slice(2,4),16),parseInt(f.slice(4,6),16),1];}
    const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return [255,255,255,1];
    const p=m[1].split(',').map(parseFloat);return [p[0],p[1],p[2],p[3]==null?1:p[3]];
  }
  const lerpN=(a,b,t)=>a+(b-a)*t;

  /* ---------- 颜色 ---------- */
  /* mix(c1,c2,t): t=0 得 c1，t=1 得 c2。alpha 可乘 */
  function mix(c1,c2,t,alpha=1){
    const a=parseColor(c1),b=parseColor(c2);
    return `rgba(${Math.round(lerpN(a[0],b[0],t))},${Math.round(lerpN(a[1],b[1],t))},${Math.round(lerpN(a[2],b[2],t))},${(lerpN(a[3],b[3],t)*alpha).toFixed(3)})`;
  }
  /* 文档D第一章：从一个主色推导整套色彩系统 */
  function derivePalette(brand,{darkBase='#0b0b0c',lightBase='#f2eee6'}={}){
    return {
      brand,
      ink : mix(darkBase, brand, .12),   /* 底色：近黑染12%主色 */
      bone: mix(lightBase, brand, .08),  /* 文字：近白染8%主色 */
      acc : brand,
      accDeep: mix(brand,'#000000',.55), /* 区域级红/深底 */
      dim : a=>mix(lightBase, brand, .08, a) /* 次级阶梯用透明度 */
    };
  }

  /* ---------- 文字 ---------- */
  function splitChars(el){
    if(el.dataset.mSplit) return Array.from(el.querySelectorAll('.m-ch'));
    const t=el.textContent; el.textContent=''; el.dataset.mSplit='1';
    return [...t].map(c=>{const s=document.createElement('span');s.className='m-ch';
      s.style.display='inline-block'; s.textContent=c===' '?' ':c; el.appendChild(s); return s;});
  }
  /* 写出（丝滑默认入场）。opTo=整元素目标透明度 */
  function writeOn(el,{each=.03,dur=.35,dy=5,opTo=1,ease='sine.out',tl,at}={}){
    const chs=splitChars(el);
    const t=gsap.timeline();
    t.set(el,{opacity:opTo},0);
    t.fromTo(chs,{opacity:0,y:dy},{opacity:1,y:0,duration:dur,ease,stagger:each},0);
    return place(t,{tl,at});
  }
  /* 聚拢：字符从散乱确定性位置归位成句 */
  function gather(el,{spread=60,dur=1.1,each=.04,tl,at}={}){
    const chs=splitChars(el);
    const t=gsap.timeline();
    t.set(el,{opacity:1},0);
    chs.forEach((c,i)=>{
      const dx=Math.sin(i*7.7)*spread, dy=Math.cos(i*5.3)*spread*.6, r=Math.sin(i*3.1)*40;
      t.fromTo(c,{x:dx,y:dy,rotation:r,opacity:.25},
        {x:0,y:0,rotation:0,opacity:1,duration:dur,ease:'power2.inOut'},i*each);
    });
    return place(t,{tl,at});
  }
  /* 数字计数（ValueTracker）。format 可自定义显示 */
  function counter(el,{from=0,to,dur=1,ease='power2.inOut',format=v=>Math.round(v),onUpdate,tl,at}={}){
    const st={v:from};
    const tw=gsap.to(st,{v:to,duration:dur,ease,onUpdate:()=>{
      el.textContent=format(st.v); if(onUpdate)onUpdate(st.v);
    }});
    return place(tw,{tl,at});
  }
  /* 数字滚轮：容器内为每一位建 0-9 列并滚到目标 */
  function odometer(el,{to,digits,dur=1.4,ease='power2.inOut',tl,at}={}){
    const str=String(to).padStart(digits||String(to).length,'0');
    if(!el.dataset.mOdo){
      el.dataset.mOdo='1';
      el.style.display='inline-flex'; el.style.overflow='hidden';
      el.style.height='1em'; el.style.lineHeight='1';
      el.textContent='';
      for(let i=0;i<str.length;i++){
        const col=document.createElement('span');
        col.className='m-odo-col'; col.style.display='inline-block';
        col.innerHTML=Array.from({length:10},(_,d)=>`<span style="display:block;height:1em;line-height:1">${d}</span>`).join('');
        el.appendChild(col);
      }
    }
    const cols=Array.from(el.children);
    const t=gsap.timeline();
    cols.forEach((col,i)=>{
      const d=+str[i];
      t.fromTo(col,{y:0},{y:`-${d}em`,duration:dur,ease},i*.12);
    });
    return place(t,{tl,at});
  }

  /* ---------- 图形 ---------- */
  /* SVG 路径描出 */
  function drawPath(path,{dur=1.2,ease='power2.inOut',tl,at}={}){
    const L=path.getTotalLength();
    path.style.strokeDasharray=L;
    const tw=gsap.fromTo(path,{strokeDashoffset:L},{strokeDashoffset:0,duration:dur,ease});
    return place(tw,{tl,at});
  }
  /* canvas 折线描出：segs=[[x1,y1,x2,y2],...]，返回 draw(ctx,progress) */
  function segDrawer(segs){
    const lens=segs.map(s=>Math.hypot(s[2]-s[0],s[3]-s[1]));
    const total=lens.reduce((a,b)=>a+b,0);
    return function(ctx,progress){
      let budget=Math.max(0,Math.min(1,progress))*total;
      ctx.beginPath();
      for(let i=0;i<segs.length;i++){
        if(budget<=0)break;
        const s=segs[i],f=Math.min(1,budget/lens[i]);
        ctx.moveTo(s[0],s[1]);
        ctx.lineTo(lerpN(s[0],s[2],f),lerpN(s[1],s[3],f));
        budget-=lens[i];
      }
      ctx.stroke();
    };
  }

  /* ---------- 入场动词（打击流） ---------- */
  function smash(el,{scale=2,rot=-6,dur=.2,tl,at}={}){
    return place(gsap.fromTo(el,{opacity:0,scale,rotation:rot},
      {opacity:1,scale:1,rotation:0,duration:dur,ease:'power3.out'}),{tl,at});
  }
  function pop(el,{dur=.24,tl,at}={}){
    return place(gsap.fromTo(el,{opacity:0,scale:0},
      {opacity:1,scale:1,duration:dur,ease:'back.out(3)'}),{tl,at});
  }
  function flyIn(el,{from='left',dist=80,dur=.25,tl,at}={}){
    const v={left:{x:-dist},right:{x:dist},up:{y:-dist},down:{y:dist}}[from];
    return place(gsap.fromTo(el,{opacity:0,...v},
      {opacity:1,x:0,y:0,duration:dur,ease:'power4.out'}),{tl,at});
  }
  /* ---------- 入场动词（丝滑流） ---------- */
  function rise(el,{dy=14,dur=.8,opTo=1,tl,at}={}){    /* 浮现 */
    return place(gsap.fromTo(el,{opacity:0,y:dy},
      {opacity:opTo,y:0,duration:dur,ease:'sine.inOut'}),{tl,at});
  }
  function develop(el,{dur=1.4,blur=3,opTo=1,tl,at}={}){ /* 显影 */
    return place(gsap.fromTo(el,{opacity:0,filter:`blur(${blur}px)`},
      {opacity:opTo,filter:'blur(0px)',duration:dur,ease:'sine.inOut'}),{tl,at});
  }

  /* ---------- 驻留 ---------- */
  function breathe(el,{amp=1.015,period=3,tl,at}={}){
    return place(gsap.to(el,{scale:amp,duration:period/2,yoyo:true,repeat:-1,ease:'sine.inOut'}),{tl,at});
  }
  function driftScale(el,{to=1.05,dur=3,tl,at}={}){     /* 可见的慢推 */
    return place(gsap.to(el,{scale:to,duration:dur,ease:'none'}),{tl,at});
  }

  /* ---------- 转场（文档C第六章） ---------- */
  /* 遮罩擦除：topEl 盖在旧内容上，从 dir 方向扫入显出 */
  function wipeReveal(topEl,{dir='right',dur=.8,tl,at}={}){
    const from={right:'inset(0 100% 0 0)',left:'inset(0 0 0 100%)',
                down:'inset(0 0 100% 0)',up:'inset(100% 0 0 0)'}[dir];
    const t=gsap.timeline();
    t.set(topEl,{opacity:1},0);
    t.fromTo(topEl,{clipPath:from},{clipPath:'inset(0 0 0 0)',duration:dur,ease:'power2.inOut'},0);
    return place(t,{tl,at});
  }
  /* 共享元素接力：el 从当前位置飞到 targetEl 的位置与大小 */
  function flipMove(el,targetEl,{dur=.9,tl,at}={}){
    const a=el.getBoundingClientRect(), b=targetEl.getBoundingClientRect();
    const sx=b.width/a.width, sy=b.height/a.height;
    const tw=gsap.to(el,{x:`+=${b.left-a.left}`,y:`+=${b.top-a.top}`,
      scaleX:`*=${sx}`,scaleY:`*=${sy}`,transformOrigin:'0 0',
      duration:dur,ease:'power2.inOut'});
    return place(tw,{tl,at});
  }
  /* 焦点切换：front 失焦淡出，back 对焦浮现 */
  function rackFocus(frontEl,backEl,{dur=1,blur=6,tl,at}={}){
    const t=gsap.timeline();
    t.to(frontEl,{opacity:.12,filter:`blur(${blur}px)`,duration:dur,ease:'sine.inOut'},0)
     .fromTo(backEl,{opacity:0,filter:`blur(${blur}px)`},
       {opacity:1,filter:'blur(0px)',duration:dur,ease:'sine.inOut'},dur*.15);
    return place(t,{tl,at});
  }
  /* 液态字幕接力：主画面不动，旧行让位新行 */
  function liquidSwap(oldEl,newEl,{dy=6,tl,at}={}){
    const t=gsap.timeline();
    if(oldEl)t.to(oldEl,{opacity:0,y:-dy,duration:.35,ease:'sine.in'},0);
    t.fromTo(newEl,{opacity:0,y:dy},{opacity:1,y:0,duration:.45,ease:'sine.out'},oldEl?.2:0);
    return place(t,{tl,at});
  }
  /* 相机：world 容器反向变换 */
  function cameraTo(world,{x=0,y=0,scale=1,origin='50% 50%',dur=1.2,tl,at}={}){
    world.style.willChange='transform';
    return place(gsap.to(world,{x,y,scale,transformOrigin:origin,
      duration:dur,ease:'power2.inOut'}),{tl,at});
  }

  /* ---------- 编辑物理：有因果的版面行为 ---------- */
  /* 喷涌：元素从同一方向带确定性散差冲入各自既定终点 */
  function burstScatter(targets,{from='left',distance=180,spread=70,rot=18,
      dur=.72,each=.045,tl,at}={}){
    const els=toArr(targets),t=gsap.timeline();
    els.forEach((el,i)=>{
      const side=from==='right'||from==='down'?1:-1;
      const horizontal=from==='left'||from==='right';
      const main=side*(distance+i*11),cross=Math.sin((i+1)*2.37)*spread;
      const start=horizontal?{x:main,y:cross}:{x:cross,y:main};
      t.fromTo(el,{opacity:0,scale:.82,rotation:Math.sin((i+1)*1.91)*rot,...start},
        {opacity:1,scale:1,x:0,y:0,rotation:0,duration:dur,ease:'power3.out'},i*each);
    });
    return place(t,{tl,at});
  }
  /* 抽取：一个对象被选出，其余对象让位但不凭空消失 */
  function extractOne(selected,others,{x=0,y=-42,scale=1.12,rot=-2,spread=34,
      dim=.28,dur=.75,tl,at}={}){
    const rest=toArr(others),t=gsap.timeline();
    t.to(selected,{x,y,scale,rotation:rot,zIndex:20,duration:dur,ease:'power2.inOut'},0);
    rest.forEach((el,i)=>{
      const side=i%2?1:-1,dy=Math.sin((i+1)*2.11)*spread*.45;
      t.to(el,{x:`+=${side*(spread+Math.floor(i/2)*7)}`,y:`+=${dy}`,
        opacity:dim,duration:dur,ease:'power2.inOut'},i*.025);
    });
    return place(t,{tl,at});
  }
  /* 堆叠施压：多个对象落成一摞，偏差确定、可复现 */
  function pileStack(targets,{xStep=7,yStep=-7,rotStep=2.2,drop=110,
      dur=.65,each=.055,tl,at}={}){
    const els=toArr(targets),t=gsap.timeline();
    els.forEach((el,i)=>{
      const tx=i*xStep,ty=i*yStep,tr=((i%5)-2)*rotStep;
      t.fromTo(el,{opacity:0,x:tx,y:ty-drop-(i%3)*18,rotation:tr*2.2},
        {opacity:1,x:tx,y:ty,rotation:tr,duration:dur,ease:'power3.out'},i*each);
    });
    return place(t,{tl,at});
  }
  /* 覆盖推挤：上层对象取得位置，下层对象仍可见但被压低权重 */
  function coverPush(overEl,underEl,{from='right',dist,underShift=26,underOpacity=.22,
      dur=.8,tl,at}={}){
    const host=overEl.parentElement?.getBoundingClientRect();
    const d=dist??(from==='left'||from==='right'?(host?.width||640):(host?.height||360));
    const v={left:{x:-d,y:0},right:{x:d,y:0},up:{x:0,y:-d},down:{x:0,y:d}}[from];
    const u={left:{x:underShift},right:{x:-underShift},up:{y:underShift},down:{y:-underShift}}[from];
    const t=gsap.timeline();
    t.fromTo(overEl,{opacity:1,...v},{opacity:1,x:0,y:0,duration:dur,ease:'power2.inOut'},0)
     .to(underEl,{...u,opacity:underOpacity,duration:dur,ease:'power2.inOut'},0);
    return place(t,{tl,at});
  }
  /* 重排：调用者在 applyLayout 中改变 DOM 顺序或布局，视觉位置用 FLIP 连续过渡 */
  function reorderFlip(targets,applyLayout,{dur=.85,each=.025,tl,at}={}){
    const els=toArr(targets),before=els.map(el=>el.getBoundingClientRect());
    applyLayout();
    const after=els.map(el=>el.getBoundingClientRect()),t=gsap.timeline();
    els.forEach((el,i)=>{
      const dx=before[i].left-after[i].left,dy=before[i].top-after[i].top;
      t.fromTo(el,{x:dx,y:dy},{x:0,y:0,duration:dur,ease:'power2.inOut'},i*each);
    });
    return place(t,{tl,at});
  }
  /* 错峰撕页：色带依次盖住画面，再从相反锚点依次退开 */
  function bandTear(targets,{dir='right',dur=.52,each=.055,hold=.08,skew=0,tl,at}={}){
    const els=toArr(targets),horizontal=dir==='left'||dir==='right';
    const enterOrigin=horizontal?(dir==='right'?'left center':'right center'):(dir==='down'?'center top':'center bottom');
    const exitOrigin=horizontal?(dir==='right'?'right center':'left center'):(dir==='down'?'center bottom':'center top');
    const scaleProp=horizontal?'scaleX':'scaleY',t=gsap.timeline();
    t.set(els,{opacity:1,transformOrigin:enterOrigin,[scaleProp]:0,skewX:horizontal?skew:0},0)
     .to(els,{[scaleProp]:1,duration:dur,ease:'power3.out',stagger:{each}},0);
    const covered=dur+Math.max(0,els.length-1)*each+hold;
    t.set(els,{transformOrigin:exitOrigin},covered)
     .to(els,{[scaleProp]:0,duration:dur,ease:'power2.inOut',stagger:{each,from:'end'}},covered);
    return place(t,{tl,at});
  }

  /* ---------- 颜色渗染与强调 ---------- */
  function tintWave(els,{color,each=.06,from='start',dur=.5,prop='backgroundColor',tl,at}={}){
    return place(gsap.to(toArr(els),{[prop]:color,duration:dur,ease:'sine.inOut',
      stagger:{each,from}}),{tl,at});
  }
  function indicate(el,{amp=1.08,dur=.6,tl,at}={}){     /* 丝滑流的强调 */
    const t=gsap.timeline();
    t.to(el,{scale:amp,duration:dur/2,ease:'sine.inOut'},0)
     .to(el,{scale:1,duration:dur/2,ease:'sine.inOut'},dur/2);
    return place(t,{tl,at});
  }
  function focusOn(dimEls,{dimTo=.35,dur=.8,restoreAfter=1.2,tl,at}={}){
    const t=gsap.timeline();
    t.to(toArr(dimEls),{opacity:dimTo,duration:dur,ease:'sine.inOut'},0);
    if(restoreAfter>0)t.to(toArr(dimEls),{opacity:1,duration:dur,ease:'sine.inOut'},dur+restoreAfter);
    return place(t,{tl,at});
  }

  /* ---------- 打击特效（预算与降级内建） ---------- */
  /* initFx(stage, redLayer, whiteLayer)：返回受安全预算约束的 flash/shake */
  function initFx(stage,redLayer,whiteLayer){
    const log=[];
    function ok(){const now=performance.now();
      while(log.length&&now-log[0]>1000)log.shift();
      if(log.length>=3)return false; log.push(now); return true;}
    return {
      flashRed(peak=.45){if(REDUCED||!ok())return;
        gsap.fromTo(redLayer,{opacity:0},{opacity:Math.min(peak,.45),duration:.06,yoyo:true,repeat:1,overwrite:'auto'});},
      flashWhite(peak=.3){if(REDUCED||!ok())return;
        gsap.fromTo(whiteLayer,{opacity:0},{opacity:Math.min(peak,.35),duration:.06,yoyo:true,repeat:1,overwrite:'auto'});},
      shake(amp=2){if(REDUCED)return;
        gsap.to(stage,{x:amp,duration:.04,yoyo:true,repeat:amp>=4?6:3,ease:'power2.inOut',
          overwrite:'auto',onComplete:()=>gsap.set(stage,{x:0,y:0})});}
    };
  }

  window.Motion={
    version:'1.1',
    reduced:REDUCED,
    mix, derivePalette,
    splitChars, writeOn, gather, counter, odometer,
    drawPath, segDrawer,
    smash, pop, flyIn, rise, develop,
    breathe, driftScale,
    wipeReveal, flipMove, rackFocus, liquidSwap, cameraTo,
    burstScatter, extractOne, pileStack, coverPush, reorderFlip, bandTear,
    tintWave, indicate, focusOn,
    initFx
  };
})();
