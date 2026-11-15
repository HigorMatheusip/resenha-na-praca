'use strict';
// ===== LÓGICA PURA =====
const R=['4','5','6','7','Q','J','K','A','2','3'],S=['♦','♠','♥','♣'];
const LAB={3:'TRUCO',6:'SEIS',9:'NOVE',12:'DOZE'},NX={1:3,3:6,6:9,9:12};
const red=s=>s==='♦'||s==='♥';
const deck=()=>{const d=[];for(const r of R)for(const s of S)d.push({r,s});return d};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const manilha=v=>v==='2'?'4':R[(R.indexOf(v)+1)%10];
const force=(c,m)=>c.r===m?10+S.indexOf(c.s):R.indexOf(c.r);
function handWinner(r){ // 0,1 = vencedor; 'd' = empate geral; -1 = indefinido
 const a=r.filter(x=>x===0).length,b=r.filter(x=>x===1).length;
 if(a>=2)return 0;if(b>=2)return 1;
 if(r.length===2){if(r[0]==='t'&&r[1]!=='t')return r[1];if(r[1]==='t'&&r[0]!=='t')return r[0];return -1}
 if(r.length===3){if(a!==b)return a>b?0:1;return r[0]!=='t'?r[0]:'d'}
 return -1}
function runTests(){const o=[],t=(n,c)=>o.push((c?'✔ ':'✘ ')+n);
 t('Baralho com 40 cartas',deck().length===40);
 const e=['5','6','7','Q','J','K','A','2','4','4'];t('Manilha para todas as viras',R.every((r,i)=>manilha(r)===e[i]));t('Vira 2: manilha 4',manilha('2')==='4');
 t('Naipes das manilhas (paus>copas>espadas>ouros)',['♣','♥','♠','♦'].every((s,i,a)=>!i||force({r:'6',s:a[i-1]},'6')>force({r:'6',s:s},'6')));
 t('Ordem comum 3>2>A>K>J>Q>7>6>5>4',['3','2','A','K','J','Q','7','6','5','4'].every((r,i,a)=>!i||force({r:a[i-1],s:'♦'},'X')>force({r:r,s:'♦'},'X')));
 t('Manilha vence o 3',force({r:'4',s:'♦'},'4')>force({r:'3',s:'♣'},'4'));
 const h=handWinner;t('Duas vitórias',h([0,0])===0&&h([1,0,1])===1);
 t('Empate 1ª: vale a 2ª',h(['t',1])===1&&h(['t',0])===0);t('Empate 2ª: vale a 1ª',h([0,'t'])===0&&h([1,'t'])===1);
 t('Empate 1ª e 2ª: vale a 3ª',h(['t','t',1])===1&&h(['t','t',0])===0);t('Empate 3ª: vale a 1ª',h([0,1,'t'])===0&&h([1,0,'t'])===1);
 t('Empate nas três',h(['t','t','t'])==='d');t('Indefinido',h([0])===-1&&h([0,1])===-1&&h(['t','t'])===-1);
 let ok=true;for(let v=3;v<=12;v*=1.0001){break}ok=NX[1]===3&&NX[3]===6&&NX[6]===9&&NX[9]===12&&!NX[12];t('Sequência de trucadas até Doze',ok);
 t('IA corre com mão muito fraca',aiAcceptChance(.35,2,false)===0);
 t('IA evita aceitar fraca no ponto do jogo',aiAcceptChance(.6,2,true)===0);
 t('IA pode aceitar uma mão razoável',aiAcceptChance(.55,1,false)>0);
 t('Facão é raro',FACAO_CHANCE>0&&FACAO_CHANCE<=.05);
 return o}

// ===== ESTADO =====
const $=id=>document.getElementById(id);
let cfg=Object.assign({diff:1,bo:1,snd:true},JSON.parse(localStorage.getItem('tpcfg')||'{}')),
 st=Object.assign({g:0,w:0},JSON.parse(localStorage.getItem('tpst')||'{}')),G=null,H=null,gid=0,hideMode=false;
const save=()=>{localStorage.setItem('tpcfg',JSON.stringify(cfg));localStorage.setItem('tpst',JSON.stringify(st))};
function later(ms,fn){const g=gid,h=H;setTimeout(()=>{if(g===gid&&h===H)fn()},ms)}
function beep(f){if(!cfg.snd)return;try{const a=beep.a||(beep.a=new AudioContext()),o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.value=.05;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.1)}catch(e){}}

