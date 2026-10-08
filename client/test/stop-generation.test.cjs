const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createChatHarness}=require('./helpers/chat-harness.cjs');

test('stopping keeps the user question and continues from the partially answered node',async()=>{
 const parents=[],saved=[];
 let count=0;
 const harness=createChatHarness({sendMessageStream:async(question,parent,...args)=>{
  parents.push(parent);const options=args.at(-1);
  if(++count===1){options.onNode({nodeId:'partial'});options.onDelta({content:'Partial reply'});return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const error=new Error('Stopped');error.name='AbortError';reject(error);},{once:true}));}
  return {nodeId:'next',response:'Next reply'};
 }},{saveActiveEndNodeId:async(topic,id)=>{saved.push([topic,id]);return {success:true};}});
 harness.render('topic');let chat=harness.render('topic');chat.setActiveEndNodeId('previous');chat=harness.render('topic');
 const sending=chat.sendMessage('Original question');chat=harness.render('topic');chat.stopStreaming();await sending;
 chat=harness.render('topic');
 assert.equal(chat.messages.at(-2).content,'Original question');
 assert.equal(chat.messages.at(-1).content,'Partial reply');
 assert.equal(chat.activeEndNodeId,'partial');
 await chat.sendMessage('Continue');
 assert.deepEqual(parents,['previous','partial']);
 assert.deepEqual(saved,[['topic','partial'],['topic','next']]);
});
