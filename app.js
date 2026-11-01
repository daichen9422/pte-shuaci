(function () {
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
const dayStr = n => new Date(n * 86400000).toISOString().slice(0, 10);

const ICON = {
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.3 1.1 4.1 2.3h3C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  starF: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.7"/></svg>',
  checkF: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M8 12.3l2.7 2.7L16 9.7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/></svg>'
};
const GRADS = [["#ff5f6d","#ffc371"],["#7f5cff","#ff7ac6"],["#11998e","#38ef7d"],["#fc4a1a","#f7b733"],["#2b5876","#4e4376"],["#ee0979","#ff6a00"],["#00b4db","#0083b0"],["#f857a6","#ff5858"],["#3a7bd5","#00d2ff"],["#8e2de2","#4a00e0"],["#e65c00","#f9d423"],["#134e5e","#71b280"]];
const AVC = ["#ff7a8a","#7a8cff","#29b38a","#f2a33a","#9b6cf0","#3fb2d8"];
const LVL = ["基础", "中等", "难词"];
const INT = [1, 3, 7, 15];   // 斩掉后第 1、3、7、15 天复习，全部通过即彻底掌握

/* ---------------- 状态 ---------------- */
const KEY = "pte-shuaci-v2";
const blank = () => ({ v: 2, known: {}, mastered: {}, fav: {}, seen: {}, daily: {}, act: {}, goal: 30, mode: "mean", range: "due" });
let S = blank();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) {}
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("保存失败：手机存储空间可能满了"); } }, 200); }
function touchDay() { S.act[dayStr(today())] = 1; }
const isKnown = w => !!(S.known[w] || S.mastered[w]);
const isFav = w => !!S.fav[w];
function setKnown(w, on) {
  if (on) { S.known[w] = { s: 0, due: today() + INT[0] }; delete S.mastered[w]; }
  else { delete S.known[w]; delete S.mastered[w]; }
  touchDay(); save();
}
function setFav(w, on) { if (on) S.fav[w] = Date.now(); else delete S.fav[w]; save(); }
function markSeen(w) {
  if (S.seen[w]) return;
  S.seen[w] = today();
  const k = dayStr(today()); S.daily[k] = (S.daily[k] || 0) + 1;
  touchDay(); save();
}
function srsPass(w) {
  const k = S.known[w]; if (!k) return;
  const s = k.s + 1;
  if (s >= INT.length) { delete S.known[w]; S.mastered[w] = today(); }
  else S.known[w] = { s, due: today() + INT[s] };
  touchDay(); save();
}
function srsFail(w) { delete S.known[w]; delete S.mastered[w]; S.fav[w] = Date.now(); touchDay(); save(); }
const dueList = () => Object.keys(S.known).filter(w => S.known[w].due <= today()).sort((a, b) => S.known[a].due - S.known[b].due);

/* ---------------- 数据 ---------------- */
let WORDS = [], WMAP = new Map(), POSTS = new Map(), POST_LIST = [];
async function load() {
  const [wr, ir] = await Promise.all([fetch("data/words.json"), fetch("data/posts/index.json")]);
  WORDS = (await wr.json()).map(r => ({ w: r[0], ph: r[1], full: r[2], cn: r[3], lvl: r[4], f: r[5] }));
  WORDS.forEach(x => WMAP.set(x.w.toLowerCase(), x));
  const files = await ir.json();
  const chunks = await Promise.all(files.map(f => fetch("data/posts/" + f).then(r => r.json()).catch(() => [])));
  chunks.forEach(ch => ch.forEach(p => { const k = String(p.w).toLowerCase(); if (WMAP.has(k)) POSTS.set(k, p); }));
  // 先难词后中等词，同级按常用程度
  POST_LIST = [...POSTS.keys()].sort((a, b) => { const A = WMAP.get(a), B = WMAP.get(b); return (B.lvl - A.lvl) || (B.f - A.f); });
}