// ===== INTERFACE =====
function el(c,back){const d=document.createElement('div');d.className='card'+(back?' back':'')+(!back&&red(c.s)?' red':'');
 if(!back)d.innerHTML=`<b>${c.r}<i>${c.s}</i></b><u>${'JQK'.includes(c.r)?'<em>'+c.r+'</em>':''}${c.s}</u><b class="bt">${c.r}<i>${c.s}</i></b>`;return d}
function ask(t,cards,btns,html){return new Promise(res=>{const m=$('modal');m.innerHTML='<div class="box"><h2></h2>'+(html?'<div class="rl">'+html+'</div>':'')+'<div class="cs"></div><div class="bs"></div></div>';
 m.querySelector('h2').textContent=t;if(cards)cards.forEach(c=>m.querySelector('.cs').append(el(c)));
 btns.forEach((b,i)=>{const e=document.createElement('button');e.textContent=b;e.onclick=()=>{m.hidden=true;res(i)};m.querySelector('.bs').append(e)});m.hidden=false})}
let mt;function flash(t,ms=1300){const m=$('msg');m.textContent=t;m.classList.add('show');clearTimeout(mt);mt=setTimeout(()=>m.classList.remove('show'),ms)}
function renderHands(deal){
 [0,1].forEach(p=>{const box=$(p?'opp':'me');box.innerHTML='';box.className='hand'+(p?'':' mine');
  H.hands[p].forEach((c,i)=>{const e=el(c,p===1||H.ferro);if(deal)e.classList.add('deal');
   if(p===0)e.onclick=()=>{if(H.phase==='play'&&H.turn===0){const hd=hideMode;hideMode=false;playCard(0,i,hd)}};box.append(e)})})}
function renderTable(win){[0,1].forEach(p=>{const s=$('cp'+p);s.innerHTML='';const t=H.table[p];if(t){const e=el(t.c,t.h);e.classList.add('drop');if(win===p)e.classList.add('win');s.append(e)}})}
function hud(){if(!G)return;$('sc').textContent=`VOCÊ ${G.score[0]} × ${G.score[1]} ADVERSÁRIO`+(cfg.bo>1?` (partidas ${G.mw[0]}-${G.mw[1]})`:'');
 $('val').textContent='Mão vale '+H.value+(H.ferro?' · MÃO DE FERRO':H.onze?' · MÃO DE ONZE':'');
 $('rd').textContent=`Rodada ${Math.min(H.rounds.length+1,3)} · Manilha: ${H.m} · ${H.phase==='play'?(H.turn?'Vez: Adversário':'Sua vez'):''} · Começa: ${G.starter?'Adversário':'Você'}`;
 $('log').innerHTML='Rodadas<br>'+H.rounds.map((r,i)=>(i+1)+'ª: '+(r==='t'?'Empate':r===0?'Você':'Adversário')).join('<br>');
 $('vira').innerHTML='';$('vira').append(el(H.vira));$('vira').title='Vira'}
function btns(){const my=H.phase==='play'&&H.turn===0;const t=$('btnT'),h=$('btnH');
 t.disabled=!(my&&canRaise(0));t.textContent=H.value<12?LAB[NX[H.value]]:'DOZE';h.disabled=!(my&&H.rounds.length>0&&H.hands[0].length>0&&!H.ferro);
 h.classList.toggle('on',hideMode&&!h.disabled);if(h.disabled)hideMode=false}
const refresh=()=>{hud();btns()};

// ===== FLUXO DA MÃO =====
function startGame(){gid++;G=G&&G.keep?G:{score:[0,0],mw:[0,0],starter:Math.random()<.5?0:1};G.keep=0;$('menu').hidden=true;$('modal').hidden=true;newHand()}
function newHand(){const d=shuffle(deck()),s=G.score;
 H={hands:[d.splice(0,3),d.splice(0,3)],vira:d.pop(),rounds:[],table:[null,null],value:1,pend:null,last:-1,phase:'wait',turn:G.starter,lead:G.starter,onze:false,ferro:false,onzeP:-1};
 H.m=manilha(H.vira.r);hideMode=false;renderHands(true);renderTable();refresh();beep(400);
 if(s[0]===11&&s[1]===11){H.ferro=true;renderHands();refresh();flash('MÃO DE FERRO!',2200);later(2300,next)}
 else if(s[0]===11||s[1]===11){const p=s[0]===11?0:1;H.onze=true;H.onzeP=p;H.value=3;H.phase='resp';refresh();
  if(p===0)ask('VOCÊ ESTÁ NA MÃO DE ONZE!',H.hands[0],['JOGAR','CORRER']).then(i=>onze(i===0));
  else later(1300,()=>onze(aiScore()>.4))}
 else later(900,next)}
