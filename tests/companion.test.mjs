import test from "node:test";
import assert from "node:assert/strict";
import { answerCompanion } from "../server/companion.mjs";
const source = { blocks: [{ id: "p1", text: "这是作者的具体原话。" }] };
const result = { chapters: [{ id: "c1", body: "第一段\n第二段" }] };
test("companion scopes paragraph and only accepts literal source citations", async () => {
  const response = await answerCompanion(
    source,
    result,
    { question: "换个例子", chapterId: "c1", paragraphIndex: 1 },
    [],
    async (system, input) => {
      assert.equal(input.selectedParagraph, "第二段");
      assert.match(system, /虚构例子/);
      return {
        answer: "虚构例子：想象一下…",
        citations: [
          { id: "p1", quote: "作者的具体原话" },
          { id: "p1", quote: "不存在的引用" },
          { id: "evil", quote: "作者的具体原话" },
        ],
      };
    },
  );
  assert.equal(response.citations.length, 1);
});
test("invalid input never reaches provider", async () => {
  for (const input of [
    { question: "" },
    { question: "a", chapterId: "missing" },
    { question: "a", chapterId: "c1", paragraphIndex: 99 },
  ])
    await assert.rejects(
      answerCompanion(source, result, input, [], () => {
        throw Error("provider should not run");
      }),
      (e) =>
        e.status === 400 ||
        e.message.includes("不存在") ||
        e.message.includes("2000"),
    );
});