/* ---------------- 工具 ---------------- */
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1500); }
function ask(html, btns) {
  const sh = $("#sheet"), inn = $("#sheetIn");
  inn.innerHTML = html + '<div class="row">' + btns.map((b, i) => '<button class="btn ' + (b.ghost ? "ghost" : "") + '" data-i="' + i + '">' + esc(b.t) + "</button>").join("") + "</div>";
  sh.hidden = false;
  inn.querySelectorAll("[data-i]").forEach(el => el.onclick = () => { sh.hidden = true; const f = btns[+el.dataset.i].f; if (f) f(); });
}
let voice = null;
function pickVoice() { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-AU/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(t, rate) {
  if (!("speechSynthesis" in window)) { toast("这个浏览器不支持发音"); return; }
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = voice ? voice.lang : "en-GB"; if (voice) u.voice = voice; u.rate = rate || 0.9; speechSynthesis.speak(u); } catch (e) { toast("发音失败"); }
}
const NAMES = ["考鸭日记", "PTE上岸姐", "79分在路上", "背词小熊", "悉尼打工人", "墨尔本的猫", "澳洲考鸭", "词根狂魔", "WFD战士", "布村留学生"];
const author = w => NAMES[hash(w) % NAMES.length];
const likes = w => { const n = (hash(w) % 240) / 10 + 0.6; return n >= 1 ? n.toFixed(1) + "w" : Math.round(n * 10000) + ""; };
const avHTML = n => '<span class="av" style="background:' + AVC[hash(n) % AVC.length] + '">' + esc(n.slice(0, 1)) + "</span>";
function coverHTML(w, line, stk, big) {
  const g = GRADS[hash(w) % GRADS.length];
  const fs = Math.min(big ? 44 : 28, Math.floor((big ? 560 : 250) / Math.max(w.length, 1)));
  const style = "background:linear-gradient(135deg," + g[0] + "," + g[1] + ")" + (big ? "" : ";min-height:" + (140 + hash(w + "h") % 90) + "px");
  return '<div class="cover" style="' + style + '"><div class="w" style="font-size:' + fs + 'px">' + esc(w) + "</div>" + (line ? '<div class="line">' + esc(line) + "</div>" : "") + '<div class="stk" aria-hidden="true">' + esc(stk || "") + "</div></div>";
}
function srsText(w) {
  if (S.mastered[w]) return "已彻底掌握";
  const k = S.known[w]; if (!k) return "";
  const d = k.due - today();
  return "第 " + (k.s + 1) + "/" + INT.length + " 轮复习 · " + (d <= 0 ? "今天该复习了" : d + " 天后复习");
}

/* ---------------- 顶部今日进度 ---------------- */
function renderToday() {
  const n = S.daily[dayStr(today())] || 0, g = S.goal, due = dueList().length;
  const el = $("#today");
  el.classList.toggle("done", n >= g);
  el.innerHTML = "<span>今日</span><span class=\"barw\"><i style=\"width:" + Math.min(100, n / g * 100) + "%\"></i></span><span class=\"n\">" + n + " / " + g + "</span>" + (due ? '<span class="due">待复习 ' + due + "</span>" : "");
  const dot = $("#dueDot"); dot.hidden = !due; dot.textContent = due > 99 ? "99+" : due;
}
$("#today").onclick = () => { if (dueList().length) { S.range = "due"; go("review"); } };

