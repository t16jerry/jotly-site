// Set this one line when Novi is approved, then every App Store button goes live:
// const APP_STORE_URL = "https://apps.apple.com/app/id6829156001";
const APP_STORE_URL = "";

(function () {
  "use strict";
  const root = document.documentElement;
  const KEY = "novi-lang";
  const TAG = { zh: "zh-Hant", en: "en" };
  const META = {
    zh: {
      title: "Novi：打一句，幫你分好",
      description: "Novi 是 iPhone 記事 app，也是陪你記事的小機器人。打一句話，作業、考試、行程、待辦、記帳自動分類，到時提醒。記錄留在你的手機。",
    },
    en: {
      title: "Novi: One line. Everything sorted.",
      description: "Novi is a notes app for iPhone with a little robot friend. Type one line and homework, exams, events, to-dos and spending sort themselves and remind you. Your records stay on your phone.",
    },
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function stored() {
    try {
      const value = localStorage.getItem(KEY);
      return value === "zh" || value === "en" ? value : null;
    } catch (e) {
      return null;
    }
  }

  function remember(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {
      /* private window: the choice just lasts for this page */
    }
  }

  function fromBrowser() {
    const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (const item of list) {
      const code = item.toLowerCase();
      if (code.startsWith("zh")) return "zh";
      if (code.startsWith("en")) return "en";
    }
    return "en";
  }

  // The old support page linked #zh and #en, so those anchors still choose the language.
  function fromHash() {
    return location.hash === "#zh" ? "zh" : location.hash === "#en" ? "en" : null;
  }

  let lang = fromHash() || stored() || fromBrowser();
  const changed = [];

  function apply(next) {
    lang = next;
    root.dataset.lang = next;
    root.lang = TAG[next];
    document.title = META[next].title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = META[next].description;
    document.querySelectorAll("[data-set-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.setLang === next));
    });
    changed.forEach((run) => run());
    document.dispatchEvent(new CustomEvent("novi:lang"));
  }

  // Runs in <head> so the page never paints in the wrong language.
  root.dataset.lang = lang;
  root.lang = TAG[lang];
  root.classList.add("js");
  if (APP_STORE_URL) root.classList.add("store-live");

  function setupStore() {
    if (!APP_STORE_URL) return;
    document.querySelectorAll("[data-store]").forEach((link) => {
      link.href = APP_STORE_URL;
      link.removeAttribute("aria-disabled");
    });
  }

  function setupSwitch() {
    const box = document.querySelector("[data-switch]");
    if (box) box.hidden = false;
    document.querySelectorAll("[data-set-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        remember(button.dataset.setLang);
        if (fromHash()) history.replaceState(null, "", location.pathname + location.search);
        apply(button.dataset.setLang);
      });
    });
    addEventListener("hashchange", () => {
      const wanted = fromHash();
      if (!wanted || wanted === lang) return;
      apply(wanted);
      const target = document.getElementById(wanted);
      if (target) target.scrollIntoView();
    });
  }

  function setupNav() {
    const nav = document.querySelector("[data-nav]");
    if (!nav) return;
    const menu = nav.querySelector("[data-menu]");
    const close = () => { nav.classList.remove("open"); if (menu) menu.setAttribute("aria-expanded", "false"); };
    if (menu) menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll(".links a").forEach((a) => a.addEventListener("click", close));
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    const mark = () => nav.classList.toggle("scrolled", scrollY > 30);
    addEventListener("scroll", mark, { passive: true });
    mark();
  }

  function setupReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("in")); return; }
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => seen.observe(el));
  }

  /* The hero's light follows the pointer, and the five tags drift at different depths. */
  function setupHero() {
    const hero = document.querySelector(".hero");
    if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const box = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", (e.clientX - box.left).toFixed(0) + "px");
      hero.style.setProperty("--my", (e.clientY - box.top).toFixed(0) + "px");
      hero.style.setProperty("--px", ((e.clientX / innerWidth - 0.5) * 2).toFixed(3));
      hero.style.setProperty("--py", ((e.clientY / innerHeight - 0.5) * 2).toFixed(3));
    }, { passive: true });
  }

  /* ---------- try it: a small stand-in for the app's parser ---------- */

  const WORDS = {
    zh: { homework: "作業", exam: "考試", event: "行程", todo: "待辦", expense: "記帳", nodate: "沒有日期", notime: "沒寫日期",
          remind: { homework: "提醒：1 天前、2 小時前", exam: "提醒：3 天前、1 天前、1 小時前", event: "提醒：1 小時前、5 分鐘前" },
          cats: { food: "餐飲", move: "交通", fun: "娛樂", other: "其他" }, placeholder: "隨口記一件事…", send: "送出" },
    en: { homework: "Homework", exam: "Exam", event: "Event", todo: "To-do", expense: "Spending", nodate: "No date", notime: "No date given",
          remind: { homework: "Reminders: 1 day, 2 h before", exam: "Reminders: 3 days, 1 day, 1 h before", event: "Reminders: 1 h, 5 min before" },
          cats: { food: "Food", move: "Transport", fun: "Fun", other: "Other" }, placeholder: "Jot something down…", send: "Send" },
  };
  const ICON = { homework: "i-homework", exam: "i-exam", event: "i-event", todo: "i-check", expense: "i-expense" };
  const WHEN = /(今天|今晚|明天|後天|大後天|下?(?:週|星期|禮拜)[一二三四五六日天]|下個?月\s*\d{1,2}[號日]?|\d{1,2}月\d{1,2}[日號]?|\d{1,2}\/\d{1,2}|(?:早上|上午|中午|下午|晚上)?\s*\d{1,2}(?:[:：]\d{2}|[點点]半?(?:\d{1,2}分)?)|\b(?:today|tonight|tomorrow)\b|\bnext\s+(?:week|mon|tue|wed|thu|fri|sat|sun)[a-z]*|\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\b\d{1,2}:\d{2}\b)/gi;
  const EXAM = /(考試|小考|段考|期中|期末|測驗|考|\b(?:quiz|exam|test|midterm|final)s?\b)/i;
  const HOMEWORK = /(作業|報告|習題|功課|\b(?:essay|homework|assignment|report|paper|hw|worksheet)\b|\bdue\b)/i;
  const MONEY = /^(.*?)[\s　]*(?:nt\$|\$|＄)?\s*(\d+(?:\.\d{1,2})?)\s*(?:元|塊|块|dollars?|bucks)?$/i;
  const CAT = [
    ["food", /(餐|飯|吃|喝|咖啡|奶茶|手搖|便當|麵|lunch|dinner|breakfast|brunch|coffee|boba|tea|food|pizza|snack)/i],
    ["move", /(車|捷運|公車|高鐵|加油|油錢|uber|bus|taxi|train|gas|parking|transit)/i],
    ["fun", /(電影|遊戲|唱歌|球|movie|game|golf|concert|ticket)/i],
  ];

  function sort(line, which) {
    const w = WORDS[which], text = line.trim().replace(/\s+/g, " ");
    const times = text.match(WHEN) || [];
    const bare = text.replace(WHEN, " ").replace(/\b(?:due|on|at|by)\b/gi, " ").replace(/\s+/g, " ").trim();
    const when = times.join(" ").replace(/\s+/g, " ").trim();
    if (EXAM.test(text)) return { type: "exam", title: bare || text, line: when || w.notime, fine: when ? w.remind.exam : "" };
    if (HOMEWORK.test(text)) return { type: "homework", title: bare || text, line: when || w.notime, fine: when ? w.remind.homework : "" };
    const money = !times.length && text.match(MONEY);
    if (money && money[1].trim()) {
      const note = money[1].trim(), amount = Number(money[2]);
      const cat = (CAT.find((c) => c[1].test(note)) || ["other"])[0];
      const shown = which === "zh" ? amount + " 元" : "$" + (Number.isInteger(amount) ? amount : amount.toFixed(2));
      return { type: "expense", title: shown, line: w.cats[cat] + " · " + note, fine: "" };
    }
    if (times.length) return { type: "event", title: bare || text, line: when, fine: w.remind.event };
    return { type: "todo", title: text.replace(/^(記得|要|remember to|don't forget to)\s*/i, "") || text, line: w.nodate, fine: "" };
  }

  function setupConsole() {
    const box = document.querySelector("[data-console]");
    if (!box) return;
    const thread = box.querySelector("[data-thread]"), form = box.querySelector("[data-composer]"), input = box.querySelector("[data-input]");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let touched = false, run = 0;

    function element(tag, cls, text) {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text != null) el.textContent = text;
      return el;
    }

    function add(line, quiet) {
      const r = sort(line, lang), w = WORDS[lang];
      const item = element("li");
      item.append(element("p", "me", line));
      const card = element("div", "card t-" + r.type);
      const tile = element("span", "tile");
      tile.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + ICON[r.type] + '"/></svg>';
      const body = element("div");
      const head = element("p", "ct");
      head.append(element("b", "", r.title), element("span", "tag", w[r.type]));
      body.append(head, element("p", "", r.line));
      if (r.fine) body.append(element("p", "", r.fine));
      card.append(tile, body);
      item.append(card);
      thread.append(item);
      while (thread.children.length > 3) thread.firstElementChild.remove();
      if (!quiet && window.Novi) {
        window.Novi.play(r.type === "expense" ? "nod" : r.type === "exam" ? "flex" : r.type === "todo" ? "clap" : "celebrate");
        window.Novi.say("filed", 2600);
      }
    }

    function examples() {
      return [...box.querySelectorAll('[data-line][lang="' + TAG[lang] + '"]')].map((b) => b.textContent.trim());
    }

    const wait = (ms) => new Promise((done) => setTimeout(done, ms));

    /* Until someone types, Novi's examples type themselves once. */
    async function auto() {
      const id = ++run, lines = examples().slice(0, 3);
      thread.replaceChildren();
      if (still.matches) { lines.forEach((line) => add(line, true)); return; }
      for (const line of lines) {
        input.value = "";
        for (const letter of Array.from(line)) {
          if (id !== run || touched) return;
          input.value += letter;
          await wait(letter === " " ? 50 : 80);
        }
        await wait(420);
        if (id !== run || touched) return;
        input.value = "";
        add(line, true);
        await wait(1300);
      }
    }

    function stopAuto() {
      if (touched) return;
      touched = true; run += 1; input.value = "";
    }

    input.addEventListener("focus", () => { stopAuto(); root.classList.add("typing"); if (window.Novi) window.Novi.play("typing"); });
    input.addEventListener("blur", () => root.classList.remove("typing"));
    input.addEventListener("pointerdown", stopAuto);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const line = input.value.trim();
      stopAuto();
      if (!line) return;
      add(line.slice(0, 80));
      input.value = "";
    });
    box.querySelectorAll("[data-line]").forEach((chip) => chip.addEventListener("click", () => { stopAuto(); add(chip.textContent.trim()); }));

    function label() {
      input.placeholder = WORDS[lang].placeholder;
      input.setAttribute("aria-label", WORDS[lang].placeholder);
      form.querySelector("button").setAttribute("aria-label", WORDS[lang].send);
    }
    changed.push(() => { label(); if (!touched && started) auto(); else thread.replaceChildren(); });
    label();

    let started = false;
    new IntersectionObserver((entries, seen) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      seen.disconnect();
      started = true;
      auto();
    }, { threshold: 0.35 }).observe(box);
  }

  /* ---------- the tour: one screen, six phones passing through ---------- */

  function setupTour() {
    const tour = document.querySelector("[data-tour]");
    if (!tour) return;
    const slides = [...tour.querySelectorAll("[data-slide]")], phones = [...tour.querySelectorAll("[data-phone]")];
    const dots = [...tour.querySelectorAll("[data-dot]")], stage = tour.querySelector(".tour-stage");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const count = slides.length;
    let index = -1, queued = false, inside = false;

    function cueNovi() {
      if (!window.Novi || index < 0) return;
      // Novi crosses behind the phones each time, so it is always on the far side of the last stop.
      const odd = index % 2 === 1;
      window.Novi.cue({ x: odd ? 0.93 : 0.47, xm: odd ? 0.86 : 0.14, move: index === 0 ? "wave" : "point", say: slides[index].dataset.slide });
    }

    function update() {
      queued = false;
      if (still.matches) { phones.forEach((p) => { p.style.transform = ""; p.style.opacity = ""; }); return; }
      const box = tour.getBoundingClientRect(), span = box.height - innerHeight;
      const p = clamp(-box.top / span, 0, 1) * (count - 1);
      const narrow = innerWidth < 900, spread = narrow ? innerWidth * 0.6 : Math.min(innerWidth * 0.3, 400);
      phones.forEach((phone, i) => {
        const d = i - p, a = Math.abs(d), near = clamp(d, -1.6, 1.6);
        // A phone that has gone by slips away quickly, so it never sits over the words on the left.
        const x = d < 0 && !narrow ? near * spread * 0.55 : near * spread;
        phone.style.transform = "translate3d(" + x.toFixed(1) + "px," + (a * a * -10).toFixed(1) + "px," + (-a * 300).toFixed(1) + "px) rotateY(" + (near * -38).toFixed(2) + "deg) rotateZ(" + (near * 2.5).toFixed(2) + "deg)";
        phone.style.opacity = (d < 0 ? clamp(1 + d * 1.7, 0, 1) : clamp(1.9 - a * 1.15, 0, 1)).toFixed(3);
        phone.style.zIndex = String(50 - Math.round(a * 10));
      });
      const next = Math.round(p);
      if (next !== index) {
        index = next;
        slides.forEach((s, i) => s.classList.toggle("on", i === index));
        dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
        stage.style.setProperty("--tone", "var(--" + slides[index].dataset.tone + ")");
        if (inside) cueNovi();
      }
    }

    function ask() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    addEventListener("scroll", ask, { passive: true });
    addEventListener("resize", ask);
    document.addEventListener("novi:stop", (e) => { inside = e.detail === "tour"; if (inside) cueNovi(); });
    document.addEventListener("novi:ready", () => { if (inside) cueNovi(); });
    dots.forEach((dot, i) => dot.addEventListener("click", () => {
      const box = tour.getBoundingClientRect(), span = box.height - innerHeight;
      scrollTo({ top: scrollY + box.top + (span * i) / (count - 1), behavior: still.matches ? "auto" : "smooth" });
    }));
    update();
  }

  function setupWardrobe() {
    const rack = document.querySelector("[data-rack]");
    if (!rack) return;
    const buttons = [...rack.querySelectorAll("[data-outfit]")];
    const mark = (id) => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.outfit === id)));
    buttons.forEach((button) => button.addEventListener("click", () => {
      mark(button.dataset.outfit);
      if (window.Novi) window.Novi.wear(button.dataset.outfit);
    }));
    document.addEventListener("novi:ready", () => mark(window.Novi.outfit()));
    mark("none");
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupStore();
    setupSwitch();
    setupNav();
    setupReveal();
    setupHero();
    setupConsole();
    setupTour();
    setupWardrobe();
    apply(lang);
  });
})();
