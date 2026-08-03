/* ═══════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════ */
var CFG={owner:'reda889',repo:'Stickers-cloud',imgDir:'images/',inDir:'input/',outDir:'output/'};
var API='https://api.github.com', LS_KEY='sc_gh_pat', LS_THEME='sc_theme';
function pgURL(p){return 'https://'+CFG.owner+'.github.io/'+CFG.repo+'/'+p;}

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
var selFile=null,selVid=false,pendUpload=null,pendDel=null,defBranch=null,activeTab='images';
var cache={images:[],videos:[],pending:[]};

/* ═══════════════════════════════════════════════════════
   DOM
═══════════════════════════════════════════════════════ */
var $=function(id){return document.getElementById(id);};
var grid=$('grid'),searchInp=$('searchInp'),refreshBtn=$('refreshBtn');
var openUpBtn=$('openUpBtn'),openTokBtn=$('openTokBtn'),tokDot=$('tokDot'),tokLbl=$('tokLbl');
var drwBg=$('drwBg'),dropZone=$('dropZone'),fileInp=$('fileInp');
var prevBar=$('prevBar'),prevThumb=$('prevThumb'),prevNm=$('prevNm'),prevSz=$('prevSz'),routePill=$('routePill');
var clearFile=$('clearFile'),vidNote=$('vidNote'),upMsg=$('upMsg'),upBtn=$('upBtn'),upLbl=$('upLbl'),cancelDrw=$('cancelDrw');
var nameModal=$('nameModal'),nameThumb=$('nameThumb'),nameOrig=$('nameOrig'),nameFsz=$('nameFsz');
var nameTitleEl=$('nameTitleEl'),nameInp=$('nameInp'),nameExtLbl=$('nameExtLbl'),nameAutoVal=$('nameAutoVal');
var nameCancel=$('nameCancel'),nameContinue=$('nameContinue');
var tokModal=$('tokModal'),tokInp=$('tokInp'),tokSave=$('tokSave'),tokCancel=$('tokCancel'),tokClear=$('tokClear');
var setupBar=$('setupBar'),installBtn=$('installBtn'),dismissSetup=$('dismissSetup');
var lb=$('lb'),lbImg=$('lbImg'),lbVid=$('lbVid'),lbClose=$('lbClose'),lbNm=$('lbNm');
var delModal=$('delModal'),delDesc=$('delDesc'),delFile=$('delFile'),delCancel=$('delCancel'),delConfirm=$('delConfirm');
var logoSub=$('logoSub');

/* ═══════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════ */
function esc(s){var d=document.createElement('div');d.textContent=String(s);return d.innerHTML;}
function fmtB(b){if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(1)+' KB';return (b/1048576).toFixed(2)+' MB';}
function isImgF(n){return /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico|tiff?)$/i.test(n);}
function isVidF(n){return /\.(mp4|webm|mov|avi|mkv|m4v|ogv|3gp|wmv|ts)$/i.test(n);}
function sanitize(s){
  return s.trim().toLowerCase()
    .replace(/[^\w\s\-]/g,'').replace(/\s+/g,'-')
    .replace(/-+/g,'-').replace(/^-|-$/g,'').substring(0,55)||'';
}

/* ═══════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════ */
var THEMES=['dark','sakura','neon','blue','light'];

function applyTheme(t){
  if(THEMES.indexOf(t)===-1)t='dark';
  document.body.className='theme-'+t;
  localStorage.setItem(LS_THEME,t);
  document.querySelectorAll('.th-btn').forEach(function(b){
    b.classList.toggle('active',b.dataset.theme===t);
  });
}

document.querySelectorAll('.th-btn').forEach(function(btn){
  btn.addEventListener('click',function(){applyTheme(btn.dataset.theme);});
});

function initTheme(){applyTheme(localStorage.getItem(LS_THEME)||'dark');}

