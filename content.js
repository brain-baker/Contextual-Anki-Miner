/* ============================================================
   content.js — CAD v4.6
   Added: Pixabay image picker in bubble
   ============================================================ */
(function(){
"use strict";
if(window.__cadV45)return;window.__cadV45=true;

var PREDEF={
  stone:{bg:"#252525",border:"#383838",fg:"#e8e4e0",fgDim:"#9a9590",fgMuted:"#6a6560",accent:"#c9a87c",btnBg:"#c9a87c",btnFg:"#1a1a1a",ok:"#5a9e5a",err:"#c45454"},
  minimal:{bg:"#ffffff",border:"#dcdcdc",fg:"#1a1a1a",fgDim:"#555",fgMuted:"#999",accent:"#333",btnBg:"#333",btnFg:"#fff",ok:"#2d8a2d",err:"#c44040"},
  nord:{bg:"#3b4252",border:"#434c5e",fg:"#eceff4",fgDim:"#8a95aa",fgMuted:"#5d6880",accent:"#88c0d0",btnBg:"#88c0d0",btnFg:"#2e3440",ok:"#a3be8c",err:"#bf616a"},
  rose:{bg:"#261a22",border:"#3d2b35",fg:"#f0e6ec",fgDim:"#a0808f",fgMuted:"#6a4a5a",accent:"#e879a8",btnBg:"#e879a8",btnFg:"#1a1118",ok:"#7ab87a",err:"#c45454"},
  forest:{bg:"#1a2a1e",border:"#2a3d2e",fg:"#d4e8d9",fgDim:"#78a882",fgMuted:"#4a6a52",accent:"#6dca9a",btnBg:"#6dca9a",btnFg:"#111a14",ok:"#5aaa6a",err:"#c45454"}
};
var customs=[];
var cfg={theme:"stone",kb:{ctrl:false,shift:true,alt:false,meta:false,key:""},numEx:2,fPron:true,fPos:true,fEx:true,fCtx:true,fAud:true};

function T(){
  if(PREDEF[cfg.theme])return PREDEF[cfg.theme];
  for(var i=0;i<customs.length;i++){
    if(customs[i].id===cfg.theme)return{
      bg:customs[i].cardBg,border:customs[i].border,fg:customs[i].fg,fgDim:customs[i].fgDim,fgMuted:customs[i].fgMuted,
      accent:customs[i].accent,btnBg:customs[i].accent,btnFg:customs[i].pageBg,ok:"#5a9e5a",err:"#c45454"
    };
  }
  return PREDEF.stone;
}

function loadCfg(){
  chrome.storage.local.get(["theme","customThemes","keybind","numExamples","fieldPronunciation","fieldPartOfSpeech","fieldExamples","fieldContext","fieldAudio"],function(s){
    if(s.theme)cfg.theme=s.theme;
    if(s.customThemes)customs=s.customThemes;
    if(s.keybind){try{cfg.kb=typeof s.keybind==="string"?JSON.parse(s.keybind):s.keybind;}catch(_){}}
    if(s.numExamples!==undefined)cfg.numEx=parseInt(s.numExamples,10)||2;
    if(s.fieldPronunciation!==undefined)cfg.fPron=s.fieldPronunciation;
    if(s.fieldPartOfSpeech!==undefined)cfg.fPos=s.fieldPartOfSpeech;
    if(s.fieldExamples!==undefined)cfg.fEx=s.fieldExamples;
    if(s.fieldContext!==undefined)cfg.fCtx=s.fieldContext;
    if(s.fieldAudio!==undefined)cfg.fAud=s.fieldAudio;
  });
}
loadCfg();

chrome.storage.onChanged.addListener(function(c){
  if(c.theme)cfg.theme=c.theme.newValue;
  if(c.customThemes)customs=c.customThemes.newValue||[];
  if(c.keybind){try{cfg.kb=typeof c.keybind.newValue==="string"?JSON.parse(c.keybind.newValue):c.keybind.newValue;}catch(_){}}
  if(c.numExamples)cfg.numEx=parseInt(c.numExamples.newValue,10)||2;
  if(c.fieldPronunciation!==undefined)cfg.fPron=c.fieldPronunciation.newValue;
  if(c.fieldPartOfSpeech!==undefined)cfg.fPos=c.fieldPartOfSpeech.newValue;
  if(c.fieldExamples!==undefined)cfg.fEx=c.fieldExamples.newValue;
  if(c.fieldContext!==undefined)cfg.fCtx=c.fieldContext.newValue;
  if(c.fieldAudio!==undefined)cfg.fAud=c.fieldAudio.newValue;
});

/* ---------- SHADOW DOM HOST ---------- */
var shadow=null;
var shadowRoot=null;

function ensureShadowHost(){
  if(shadow&&shadow.isConnected&&shadowRoot)return shadowRoot;
  if(shadow)shadow.remove();
  shadow=document.createElement("div");
  shadow.id="cad-shadow-host";
  shadow.style.cssText="position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(shadow);
  shadowRoot=shadow.attachShadow({mode:"open"});
  var style=document.createElement("style");
  style.textContent=
    "@keyframes cadFadeIn{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}"+
    "@keyframes cadSpin{to{transform:rotate(360deg);}}"+
    "*{box-sizing:border-box;margin:0;padding:0;}"+
    "button{font-family:inherit;}";
  shadowRoot.appendChild(style);
  return shadowRoot;
}

/* ---------- WORD DETECTION ---------- */
var mx=0,my=0;
document.addEventListener("mousemove",function(e){mx=e.clientX;my=e.clientY;});

function wordAt(x,y){
  var rng=null;
  if(document.caretRangeFromPoint)rng=document.caretRangeFromPoint(x,y);
  else if(document.caretPositionFromPoint){var p=document.caretPositionFromPoint(x,y);if(p&&p.offsetNode){rng=document.createRange();rng.setStart(p.offsetNode,p.offset);rng.collapse(true);}}
  if(!rng)return null;
  var nd=rng.startContainer,off=rng.startOffset;
  if(nd.nodeType!==3)return null;
  var txt=nd.textContent;if(!txt||off>=txt.length)return null;
  var wc=/[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF'-]/;
  var s=off,e=off;
  while(s>0&&wc.test(txt[s-1]))s--;
  while(e<txt.length&&wc.test(txt[e]))e++;
  var w=txt.substring(s,e).trim();
  return w?{word:w,sentence:getSent(nd.parentElement,w)}:null;
}

function selInfo(){
  var sel=window.getSelection();if(!sel||!sel.rangeCount)return null;
  var w=sel.toString().trim();if(!w||w.length>60)return null;
  var nd=sel.anchorNode;var elem=nd?(nd.nodeType===3?nd.parentElement:nd):null;
  return{word:w,sentence:getSent(elem,w)};
}

function getSent(elem,w){
  if(!elem)return w;var full=elem.innerText||elem.textContent||"";
  var parts=full.split(/(?<=[.!?。！？])\s+/);
  for(var i=0;i<parts.length;i++){if(parts[i].indexOf(w)!==-1)return parts[i].trim();}
  var idx=full.indexOf(w);if(idx!==-1)return full.substring(Math.max(0,idx-80),Math.min(full.length,idx+w.length+80)).trim();
  return w;
}

function selCoords(){
  var sel=window.getSelection();if(!sel||!sel.rangeCount)return{x:200,y:200};
  var r=sel.getRangeAt(0).getBoundingClientRect();
  return{x:r.left+window.scrollX+r.width/2,y:r.bottom+window.scrollY+10};
}

/* ---------- KEYBIND ---------- */
var lastTrigger=0;
var currentBubbleWord=null;

document.addEventListener("keydown",function(e){
  if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.isContentEditable)return;

  var kb=cfg.kb;
  if(kb.ctrl&&!e.ctrlKey)return;
  if(kb.shift&&!e.shiftKey)return;
  if(kb.alt&&!e.altKey)return;
  if(kb.meta&&!e.metaKey)return;
  if(!kb.ctrl&&!kb.shift&&!kb.alt&&!kb.meta&&!kb.key)return;
  if(kb.key){if(e.key.toLowerCase()!==kb.key.toLowerCase())return;}
  else{if(!["Shift","Control","Alt","Meta"].includes(e.key))return;}
  e.preventDefault();

  var now=Date.now();
  if(now-lastTrigger<800)return;
  lastTrigger=now;

  var word=null,sentence=null,px,py;
  var sel=window.getSelection(),st=sel?sel.toString().trim():"";
  if(st&&st.length>0&&st.length<60){
    var info=selInfo();
    if(info){word=info.word;sentence=info.sentence;var co=selCoords();px=co.x-180;py=co.y;}
  }
  if(!word){
    var r=wordAt(mx,my);
    if(r){word=r.word;sentence=r.sentence;px=mx+window.scrollX-180;py=my+window.scrollY+14;}
  }
  if(!word||word.length<1||word.length>60)return;
  if(bub&&currentBubbleWord&&currentBubbleWord.toLowerCase()===word.toLowerCase())return;
  go(word,sentence,px,py);
});

/* ---------- BUBBLE ---------- */
var bub=null;
var bubCreatedAt=0;
var selectedImageUrl=null;

function kill(){
  if(bub){bub.remove();bub=null;}
  currentBubbleWord=null;
  selectedImageUrl=null;
}

function he(s){return(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

function make(x,y){
  kill();
  var c=T();
  var root=ensureShadowHost();

  bub=document.createElement("div");
  bub.style.cssText="position:absolute;z-index:2147483647;width:370px;max-width:92vw;border-radius:14px;padding:20px 22px;box-sizing:border-box;animation:cadFadeIn .18s ease-out;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;pointer-events:auto;background:"+c.bg+";color:"+c.fg+";border:1px solid "+c.border+";box-shadow:0 6px 28px rgba(0,0,0,.35);";
  bub.innerHTML='<div style="display:flex;align-items:center;gap:10px;justify-content:center;padding:10px 0;"><div style="width:18px;height:18px;border:2.5px solid '+c.border+';border-top-color:'+c.accent+';border-radius:50%;animation:cadSpin .6s linear infinite;"></div><span style="color:'+c.fgDim+';font-size:13px;">Looking up…</span></div>';

  root.appendChild(bub);
  bubCreatedAt=Date.now();

  bub.style.left=Math.max(8,x)+"px";
  bub.style.top=Math.max(8,y)+"px";

  requestAnimationFrame(function(){
    if(!bub)return;
    var r=bub.getBoundingClientRect();
    if(r.right>window.innerWidth-10)bub.style.left=Math.max(8,window.innerWidth-r.width-10+window.scrollX)+"px";
    if(r.left<8)bub.style.left=(8+window.scrollX)+"px";
    if(r.bottom>window.innerHeight-10)bub.style.top=Math.max(8,y-r.height-24)+"px";
  });
}

function showErr(m){
  if(!bub)return;
  var c=T();
  bub.innerHTML='<div style="padding:4px 0;"><div style="color:'+c.err+';font-size:13px;line-height:1.6;word-break:break-word;margin-bottom:10px;">'+he(m)+'</div><button style="padding:6px 14px;border-radius:8px;background:rgba(128,128,128,.15);border:1px solid '+c.border+';color:'+c.fg+';cursor:pointer;font-size:12px;">Close</button></div>';
  bub.querySelector("button").addEventListener("click",function(e){e.stopPropagation();kill();});
}

function showRes(data,word,sentence){
  if(!bub)return;
  var c=T();
  var def=data.definition||"",pos=data.partOfSpeech||"",orig=data.originalForm||word,ipa=data.pronunciation||"",exs=data.examples||[],tts=data.ttsUrl||"";
  var others=data.otherMeanings||[];
  var images=data.images||[];

  selectedImageUrl=null;

  var h='';

  h+='<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid '+c.border+';">';
  h+='<div style="display:flex;align-items:center;gap:6px;">';
  h+='<span style="font-size:22px;font-weight:700;color:'+c.accent+';">'+he(orig)+'</span>';
  if(cfg.fAud&&tts)h+='<button data-role="play" data-u="'+he(tts)+'" style="background:none;border:none;cursor:pointer;padding:3px;color:'+c.fgMuted+';display:inline-flex;align-items:center;border-radius:4px;" title="Play"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>';
  h+='</div>';
  if(orig.toLowerCase()!==word.toLowerCase())h+='<div style="font-size:11px;color:'+c.fgMuted+';font-style:italic;">from "'+he(word)+'"</div>';
  if(cfg.fPron&&ipa)h+='<div style="font-size:13px;color:'+c.fgDim+';margin-top:2px;">'+he(ipa)+'</div>';
  if(cfg.fPos&&pos)h+='<div style="display:inline-block;font-size:10px;font-weight:700;color:'+c.accent+';background:rgba(128,128,128,.08);border:1px solid '+c.border+';padding:2px 8px;border-radius:5px;text-transform:uppercase;letter-spacing:.5px;margin-top:5px;">'+he(pos)+'</div>';
  h+='</div>';

  h+='<div style="font-size:15px;line-height:1.6;margin-bottom:10px;">'+he(def)+'</div>';

  if(others.length>0){
    h+='<div style="margin-top:8px;padding-top:8px;border-top:1px dashed '+c.border+';margin-bottom:10px;">';
    h+='<div style="font-size:10px;font-weight:700;color:'+c.fgMuted+';text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Other meanings</div>';
    for(var m=0;m<others.length;m++)h+='<div style="font-size:13px;color:'+c.fgDim+';line-height:1.5;margin-bottom:3px;">'+(m+1)+'. '+he(others[m])+'</div>';
    h+='</div>';
  }

  if(cfg.fEx&&exs.length){
    h+='<div style="font-size:10px;font-weight:700;color:'+c.fgMuted+';text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Examples</div>';
    h+='<ul style="margin:0 0 8px;padding-left:16px;list-style:disc;">';
    for(var i=0;i<exs.length;i++){
      var ex=exs[i];
      if(typeof ex==='string'){
        h+='<li style="font-size:12px;color:'+c.fgDim+';line-height:1.6;margin-bottom:4px;">'+he(ex)+'</li>';
      }else{
        h+='<li style="font-size:12px;color:'+c.fgDim+';line-height:1.6;margin-bottom:4px;">'+he(ex.text||"");
        if(ex.translation)h+='<div style="font-size:11px;color:'+c.fgMuted+';margin-top:2px;">'+he(ex.translation)+'</div>';
        h+='</li>';
      }
    }
    h+='</ul>';
  }

  if(cfg.fCtx&&sentence){
    var rx=new RegExp("("+word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","gi");
    var hs=he(sentence).replace(rx,'<span style="color:'+c.accent+';font-weight:600;">$1</span>');
    h+='<div style="font-size:10px;font-weight:700;color:'+c.fgMuted+';text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;margin-top:10px;">Context</div>';
    h+='<div style="background:rgba(128,128,128,.08);border:1px solid '+c.border+';border-radius:8px;padding:10px 12px;font-size:12px;color:'+c.fgDim+';line-height:1.55;">'+hs+'</div>';
  }

  /* ---------- IMAGE PICKER ---------- */
  if(images.length>0){
    h+='<div style="margin-top:12px;">';
    h+='<div style="font-size:10px;font-weight:700;color:'+c.fgMuted+';text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Image <span style="font-weight:400;text-transform:none;letter-spacing:0;font-style:italic;">(click to attach)</span></div>';
    h+='<div data-role="img-strip" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin;">';
    for(var gi=0;gi<images.length;gi++){
      h+='<img data-role="img-pick" data-web="'+he(images[gi].web)+'" src="'+he(images[gi].thumb)+'" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:2px solid '+c.border+';cursor:pointer;flex-shrink:0;transition:border-color .15s,transform .15s;" />';
    }
    h+='</div>';
    h+='</div>';
  }

  h+='<div data-role="actions" style="display:flex;gap:6px;align-items:center;margin-top:14px;">';
  h+='<button data-role="add" style="flex:1;padding:8px 14px;border:none;border-radius:8px;background:'+c.btnBg+';color:'+c.btnFg+';font-weight:600;font-size:13px;cursor:pointer;">Add to Anki</button>';
  h+='<button data-role="close" style="width:30px;height:30px;border-radius:8px;background:rgba(128,128,128,.1);border:1px solid '+c.border+';color:'+c.fgMuted+';cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  h+='</div>';

  bub.innerHTML=h;

  bub.addEventListener("click",function(e){
    var t=e.target.closest("[data-role]");
    if(!t)return;
    e.stopPropagation();
    var role=t.getAttribute("data-role");

    if(role==="play"){
      try{new Audio(t.getAttribute("data-u")).play();}catch(_){}
    }

    if(role==="img-pick"){
      var webUrl=t.getAttribute("data-web");
      var allImgs=bub.querySelectorAll("[data-role=img-pick]");
      if(selectedImageUrl===webUrl){
        // deselect
        selectedImageUrl=null;
        t.style.borderColor=c.border;
        t.style.transform="scale(1)";
      }else{
        selectedImageUrl=webUrl;
        for(var ii=0;ii<allImgs.length;ii++){
          allImgs[ii].style.borderColor=c.border;
          allImgs[ii].style.transform="scale(1)";
        }
        t.style.borderColor=c.ok;
        t.style.transform="scale(1.08)";
      }
    }

    if(role==="close"){kill();}

    if(role==="view"){
      chrome.runtime.sendMessage({action:"browseCard",noteId:parseInt(t.getAttribute("data-nid"))});
    }

    if(role==="add"){
      t.disabled=true;t.textContent="Saving…";t.style.opacity="0.7";
      chrome.runtime.sendMessage({
        action:"addToAnki",
        payload:{word:word,sentence:sentence,definition:def,pronunciation:ipa,partOfSpeech:pos,originalForm:orig,examples:exs,ttsUrl:tts,otherMeanings:others,selectedImageUrl:selectedImageUrl}
      },function(resp){
        if(chrome.runtime.lastError){t.textContent="Error";t.style.opacity="1";t.disabled=false;return;}
        if(resp&&resp.ok){
          t.style.background=c.ok;t.style.color="#fff";t.style.opacity="1";t.textContent="✓ Saved";
          var vb=document.createElement("button");
          vb.setAttribute("data-role","view");
          vb.setAttribute("data-nid",resp.noteId);
          vb.textContent="View in Anki";
          vb.style.cssText="padding:8px 10px;border:1px solid "+c.border+";border-radius:8px;background:rgba(128,128,128,.1);color:"+c.fgDim+";font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;";
          var acts=bub.querySelector("[data-role=actions]");
          var closeBtn=bub.querySelector("[data-role=close]");
          if(acts&&closeBtn)acts.insertBefore(vb,closeBtn);
        }else{
          t.textContent="Failed";t.title=resp?resp.error:"";t.style.opacity="1";
          setTimeout(function(){t.textContent="Add to Anki";t.disabled=false;},3000);
        }
      });
    }
  });
}

function go(word,sentence,x,y){
  if(!word||word.length<1||word.length>60)return;
  make(x,y);
  currentBubbleWord=word;
  chrome.runtime.sendMessage({action:"lookup",word:word,sentence:sentence},function(r){
    if(!bub||currentBubbleWord===null)return;
    if(currentBubbleWord.toLowerCase()!==word.toLowerCase())return;
    if(chrome.runtime.lastError){showErr(chrome.runtime.lastError.message);return;}
    if(!r){showErr("No response from background script.");return;}
    if(r.error){showErr(r.error);return;}
    if(r.ok&&r.data)showRes(r.data,word,sentence);
    else showErr("Unexpected response.");
  });
}

/* ---------- DISMISS ---------- */
document.addEventListener("keydown",function(e){if(e.key==="Escape")kill();});
document.addEventListener("mousedown",function(e){
  if(Date.now()-bubCreatedAt<400)return;
  if(bub&&shadow&&!shadow.contains(e.target))kill();
});

})();