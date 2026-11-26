"use strict";
// Internal round keys and scopes remain in memory; emitted values are fixed event names.
function createObserver(){return {key:null,scope:null,setup:false,started:false,completed:false,pending:null,replayKey:null};}
function observe(s,{key,scope,phase,drill}){
  if(drill||!scope||!key||phase==="home"){
    Object.assign(s,createObserver());return [];
  }
  if(key!==s.key){
    const replay=phase==="setup"&&s.pending?.scope===scope&&s.pending?.key!==key;
    s.key=key;s.scope=scope;s.setup=false;s.started=false;s.completed=false;s.replayKey=replay?key:null;s.pending=null;
  }
  if(phase==="setup"){s.setup=true;return [];}
  if(phase==="play"&&s.setup&&!s.started){
    s.started=true;return s.replayKey===key?["first_started","rematch_started"]:["first_started"];
  }
  if(phase==="over"&&s.started&&!s.completed){s.completed=true;return ["first_completed"];}
  return [];
}
function requestRematch(s,key,scope){if(s.key===key&&s.scope===scope&&s.completed)s.pending={key,scope};}
module.exports={createObserver,observe,requestRematch};