/* ---------------- 首页 ---------------- */
let filter = "all", list = [], shown = 0;
function buildList() {
  const seed = today();
  const rank = w => (isKnown(w) ? 2 : S.seen[w] ? 1 : 0);
  let L = POST_LIST.slice();
  if (filter === "fav") L = L.filter(isFav);
  if (filter === "todo") L = L.filter(w => !isKnown(w));
  // 没刷过的在前（按难度和常用程度，每天在小范围内打乱一下），刷过没斩的其次，斩了的最后
  const pos = new Map(L.map((w, i) => [w, i + (hash(w + seed) % 12)]));
  list = L.sort((a, b) => (rank(a) - rank(b)) || (pos.get(a) - pos.get(b)));
}
function cardHTML(w, i) {
  const p = POSTS.get(w);
  return '<button class="card' + (isKnown(w) ? " known" : "") + '" data-i="' + i + '">' + coverHTML(w, p.line, p.stk) + '<div class="t">' + esc(p.title) + '</div><div class="meta">' + avHTML(author(w)) + '<span class="nm">' + esc(author(w)) + '</span><span class="lk">' + (isFav(w) ? ICON.starF : ICON.heart) + likes(w) + "</span></div></button>";
}
function renderFeed() {
  buildList(); shown = 0;
  $("#feed").innerHTML = "";
  if (!list.length) {
    $("#more").innerHTML = '<div class="empty">' + (filter === "fav" ? "还没有收藏。刷到想记的词点一下星星。" : "这里的帖子全部斩完了，太强了。") + "</div>";
    return;
  }
  moreCards();
}
function moreCards() {
  const n = Math.min(list.length, shown + 24);
  $("#feed").insertAdjacentHTML("beforeend", list.slice(shown, n).map((w, k) => cardHTML(w, shown + k)).join(""));
  shown = n;
  $("#more").textContent = shown < list.length ? "继续往下刷…" : "刷到底了，共 " + list.length + " 篇。去复习里巩固一下吧。";
}
new IntersectionObserver(es => { if (es[0].isIntersecting && shown && shown < list.length) moreCards(); }, { root: $("#main"), rootMargin: "600px" }).observe($("#more"));
$("#feed").addEventListener("click", e => { const c = e.target.closest(".card"); if (c) openPost(+c.dataset.i); });
$("#chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  filter = b.dataset.f; $$(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
  renderFeed(); $("#main").scrollTop = 0;
});

