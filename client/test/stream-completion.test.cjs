const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function apiFor(text){
 const bytes=new TextEncoder().encode(text);
 const response=new Response(new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}}));
 const source=fs.readFileSync(path.join(__dirname,'../src/services/api/chat.api.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
 const context={fetch:async()=>response,TextDecoder,logger:{error:()=>{}}};
 vm.runInNewContext(source+'\nthis.sendMessageStream=sendMessageStream;',context);
 return context.sendMessageStream;
}
test('fragmented UTF-8 and CRLF SSE events preserve a valid terminal result',async()=>{
 const api=apiFor('event: node\r\ndata: {"nodeId":"node"}\r\n\r\nevent: delta\r\ndata: {"content":"你好"}\r\n\r\nevent: done\r\ndata: {"nodeId":"node","response":"你好"}\r\n\r\n');
 const progress=[];
 const result=await api('question',null,null,null,null,null,[],{onDelta:data=>progress.push(data.content)});
 assert.equal(result.nodeId,'node');assert.equal(result.response,'你好');assert.deepEqual(progress,['你好']);
});
test('EOF without a done event reports interruption',async()=>{
 const result=await apiFor('event: node\ndata: {"nodeId":"node"}\n\n')('question');
 assert.match(result.error,/interrupted/);
});
test('malformed terminal results are not successful conversations',async()=>{
 const result=await apiFor('event: done\ndata: {"response":"answer"}\n\n')('question');
 assert.match(result.error,/interrupted/);
});
test('provider error events retain their actual failure reason',async()=>{
 const result=await apiFor('event: error\ndata: {"error":"Provider unavailable"}\n\n')('question');
 assert.equal(result.error,'Provider unavailable');
});