function onze(ok){if(H.phase!=='resp'||!H.onze)return;if(ok){flash(H.onzeP?'ADVERSÁRIO JOGA A MÃO DE ONZE':'MÃO DE ONZE: JOGANDO');later(900,next)}else finish(1-H.onzeP,1,H.onzeP?'ADVERSÁRIO CORREU':'VOCÊ CORREU')}
function next(){H.phase='play';refresh();if(H.turn===1)later(800+Math.random()*700,aiAct)}
function canRaise(p){return H.phase==='play'&&H.turn===p&&!H.ferro&&!H.onze&&H.value<12&&H.last!==p&&!H.table[p]}
function playCard(p,i,hide){if(H.phase!=='play'||H.turn!==p||H.table[p]||!H.hands[p][i])return;
 if(hide&&!H.rounds.length)hide=false;const c=H.hands[p].splice(i,1)[0];if(!H.table[1-p])H.lead=p;
 H.table[p]={c,h:!!hide};beep(300);renderHands();renderTable();
 if(H.table[1-p]){H.phase='anim';refresh();later(600,resolve)}else{H.turn=1-p;next()}}
function resolve(){const [a,b]=H.table,fa=a.h?-1:force(a.c,H.m),fb=b.h?-1:force(b.c,H.m);
 const w=fa===fb?'t':fa>fb?0:1;H.rounds.push(w);renderTable(w);refresh();
 flash(w==='t'?'EMPATOU':w===0?'VOCÊ GANHOU A RODADA':'RODADA PERDIDA');
 later(1500,()=>{const hw=handWinner(H.rounds);H.table=[null,null];renderTable();
  if(hw===-1){H.turn=w==='t'?H.lead:w;H.lead=H.turn;next()}
  else if(hw==='d')finish(-1,0,'MÃO EMPATADA: NINGUÉM PONTUA');
  else finish(hw,H.value,hw===0?'MÃO VENCIDA!':'MÃO PERDIDA')})}
function finish(w,pts,txt){H.phase='over';H.pend=null;refresh();flash(txt+(w>=0?` (+${pts})`:''),1800);
 if(w>=0){G.score[w]=Math.min(12,G.score[w]+pts);beep(w?200:600)}hud();
 if(G.score[0]>=12||G.score[1]>=12)later(2000,endGame);else later(2200,()=>{G.starter=1-G.starter;newHand()})}
function endGame(){const w=G.score[0]>=12?0:1;G.mw[w]++;const sc=G.score.join(' × ');
 if(G.mw[w]>=Math.ceil(cfg.bo/2)){st.g++;if(w===0)st.w++;save();
  ask(w===0?'🏆 VITÓRIA!':'💀 DERROTA',null,['JOGAR NOVAMENTE','MENU'],`Placar final: ${sc}`).then(i=>{G=null;i===0?startGame():toMenu()})}
 else ask(w===0?'PARTIDA VENCIDA!':'PARTIDA PERDIDA',null,['PRÓXIMA PARTIDA'],`Placar: ${sc} · Série: ${G.mw[0]}-${G.mw[1]}`).then(()=>{G.score=[0,0];G.starter=1-G.starter;newHand()})}

// ===== TRUCADAS =====
function raise(p){if(!canRaise(p))return;H.pend={by:p,to:NX[H.value]};H.phase='resp';flash(LAB[H.pend.to]+'!');beep(150);refresh();prompt1(1-p)}
function prompt1(r){const to=H.pend.to;
 if(r===0)ask(to===3?'VOCÊ FOI TRUCADO!':'ADVERSÁRIO PEDIU '+LAB[to]+'!',null,['ACEITAR','CORRER'].concat(to<12?[LAB[NX[to]]]:[]),`Vale ${to} pontos. Correr dá ${H.value} ao adversário.`).then(i=>respond(0,i));
 else later(1000,()=>respond(1,aiResp()))}
