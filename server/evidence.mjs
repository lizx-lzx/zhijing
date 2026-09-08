// Give the model selectable literal excerpts. It chooses evidence; it does not
// transcribe or rewrite the user's original text into an alleged quotation.
export function sourceExcerpts(source) {
  return source.blocks.flatMap((block) => {
    const quotes = [];
    let pending = "";
    for (const sentence of block.text.split(/(?<=[。！？])/u)) {
      if (pending.length + sentence.length > 220 && pending.length >= 12) {
        quotes.push(pending);
        pending = "";
      }
      pending += sentence;
      while (pending.length > 280) {
        quotes.push(pending.slice(0, 220));
        pending = pending.slice(220);
      }
    }
    if (pending.length >= 12) quotes.push(pending);
    else if (pending && quotes.length) quotes[quotes.length - 1] += pending;
    return quotes.map((quote, index) => ({
      id: `${block.id}:e${index + 1}`,
      sourceId: block.id,
      quote,
    }));
  });
}
