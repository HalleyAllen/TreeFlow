const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function createChatHarness(chatApi,treeApi={saveActiveEndNodeId:async()=>({success:true})}){
 const slots=[],effects=[];let cursor=0;
 const useState=initial=>{const index=cursor++;if(!(index in slots))slots[index]=initial;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];};
 const useRef=initial=>{const index=cursor++;return slots[index] || (slots[index]={current:initial});};
 const useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous || deps.some((v,i)=>v!==previous.deps[i]))effects.push(()=>{previous?.cleanup?.();slots[index]={deps,cleanup:effect()};});};
 const source=fs.readFileSync(path.join(__dirname,'../../src/hooks/useChat.js'),'utf8')
  .replace(/^import .*;\r?\n/gm,'').replace('export const useChat','const useChat');
 const context={useState,useRef,useEffect,useCallback:fn=>fn,chatApi,treeApi,logger:{info:()=>{},error:()=>{}},AbortController,Date,setTimeout:()=>0};
 vm.runInNewContext(source+'\nthis.useChat = useChat;',context);
 return {render(topicId){cursor=0;const value=context.useChat(topicId);for(const effect of effects.splice(0))effect();return value;}};
}
module.exports={createChatHarness};
