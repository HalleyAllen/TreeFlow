const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const TopicManager=require('../core/managers/TopicManager');
const TreeManager=require('../core/managers/ConversationTreeManager');
const TopicController=require('../server/controllers/topic.controller');
const logger=require('../core/utils/logger');
for(const level of ['info','warn','error'])logger[level]=()=>{};

test('unnamed topic uses only its first question as the persisted title',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'treeflow-title-'));
 try{
  const manager=new TopicManager(path.join(directory,'topics.json'));
  const tree=new TreeManager(manager);
  const {topic}=manager.createTopic(undefined,true);
  assert.equal(topic.autoNameFromFirstQuestion,true);
  tree.addConversationNode(topic.id,'  First question\nwith details  ','',{status:'loading'});
  assert.equal(topic.name,'First question\nwith details');
  assert.equal(topic.autoNameFromFirstQuestion,false);
  tree.addConversationNode(topic.id,'Second question','Second answer');
  assert.equal(topic.name,'First question\nwith details');
  const reloaded=new TopicManager(manager.topicsFile);reloaded.loadTopics();
  assert.equal(reloaded.getTopic(topic.id).name,'First question\nwith details');
 }finally{assert.equal(path.dirname(directory),os.tmpdir());fs.rmSync(directory,{recursive:true,force:true});}
});
test('existing and explicitly named topics retain their names',()=>{
 const manager=new TopicManager('unused');manager.saveTopics=()=>{};
 const tree=new TreeManager(manager);
 const {topic}=manager.createTopic('Existing title',true);
 tree.addConversationNode(topic.id,'A question','An answer');
 assert.equal(topic.name,'Existing title');
 const original=manager.getTopic('default').name;
 tree.addConversationNode('default','Default question','An answer');
 assert.equal(manager.getTopic('default').name,original);
});
test('topic creation selects the new topic and provides its ID without a name input',()=>{
 const manager=new TopicManager('unused');manager.saveTopics=()=>{};
 let selected='default',response;
 const services={topicManager:manager,conversationTreeManager:new TreeManager(manager),configManager:{setCurrentTopic:id=>{selected=id;},getCurrentTopic:()=>selected}};
 const controller=new TopicController({get:name=>services[name]});
 controller.createTopic({body:{}},{success:data=>{response=data;},error:error=>{throw new Error(error);}});
 assert.equal(selected,response.topicId);
 assert.equal(manager.getTopic(selected).autoNameFromFirstQuestion,true);
 controller.getCurrentTopic({}, {success:data=>{response=data;}});
 assert.equal(response.currentTopic.id,selected);
 assert.equal(response.currentTopic.autoNameFromFirstQuestion,true);
});
