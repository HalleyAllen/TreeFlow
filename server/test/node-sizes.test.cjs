const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const TopicManager=require('../core/managers/TopicManager');
const TreeManager=require('../core/managers/ConversationTreeManager');
const logger=require('../core/utils/logger');
for(const level of ['info','warn','error'])logger[level]=()=>{};
function fixture(file='unused'){
 const manager=new TopicManager(file);
 if(file==='unused')manager.saveTopics=()=>{};
 const tree=new TreeManager(manager);
 const root=tree.addConversationNode('default','root','answer');
 const child=tree.addConversationNode('default','child','answer');
 const leaf=tree.addConversationNode('default','leaf','answer');
 return {manager,tree,root,child,leaf};
}
test('node sizes persist by topic and work for legacy topics without size records',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'treeflow-sizes-'));
 try{
  const {manager,root}=fixture(path.join(directory,'topics.json'));
  delete manager.getTopic('default').nodeSizes;
  assert.deepEqual(manager.getNodeSizes('default'),{});
  const {topic}=manager.createTopic('Other topic',true);
  assert.equal(manager.saveNodeSizes('default',{[root.id]:{width:480.4,height:360.2}}),true);
  assert.deepEqual(manager.getNodeSizes(topic.id),{});
  const reloaded=new TopicManager(manager.topicsFile);reloaded.loadTopics();
  assert.deepEqual(reloaded.getNodeSizes('default')[root.id],{width:480,height:360});
 }finally{assert.equal(path.dirname(directory),os.tmpdir());fs.rmSync(directory,{recursive:true,force:true});}
});
test('invalid size batches and absent nodes are rejected without changing saved sizes',()=>{
 const {manager,root,child}=fixture();
 const original={width:400,height:320};
 manager.saveNodeSizes('default',{[root.id]:original});
 for(const bad of [{width:0,height:300},{width:Infinity,height:300},{width:400,height:10},{width:'400',height:300},{width:1300,height:300}]){
  assert.equal(manager.saveNodeSizes('default',{[child.id]:{width:300,height:300},[root.id]:bad}),false);
  assert.deepEqual(manager.getNodeSizes('default'),{[root.id]:original});
 }
 assert.equal(manager.saveNodeSizes('default',{absent:{width:400,height:320}}),false);
 assert.equal(manager.saveNodeSizes('missing',{[root.id]:original}),false);
});
test('deleting descendants removes their size records and keeps surviving sizes',()=>{
 const {manager,tree,root,child,leaf}=fixture();
 for(const node of [root,child,leaf])manager.saveNodeSizes('default',{[node.id]:{width:400,height:320}});
 tree.clearNodeChildren('default',child.id);
 assert.equal(manager.getNodeSizes('default')[leaf.id],undefined);
 assert.ok(manager.getNodeSizes('default')[root.id]);
 tree.deleteNode('default',child.id);
 assert.deepEqual(Object.keys(manager.getNodeSizes('default')),[root.id]);
});
test('failed persistence does not report saved sizes or replace previous records',()=>{
 const {manager,root}=fixture();
 manager.saveNodeSizes('default',{[root.id]:{width:400,height:320}});
 manager.saveTopics=()=>false;
 assert.equal(manager.saveNodeSizes('default',{[root.id]:{width:500,height:450}}),false);
 assert.deepEqual(manager.getNodeSizes('default')[root.id],{width:400,height:320});
});
