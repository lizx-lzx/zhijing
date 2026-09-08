const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function playerHTML(lesson, scenes = [], audio = "", capture = false) {
  const timeline = scenes.length
    ? scenes
    : lesson.chapters.map((c, i) => ({ start: i * 15, end: (i + 1) * 15 }));
  const data = JSON.stringify({ lesson, timeline, audio, capture })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(lesson.title)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f7f2;color:#20232c;font-family:"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif}button{font:inherit;cursor:pointer}.frame{min-height:100vh;padding:4.2vh 4.5vw;display:flex;flex-direction:column;gap:2vh;overflow:hidden}.eyebrow{font-size:clamp(14px,1.8vw,24px);color:#5964ae;display:flex;justify-content:space-between;gap:16px}h1{font-size:clamp(25px,3.5vw,46px);line-height:1.3;margin:0;max-width:1100px}h2{font-size:clamp(21px,2.8vw,36px);margin:0 0 12px;line-height:1.4}.kind{margin-right:12px;color:#636c95}.diagram{display:flex;align-items:stretch;gap:20px;flex:1;min-height:0;margin:3vh 0}.item{flex:1;background:#fff;border:1px solid #d8dce8;border-radius:20px;padding:28px 22px;align-self:center;min-height:210px;display:flex;flex-direction:column;justify-content:center;transition:none}.item.active{background:#e6ebff;border-color:#6675d1}.label{font-size:clamp(21px,3.2vw,42px);line-height:1.4;font-weight:600;margin-bottom:14px}.detail{font-size:clamp(16px,2vw,27px);line-height:1.5;color:#4c5262}.arrow{align-self:center;font-size:24px;color:#646faa;max-width:80px;text-align:center}.arrow small{display:block;font-size:14px}.caption{background:#232943;color:#fff;border-radius:14px;padding:18px 24px;font-size:clamp(18px,2.15vw,28px);line-height:1.6;min-height:80px}.footer{display:flex;justify-content:space-between;color:#656b7a;font-size:14px;gap:12px}.progress{height:4px;background:#e0e3ef;margin-top:8px}.progress span{display:block;height:100%;background:#5c70d2}.controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px 4.5vw;border-top:1px solid #dce0eb}button{border:1px solid #d3d8e5;border-radius:9px;background:#fff;padding:9px 14px;color:#20232c}button:focus-visible{outline:3px solid #6374cd;outline-offset:3px}button:first-child{background:#5364cb;color:#fff;border-color:#5364cb}button:disabled{opacity:.45;cursor:default}.frame.capture{height:720px;min-height:720px}.capture .caption{font-size:27px}.capture .label{font-size:37px}.capture .detail{font-size:23px}.capture h1{font-size:43px}.capture .diagram{margin:12px 0}.capture .item{padding:24px 20px}.capture .eyebrow{font-size:21px}.capture .footer{font-size:17px}audio{display:none}@media(max-width:650px){.frame{padding:22px 20px}.diagram{flex-direction:column;gap:12px;flex:initial;margin:12px 0}.item{width:100%;padding:20px;min-height:100px}.arrow{font-size:18px;transform:rotate(90deg);height:12px}.arrow small{display:none}.label{margin-bottom:8px}.caption{padding:16px}.eyebrow{font-size:14px}.footer{font-size:13px}h1{font-size:26px}}
</style></head><body><main class="frame${capture ? " capture" : ""}"><div class="eyebrow"><span>知径 · 你的学习讲解</span><span id="count"></span></div><h1 id="title"></h1><div id="diagram" class="diagram"></div><div class="caption" id="caption"></div><div class="footer"><span id="source"></span><span id="clock"></span></div><div class="progress"><span id="bar"></span></div></main><div class="controls" ${capture ? "hidden" : ""}><button id="play">播放讲解</button><button id="prev">上一章</button><button id="next">下一章</button><span id="sound"></span></div><audio id="audio" preload="metadata"></audio><script>
const DATA=${data};const $=id=>document.getElementById(id);const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let at=0,chapter=-1,playing=false,last=0;const duration=DATA.timeline.at(-1).end;const audio=$('audio');if(DATA.audio)audio.src=DATA.audio;$('sound').textContent=DATA.audio?'含 AI 配音':'无配音时可逐章阅读';
window.seek=function(time){at=Math.max(0,Math.min(time,duration-.01));let i=DATA.timeline.findIndex(s=>at>=s.start&&at<s.end);if(i<0)i=DATA.timeline.length-1;const c=DATA.lesson.chapters[i];const scene=DATA.timeline[i];const fraction=(at-scene.start)/(scene.end-scene.start);if(chapter!==i){chapter=i;$('title').textContent=c.title;$('count').textContent=(i+1)+' / '+DATA.timeline.length;$('source').textContent=(c.fictional?'虚构例子 · ':'')+'来源段落 '+c.sourceIds.join('、');const items=c.visual.items;$('diagram').innerHTML=items.map((v,k)=>'<div class="item"><div class="label">'+escape(v.label)+'</div><div class="detail">'+escape(v.detail)+'</div></div>'+((c.visual.type==='chain'||c.visual.type==='steps')&&k<items.length-1?'<div class="arrow">→<small>'+escape(c.visual.relation)+'</small></div>':'')).join('');$('prev').disabled=i===0;$('next').disabled=i===DATA.timeline.length-1;}
const sentences=c.narration.match(/[^。！？!?；;]+[。！？!?；;]?/g)||[c.narration];const total=sentences.reduce((n,s)=>n+s.length,0);let used=0;let sentence=sentences.at(-1);for(const s of sentences){used+=s.length;if(fraction<used/total){sentence=s;break;}}$('caption').textContent=sentence;document.querySelectorAll('.item').forEach((el,k)=>{const progress=Math.min(1,Math.max(0,(fraction-k*.11)*6));el.classList.toggle('active',k===Math.min(c.visual.items.length-1,Math.floor(fraction*c.visual.items.length)));el.style.transform='translateY('+(1-progress)*20+'px)';el.style.opacity=String(.45+progress*.55);});$('bar').style.width=(at/duration*100)+'%';$('clock').textContent=Math.floor(at/60)+':'+String(Math.floor(at%60)).padStart(2,'0')+' / '+Math.floor(duration/60)+':'+String(Math.floor(duration%60)).padStart(2,'0');};
function pause(){playing=false;audio.pause();$('play').textContent='播放讲解';}function jump(index){pause();window.seek(DATA.timeline[Math.max(0,Math.min(index,DATA.timeline.length-1))].start);if(DATA.audio)audio.currentTime=at;}$('prev').onclick=()=>jump(chapter-1);$('next').onclick=()=>jump(chapter+1);$('play').onclick=async()=>{if(playing){pause();return;}if(at>=duration-.1){at=0;audio.currentTime=0;}if(DATA.audio){try{audio.currentTime=at;await audio.play();}catch{$('sound').textContent='配音暂时无法播放，可以继续逐章阅读';return;}}playing=true;last=performance.now();$('play').textContent='暂停';};function tick(t){if(playing){window.seek(DATA.audio?audio.currentTime:at+(t-last)/1000);if(at>=duration-.1)pause();}last=t;requestAnimationFrame(tick);}audio.onended=pause;document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.seek(0);if(!DATA.capture)requestAnimationFrame(tick);
</script></body></html>`;
}

export function diagramSVG(chapter) {
  const items = chapter.visual.items;
  const height = 160 + items.length * 155;
  const wrap = (s, n) =>
    Array.from({ length: Math.ceil(s.length / n) }, (_, i) =>
      s.slice(i * n, (i + 1) * n),
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}"><rect width="960" height="${height}" fill="#f7f7f2"/><style>text{font-family:"Noto Sans CJK SC","PingFang SC",sans-serif;fill:#22283d}</style><text x="50" y="65" font-size="30">${esc(chapter.title)}</text>${items
    .map(
      (v, i) =>
        `<rect x="50" y="${110 + i * 155}" width="860" height="125" rx="16" fill="#e7ebff"/><text x="80" y="${150 + i * 155}" font-size="27">${esc(v.label)}</text><text x="80" y="${187 + i * 155}" font-size="20">${wrap(
          v.detail,
          35,
        )
          .slice(0, 2)
          .map((t, j) => `<tspan x="80" dy="${j ? 27 : 0}">${esc(t)}</tspan>`)
          .join(
            "",
          )}</text>${i < items.length - 1 && ["chain", "steps"].includes(chapter.visual.type) ? `<text x="460" y="${258 + i * 155}" font-size="22">↓</text>` : ""}`,
    )
    .join(
      "",
    )}<text x="50" y="${height - 15}" font-size="17">${esc(chapter.visual.relation || "")} · 来源 ${esc(chapter.sourceIds.join("、"))}</text></svg>`;
}
