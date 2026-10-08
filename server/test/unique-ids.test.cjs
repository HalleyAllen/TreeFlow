const {test}=require('node:test');
const assert=require('node:assert/strict');
const TopicManager=require('../core/managers/TopicManager');
const TreeManager=require('../core/managers/ConversationTreeManager');
const logger=require('../core/utils/logger');
for(const level of ['info','warn','error'])logger[level]=()=>{};

test('same-millisecond operations retain distinct topics and conversation nodes',()=>{
 const manager=new TopicManager('unused');manager.saveTopics=()=>{};
 const tree=new TreeManager(manager),original=Date.now;
 try{
  Date.now=()=>123456;
  manager.createTopic('one');manager.createTopic('two');
  assert.equal(manager.getTopics().length,3);
  const root=tree.addConversationNode('default','root','answer');
  const first=tree.addConversationNode('default','first','answer');
  const second=tree.addConversationNode('default','second','answer');
  assert.equal(new Set([root.id,first.id,second.id]).size,3);
  assert.notEqual(second.id,second.parentId);
  assert.deepEqual(tree.getConversationHistory('default').map(n=>n.content),['root','answer','first','answer','second','answer']);
  tree.createBranchFromNode('default',root.id);tree.createBranchFromNode('default',root.id);
  const branches=root.children.map(n=>n.id);assert.equal(new Set(branches).size,branches.length);
 }finally{Date.now=original;}
});
