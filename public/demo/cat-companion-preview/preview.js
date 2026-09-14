const $=id=>document.getElementById(id);
let vm,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,busy=false;
rive.RuntimeLoader.setWasmUrl('./rive.wasm');
const cat=new rive.Rive({src:'./cat-pomodoro.riv',canvas:$('cat'),artboard:'Artboard',stateMachines:'State Machine 1',autoplay:true,autoBind:true,onLoad(){cat.resizeDrawingSurfaceToCanvas();vm=cat.viewModelInstance;vm=vm?.viewModel('propertyOfViewModel1')||vm;action('animIdle');$('status').textContent='点我，聊一会儿';if(paused)cat.pause();},onLoadError(){ $('status').textContent='小猫暂时没能加载，请刷新重试';}});
function action(name){const trigger=vm?.trigger(name);if(trigger){if(!paused)cat.play();trigger.trigger();}else if(vm){$('status').textContent='这个动作暂不可用';}}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{action(b.dataset.action);$('status').textContent=b.textContent;});
$('color').onchange=e=>{const color=vm?.number('typeColor');if(color)color.value=Number(e.target.value);};
$('motion').onclick=()=>{paused=!paused;paused?cat.pause():cat.play();$('motion').textContent=paused?'开启动效':'暂停动效';};
$('motion').textContent=paused?'开启动效':'暂停动效';
$('pet').onclick=()=>{action('animIdle');$('question').focus();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)cat.pause();else if(!paused)cat.play();});
window.addEventListener('pagehide',()=>cat.cleanup());
function show(messages){$('messages').replaceChildren();for(const message of messages){const el=document.createElement('div');el.className='message '+(message.role==='user'?'user':'assistant');el.textContent=message.text;$('messages').append(el);}$('messages').scrollTop=$('messages').scrollHeight;}
async function chat(question){if(busy||!question.trim())return;busy=true;$('send').disabled=true;$('error').textContent='';action('animFocusLvl1');$('status').textContent='我想一想…';try{const res=await fetch('../../api/companion/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});const data=await res.json();if(!res.ok)throw Error(data.error||'暂时无法回答，请重试');show(data.messages);$('question').value='';action('animBreak');$('status').textContent='想好了，我们接着聊';}catch(e){$('error').textContent=e.message;action('animIdle');$('status').textContent='没关系，可以再试一次';}finally{busy=false;$('send').disabled=false;}}
$('form').onsubmit=e=>{e.preventDefault();chat($('question').value);};document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{$('question').value=b.dataset.question;chat(b.dataset.question);});
fetch('../../api/companion/chat').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>show(d.messages)).catch(()=>{$('error').textContent='历史对话暂时未能读取。';});
