const {test}=require('node:test');
const assert=require('node:assert/strict');
const TreeManager=require('../core/managers/ConversationTreeManager');

test('a branch containing the current descendant is marked active',()=>{
 const current={id:'current',children:[]};
 const active={id:'active',children:[current]};
 const other={id:'other',children:[]};
 const root={id:'root',children:[active,other]};
 const topic={conversationTree:root,currentNode:current};
 const tree=new TreeManager({getTopic:()=>topic});
 const branches=tree.getNodeBranches('topic','root');
 assert.equal(branches.find(n=>n.id==='active').isCurrentBranch,true);
 assert.equal(branches.find(n=>n.id==='other').isCurrentBranch,false);
 topic.currentNode=null;
 assert.ok(tree.getNodeBranches('topic','root').every(n=>n.isCurrentBranch===false));
});