/* ═══════════════════════════════════════════════════════
   TOKEN
═══════════════════════════════════════════════════════ */
function getTok(){return localStorage.getItem(LS_KEY)||'';}
function setTok(v){if(v)localStorage.setItem(LS_KEY,v);else localStorage.removeItem(LS_KEY);}
function syncTokUI(){
  var h=!!getTok();
  tokDot.className='tok-dot'+(h?' ok':'');
  tokLbl.textContent=h?'Token ✓':'Set Token';
}

openTokBtn.addEventListener('click',function(){tokInp.value='';tokModal.classList.add('open');setTimeout(function(){tokInp.focus();},60);});
tokCancel.addEventListener('click',function(){tokModal.classList.remove('open');});
tokModal.addEventListener('click',function(e){if(e.target===tokModal)tokModal.classList.remove('open');});
tokInp.addEventListener('keydown',function(e){if(e.key==='Enter')tokSave.click();});
tokSave.addEventListener('click',function(){
  var v=tokInp.value.trim();if(!v){toast('Paste your PAT first.','err');return;}
  setTok(v);syncTokUI();tokModal.classList.remove('open');
  toast('Token saved!','ok');fetchAll();checkWF();
});
tokClear.addEventListener('click',function(){setTok('');syncTokUI();tokModal.classList.remove('open');toast('Token cleared.','info');});

/* ═══════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════ */
function authH(tk){return{'Authorization':'Bearer '+tk,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};}
function baseH(){var h={'X-GitHub-Api-Version':'2022-11-28'};var tk=getTok();if(tk)h['Authorization']='Bearer '+tk;return h;}

async function getBranch(){
  if(defBranch)return defBranch;
  try{
    var r=await fetch(API+'/repos/'+CFG.owner+'/'+CFG.repo,{headers:baseH()});
    if(r.ok){var d=await r.json();defBranch=d.default_branch||'main';
      if(logoSub)logoSub.textContent='reda889/Stickers-cloud · '+defBranch;
      return defBranch;}
  }catch(e){}
  defBranch='main';return defBranch;
}

/* ═══════════════════════════════════════════════════════
   UPLOAD DRAWER
═══════════════════════════════════════════════════════ */
openUpBtn.addEventListener('click',openDrw);
cancelDrw.addEventListener('click',closeDrw);
drwBg.addEventListener('click',function(e){if(e.target===drwBg)closeDrw();});
function openDrw(){drwBg.classList.add('open');}
function closeDrw(){drwBg.classList.remove('open');resetUp();}

function handleFile(file){
  if(!file)return;
  var vid=file.type.startsWith('video/')||isVidF(file.name);
  var img=file.type.startsWith('image/')||isImgF(file.name);
  if(!vid&&!img){toast('Pick an image or video file.','err');return;}
  if(file.size>90*1024*1024){toast('File >90 MB — may exceed GitHub API limit.','warn');return;}
  selFile=file;selVid=vid;
  /* Preview thumbnail */
  prevThumb.innerHTML='';
  if(img){
    var im=new Image();im.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:10px';
    var rd=new FileReader();rd.onload=function(e){im.src=e.target.result;};rd.readAsDataURL(file);
    prevThumb.appendChild(im);
  } else {prevThumb.textContent='🎬';}
  prevNm.textContent=file.name;
  prevSz.textContent=fmtB(file.size);
  routePill.textContent=vid?'→ input/':'→ images/';
  routePill.className='route-pill '+(vid?'rp-vid':'rp-img');
  vidNote.className='vid-note'+(vid?' show':'');
  upLbl.textContent=vid?'Upload Video':'Upload Image';
  prevBar.classList.add('show');
  upBtn.disabled=false;
  setMsg('','');
}

fileInp.addEventListener('change',function(e){handleFile(e.target.files[0]);});
clearFile.addEventListener('click',resetUp);
['dragenter','dragover'].forEach(function(ev){
  dropZone.addEventListener(ev,function(e){e.preventDefault();dropZone.classList.add('over');});
});
['dragleave','drop'].forEach(function(ev){
  dropZone.addEventListener(ev,function(e){e.preventDefault();dropZone.classList.remove('over');});
});
dropZone.addEventListener('drop',function(e){handleFile(e.dataTransfer.files[0]);});