/* ---------------- 帖子 / 单词详情 ---------------- */
let cur = -1, ctx = null; // ctx: 当前翻页用的单词数组
function openPost(i, arr) {
  ctx = arr || list; cur = i;
  const w = ctx[i]; if (!w) return;
  if ($("#post").hidden) history.pushState({ o: 1 }, "");
  renderPost(w); $("#post").hidden = false; $("#post .scroll").scrollTop = 0;
}
function openWord(w) { openPost(0, [w.toLowerCase()]); }
function renderPost(w) {
  const x = WMAP.get(w), p = POSTS.get(w);
  if (p) markSeen(w);
  const name = p ? author(w) : "词库";
  const paras = p ? String(p.body || "").split(/\n+/).map(t => "<p>" + esc(t) + "</p>").join("") : "";
  const srs = srsText(w);
  $("#post").innerHTML =
    '<div class="bar"><button class="ico" id="pBack" aria-label="返回">' + ICON.back + "</button>" + avHTML(name) + '<span class="nm">' + esc(name) + "</span>" + (ctx.length > 1 ? '<span class="ph">' + (cur + 1) + " / " + ctx.length + "</span>" : "") + "</div>" +
    '<div class="scroll">' + coverHTML(x.w, p ? p.line : x.cn, p ? p.stk : "", true) +
    '<div class="body">' +
      '<div class="wordrow"><span class="big">' + esc(x.w) + '</span><span class="ph">' + esc(x.ph) + '</span><span class="lvl">' + LVL[x.lvl] + '</span><button class="say" id="pSay">' + ICON.speaker + "发音</button></div>" +
      '<div class="cn">' + esc(x.cn) + (x.full && x.full !== x.cn ? "<small>" + esc(x.full) + "</small>" : "") + "</div>" +
      (srs ? '<div class="box srs"><div class="lab">复习进度</div><div>' + esc(srs) + "</div></div>" : "") +
      (p ? "<h2>" + esc(p.title) + '</h2><div class="txt">' + paras + "</div>" +
        '<div class="box"><div class="lab">例句<button class="say" id="pSayEx">' + ICON.speaker + '听句子</button></div><div class="en">' + esc(p.ex) + "</div><div>" + esc(p.exCn) + "</div></div>" +
        '<div class="box pte"><div class="lab">PTE 考点</div><div>' + esc(p.pte) + "</div></div>" +
        '<div class="tags">' + esc(p.tags) + "</div>"
        : '<div class="note">这个词还没写成帖子。' + (x.lvl === 0 ? "基础词主要在复习里练拼写和词义。" : "人名、地名、缩写这类词没有写帖子，可以在复习里练。") + "</div>") +
    "</div>" +
    (p && p.cm && p.cm.length ? '<div class="cm"><h3>共 ' + p.cm.length + " 条评论</h3>" + p.cm.map(c => '<div class="c">' + avHTML(c[0] || "?") + '<div><div class="who">' + esc(c[0]) + '</div><div class="say2">' + esc(c[1]) + '</div></div><div class="clk">' + ICON.heart + esc(c[2]) + "</div></div>").join("") + "</div>" : "") +
    "</div>" +
    '<div class="acts">' +
      '<button class="act k' + (isKnown(w) ? " on" : "") + '" id="pKnow">' + (isKnown(w) ? ICON.checkF : ICON.check) + "斩了</button>" +
      '<button class="act' + (isFav(w) ? " on" : "") + '" id="pFav">' + (isFav(w) ? ICON.starF : ICON.star) + "收藏</button>" +
      (ctx.length > 1 ? '<button class="btn" id="pNext">下一篇</button>' : '<button class="btn ghost" id="pClose">返回</button>') +
    "</div>";
  $("#pBack").onclick = closePost;
  $("#pSay").onclick = () => speak(x.w, 0.85);
  if (p) $("#pSayEx").onclick = () => speak(p.ex, 0.95);
  $("#pKnow").onclick = () => { const on = !isKnown(w); setKnown(w, on); toast(on ? "斩！明天会再考你一次" : "已取消"); keep(w); };
  $("#pFav").onclick = () => { const on = !isFav(w); setFav(w, on); toast(on ? "已收藏" : "已取消收藏"); keep(w); };
  if ($("#pNext")) $("#pNext").onclick = () => step(1);
  if ($("#pClose")) $("#pClose").onclick = closePost;
  renderToday();
}
function keep(w) { const sc = $("#post .scroll").scrollTop; renderPost(w); $("#post .scroll").scrollTop = sc; }
function step(d) {
  const n = cur + d;
  if (n >= ctx.length) { toast("已经是最后一篇"); return; }
  if (n < 0) { toast("已经是第一篇"); return; }
  openPost(n, ctx);
}
function closePost() { if (history.state && history.state.o) history.back(); else doClose(); }
function doClose() {
  $("#post").hidden = true;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  // 只更新卡片状态，不打乱当前顺序
  $$("#feed .card").forEach(c => { const w = list[+c.dataset.i]; if (w) c.classList.toggle("known", isKnown(w)); });
  renderToday();
  if (!$("#v-me").hidden) renderMe();
}
(function swipe() {
  let x0 = 0, y0 = 0, t0 = 0; const el = $("#post");
  el.addEventListener("touchstart", e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
  el.addEventListener("touchend", e => {
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    if (Date.now() - t0 < 600 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) step(1); else if (x0 < 40) closePost(); else step(-1); }
  }, { passive: true });
})();
window.addEventListener("popstate", () => { if (!$("#post").hidden) doClose(); else if (!$("#search").hidden) $("#search").hidden = true; });

/* ---------------- 搜索 ---------------- */
$("#openSearch").onclick = () => { history.pushState({ o: 1 }, ""); $("#search").hidden = false; $("#q").value = ""; $("#sres").innerHTML = '<div class="note">共 ' + WORDS.length + " 个词，其中 " + POSTS.size + " 个有帖子</div>"; setTimeout(() => $("#q").focus(), 50); };
$("#closeSearch").onclick = () => { if (history.state && history.state.o) history.back(); else $("#search").hidden = true; };
$("#q").addEventListener("input", () => {
  const q = $("#q").value.trim().toLowerCase();
  if (!q) { $("#sres").innerHTML = ""; return; }
  const zh = /[一-龥]/.test(q);
  const r = [];
  for (const x of WORDS) {
    const k = x.w.toLowerCase();
    if (zh ? x.full.includes(q) : k.startsWith(q)) r.push(x);
    if (r.length >= 60) break;
  }
  if (!zh && r.length < 60) for (const x of WORDS) { const k = x.w.toLowerCase(); if (!k.startsWith(q) && k.includes(q)) { r.push(x); if (r.length >= 60) break; } }
  $("#sres").innerHTML = r.length ? r.map(x => '<button class="li" data-w="' + esc(x.w.toLowerCase()) + '"><b>' + esc(x.w) + "</b><span>" + esc(x.cn) + "</span>" + (POSTS.has(x.w.toLowerCase()) ? '<span class="lvl">有帖子</span>' : "") + "</button>").join("") : '<div class="empty">词库里没有这个词</div>';
});
$("#sres").addEventListener("click", e => { const b = e.target.closest(".li"); if (b) openWord(b.dataset.w); });