function respond(r,ch){if(H.phase!=='resp'||!H.pend)return;const pd=H.pend;
 if(ch===0){H.value=pd.to;H.last=pd.by;H.pend=null;flash(r?'ADVERSÁRIO ACEITOU':'VOCÊ ACEITOU');later(900,next)}
 else if(ch===1)finish(pd.by,H.value,r?'ADVERSÁRIO CORREU':'VOCÊ CORREU');
 else{H.value=pd.to;H.last=r;H.pend={by:r,to:NX[H.value]};flash(LAB[H.pend.to]+'!');refresh();prompt1(pd.by)}}

// ===== IA (usa apenas suas cartas, a vira e as cartas jogadas) =====
function aiScore(){const f=H.hands[1].map(c=>force(c,H.m)).sort((a,b)=>b-a);if(!f.length)return 0;
 let s=f.length>1?(f[0]+f[1])/26:f[0]/13;const w=H.rounds.filter(x=>x===1).length,l=H.rounds.filter(x=>x===0).length;s+=.2*w-.2*l;
 const d=cfg.diff;s+=(Math.random()-.5)*(d===0?.5:d===1?.2:.08);return s}
const FACAO_CHANCE=.03;
function aiAcceptChance(s,d,critical){const floor=critical?.68:.42;if(s<floor)return 0;
 const base=critical?[.2,.4,.6][d]:[.25,.45,.62][d];return Math.min(.92,base+(s-floor)*.8)}
function aiAsk(){const s=aiScore(),d=cfg.diff;if(s>.75&&Math.random()<[.2,.5,.7][d])return true;
 return s<.4&&Math.random()<FACAO_CHANCE}
function aiResp(){const s=aiScore(),d=cfg.diff,pd=H.pend,critical=G.score[0]+Math.max(H.value,pd.to)>=12;
 if(s>.9&&pd.to<12&&Math.random()<[.08,.2,.35][d])return 2;
 return Math.random()<aiAcceptChance(s,d,critical)?0:1}
function aiAct(){if(H.phase!=='play'||H.turn!==1)return;if(canRaise(1)&&aiAsk()){raise(1);return}
 const h=H.hands[1],f=h.map(c=>force(c,H.m)),o=H.table[0],d=cfg.diff,idx=[...h.keys()].sort((a,b)=>f[a]-f[b]);let i,hide=false;
 if(d===0&&Math.random()<.4)i=idx[Math.random()*idx.length|0];
 else if(o){const of=o.h?-1:force(o.c,H.m),win=idx.filter(k=>f[k]>of);i=win.length?win[0]:idx[0];
  hide=!win.length&&H.rounds.length>0&&d>0&&Math.random()<.6}
 else i=(H.rounds.length===0&&d===2&&idx.length===3&&aiScore()<.7)?idx[1]:idx[idx.length-1];
 playCard(1,i,hide)}

