const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const TopicManager=require('../core/managers/TopicManager');
const TreeManager=require('../core/managers/ConversationTreeManager');
const logger=require('../core/utils/logger');
for(const level of ['info','warn','error'])logger[level]=()=>{};

test('deleted descendants are removed from pointers, positions and reloads',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'treeflow-delete-'));
 try{
  const manager=new TopicManager(path.join(dir,'topics.json'));
  const tree=new TreeManager(manager);
  const leaf={id:'leaf',parentId:'middle',message:'leaf',response:'answer',children:[]};
  const middle={id:'middle',parentId:'root',children:[leaf]};
  const root={id:'root',parentId:null,children:[middle]};
  const topic=manager.getTopic('default');
  Object.assign(topic,{conversationTree:root,currentNode:leaf,activeEndNodeId:'leaf',nodePositions:{middle:{x:0,y:0},leaf:{x:0,y:220},root:{x:0,y:0}}});
  assert.equal(tree.deleteNode('default','middle'),true);
  assert.equal(topic.currentNode,root);
  assert.equal(topic.activeEndNodeId,null);
  assert.deepEqual(Object.keys(topic.nodePositions),['root']);
  const reloaded=new TopicManager(manager.topicsFile);reloaded.loadTopics();
  assert.equal(tree.findNodeById(reloaded.getTopic('default').conversationTree,'leaf'),null);
  assert.equal(reloaded.getTopic('default').currentNode.id,'root');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