function resetUp(){
  selFile=null;selVid=false;fileInp.value='';
  prevBar.classList.remove('show');prevThumb.innerHTML='';
  vidNote.className='vid-note';upBtn.disabled=true;upLbl.textContent='Upload';setMsg('','');
}
function setMsg(txt,type){
  if(!txt){upMsg.className='up-msg';upMsg.innerHTML='';return;}
  upMsg.className='up-msg show '+type;
  upMsg.innerHTML=(type==='loading'?'<span class="spin-el"></span>':'')+esc(txt);
}

/* ═══════════════════════════════════════════════════════
   NAME MODAL
═══════════════════════════════════════════════════════ */
upBtn.addEventListener('click',function(){
  if(!selFile)return;
  if(!getTok()){toast('Set your GitHub Token first.','err');openTokBtn.click();return;}
  openNameModal();
});

function openNameModal(){
  var ext=selFile.name.split('.').pop().toLowerCase();
  var autoBase=(selVid?'video_':'sticker_')+Date.now();
  pendUpload={file:selFile,isVid:selVid,autoBase:autoBase,ext:ext};
  /* Name modal preview */
  nameThumb.innerHTML='';
  if(!selVid){
    var im=new Image();im.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:10px';
    var rd=new FileReader();rd.onload=function(e){im.src=e.target.result;};rd.readAsDataURL(selFile);
    nameThumb.appendChild(im);
  } else {nameThumb.textContent='🎬';}
  nameOrig.textContent=selFile.name;
  nameFsz.textContent=fmtB(selFile.size);
  nameExtLbl.textContent='.'+ext;
  nameAutoVal.textContent=autoBase;
  nameTitleEl.textContent=(selVid?'✏️ Name your video':'✏️ Name your sticker');
  nameInp.value='';
  nameInp.placeholder=autoBase;
  nameModal.classList.add('open');
  setTimeout(function(){nameInp.focus();},80);
}

function closeNameModal(){nameModal.classList.remove('open');pendUpload=null;}
nameCancel.addEventListener('click',closeNameModal);
nameModal.addEventListener('click',function(e){if(e.target===nameModal)closeNameModal();});
nameInp.addEventListener('keydown',function(e){if(e.key==='Enter')nameContinue.click();});

nameContinue.addEventListener('click',function(){
  if(!pendUpload)return;
  var raw=nameInp.value.trim();
  var base=raw?sanitize(raw):'';
  if(!base)base=pendUpload.autoBase;
  var finalName=base+'.'+pendUpload.ext;
  var p=pendUpload; closeNameModal();
  doUpload(p.file,p.isVid,finalName);
});

/* ═══════════════════════════════════════════════════════
   UPLOAD
═══════════════════════════════════════════════════════ */
async function doUpload(file,isVid,finalName){
  var tk=getTok();if(!tk){toast('Token required.','err');return;}
  var branch=await getBranch();
  var folder=isVid?CFG.inDir:CFG.imgDir;
  var url=API+'/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+folder+finalName;
  var b64=await toB64(file);
  /* Lock UI */
  upBtn.disabled=true;
  var origLbl=upLbl.textContent;
  upBtn.innerHTML='<span class="spin-el"></span>';
  setMsg(isVid?'Uploading video to input/…':'Uploading image…','loading');
  try{
    var res=await fetch(url,{method:'PUT',headers:authH(tk),
      body:JSON.stringify({message:'Upload '+finalName,content:b64,branch:branch})});
    var data=await res.json();
    if(res.ok){
      if(isVid){
        setMsg('✓ Video uploaded — GitHub Actions is processing it…','warn');
        toast('🎬 "'+finalName+'" queued! Check Videos tab in ~2 min.','warn',6000);
        resetUp();
      } else {
        setMsg('✓ "'+finalName+'" uploaded! Refreshing…','ok');
        toast('"'+finalName+'" uploaded successfully!','ok');
        resetUp();
        setTimeout(function(){closeDrw();fetchAll();},2000);
      }
    } else {
      setMsg('Upload failed: '+(data.message||'Unknown error'),'err');
      toast('Upload failed: '+(data.message||'?'),'err');
    }
  }catch(err){setMsg('Network error.','err');toast('Network error.','err');}
  finally{
    upBtn.disabled=false;
    upBtn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg><span id="upLbl">'+esc(origLbl)+'</span>';
    upLbl=$('upLbl');
  }
}

