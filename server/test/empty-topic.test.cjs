const {test}=require('node:test');
const assert=require('node:assert/strict');
const TreeManager=require('../core/managers/ConversationTreeManager');

test('fresh and missing topics have no current branch',()=>{
 const topic={conversationTree:null,currentNode:null};
 const tree=new TreeManager({getTopic:id=>id==='new'?topic:null});
 assert.equal(tree.getCurrentBranch('new'),null);
 assert.equal(tree.getCurrentBranch('missing'),null);
 assert.deepEqual(tree.getConversationMessages('new'),[]);
 topic.conversationTree={id:'root',children:[]};
 assert.equal(tree.getCurrentBranch('new'),'root');
});
