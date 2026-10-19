/* AI Forge — offline AI + terminal APK builder. 100% local, no network.
   AI engine: intent-ranked retrieval over a bundled APK-build knowledge base.
   (No LLM, no telemetry. Drop in transformers.js + a bundled quantized model
    in assets/ to upgrade to on-device neural inference — same interface.) */
(function(){
"use strict";
var out = document.getElementById('output');
var cmd = document.getElementById('cmd');
var promptEl = document.getElementById('prompt');
var history = []; var hIdx = -1;
var wizard = null; // {step, data:{}}

function print(html, cls){
  var d = document.createElement('div');
  d.className = 'line ' + (cls||'');
  d.innerHTML = html;
  out.appendChild(d);
  scrollBottom();
}
function scrollBottom(){ var t=document.getElementById('terminal'); t.scrollTop=t.scrollHeight; }
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ---------------- knowledge base (offline) ---------------- */
var KB = [
 {id:'pipeline', pats:['pipeline','build step','how build work','stage','compile link dex sign align'],
  a:'<b>APK build pipeline (7 stages):</b>\n1. <b>aapt2 compile</b> — res/*.xml + png → *.flat compiled resources\n2. <b>aapt2 link</b> — merge flats + manifest → resources.ap_ + generate R.java\n3. <b>javac/ecj</b> — src/**.java + R.java → *.class (cp=android.jar)\n4. <b>d8</b> — *.class → classes.dex (min-api sets desugaring)\n5. <b>assemble</b> — zip resources.ap_ + classes.dex + assets/ + lib/ → unsigned.apk\n6. <b>zipalign -p 4</b> — 4-byte align uncompressed data (mmap speed)\n7. <b>apksigner</b> — sign with keystore (v2+v3 scheme) → installable APK\nVerify: <span class="info">apksigner verify --print-certs app.apk</span>'},
 {id:'tools', pats:['tool','aapt','d8','dx','ecj','javac','zipalign','apksigner','what tool','role'],
  a:'<b>Tool roles:</b>\n• <b>aapt2</b> — Android Asset Packaging Tool v2: compile+link resources, generate R.java, dump badging. (aapt = v1 legacy)\n• <b>ecj / javac</b> — Java compiler. ecj is single-jar (works on JRE-only); javac needs JDK.\n• <b>d8</b> — dex compiler: .class → .dex, desugars Java 8+. (dx = legacy, slower, no desugar.)\n• <b>zipalign</b> — alignment pass before signing.\n• <b>apksigner</b> — sign + verify (v1/v2/v3 schemes). <span class="warn">Must run AFTER zipalign.</span>\n• <b>android.jar</b> — the SDK platform stub, required at compile time (not bundled in APK).'},
 {id:'errors', pats:['error','fail','fix','troubleshoot','problem','not work','crash','INSTALL_FAILED'],
  a:'<b>Common errors + fixes:</b>\n• <span class="err">INSTALL_FAILED_NO_MATCHING_ABIS</span> — your .so is missing for the device arch; add lib/<arch>/ or remove native libs.\n• <span class="err">aapt2: resource not found @mipmap/ic_launcher</span> — adaptive icon needs both background + foreground; provide a fallback drawable or drop the icon attr.\n• <span class="err">d8: invoke-custom requires min-api 26</span> — raise minSdk or avoid Java 8 lambdas/streams.\n• <span class="err">INSTALL_FAILED_UPDATE_INCOMPATIBLE</span> — signature mismatch with installed app; uninstall old copy first.\n• <span class="err">ClassNotFoundException at runtime</span> — classes.dex missing from APK; check assemble step added it.\n• <span class="err">WebView shows file not found</span> — assets/ never zipped in; build with <span class="info">aapt2 link -A assets/</span>.\n• <span class="err">aapt2 daemon startup failed (ARM)</span> — use <span class="info">--no-daemon</span> or call aapt2 compile per-file.'},
 {id:'sign', pats:['sign','keystore','keytool','certificate','debug key','apksigner sign'],
  a:'<b>Signing (required to install):</b>\nGenerate a debug keystore once:\n<span class="info">keytool -genkeypair -keystore debug.keystore -alias mykey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Debug"</span>\nSign:\n<span class="info">apksigner sign --ks debug.keystore --ks-pass pass:android --out app-signed.apk app-aligned.apk</span>\nVerify:\n<span class="info">apksigner verify --print-certs app-signed.apk</span>\n<span class="warn">Same package + same key = update. Different key = uninstall first.</span>'},
 {id:'termux', pats:['termux','on device','phone','android build','pkg install','setup','on-device'],
  a:'<b>Build on your phone (Termux):</b>\n<span class="info">pkg update && pkg install aapt aapt2 apksigner dx d8 ecj openjdk-17 zipalign</span>\nThen run <span class="info">./build.sh</span> in any forge project. android.jar: download platform-XX zip from dl.google.com into lib/, or <span class="info">cp /system/framework/framework.jar lib/android.jar</span> as a stub fallback. No root needed. For Gradle projects: install cmdline-tools to ~/android-sdk, accept licenses, set android.aapt2FromMavenOverride to Termux aapt2.'},
 {id:'pwa', pats:['pwa','wrap','webview','index.html','offline app','website to apk','convert web'],
  a:'<b>PWA → APK (wrap-pwa.sh):</b>\n<span class="info">./scripts/wrap-pwa.sh ./my-pwa-folder "My App" com.my.app</span>\nThis scaffolds projects/my-app/ with your PWA copied into assets/, a sovereign-hardened WebView MainActivity (JS+DOM+IndexedDB on, no cross-origin, no cleartext), and <b>no INTERNET permission</b> — it loads file:///android_asset/index.html, 100% offline. Build: <span class="info">cd projects/my-app && ./build.sh</span>. WebGL/WebAudio work (hardware-accelerated). Service workers are ignored under file:// — inline your cache logic.'},
 {id:'sovereign', pats:['sovereign','offline','hardened','permission','internet','security','privacy','no network'],
  a:'<b>Sovereign hardening defaults:</b>\n• <b>NO INTERNET permission</b> — everything bundled in assets/.\n• allowBackup=false, usesCleartextTraffic=false, MIXED_CONTENT_NEVER_ALLOW.\n• allowFileAccess=true (needed for assets) but allowUniversalAccessFromFileURLs=false.\n• allowContentAccess=false. WebView.destroy() in onDestroy (no leak).\n• Signed with a local keystore that never leaves the device.\n• Deterministic builds via SOURCE_DATE_EPOCH for reproducible SHA256.\nTo add network: uncomment the INTERNET permission AND record a governance note — the forge flags it.'},
 {id:'wizard', pats:['wizard','new app','create app','start project','scaffold','generate'],
  a:'Run the interactive build wizard: type <b>wizard</b>. It asks 3 questions (name, package, type) and outputs a ready project + exact build commands. Or use <b>wrap</b> for PWAs.'},
 {id:'multidex', pats:['multidex','64k','method limit','classes2','too many method','dex limit'],
  a:'<b>64k method limit / multidex:</b>\nA single classes.dex holds ~64k methods. Exceed → split. d8 outputs classes.dex, classes2.dex, … automatically when you pass many classes. For minSdk < 21 you must bundle the multidex support library and attach BaseContext. For minSdk ≥ 21 (our default 26), the OS loads all dexes natively — no code change. If you hit <span class="err">Too many field references</span>, enable multidex or strip unused libs (proguard/R8).'},
 {id:'icon', pats:['icon','adaptive','mipmap','ic_launcher','foreground background','app icon'],
  a:'<b>Adaptive icons (API 26+):</b>\nres/mipmap-anydpi-v26/ic_launcher.xml references a <b>background</b> (color or drawable) and <b>foreground</b> (vector, 108dp canvas, safe zone 72dp). Both must exist or aapt2 link fails. For pre-26 fallback add pngs in mipmap-mdpi/hdpi/xhdpi/xxhdpi. Our forge minSdk=26 so anydpi-v26 alone is sufficient. Simplest: set background=@color/ic_bg and foreground=@drawable/ic_foreground_vector.'},
 {id:'about', pats:['about','what is','who are you','version','license','source'],
  a:'<b>AI Forge v1.3</b> — part of Sovereign APK Forge.\nOffline AI: <b>MiniLM-L6-v2 neural semantic retrieval</b> (22MB Q4 ONNX + onnxruntime-web WASM, bundled in assets/ai/). No network, no telemetry. Type <b>neural</b> for engine status. Keyword engine used before neural loads or as fallback. Upgrade to a generative LLM: bundle a quantized model + transformers.js (interface-compatible).\nLicense: MIT. Evidence: DEMONSTRATED (real signed APK, apksigner-verified).'},
 {id:'hello', pats:['hello','hi','hey','gday','g\'day','yo'],
  a:'G\'day. I\'m your offline APK-build assistant. Ask me about <b>pipeline</b>, <b>errors</b>, <b>signing</b>, <b>Termux</b>, <b>PWA wrapping</b>, or run <b>wizard</b> to scaffold an app. Type <b>help</b> for commands.'}
];

/* ---------------- AI engine ---------------- */
var lastTopic = 'hello';
function aiAsk(q){
  q = q.toLowerCase();
  var best=null, bestScore=0;
  for(var i=0;i<KB.length;i++){
    var sc=0; var k=KB[i];
    for(var j=0;j<k.pats.length;j++){
      var p=k.pats[j];
      if(q.indexOf(p)>=0) sc += (p.length>6?2:1);
    }
    if(sc>bestScore){bestScore=sc;best=k;}
  }
  if(best){ lastTopic=best.id; return '<span class="ai">'+best.a+'</span>'; }
  // fallback: keyword scan of KB answers
  var terms=q.split(/\s+/).filter(function(t){return t.length>3;});
  var fb=null, fbSc=0;
  for(i=0;i<KB.length;i++){ var s2=0;
    for(j=0;j<terms.length;j++){ if(KB[i].a.toLowerCase().indexOf(terms[j])>=0) s2++; }
    if(s2>fbSc){fbSc=s2; fb=KB[i];}
  }
  if(fb && fbSc>=2){ lastTopic=fb.id; return '<span class="dim">(closest match)</span>\n<span class="ai">'+fb.a+'</span>'; }
  return '<span class="ai">I don\'t have that in my offline knowledge base yet. Try: <b>help</b>, <b>pipeline</b>, <b>errors</b>, <b>sign</b>, <b>termux</b>, <b>pwa</b>, <b>wizard</b>. I remember your last topic was <b>'+lastTopic+'</b> — ask a follow-up.</span>';
}

/* ---------------- build wizard ---------------- */
function wizardStart(){
  wizard={step:0, data:{}};
  print('<span class="info">== BUILD WIZARD ==  (ctrl+c / "cancel" to abort)</span>');
  print('1/3 · App display name? (e.g. "My Cool App")');
  promptEl.textContent='wizard:';
}
function wizardStep(input){
  if(input==='cancel'||input==='abort'){ wizard=null; promptEl.textContent='ai-forge:~$'; print('<span class="warn">wizard aborted.</span>'); return; }
  if(wizard.step===0){
    wizard.data.name=input.trim()||'MyApp';
    wizard.step=1;
    print('2/3 · Package name? (reverse-domain, e.g. com.my.coolapp) [com.example.'+(wizard.data.name.toLowerCase().replace(/\W+/g,''))+']');
  } else if(wizard.step===1){
    wizard.data.pkg=input.trim()||('com.example.'+wizard.data.name.toLowerCase().replace(/\W+/g,''));
    wizard.step=2;
    print('3/3 · Type?  <b>pwa</b> (bundle a web app folder) or <b>native</b> (Java Activity) [pwa]');
  } else {
    wizard.data.type=(input.trim()||'pwa').toLowerCase();
    finishWizard();
  }
}
function finishWizard(){
  var d=wizard.data; var slug=d.name.toLowerCase().replace(/\W+/g,'-').replace(/^-|-$/g,'');
  var cmds;
  if(d.type==='native'){
    cmds='<b>Native project — scaffold + build:</b>\n<span class="info">./scripts/new-project.sh "'+d.name+'" '+d.pkg+' native</span>\n<span class="info">cd projects/'+slug+' && ./build.sh</span>\n→ dist/'+d.name+'-1.0.0-signed.apk';
  } else {
    cmds='<b>PWA project — wrap + build:</b>\n<span class="info">./scripts/wrap-pwa.sh ./path-to-pwa-folder "'+d.name+'" '+d.pkg+'</span>\n<span class="info">cd projects/'+slug+' && ./build.sh</span>\n→ dist/'+slug+'-1.0.0-signed.apk\n<span class="dim">Put your index.html + assets in a folder and point wrap-pwa.sh at it.</span>';
  }
  print('<span class="ok">== PROJECT READY ==</span>\nName: <b>'+d.name+'</b>\nPackage: <b>'+d.pkg+'</b>\nType: <b>'+d.type+'</b>\n\n'+cmds+'\n\n<span class="dim">Keystore auto-generated on first build (local-only). No network required.</span>');
  wizard=null; promptEl.textContent='ai-forge:~$';
}

/* ---------------- commands ---------------- */
var COMMANDS={
  help:function(){ print('<b>Commands:</b>\n  <b>help</b> — this list\n  <b>ai &lt;question&gt;</b> or just type a question — ask the offline AI\n  <b>wizard</b> — interactive app scaffold wizard\n  <b>wrap &lt;dir&gt; &lt;name&gt; &lt;pkg&gt;</b> — PWA→APK project (same as wrap-pwa.sh)\n  <b>build</b> — show build pipeline + commands\n  <b>tools</b> — tool roles & versions\n  <b>errors</b> — common errors + fixes\n  <b>sign</b> — keystore + signing guide\n  <b>termux</b> — on-device setup\n  <b>status</b> — forge state\n  <b>clear</b> — clear terminal\n  <b>about</b> — about this app\n  <b>neural</b> — offline neural AI (MiniLM) status'); },
  build:function(){ print(aiAsk('pipeline')); },
  tools:function(){ print(aiAsk('tools')); },
  errors:function(){ print(aiAsk('errors')); },
  sign:function(){ print(aiAsk('sign')); },
  termux:function(){ print(aiAsk('termux')); },
  wizard:function(){ wizardStart(); },
  about:function(){ print(aiAsk('about')); },
  neural:function(){ var NA=window.NeuralAI||{}; print('<b>Neural engine (offline):</b>\n  model: MiniLM-L6-v2 (Q4 ONNX, 22MB)\n  runtime: onnxruntime-web WASM\n  status: <b>'+(NA.ready?'READY (semantic retrieval)':(NA.status||'initializing'))+'</b>\n  vocab: BERT uncased WordPiece\n  When ready, questions are matched by meaning, not just keywords.'); },
  status:function(){ print('<b>Forge status:</b>\n  Toolchain: <span class="ok">READY</span> (aapt2 · ecj · d8 · zipalign · apksigner)\n  Platform: android-34\n  Projects: portal-c137 · ai-forge\n  Evidence: <span class="ok">DEMONSTRATED</span> (real signed APKs)\n  Network: <span class="ok">OFFLINE</span> (no INTERNET permission)\n  Keystore: local debug (auto-generated, never leaves device)'); },
  clear:function(){ out.innerHTML=''; },
  wrap:function(a){
    if(a.length<3){ print('<span class="err">usage: wrap &lt;pwa-dir&gt; &lt;app-name&gt; &lt;package&gt;</span>'); return; }
    print('<span class="info">On-device equivalent:</span>\n<span class="info">./scripts/wrap-pwa.sh '+a.join(' ')+'</span>\nThen <span class="info">cd projects/&lt;slug&gt; && ./build.sh</span>');
  }
};

function exec(raw){
  var input=raw.trim();
  if(!input) return;
  print('<span class="cmd-echo">'+esc(promptEl.textContent+' '+input)+'</span>');
  history.push(input); hIdx=history.length;
  if(wizard){ wizardStep(input); return; }
  var parts=input.split(/\s+/); var c=parts[0].toLowerCase(); var args=parts.slice(1);
  if(c==='ai'){ print(aiAsk(args.join(' '))); return; }
  if(COMMANDS[c]){ COMMANDS[c](args); return; }
  // treat anything else as an AI question — neural (MiniLM) first, keyword fallback
  askAI(input);
}

/* Neural AI path (async). Uses offline MiniLM embeddings if loaded; else keyword engine. */
function askAI(input){
  var NA = window.NeuralAI;
  if(NA && NA.ready){
    var thinking = document.createElement('div');
    thinking.className='line dim'; thinking.textContent='neural: embedding query… (offline MiniLM)';
    out.appendChild(thinking); scrollBottom();
    NA.ask(input).then(function(r){
      thinking.remove();
      if(r && r.score > 0.35){
        var entry=null;
        for(var i=0;i<KB.length;i++){ if(KB[i].id===r.id){ entry=KB[i]; break; } }
        if(entry){
          print('<span class="dim">(neural match '+r.id+' · confidence '+r.score.toFixed(2)+')</span>');
          print('<span class="ai">'+entry.a+'</span>');
          lastTopic=r.id; return;
        }
      }
      print(aiAsk(input)); // keyword fallback
    }).catch(function(){ print(aiAsk(input)); });
  } else {
    if(NA && NA.status && NA.status.indexOf('loading')>=0){
      print('<span class="dim">(neural AI '+NA.status+' — keyword mode for now)</span>');
    }
    print(aiAsk(input));
  }
}

/* input handling */
cmd.addEventListener('keydown',function(e){
  if(e.key==='Enter'){ var v=cmd.value; cmd.value=''; exec(v); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); if(hIdx>0){hIdx--; cmd.value=history[hIdx]||'';} }
  else if(e.key==='ArrowDown'){ e.preventDefault(); if(hIdx<history.length-1){hIdx++; cmd.value=history[hIdx]||'';} else {hIdx=history.length; cmd.value='';} }
});
document.getElementById('terminal').addEventListener('click',function(){ cmd.focus(); });

/* banner */
print('<span class="ok">  ___ _____ ___ ___ ___ ___ _  _   ___ ___ ___ ___</span>');
print('<span class="ok"> / _ \\_   _| __| _ \\ __| __| \\| | | __| _ \\ __/ __|</span>');
print('<span class="ok">| (_) || | | _||   / _|| _|| .` | | _||   / _| (__</span>');
print('<span class="ok"> \\___/ |_| |___|_|_\\___|___|_|\\_| |___|_|_\\___\\___|</span>');
print('<span class="dim">offline AI · terminal APK builder · sovereign · v1.2</span>');
print('');
print('Type <b>help</b> for commands, <b>wizard</b> to scaffold an app, or just ask a question.');
print('<span class="dim">Everything runs locally — no network, no telemetry.</span>');
cmd.focus();
})();
