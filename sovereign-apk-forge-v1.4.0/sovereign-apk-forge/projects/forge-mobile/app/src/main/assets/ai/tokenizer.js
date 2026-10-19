/* BERT uncased WordPiece tokenizer (pure JS, offline). Matches all-MiniLM-L6-v2. */
(function(){
"use strict";
function loadVocab(text){
  var lines = text.split('\n'); var m = new Map();
  for(var i=0;i<lines.length;i++){ var t=lines[i].replace(/\r$/,''); if(t) m.set(t, i); }
  return m;
}
function isPunct(c){ return /[!-/:-@\[-`{-~]/.test(c); }
function isWS(c){ return /\s/.test(c); }
function stripAccents(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function basicTokenize(text){
  text = text.toLowerCase();
  // split on whitespace + punctuation, keep punctuation as tokens
  var tokens=[]; var cur='';
  for(var i=0;i<text.length;i++){
    var c=text[i];
    if(isWS(c)){ if(cur){tokens.push(cur);cur='';} }
    else if(isPunct(c)){ if(cur){tokens.push(cur);cur='';} tokens.push(c); }
    else cur+=c;
  }
  if(cur) tokens.push(cur);
  // strip accents per token
  return tokens.map(stripAccents);
}
function wordpiece(word, vocab, unkId){
  if(word.length > 100) return [unkId];
  var subTokens=[]; var start=0;
  while(start < word.length){
    var end=word.length; var curSub=null; var curId=-1;
    while(start < end){
      var sub = word.substring(start,end);
      if(start>0) sub = '##'+sub;
      var id = vocab.get(sub);
      if(id !== undefined){ curSub=sub; curId=id; break; }
      end--;
    }
    if(curSub === null){ return [unkId]; }
    subTokens.push(curId);
    start = end;
  }
  return subTokens;
}
function encode(text, vocab, maxLen){
  maxLen = maxLen || 128;
  var CLS=101, SEP=102, PAD=0, UNK=100;
  var words = basicTokenize(text);
  var ids=[CLS];
  for(var w=0; w<words.length; w++){
    var sub = wordpiece(words[w], vocab, UNK);
    if(ids.length + sub.length + 1 > maxLen) break; // leave room for SEP
    for(var s=0;s<sub.length;s++) ids.push(sub[s]);
  }
  ids.push(SEP);
  var inputIds = new Array(maxLen).fill(PAD);
  var attnMask = new Array(maxLen).fill(0);
  var tokenType = new Array(maxLen).fill(0);
  for(var i=0;i<ids.length && i<maxLen;i++){ inputIds[i]=ids[i]; attnMask[i]=1; }
  return {inputIds:inputIds, attnMask:attnMask, tokenType:tokenType, len:ids.length};
}
window.BertTokenizer = { loadVocab:loadVocab, encode:encode };
})();