function toB64(file){
  return new Promise(function(res,rej){
    var r=new FileReader();
    r.onload=function(e){res(e.target.result.split(',')[1]);};
    r.onerror=function(){rej(new Error('Read failed'));};
    r.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════════════════════
   WORKFLOW INSTALLER
═══════════════════════════════════════════════════════ */
var WF_PATH='.github/workflows/process-video.yml';

function getWFYAML(){
  var s='name: Process Videos with FFmpeg\n\n';
  s+='on:\n  push:\n    branches: [main]\n    paths: ["input/**"]\n\n';
  s+='jobs:\n  process:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n    steps:\n';
  s+='      - uses: actions/checkout@v4\n\n';
  s+='      - name: Convert new videos to silent looping MP4\n        run: |\n';
  s+='          mkdir -p output\n';
  s+='          for file in input/*; do\n';
  s+='            [ -f "$file" ] || continue\n';
  s+='            fn=$(basename -- "$file")\n';
  s+='            [ "$fn" = ".gitkeep" ] && continue\n';
  s+='            base="${fn%.*}"\n';
  s+='            out="output/${base}.mp4"\n';
  s+='            [ -f "$out" ] && { echo "skip: $fn"; continue; }\n';
  s+='            echo "processing: $fn"\n';
  s+='            ffmpeg -i "$file" -an -c:v libx264 -preset slow -crf 23 \\\n';
  s+='              -movflags +faststart -pix_fmt yuv420p \\\n';
  s+='              -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "$out"\n';
  s+='            echo "done: $out"\n';
  s+='          done\n\n';
  s+='      - name: Commit processed videos\n        env:\n';
  s+='          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: |\n';
  s+='          git config user.name "github-actions[bot]"\n';
  s+='          git config user.email "github-actions[bot]@users.noreply.github.com"\n';
  s+='          git add output/\n';
  s+='          if git diff --staged --quiet; then echo "nothing new";\n';
  s+='          else git commit -m "Auto-process videos [skip ci]" && git push; fi\n';
  return s;
}

function s2b64(str){var bytes=new TextEncoder().encode(str);var bin='';bytes.forEach(function(b){bin+=String.fromCharCode(b);});return btoa(bin);}

async function checkWF(){
  var tk=getTok();if(!tk)return;
  var b=await getBranch();
  try{
    var r=await fetch(API+'/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+encodeURIComponent(WF_PATH)+'?ref='+b+'&_='+Date.now(),{headers:baseH()});
    if(r.ok)setupBar.classList.add('gone');else setupBar.classList.remove('gone');
  }catch(e){}
}

installBtn.addEventListener('click',async function(){
  var tk=getTok();if(!tk){toast('Set your Token first.','err');openTokBtn.click();return;}
  var b=await getBranch();
  var orig=installBtn.innerHTML;installBtn.disabled=true;
  installBtn.innerHTML='<span class="spin-el" style="width:12px;height:12px;border-width:2px"></span>';
  /* Create placeholder folders */
  for(var fp of [CFG.inDir+'.gitkeep',CFG.outDir+'.gitkeep']){
    var fu=API+'/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+fp;
    var fc=await fetch(fu+'?ref='+b,{headers:baseH()}).catch(function(){return null;});
    if(!fc||!fc.ok)await fetch(fu,{method:'PUT',headers:authH(tk),body:JSON.stringify({message:'Init folder',content:s2b64(''),branch:b})}).catch(function(){});
  }
  /* Install workflow */
  var wr=await fetch(API+'/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+encodeURIComponent(WF_PATH),{
    method:'PUT',headers:authH(tk),body:JSON.stringify({message:'Add video workflow',content:s2b64(getWFYAML()),branch:b})
  }).catch(function(){return null;});
  if(wr&&(wr.ok||wr.status===422)){
    toast('✓ Workflow installed! Videos will now auto-process.','ok',6000);
    setupBar.classList.add('gone');
  } else {
    var d=wr?await wr.json().catch(function(){return{};}):{message:'Network error'};
    toast('Install failed: '+(d.message||'?'),'err');
  }
  installBtn.disabled=false;installBtn.innerHTML=orig;
});
dismissSetup.addEventListener('click',function(){setupBar.classList.add('gone');});

/* ═══════════════════════════════════════════════════════
   FETCH ALL  (images/ + output/ + input/)
═══════════════════════════════════════════════════════ */
refreshBtn.addEventListener('click',function(){fetchAll();toast('Refreshed.','info',2000);});

async function fetchAll(){
  var b=await getBranch();var ts='&_='+Date.now();var h=baseH();
  var origIcon=refreshBtn.innerHTML;
  refreshBtn.disabled=true;refreshBtn.innerHTML='<span class="spin-el" style="width:13px;height:13px;border-width:2px"></span>';
  showSkels(18);
  async function fetchDir(dir){
    var clean=dir.replace(/\/$/,'');
    var url=API+'/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+clean+'?ref='+b+ts;
    try{var r=await fetch(url,{headers:h});if(!r.ok)return[];var d=await r.json();return Array.isArray(d)?d:[];}catch(e){return[];}
  }
  var res=await Promise.all([fetchDir(CFG.imgDir),fetchDir(CFG.outDir),fetchDir(CFG.inDir)]);
  var rawImg=res[0],rawOut=res[1],rawIn=res[2];
  /* Images */
  cache.images=rawImg
    .filter(function(f){return f.type==='file'&&isImgF(f.name)&&f.name!=='.gitkeep';})
    .sort(function(a,b){return b.name.localeCompare(a.name);})
    .map(function(f){return{name:f.name,path:f.path,sha:f.sha,src:pgURL(f.path),folder:CFG.imgDir,type:'image'};});
  /* Processed videos — MUST use GitHub Pages URL for streaming */
  cache.videos=rawOut
    .filter(function(f){return f.type==='file'&&isVidF(f.name)&&f.name!=='.gitkeep';})
    .sort(function(a,b){return b.name.localeCompare(a.name);})
    .map(function(f){return{name:f.name,path:f.path,sha:f.sha,src:pgURL(f.path),folder:CFG.outDir,type:'video'};});
  /* Pending = in input/ but not yet in output/ */
  var outNames=new Set(cache.videos.map(function(v){return v.name.replace(/\.[^.]+$/,'');}));
  cache.pending=rawIn
    .filter(function(f){return f.type==='file'&&isVidF(f.name)&&f.name!=='.gitkeep'&&!outNames.has(f.name.replace(/\.[^.]+$/,''));})
    .map(function(f){return{name:f.name,path:f.path};});
  /* Update badges */
  $('cnt-img').textContent=cache.images.length;
  $('cnt-vid').textContent=cache.videos.length;
  $('cnt-pend').textContent=cache.pending.length;
  var pendTab=document.querySelector('[data-tab="pending"]');
  if(cache.pending.length>0)pendTab.classList.add('pend');else pendTab.classList.remove('pend');
  renderTab();
  refreshBtn.disabled=false;refreshBtn.innerHTML=origIcon;
}

/* ═══════════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════════ */
document.querySelectorAll('.tab').forEach(function(btn){
  btn.addEventListener('click',function(){
    activeTab=btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('on',b===btn);b.setAttribute('aria-selected',b===btn?'true':'false');});
    renderTab();searchInp.value='';
  });
});

function renderTab(){
  if(activeTab==='images')renderItems(cache.images,'images');
  else if(activeTab==='videos')renderItems(cache.videos,'videos');
  else renderPending();
}

searchInp.addEventListener('input',function(){
  var q=searchInp.value.trim().toLowerCase();
  var src=activeTab==='images'?cache.images:activeTab==='videos'?cache.videos:[];
  renderItems(q?src.filter(function(i){return i.name.toLowerCase().includes(q);}):src,activeTab);
});

/* ═══════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════ */
var vidObs=new IntersectionObserver(function(entries){
  entries.forEach(function(en){var v=en.target;if(en.isIntersecting)v.play().catch(function(){});else v.pause();});
},{threshold:0.1});

function showSkels(n){grid.innerHTML=Array(n).fill('<div class="skel" role="presentation"></div>').join('');}

function renderItems(items,tab){
  grid.innerHTML='';
  if(!items.length){
    var msg=tab==='images'?'Upload your first sticker using the Upload button above!':
            tab==='videos'?(cache.pending.length?'Videos are processing — check the ⏳ tab…':'Upload a video and GitHub Actions converts it automatically.'):'';
    grid.innerHTML='<div class="empty"><span class="empty-ico">'+(tab==='images'?'🖼️':'🎬')+'</span><p>Nothing here yet.<br><small style="color:var(--t3)">'+esc(msg)+'</small></p></div>';
    return;
  }
  items.forEach(function(item){grid.appendChild(makeCard(item));});
}

function renderPending(){
  grid.innerHTML='';
  if(!cache.pending.length){
    grid.innerHTML='<div class="empty"><span class="empty-ico">✅</span><p>All videos processed!</p></div>';
    return;
  }
  cache.pending.forEach(function(item){
    var c=document.createElement('div');c.className='card';c.setAttribute('role','listitem');
    c.innerHTML='<div class="card-bg"></div><div class="proc-body"><div class="proc-spin"></div><div class="proc-ico">🎬</div><p class="proc-lbl">Processing…<br>'+esc(item.name)+'</p></div>';
    grid.appendChild(c);
  });
}

/* ═══════════════════════════════════════════════════════
   MAKE CARD
═══════════════════════════════════════════════════════ */
var COPY_SVG='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var DEL_SVG='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
var TICK_SVG='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

function makeCard(item){
  var isV=(item.type==='video');
  var c=document.createElement('div');
  c.className='card'+(isV?' vc':'');c.setAttribute('role','listitem');
  var media=isV
    ?'<video src="'+esc(item.src)+'" loop muted autoplay playsinline preload="auto"></video>'
    :'<img src="'+esc(item.src)+'" alt="'+esc(item.name)+'" loading="lazy" decoding="async"/>';
  c.innerHTML=
    '<div class="card-bg"></div>'+media+
    '<div class="card-ov"><button class="copy-cta" data-url="'+esc(item.src)+'">'+COPY_SVG+' Copy Link</button></div>'+
    '<div class="card-acts"><button class="act-del" data-n="'+esc(item.name)+'" data-sha="'+esc(item.sha)+'" data-folder="'+esc(item.folder)+'" data-vid="'+isV+'" title="Delete">'+DEL_SVG+'</button></div>'+
    (isV?'<div class="vid-badge">LOOP</div>':'')+
    '<div class="card-nm">'+esc(item.name)+'</div>';
  if(isV){var vid=c.querySelector('video');vidObs.observe(vid);}
  c.addEventListener('click',function(e){
    if(e.target.closest('.copy-cta')||e.target.closest('.act-del'))return;
    openLB(item.src,item.name,isV);
  });
  c.querySelector('.copy-cta').addEventListener('click',function(e){
    e.stopPropagation();copyURL(e.currentTarget.dataset.url,e.currentTarget);
  });
  c.querySelector('.act-del').addEventListener('click',function(e){
    e.stopPropagation();var b=e.currentTarget;
    openDel(b.dataset.n,b.dataset.sha,b.dataset.folder,b.dataset.vid==='true');
  });
  return c;
}

/* ═══════════════════════════════════════════════════════
   COPY URL
═══════════════════════════════════════════════════════ */
function copyURL(url,btn){
  var orig=btn.innerHTML;
  function done(){btn.innerHTML=TICK_SVG+' Copied!';btn.classList.add('copied');toast('Link copied!','ok');setTimeout(function(){btn.innerHTML=orig;btn.classList.remove('copied');},2200);}
  if(navigator.clipboard)navigator.clipboard.writeText(url).then(done).catch(function(){fbCopy(url,done);});
  else fbCopy(url,done);
}
function fbCopy(url,cb){
  try{var t=Object.assign(document.createElement('textarea'),{value:url,style:'position:fixed;opacity:0'});document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);cb();}
  catch(e){toast('Copy failed.','err');}
}