/* ---------------- 复习 ---------------- */
let q = null, score = { ok: 0, all: 0 }, dueQueue = [];
function poolFor(range) {
  if (range === "due") return dueList();
  if (range === "weak") return WORDS.map(x => x.w.toLowerCase()).filter(w => isFav(w) || (S.seen[w] && !isKnown(w)));
  if (range === "base") return WORDS.filter(x => x.lvl === 0).map(x => x.w.toLowerCase());
  return WORDS.map(x => x.w.toLowerCase());
}
function nextQ() {
  const pool = poolFor(S.range);
  if (!pool.length) { q = null; return; }
  const w = S.range === "due" ? pool[0] : pool[Math.floor(Math.random() * pool.length)];
  const x = WMAP.get(w);
  const used = new Set([x.cn]), opts = [x];
  let guard = 0;
  while (opts.length < 4 && guard++ < 200) {
    const y = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (y.lvl === x.lvl && !used.has(y.cn) && y.cn) { used.add(y.cn); opts.push(y); }
  }
  q = { w, x, opts: opts.sort(() => Math.random() - 0.5), done: false };
}
const RANGES = [["due", "到期复习"], ["weak", "收藏+没斩"], ["base", "基础词"], ["all", "全部"]];
function renderReview() {
  if (!q || !poolFor(S.range).includes(q.w)) nextQ();
  const v = $("#v-review");
  let head = '<div class="seg"><button data-m="mean" aria-pressed="' + (S.mode === "mean") + '">选词义</button><button data-m="spell" aria-pressed="' + (S.mode === "spell") + '">听写拼写</button></div>' +
    '<div class="ranges">' + RANGES.map(r => '<button data-r="' + r[0] + '" aria-pressed="' + (S.range === r[0]) + '">' + r[1] + ' <span class="c">' + poolFor(r[0]).length + "</span></button>").join("") + "</div>";
  let body;
  if (!q) {
    body = '<div class="qcard"><div class="empty">' + (S.range === "due" ? "今天没有到期的词。斩掉的词会在 1、3、7、15 天后回来考你。" : "这里还没有词。先去首页刷几篇，收藏或者没斩的词会出现在这里。") + "</div></div>";
  } else if (S.mode === "mean") {
    body = '<div class="qcard"><div class="hint">这个词是什么意思？</div><div class="qw">' + esc(q.x.w) + '</div><div class="row"><button class="say" id="qSay">' + ICON.speaker + "发音</button></div>" +
      '<div class="opts">' + q.opts.map((o, i) => '<button class="opt" data-i="' + i + '">' + esc(o.cn) + "</button>").join("") + '</div><div class="verdict" id="qRes"></div><div class="row" id="qNext"></div></div>';
  } else {
    body = '<div class="qcard"><div class="hint">听发音，拼出单词</div><div class="row"><button class="btn" id="qSay">' + ICON.speaker.replace("<svg", '<svg width="18" height="18"') + '播放</button><button class="btn ghost" id="qSlow">慢速</button></div>' +
      '<input class="inp" id="qIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="输入你听到的词" aria-label="拼写">' +
      '<div class="hint">提示：' + esc(q.x.cn) + '</div><div class="row"><button class="btn" id="qCheck">检查</button></div><div class="verdict" id="qRes"></div><div class="row" id="qNext"></div></div>';
  }
  v.innerHTML = head + body + '<div class="score">本轮答对 ' + score.ok + " / " + score.all + (S.range === "due" ? " · 答对进入下一轮，答错退回没斩并加入收藏" : " · 答错会自动加入收藏") + "</div>";
  v.querySelectorAll(".seg button").forEach(b => b.onclick = () => { S.mode = b.dataset.m; save(); q = null; renderReview(); });
  v.querySelectorAll(".ranges button").forEach(b => b.onclick = () => { S.range = b.dataset.r; save(); q = null; renderReview(); });
  if (!q) return;
  $("#qSay").onclick = () => speak(q.x.w, 0.85);
  if (S.mode === "mean") {
    v.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      if (q.done) return;
      const ok = q.opts[+b.dataset.i] === q.x;
      v.querySelectorAll(".opt").forEach((el, i) => { if (q.opts[i] === q.x) el.classList.add("ok"); });
      if (!ok) b.classList.add("no");
      answer(ok, ok ? "答对了" : "答错了");
      speak(q.x.w, 0.85);
    });
  } else {
    const inp = $("#qIn");
    $("#qSlow").onclick = () => speak(q.x.w, 0.55);
    const check = () => {
      if (q.done) return;
      const a = inp.value.trim().toLowerCase();
      if (!a) { toast("先输入再检查"); return; }
      const ok = a === q.x.w.toLowerCase();
      answer(ok, ok ? "拼对了" : "正确拼写：" + q.x.w + "（你写的：" + a + "）");
    };
    $("#qCheck").onclick = check;
    inp.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
    setTimeout(() => { inp.focus(); speak(q.x.w, 0.85); }, 150);
  }
}
function answer(ok, msg) {
  q.done = true; score.all++; if (ok) score.ok++;
  const w = q.w;
  if (S.range === "due") { ok ? srsPass(w) : srsFail(w); }
  else if (!ok && !isFav(w)) setFav(w, true);
  touchDay(); save();
  const r = $("#qRes"); r.className = "verdict " + (ok ? "ok" : "no"); r.textContent = msg + (S.range === "due" && ok ? " · " + (S.mastered[w] ? "彻底掌握！" : srsText(w)) : "");
  $("#qNext").innerHTML = '<button class="btn ghost" id="qOpen">看详情</button>' + (ok && S.range !== "due" && !isKnown(w) ? '<button class="btn ghost" id="qKnow">斩了</button>' : "") + '<button class="btn" id="qGo">下一题</button>';
  $("#qGo").onclick = () => { nextQ(); renderReview(); };
  $("#qOpen").onclick = () => openWord(w);
  if ($("#qKnow")) $("#qKnow").onclick = () => { setKnown(w, true); toast("斩！"); $("#qKnow").remove(); };
  renderToday();
}

