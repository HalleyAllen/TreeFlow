const {test}=require('node:test');
const assert=require('node:assert/strict');
const {TreeFlowAgent}=require('../core/agent/TreeFlowAgent');
const TreeManager=require('../core/managers/ConversationTreeManager');
const logger=require('../core/utils/logger');
for(const level of ['info','warn','error'])logger[level]=()=>{};
function fixture(){
 const topics={a:{id:'a',conversationTree:{id:'a0',message:'a',response:'a answer',children:[]}},b:{id:'b',conversationTree:{id:'b0',message:'b',response:'b answer',children:[]}}};
 for(const topic of Object.values(topics))topic.currentNode=topic.conversationTree;
 const topicManager={getTopic:id=>topics[id],saveTopics:()=>{}};
 const agent=Object.create(TreeFlowAgent.prototype);
 Object.assign(agent,{topicManager,conversationTreeManager:new TreeManager(topicManager),configManager:{getCurrentTopic:()=> 'b',getCurrentModel:()=> 'mock',getOllamaBaseUrl:()=> ''},skillManager:{executeSkill:()=>({})},apiManager:{ask:async()=> 'reply',askStream:async()=> 'reply'}});
 return {topics,agent};
}
test('explicit topic determines insertion and completion despite a different global selection',async()=>{
 const {topics,agent}=fixture();
 const result=await agent.askStream('new question','a0',null,null,null,null,[],{topicId:'a'});
 assert.equal(topics.a.currentNode.id,result.nodeId);
 assert.equal(topics.a.currentNode.response,'reply');
 assert.equal(topics.b.currentNode.id,'b0');
});
test('invalid cross-topic parents and references are rejected before creating a node',()=>{
 const {topics,agent}=fixture();
 assert.throws(()=>agent._prepareAsk('question','a0',null,null,null,[],'b'),/Parent node/);
 assert.throws(()=>agent._prepareAsk('question','b0',null,null,'quote',['a0'],'b'),/Quoted node/);
 assert.equal(topics.b.conversationTree.children.length,0);
});