// ===== MENU E EVENTOS =====
function toMenu(){gid++;H=null;G=null;$('modal').hidden=true;$('menu').hidden=false;$('diff').value=cfg.diff;$('bo').value=cfg.bo;$('snd').checked=cfg.snd}
$('play').onclick=()=>{G=null;startGame()};
$('diff').onchange=e=>{cfg.diff=+e.target.value;save()};$('bo').onchange=e=>{cfg.bo=+e.target.value;save()};$('snd').onchange=e=>{cfg.snd=e.target.checked;save()};
$('quit').onclick=()=>{if(G&&!confirm('Voltar ao menu e abandonar a partida?'))return;toMenu()};
$('btnT').onclick=()=>raise(0);
$('btnH').onclick=()=>{if(H&&H.phase==='play'&&H.turn===0&&H.rounds.length>0){hideMode=!hideMode;btns();if(hideMode)flash('Clique na carta que deseja esconder',1500)}};
$('stats').onclick=()=>ask('Estatísticas',null,['OK'],`Partidas disputadas: ${st.g}<br>Vitórias: ${st.w}<br>Derrotas: ${st.g-st.w}`);
$('tests').onclick=()=>{const r=runTests();ask('Modo de testes',null,['OK'],r.join('<br>')+`<br><b>${r.filter(x=>x[0]==='✔').length}/${r.length} OK</b>`)};
$('rules').onclick=()=>ask('Regras',null,['FECHAR'],`<b>Baralho:</b> 40 cartas (sem 8, 9, 10 e coringas).<br><b>Força:</b> 3, 2, Ás, K, J, Q, 7, 6, 5, 4.<br><b>Vira/Manilha:</b> a manilha é a carta seguinte à vira (4→5→6→7→Q→J→K→A→2→3→4). Entre as manilhas: paus &gt; copas &gt; espadas &gt; ouros.<br><b>Mão:</b> melhor de 3 rodadas. Empate na 1ª: vale a 2ª; empate na 2ª: vale a 1ª; empate na 1ª e 2ª: vale a 3ª; empate na 3ª: vale a 1ª; três empates: ninguém pontua.<br><b>Pontos:</b> a mão vale 1 e pode subir para 3 (Truco), 6, 9 e 12 na sua vez. Quem corre dá ao desafiante o valor anterior.<br><b>Mão de Onze:</b> com 11 pontos a mão vale 3; pode jogar ou correr (adversário ganha 1).<br><b>Mão de Ferro:</b> 11 a 11, cartas às cegas, sem truco e sem correr.<br><b>Esconder:</b> a carta vale menos que qualquer outra; não vale na 1ª rodada.<br>Vence a partida quem chegar a 12 pontos.`);
$('rules').onclick=()=>ask('Regras',null,['FECHAR'],`<b>Baralho:</b> 40 cartas (sem 8, 9, 10 e coringas).<br><b>Força:</b> 3, 2, Ás, K, J, Q, 7, 6, 5, 4.<br><b>Vira/Manilha:</b> a manilha é a carta seguinte à vira (4→5→6→7→Q→J→K→A→2→4; com vira 3, manilha 4). Entre as manilhas: paus &gt; copas &gt; espadas &gt; ouros.<br><b>Mão:</b> melhor de 3 rodadas. Empate na 1ª: vale a 2ª; empate na 2ª: vale a 1ª; empate na 1ª e 2ª: vale a 3ª; empate na 3ª: vale a 1ª; três empates: ninguém pontua.<br><b>Pontos:</b> a mão vale 1 e pode subir para 3 (Truco), 6, 9 e 12 na sua vez. Quem corre dá ao desafiante o valor anterior.<br><b>Mão de Onze:</b> com 11 pontos a mão vale 3; pode jogar ou correr (adversário ganha 1).<br><b>Mão de Ferro:</b> 11 a 11, cartas às cegas, sem truco e sem correr.<br><b>Esconder:</b> a carta vale menos que qualquer outra; não vale na 1ª rodada.<br>Vence a partida quem chegar a 12 pontos.`);
$('rules').onclick=()=>ask('Regras',null,['FECHAR'],`<b>Baralho:</b> 40 cartas (sem 8, 9, 10 e coringas).<br><b>Força:</b> 3, 2, Ás, K, J, Q, 7, 6, 5, 4.<br><b>Vira/Manilha:</b> a manilha é a carta seguinte à vira (4→5→6→7→Q→J→K→A→2→4→4). Entre as manilhas: paus &gt; copas &gt; espadas &gt; ouros.<br><b>Mão:</b> melhor de 3 rodadas. Empate na 1ª: vale a 2ª; empate na 2ª: vale a 1ª; empate na 1ª e 2ª: vale a 3ª; empate na 3ª: vale a 1ª; três empates: ninguém pontua.<br><b>Pontos:</b> a mão vale 1 e pode subir para 3 (Truco), 6, 9 e 12 na sua vez. Quem corre dá ao desafiante o valor anterior.<br><b>Mão de Onze:</b> com 11 pontos a mão vale 3; pode jogar ou correr (adversário ganha 1).<br><b>Mão de Ferro:</b> 11 a 11, cartas às cegas, sem truco e sem correr.<br><b>Esconder:</b> a carta vale menos que qualquer outra; não vale na 1ª rodada.<br>Vence a partida quem chegar a 12 pontos.`);
toMenu();
if(new URLSearchParams(location.search).get('start')==='1')$('play').click();
