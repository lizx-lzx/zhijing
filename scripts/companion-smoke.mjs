import assert from 'node:assert/strict';
import { answerCompanion } from '../server/companion.mjs';
const source={title:'陪读测试',blocks:[{id:'p1',text:'小林把一项大任务拆成三个小步骤，每次只完成一个步骤，因此更容易开始。这个例子说明，降低开始时的负担，有助于行动。'}]};
const result={chapters:[{id:'c1',body:'把大任务拆小，可以减少开始时的负担。'}]};
const answer=await answerCompanion(source,result,{question:'讲简单点，并引用一句原文。',chapterId:'c1',paragraphIndex:0},[]);
assert.ok(answer.answer.length>10);
assert.ok(answer.citations.length>0);
console.log(JSON.stringify(answer));