/* ---------------- 我 ---------------- */
function streak() { let n = 0, d = today(); if (!S.act[dayStr(d)]) d--; while (S.act[dayStr(d)]) { n++; d--; } return n; }
function renderMe() {
  const seen = Object.keys(S.seen).length, known = Object.keys(S.known).length + Object.keys(S.mastered).length, mast = Object.keys(S.mastered).length;
  const favs = Object.keys(S.fav).sort((a, b) => S.fav[b] - S.fav[a]);
  const lv = [0, 1, 2].map(l => { const all = WORDS.filter(x => x.lvl === l); const k = all.filter(x => isKnown(x.w.toLowerCase())).length; return [l, k, all.length]; });
  const postTarget = WORDS.filter(x => x.lvl > 0).length;
  $("#v-me").innerHTML =
    '<div class="stats"><div class="stat"><div class="n">' + seen + '</div><div class="l">刷过</div></div><div class="stat"><div class="n">' + known + '</div><div class="l">斩了</div></div><div class="stat"><div class="n">' + mast + '</div><div class="l">彻底掌握</div></div><div class="stat"><div class="n">' + streak() + '</div><div class="l">连续天数</div></div></div>' +
    '<div class="panel"><h3>每日目标：每天新刷几篇</h3><div class="stepper">' + [10, 20, 30, 50, 80, 120].map(n => '<button data-g="' + n + '" aria-pressed="' + (S.goal === n) + '">' + n + "</button>").join("") + "</div></div>" +
    '<div class="panel"><h3>词库进度（斩了 / 总数）</h3>' + lv.map(r => '<div class="lv"><span>' + LVL[r[0]] + '</span><span class="barw"><i style="width:' + (r[1] / Math.max(r[2], 1) * 100).toFixed(1) + '%"></i></span><span class="num">' + r[1] + " / " + r[2] + "</span></div>").join("") +
      '<div class="note">帖子已写 ' + POSTS.size + " / " + postTarget + " 篇（难词和中等词；没写的主要是人名、地名、缩写）</div></div>" +
    '<div class="panel"><h3>我的收藏 · ' + favs.length + "</h3>" + (favs.length ? favs.slice(0, 200).map(w => { const x = WMAP.get(w); return x ? '<button class="li" data-w="' + esc(w) + '"><b>' + esc(x.w) + "</b><span>" + esc(x.cn) + "</span></button>" : ""; }).join("") : '<div class="note">还没有收藏。答错的词也会自动进来。</div>') + "</div>" +
    '<div class="panel"><h3>备份与恢复</h3><div class="note">进度只存在这台手机的浏览器里。换手机或清理浏览器数据前，先导出备份。</div>' +
      '<div class="row"><button class="btn ghost sm" id="bkDl">下载备份文件</button><button class="btn ghost sm" id="bkCopy">复制备份码</button><button class="btn ghost sm" id="bkIn">导入备份</button></div>' +
      '<input type="file" id="bkFile" accept=".json,application/json,text/plain" hidden></div>' +
    '<div class="row"><button class="btn ghost sm" id="reset">清空学习记录</button></div>' +
    '<div class="note" style="text-align:center">词库来自 PTEGO 基础词表 · 共 ' + WORDS.length + " 词</div>";
  $$("#v-me .stepper button").forEach(b => b.onclick = () => { S.goal = +b.dataset.g; save(); renderMe(); renderToday(); });
  $$("#v-me .li[data-w]").forEach(b => b.onclick = () => openPost(favs.indexOf(b.dataset.w), favs));
  $("#bkDl").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: "application/json" }));
    a.download = "pte-shuaci-备份-" + dayStr(today()) + ".json"; document.body.appendChild(a); a.click(); a.remove();
  };
  $("#bkCopy").onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(S)); toast("备份码已复制，粘贴到备忘录保存"); } catch (e) { toast("复制失败，用“下载备份文件”吧"); } };
  $("#bkIn").onclick = () => ask('<b>导入备份</b><div class="note">选择备份文件，或者把备份码粘贴到下面。导入会覆盖当前进度。</div><textarea id="bkText" placeholder="粘贴备份码"></textarea>',
    [{ t: "选文件", ghost: true, f: () => $("#bkFile").click() }, { t: "取消", ghost: true }, { t: "导入", f: () => importText(($("#bkText") || {}).value) }]);
  $("#bkFile").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(importText); e.target.value = ""; };
  $("#reset").onclick = () => ask("<b>清空学习记录？</b><div>刷过、斩了、收藏、复习进度都会清零，没法恢复。建议先导出备份。</div>",
    [{ t: "取消", ghost: true }, { t: "清空", f: () => { const g = S.goal; S = blank(); S.goal = g; save(); renderMe(); renderToday(); toast("已清空"); } }]);
}
function importText(t) {
  try {
    const o = JSON.parse(String(t || "").trim());
    if (!o || typeof o !== "object" || !o.known || !o.seen) throw 0;
    S = Object.assign(blank(), o); save(); renderMe(); renderToday(); toast("导入成功");
  } catch (e) { toast("这不是有效的备份"); }
}

/* ---------------- 导航 ---------------- */
function go(v) {
  $$("#tabs button").forEach(b => { if (b.dataset.v === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  ["feed", "review", "me"].forEach(k => $("#v-" + k).hidden = k !== v);
  $("#chips").style.visibility = v === "feed" ? "visible" : "hidden";
  if (v === "feed") renderFeed(); if (v === "review") { q = null; renderReview(); } if (v === "me") renderMe();
  $("#main").scrollTop = 0;
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(b.dataset.v); });
document.addEventListener("keydown", e => { if ($("#post").hidden) return; if (e.key === "Escape") closePost(); if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); });

/* ---------------- 启动 ---------------- */
renderToday();
load().then(() => { $("#loading").remove(); renderFeed(); renderToday(); })
  .catch(() => { $("#loading").textContent = "词库加载失败。第一次打开需要联网，请检查网络后刷新。"; });
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();
