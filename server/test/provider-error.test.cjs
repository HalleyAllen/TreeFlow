const {test}=require('node:test');
const assert=require('node:assert/strict');
const {TreeFlowAgent}=require('../core/agent/TreeFlowAgent');
const TopicManager=require('../core/managers/TopicManager');
const TreeManager=require('../core/managers/ConversationTreeManager');
const logger=require('../core/utils/logger');
for(const level of ['info','warn','error'])logger[level]=()=>{};
function fixture(){
 const topicManager=new TopicManager('unused');topicManager.saveTopics=()=>{};
 const agent=Object.create(TreeFlowAgent.prototype);
 Object.assign(agent,{topicManager,conversationTreeManager:new TreeManager(topicManager),configManager:{getCurrentTopic:()=> 'default',getCurrentModel:()=> 'mock',getOllamaBaseUrl:()=> ''},skillManager:{executeSkill:()=>({})},apiManager:{ask:async()=>{throw new Error('Provider unavailable');},askStream:async()=>{throw new Error('Provider unavailable');}}});
 return agent;
}
for(const method of ['ask','askStream'])test(`${method} preserves provider error details for the UI`,async()=>{
 const agent=fixture();await assert.rejects(agent[method]('question'),/Provider unavailable/);
 const node=agent.topicManager.getTopic('default').currentNode;
 assert.equal(node.status,'error');assert.equal(node.error,'Provider unavailable');
});
