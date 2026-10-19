/* NeuralAI — offline semantic retrieval via MiniLM-L6 ONNX + onnxruntime-web (WASM).
   Fully offline: model + runtime + vocab bundled in assets/ai/.
   Falls back gracefully (NeuralAI.ready=false) if WASM unavailable. */
(function(){
"use strict";
var AI = { ready:false, session:null, vocab:null, index:null, status:'idle' };
window.NeuralAI = AI;

var KB = [
 {id:'pipeline', q:'build pipeline steps stages compile link dex sign align how to build apk', a:'pipeline'},
 {id:'tools', q:'aapt2 d8 dx ecj javac zipalign apksigner tool role what does each tool do', a:'tools'},
 {id:'errors', q:'error fail fix troubleshoot install_failed no_matching_abis classnotfound aapt2 resource not found', a:'errors'},
 {id:'sign', q:'sign keystore keytool certificate debug key apksigner how to sign apk', a:'sign'},
 {id:'termux', q:'termux on device phone android build pkg install setup on-device', a:'termux'},
 {id:'pwa', q:'pwa wrap webview index.html offline app website to apk convert web wrap-pwa', a:'pwa'},
 {id:'sovereign', q:'sovereign offline hardened permission internet security privacy no network hardening', a:'sovereign'},
 {id:'wizard', q:'wizard new app create app start project scaffold generate build wizard', a:'wizard'},
 {id:'multidex', q:'multidex 64k method limit classes2 too many methods dex limit', a:'multidex'},
 {id:'icon', q:'icon adaptive mipmap ic_launcher foreground background app icon', a:'icon'},
 {id:'about', q:'about what is who are you version license source evidence', a:'about'},
 {id:'hello', q:'hello hi hey gday yo greetings start', a:'hello'}
];

/* --- fetch polyfill for file:// (XHR works where fetch is blocked) --- */
if (location.protocol === 'file:') {
  window.fetch = function(url, opts){
    return new Promise(function(resolve, reject){
      var xhr = new XMLHttpRequest();
      xhr.open((opts && opts.method) || 'GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(){
        if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
          resolve(new Response(xhr.response, {status:200, headers:{'Content-Type':'application/octet-stream'}}));
        } else reject(new Error('fetch '+url+' status '+xhr.status));
      };
      xhr.onerror = function(){ reject(new Error('xhr error '+url)); };
      xhr.send((opts && opts.body) || null);
    });
  };
}

function xhrBuf(url){
  return new Promise(function(res,rej){
    var x=new XMLHttpRequest(); x.open('GET',url,true); x.responseType='arraybuffer';
    x.onload=function(){ if(x.status===0||x.status===200) res(x.response); else rej(new Error('status '+x.status)); };
    x.onerror=function(){ rej(new Error('xhr fail '+url)); }; x.send();
  });
}
function xhrText(url){
  return new Promise(function(res,rej){
    var x=new XMLHttpRequest(); x.open('GET',url,true);
    x.onload=function(){ if(x.status===0||x.status===200) res(x.responseText); else rej(new Error('status '+x.status)); };
    x.onerror=function(){ rej(new Error('xhr fail '+url)); }; x.send();
  });
}

AI.init = async function(){
  try {
    AI.status='loading vocab';
    AI.vocab = BertTokenizer.loadVocab(await xhrText('ai/vocab.txt'));
    AI.status='loading runtime';
    ort.env.wasm.wasmPaths = 'ai/';
    ort.env.wasm.numThreads = 1;
    AI.status='loading model';
    var buf = await xhrBuf('ai/model.onnx');
    AI.session = await ort.InferenceSession.create(buf, {executionProviders:['wasm']});
    AI.status='indexing knowledge base';
    // embed each KB entry (question text)
    AI.index = [];
    for (var i=0;i<KB.length;i++){
      var vec = await AI.embed(KB[i].q);
      AI.index.push({id:KB[i].id, vec:vec});
    }
    AI.ready = true; AI.status='ready';
    if (window.onNeuralAIReady) window.onNeuralAIReady();
  } catch(e){
    AI.status='failed: '+e.message;
    AI.ready = false;
  }
  return AI.ready;
};

AI.embed = async function(text){
  var enc = BertTokenizer.encode(text, AI.vocab, 128);
  var n = 128;
  var ii = new BigInt64Array(n); var am = new BigInt64Array(n); var tt = new BigInt64Array(n);
  for (var i=0;i<n;i++){ ii[i]=BigInt(enc.inputIds[i]); am[i]=BigInt(enc.attnMask[i]); tt[i]=0n; }
  var feeds = {
    input_ids: new ort.Tensor('int64', ii, [1,n]),
    attention_mask: new ort.Tensor('int64', am, [1,n]),
    token_type_ids: new ort.Tensor('int64', tt, [1,n])
  };
  // some exports name inputs differently; try common aliases
  try { var out = await AI.session.run(feeds); }
  catch(e){
    var feeds2={};
    var names = AI.session.inputNames;
    feeds2[names[0]]=feeds.input_ids; feeds2[names[1]]=feeds.attention_mask;
    if(names[2]) feeds2[names[2]]=feeds.token_type_ids;
    out = await AI.session.run(feeds2);
  }
  // take first output tensor: [1, seq, 384]
  var outName = Object.keys(out)[0];
  var data = out[outName].data; // Float32Array length 1*128*384
  var dim = 384; var seq=128;
  // mean pool over non-pad positions
  var pooled = new Float32Array(dim); var cnt=0;
  for (var s=0;s<seq;s++){
    if (enc.attnMask[s]){ cnt++;
      for (var d=0;d<dim;d++) pooled[d]+=data[s*dim+d];
    }
  }
  for (d=0;d<dim;d++) pooled[d]/=cnt;
  // L2 normalize
  var norm=0; for (d=0;d<dim;d++) norm+=pooled[d]*pooled[d];
  norm=Math.sqrt(norm)||1; for (d=0;d<dim;d++) pooled[d]/=norm;
  return pooled;
};

AI.ask = async function(query){
  if (!AI.ready) return null;
  var qv = await AI.embed(query);
  var best=null, bestScore=-1;
  for (var i=0;i<AI.index.length;i++){
    var sc=0; var v=AI.index[i].vec;
    for (var d=0;d<v.length;d++) sc+=qv[d]*v[d]; // cosine (both normalized)
    if (sc>bestScore){ bestScore=sc; best=AI.index[i].id; }
  }
  return {id:best, score:bestScore};
};

// auto-start
AI.init();
})();