/* ═══════════════════════════════════════════════════════
   DELETE
═══════════════════════════════════════════════════════ */
function openDel(name,sha,folder,vid){
  pendDel={name:name,sha:sha,folder:folder};
  delDesc.textContent=vid?'Removes the processed MP4 from output/. The original in input/ is kept.':'This permanently removes the file and cannot be undone.';
  delFile.textContent=folder+name;delModal.classList.add('open');delConfirm.focus();
}
function closeDel(){pendDel=null;delModal.classList.remove('open');}
delCancel.addEventListener('click',closeDel);
delModal.addEventListener('click',function(e){if(e.target===delModal)closeDel();});

delConfirm.addEventListener('click',async function(){
  if(!pendDel)return;var tk=getTok();if(!tk){toast('Token required.','err');closeDel();return;}
  var n=pendDel.name,sha=pendDel.sha,folder=pendDel.folder;
  var b=await getBranch();
  var url=API+'/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+folder+n;
  delConfirm.disabled=true;delConfirm.innerHTML='<span class="spin-el" style="width:11px;height:11px;border-width:2px"></span>';
  try{
    var r=await fetch(url,{method:'DELETE',headers:authH(tk),body:JSON.stringify({message:'Delete '+n,sha:sha,branch:b})});
    if(r.ok){toast('"'+n+'" deleted.','ok');closeDel();setTimeout(fetchAll,1000);}
    else{var d=await r.json().catch(function(){return{};});toast('Delete failed: '+(d.message||'?'),'err');}
  }catch(e){toast('Network error.','err');}
  finally{delConfirm.disabled=false;delConfirm.textContent='Delete';}
});

