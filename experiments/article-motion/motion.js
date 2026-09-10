/* global gsap, Motion */
(async () => {
  const $ = (id) => document.getElementById(id);
  try {
    const response = await fetch("content.json");
    if (!response.ok) throw new Error("内容载入失败");
    const { chapters, timing } = await response.json();
    const capture = new URLSearchParams(location.search).has("capture");
    if (capture) document.body.classList.add("capture");
    const audio = $("audio");
    const groups = chapters.map((c, i) =>
      timing.segments.filter((s) => s.scene === i),
    );
    let current = -1,
      timeline;
    function fit() {
      $("stage").style.transform = `scale($('viewport').clientWidth / 1280)`;
    }
    new ResizeObserver(fit).observe($("viewport"));
    fit();
    function coords(c) {
      const n = c.nodes.length;
      if (c.layout === "cycle")
        return [
          [90, 235],
          [500, 220],
          [910, 235],
          [910, 425],
          [500, 440],
          [90, 425],
        ];
      if (c.layout === "contrast")
        return [
          [240, 305],
          [760, 305],
        ];
      if (c.layout === "layers")
        return [
          [140, 395],
          [500, 320],
          [860, 245],
        ];
      if (c.layout === "ladder")
        return [
          [120, 420],
          [500, 340],
          [880, 260],
        ];
      return c.nodes.map((_, i) => [
        120 + (i % 3) * 380,
        n > 3 ? 245 + Math.floor(i / 3) * 190 : 335,
      ]);
    }
    function makeScene(index) {
      current = index;
      timeline?.kill();
      const c = chapters[index],
        segments = groups[index],
        start = segments[0].start;
      const b = segments[1].start - start,
        d = segments[2].start - start;
      $("title").textContent = c.title;
      $("subtitle").textContent = c.subtitle;
      $("kind").textContent =
        `${String(index + 1).padStart(2, "0")} / 10 · ${c.kind}`;
      $("note").textContent = c.visualNote;
      $("nodes").replaceChildren();
      $("links").replaceChildren();
      const positions = coords(c),
        nodes = c.nodes.map((n, i) => {
          const el = document.createElement("div");
          el.className = `node${i === 1 ? " accent" : ""}`;
          el.style.left = `${positions[i][0]}px`;
          el.style.top = `${positions[i][1]}px`;
          const title = document.createElement("strong"),
            detail = document.createElement("small");
          title.textContent = n.title;
          detail.textContent = n.detail;
          el.append(title, detail);
          $("nodes").append(el);
          return el;
        });
      timeline = gsap.timeline({ paused: true });
      Motion.rise($("title"), { tl: timeline, at: 0, dur: 1, dy: 20 });
      Motion.rise($("subtitle"), { tl: timeline, at: 0.5, dur: 1 });
      const two = nodes.length === 6 && c.layout === "flow";
      const cues = nodes.map((_, i) =>
        two
          ? i < 3
            ? 1 + i * 3
            : b + (i - 3) * 3
          : c.layout === "contrast"
            ? 1 + i * b
            : 1 + i * Math.min(4, (d - 3) / nodes.length),
      );
      nodes.forEach((el, i) => {
        if (c.layout === "contrast") {
          gsap.set(el, { opacity: 0 });
          timeline.fromTo(
            el,
            { opacity: 0, x: i ? -240 : 240 },
            { opacity: 1, x: 0, duration: 2, ease: "power2.inOut" },
            cues[i],
          );
        } else
          Motion.flyIn(el, {
            tl: timeline,
            at: cues[i],
            dur: 1.3,
            from: c.layout === "ladder" ? "down" : "left",
            dist: 50,
          });
      });
      function edge(a, z, at, close = false) {
        const [x, y] = positions[a],
          [xx, yy] = positions[z];
        let path;
        if (close)
          path = `M ${x + 140} ${y} C ${x - 90} ${y - 75},${xx - 90} ${yy + 175},${xx + 140} ${yy + 118}`;
        else if (xx === x) path = `M ${x + 140} ${y + 118} L ${xx + 140} ${yy}`;
        else if (xx < x) path = `M ${x} ${y + 59} L ${xx + 280} ${yy + 59}`;
        else
          path = `M ${x + 280} ${y + 59} C ${x + 330} ${y + 59},${xx - 50} ${yy + 59},${xx} ${yy + 59}`;
        const p = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        p.setAttribute("d", path);
        $("links").append(p);
        Motion.drawPath(p, { tl: timeline, at, dur: 1.6 });
        // A travelling dot expresses direction without implying numerical magnitude.
        const dot = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        dot.setAttribute("r", "5");
        dot.setAttribute("fill", "#b3402a");
        $("links").append(dot);
        const state = { t: 0 };
        const point = () => {
          const q = p.getPointAtLength(p.getTotalLength() * state.t);
          dot.setAttribute("cx", q.x);
          dot.setAttribute("cy", q.y);
        };
        timeline.fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at);
        timeline.to(
          state,
          { t: 1, duration: 2.6, ease: "none", onUpdate: point },
          at,
        );
        timeline.to(dot, { opacity: 0, duration: 0.3 }, at + 2.6);
        point();
      }
      if (c.layout !== "contrast" && c.layout !== "layers")
        for (let i = 1; i < nodes.length; i++)
          if (!(two && i === 3)) edge(i - 1, i, cues[i] - 0.6);
      if (c.layout === "cycle") edge(5, 0, cues[5] + 2, true);
      if (c.layout === "contrast") {
        timeline.to(nodes[0], { y: -34, duration: 2, ease: "power2.inOut" }, b);
        timeline.to(nodes[1], { y: 34, duration: 2, ease: "power2.inOut" }, b);
      }
      // Focus follows the explanation; information remains on screen for reading.
      if (two) {
        timeline.to(nodes.slice(0, 3), { opacity: 0.4, duration: 1 }, b);
        timeline.to(nodes, { opacity: 1, duration: 1 }, d);
      } else if (nodes.length >= 3) {
        Motion.indicate(nodes[1], { tl: timeline, at: b, dur: 1.5, amp: 1.05 });
      }
      Motion.rise($("note"), { tl: timeline, at: d, dur: 1.2 });
      timeline.to({}, { duration: 1 }, segments[2].end - start);
      timeline.pause(0);
    }
    const pieces = timing.segments.flatMap((s) => {
      const parts = s.text.match(/[^，。！？；：]+[，。！？；：]?/g) || [
        s.text,
      ];
      let count = 0;
      return parts.map((text) => {
        const start = s.start + ((s.end - s.start) * count) / s.text.length;
        count += text.length;
        return {
          text,
          start,
          end: s.start + ((s.end - s.start) * count) / s.text.length,
        };
      });
    });
    function render(t) {
      t = Math.max(0, Math.min(timing.duration, t));
      const index = Math.max(
        0,
        groups.findIndex((s) => t >= s[0].start && t < s[2].end),
      );
      const selected = t === timing.duration ? 9 : index;
      if (selected !== current) makeScene(selected);
      timeline.seek(t - groups[selected][0].start, false);
      $("caption").textContent =
        pieces.find((s) => t >= s.start && t < s.end)?.text || "";
      $("progress").style.transform = `scaleX(${t / timing.duration})`;
      $("seek").value = t;
      $("time").textContent =
        `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} / 6:49`;
      $("chapters").value = selected;
    }
    window.renderAt = async (t) => {
      render(t);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    };
    groups.forEach((_, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = `${i + 1}. ${chapters[i].title}`;
      $("chapters").append(o);
    });
    $("seek").max = timing.duration;
    $("seek").oninput = () => {
      audio.currentTime = Number($("seek").value);
      render(audio.currentTime);
    };
    $("chapters").onchange = () => {
      audio.currentTime = groups[Number($("chapters").value)][0].start;
      render(audio.currentTime);
    };
    $("play").onclick = async () => {
      try {
        if (audio.paused) await audio.play();
        else audio.pause();
      } catch {
        $("error").hidden = false;
        $("error").textContent = "配音未能播放，请稍后重试。";
      }
    };
    audio.onplay = () => {
      $("play").textContent = "暂停";
    };
    audio.onpause = () => {
      $("play").textContent = "播放";
    };
    audio.onended = () => {
      $("play").textContent = "重播";
    };
    function mode(video) {
      audio.pause();
      $("movie").pause();
      $("movie").hidden = !video;
      $("viewport").hidden = video;
      $("controls").hidden = video;
      $("video").setAttribute("aria-pressed", String(video));
      $("web").setAttribute("aria-pressed", String(!video));
      if (!video) fit();
    }
    $("web").onclick = () => mode(false);
    $("video").onclick = () => mode(true);
    $("movie").onerror = () => {
      $("error").hidden = false;
      $("error").textContent = "视频暂时无法播放，可以先切换到网页动画。";
    };
    render(0);
    if (new URLSearchParams(location.search).get("mode") === "video")
      mode(true);
    function tick() {
      if (!audio.paused) render(audio.currentTime);
      requestAnimationFrame(tick);
    }
    if (!capture) tick();
    window.__ready = true;
  } catch (e) {
    $("error").hidden = false;
    $("error").textContent = e.message;
  }
})();
