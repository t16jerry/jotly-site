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
      description: "Novi 是 iPhone 記事 app，也是陪你記事的小機器人。打一句話，作業、考試、行程、待辦、記帳自動分類，到時提醒。資料只存在你的手機。",
      pause: "暫停",
      play: "播放",
      wearing: "Novi 穿著",
    },
    en: {
      title: "Novi: One line. Everything sorted.",
      description: "Novi is a notes app for iPhone with a little robot friend. Type one line and homework, exams, events, to-dos and spending sort themselves and remind you. Stays on your phone.",
      pause: "Pause",
      play: "Play",
      wearing: "Novi wearing",
    },
  };

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
  }

  // Runs in <head> so the page never paints in the wrong language.
  root.dataset.lang = lang;
  root.lang = TAG[lang];
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

  function setupDemo() {
    const stage = document.querySelector("[data-demo]");
    const pause = document.querySelector("[data-demo-pause]");
    if (!stage || !pause) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const lists = [...stage.querySelectorAll(".demo-list")];

    // Keep the whole line for screen readers; only the visible copy is typed out.
    lists.forEach((list) => {
      [...list.children].forEach((item) => {
        const bubble = item.querySelector(".bubble");
        const line = bubble.textContent;
        item.dataset.line = line;
        const full = document.createElement("span");
        full.className = "sr-only";
        full.textContent = line;
        const typed = document.createElement("span");
        typed.className = "typed";
        typed.setAttribute("aria-hidden", "true");
        typed.textContent = line;
        bubble.replaceChildren(full, typed);
      });
    });

    let run = 0;
    let paused = false;
    let inView = false;
    let wake = null;

    function label() {
      pause.textContent = paused ? META[lang].play : META[lang].pause;
      pause.setAttribute("aria-pressed", String(paused));
    }

    function resume() {
      if (wake) wake();
      wake = null;
    }

    async function wait(ms) {
      await new Promise((done) => setTimeout(done, ms));
      while (paused || !inView) await new Promise((done) => (wake = done));
    }

    function reset(list) {
      list.classList.remove("playing");
      [...list.children].forEach((item) => {
        item.classList.remove("typing", "done");
        item.querySelector(".typed").textContent = item.dataset.line;
      });
    }

    async function play(id, list) {
      list.classList.add("playing");
      const items = [...list.children];
      while (id === run) {
        for (const item of items) {
          const typed = item.querySelector(".typed");
          typed.textContent = "";
          item.classList.add("typing");
          for (const letter of Array.from(item.dataset.line)) {
            typed.textContent += letter;
            await wait(letter === " " ? 60 : 95);
            if (id !== run) return;
          }
          await wait(560);
          if (id !== run) return;
          item.classList.remove("typing");
          item.classList.add("done");
          await wait(1500);
          if (id !== run) return;
        }
        await wait(2800);
        if (id !== run) return;
        items.forEach((item) => item.classList.remove("done"));
        await wait(350);
        if (id !== run) return;
      }
    }

    function start() {
      run += 1;
      resume();
      lists.forEach(reset);
      pause.hidden = still.matches;
      label();
      if (still.matches) return;
      const list = lists.find((item) => item.lang === TAG[lang]);
      if (list) play(run, list);
    }

    pause.addEventListener("click", () => {
      paused = !paused;
      label();
      if (!paused) resume();
    });
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      if (inView && !paused) resume();
    }, { threshold: 0.2 }).observe(stage);
    still.addEventListener("change", start);
    changed.push(start);
    start();
  }

  function setupWardrobe() {
    const picture = document.querySelector("[data-fitting]");
    const name = document.querySelector("[data-fitting-name]");
    const rack = document.querySelector("[data-rack]");
    if (!picture || !name || !rack) return;
    const buttons = [...rack.querySelectorAll("[data-outfit]")];

    function caption() {
      const on = buttons.find((button) => button.getAttribute("aria-pressed") === "true");
      const label = on.querySelector(`[lang="${TAG[lang]}"]`).textContent;
      picture.alt = `${META[lang].wearing} ${label}`;
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        const image = button.querySelector("img");
        picture.src = image.getAttribute("src");
        picture.setAttribute("width", image.getAttribute("width"));
        picture.setAttribute("height", image.getAttribute("height"));
        name.replaceChildren(...[...button.querySelectorAll("span")].map((item) => item.cloneNode(true)));
        picture.classList.remove("hop");
        void picture.offsetWidth;
        picture.classList.add("hop");
        caption();
      });
    });
    changed.push(caption);
    caption();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupStore();
    setupSwitch();
    setupDemo();
    setupWardrobe();
    apply(lang);
  });
})();