/* ═══════════════════════════════════════════════════════
   LIGHTBOX
═══════════════════════════════════════════════════════ */
function openLB(src,name,vid){
  if(vid){lbImg.style.display='none';lbVid.style.display='block';lbVid.src=src;lbVid.play().catch(function(){});}
  else{lbVid.pause();lbVid.src='';lbVid.style.display='none';lbImg.style.display='block';lbImg.src=src;lbImg.alt=name;}
  lbNm.textContent=name;lb.classList.add('open');document.body.style.overflow='hidden';
}
function closeLB(){lb.classList.remove('open');document.body.style.overflow='';lbVid.pause();lbVid.src='';lbImg.src='';}
lbClose.addEventListener('click',closeLB);
lb.addEventListener('click',function(e){if(e.target===lb)closeLB();});

/* ═══════════════════════════════════════════════════════
   TOASTS
═══════════════════════════════════════════════════════ */
var TICON={ok:'✓',err:'✕',info:'→',warn:'!'};
function toast(msg,type,ms){
  ms=ms||3600;var el=document.createElement('div');
  el.className='toast t-'+(type||'info');el.setAttribute('role','alert');
  el.innerHTML='<span>'+( TICON[type]||'•')+'</span><span>'+esc(msg)+'</span>';
  $('toasts').appendChild(el);
  setTimeout(function(){el.classList.add('out');el.addEventListener('animationend',function(){el.remove();},{once:true});},ms);
}

/* ═══════════════════════════════════════════════════════
   KEYBOARD
═══════════════════════════════════════════════════════ */
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeLB();closeDel();closeNameModal();tokModal.classList.remove('open');drwBg.classList.remove('open');}
});

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
initTheme();
syncTokUI();
fetchAll().then(function(){checkWF();});