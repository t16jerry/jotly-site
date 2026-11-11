#!/usr/bin/env python3
"""Builds index.html. The comparison table and the support answers are lifted from
the previous page (git main), so their wording stays as it was reviewed."""
import re, subprocess, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
old = subprocess.run(["git", "-C", ROOT, "show", "main:index.html"], capture_output=True, text=True, check=True).stdout
loc = open(os.path.expanduser("~/Projects/novi-wt/1.3/JerryLife/Localization.swift")).read()

def en(zh, fallback):
    m = re.search(r'"%s": "([^"]+)"' % re.escape(zh), loc)
    return m.group(1) if m else fallback

table = re.search(r"<table>.*?</table>", old, re.S).group(0)

def faq(section_id):
    sec = re.search(r'<section id="%s"[^>]*>(.*?)\n    </section>' % section_id, old, re.S).group(1)
    title = re.search(r"<h2>(.*?)</h2>", sec, re.S).group(1)
    parts = re.split(r"\n\s*<h3>(.*?)</h3>", sec)[1:]
    out = []
    for i in range(0, len(parts), 2):
        body = parts[i + 1].strip()
        out.append('      <details%s>\n        <summary><h3>%s</h3></summary>\n        <div class="a">\n          %s\n        </div>\n      </details>'
                   % (" open" if i == 0 else "", parts[i], re.sub(r"\n\s*", "\n          ", body)))
    return title, "\n".join(out)

zh_title, zh_faq = faq("zh")
en_title, en_faq = faq("en")
zh_faq = zh_faq.replace('class="tag tone-', 'class="tag t-')
en_faq = en_faq.replace('class="tag tone-', 'class="tag t-')

def both(zh, en_, tag="span", cls=""):
    c = ' class="%s"' % cls if cls else ""
    return '<%s%s lang="zh-Hant">%s</%s><%s%s lang="en">%s</%s>' % (tag, c, zh, tag, tag, c, en_, tag)

def icon(name):
    return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#%s"/></svg>' % name

OUTFITS = [
    ("none", "原本的我", en("原本的我", "Just me"), "assets/novi-wave.webp", 540, 928),
    ("hoodie", "校園帽T", "Campus hoodie", "assets/outfits/hoodie.webp", 336, 480),
    ("cardigan", "圖書館開衫", "Library cardigan", "assets/outfits/cardigan.webp", 270, 480),
    ("varsity", "放學去運動", "Varsity jacket", "assets/outfits/varsity.webp", 291, 480),
    ("raincoat", "雨天也出門", "Rainy-day coat", "assets/outfits/raincoat.webp", 323, 480),
    ("pajamas", "月亮睡衣", "Moon pajamas", "assets/outfits/pajamas.webp", 348, 480),
    ("chef", "小小料理家", "Little cook", "assets/outfits/chef.webp", 333, 480),
    ("golf", "果嶺小球員", en("果嶺小球員", "Golf Day"), "assets/outfits/golf.webp", 278, 480),
    ("graduate", "畢業典禮", en("畢業典禮", "Graduation Day"), "assets/outfits/graduate.webp", 276, 480),
    ("witch", "月亮小巫師", en("月亮小巫師", "Moon witch"), "assets/outfits/witch.webp", 394, 480),
]
rack = "\n".join(
    '      <li data-reveal style="--d:%d"><button type="button" data-outfit="%s" aria-pressed="false"><img src="%s" width="%d" height="%d" loading="lazy" alt="">%s</button></li>'
    % (i % 6, o, src, w, h, both(zh, e)) for i, (o, zh, e, src, w, h) in enumerate(OUTFITS))

SLIDES = [
    ("home", "sky", "i-event", "聊天首頁", "Home", "一打開，<em>今天</em>就在眼前", "Open it. <em>Today</em> is right there.",
     "最上面那張卡是今天：下一件事幾點、還有幾堂課、幾個行程、幾項待辦。今天的事過完，它會換成明天。",
     "The card on top is today: what's next and when, and how many classes, plans and to-dos are left. When today is done, it turns to tomorrow.", False),
    ("study", "homework", "i-homework", "課業", "Study", "再也不會忘記<em>截止日</em>", "Never miss a <em>deadline</em>.",
     "作業和考試放在一起，每一筆都有倒數。快到期會變色，逾期會提醒你。長按圓圈完成，會有彩帶。",
     "Homework and exams in one list, each with a countdown. It changes colour when it's close and flags what's overdue. Hold the circle to finish, with confetti.", False),
    ("plans", "event", "i-event", "行程與待辦", "Plans &amp; to-dos", "整個月，<em>一眼</em>看完", "Your whole month, <em>at a glance</em>.",
     "月曆上每一天底下直接顯示那天有什麼。待辦可以不寫日期，想到就記。",
     "The calendar shows what's on each day, right under the date. To-dos don't need a date; jot them down as they come.", False),
    ("spending", "expense", "i-expense", "記帳", "Spending", "錢花去哪，<em>一看就懂</em>", "Know where it <em>all went</em>.",
     "「午餐 120」自動歸到餐飲。圓餅圖看這個月花在哪，可以切換月份看以前的紀錄。",
     "\"lunch 12.5\" lands in Food on its own. A pie chart shows where the month went; flip back to earlier months any time.", False),
    ("focus", "todo", "i-timer", "讀書計時", "Focus timer", "想專心多久，<em>你決定</em>", "Focus <em>your way</em>.",
     "5、15、25、45 分鐘，Pro 可以自訂 1 到 180 分鐘。Novi 陪你專心，完成拿一顆糖果。",
     "5, 15, 25 or 45 minutes, or any length from 1 to 180 with Pro. Novi keeps you company, and a finished session earns a candy.", False),
    ("timetable", "butter", "i-exam", "課表與成績", "Timetable &amp; grades", "課表和成績，<em>一起算好</em>", "Timetable and grades, <em>worked out</em>.",
     "每週課表一眼看完，撞堂會提醒。各科成績算出學期平均和 GPA 估算，還告訴你剩下要考幾分。",
     "A weekly timetable that flags clashes. Grades add up to a term average and a GPA estimate, and show what you need on the rest.", True),
]
slides = "\n".join(
    '      <article class="slide" data-slide="%s" data-tone="%s">\n        <p class="eyebrow">%s%s%s</p>\n        %s\n        %s\n      </article>'
    % (key, tone, icon(ic), both(kz, ke), '<span class="pro-mark">PRO</span>' if pro else "", both(hz, he, "h3"), both(pz, pe, "p"))
    for key, tone, ic, kz, ke, hz, he, pz, pe, pro in SLIDES)
ALT = {"home": ("Novi 聊天首頁：最上面是今天的卡片，下面是聊天室列表。", "Novi home: a card for today on top, then the list of chats."),
       "study": ("Novi 課業頁：作業和考試在同一個列表，每筆標示還剩幾天。", "Novi Study screen: homework and exams in one list, each showing the days left."),
       "plans": ("Novi 行程頁：一週的日期列、當天行程和待辦。", "Novi Plans screen: a week strip, the day's plans and to-dos."),
       "spending": ("Novi 記帳頁：本月支出總額和分類圓餅圖。", "Novi Spending screen: the month's total and a pie chart by category."),
       "focus": ("Novi 讀書計時頁：Novi 在倒數圓圈裡陪你。", "Novi Focus timer: Novi sits inside the countdown ring."),
       "timetable": ("Novi 課表頁：一週的課排成格子，撞堂有提醒。", "Novi Timetable: the week's classes on a grid, with clashes flagged.")}
phones = "\n".join(
    '      <figure class="phone" data-phone><img lang="zh-Hant" src="assets/shots2/zh-%s.webp" width="660" height="1434" %s alt="%s"><img lang="en" src="assets/shots2/en-%s.webp" width="660" height="1434" %s alt="%s"></figure>'
    % (k, 'loading="lazy"', ALT[k][0], k, 'loading="lazy"', ALT[k][1]) for k, *_ in SLIDES)
dots = "\n".join('      <button type="button" data-dot aria-label="%d / %d"></button>' % (i + 1, len(SLIDES)) for i in range(len(SLIDES)))

ORBIT = [("homework", "作業", "Homework", "i-homework", 4, 16, 26), ("exam", "考試", "Exam", "i-exam", 70, 8, -18), ("event", "行程", "Event", "i-event", 80, 46, 34),
         ("todo", "待辦", "To-do", "i-check", -2, 58, -30), ("expense", "記帳", "Spending", "i-expense", 66, 80, 20)]
orbit = "\n".join('        <li style="--c:var(--%s);--x:%d%%;--y:%d%%;--depth:%d;--i:%d">%s%s</li>' % (c, x, y, d, i, icon(ic), both(zh, e))
                  for i, (c, zh, e, ic, x, y, d) in enumerate(ORBIT))

store = '<a class="store" data-store aria-disabled="true">' + \
    '<span class="soon" lang="zh-Hant">即將在 App Store 上架</span><span class="soon" lang="en">Coming soon to the App Store</span>' + \
    '<span class="live" lang="zh-Hant">在 App Store 下載</span><span class="live" lang="en">Download on the App Store</span></a>'

page = f'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Novi：打一句，幫你分好</title>
<meta name="description" content="Novi 是 iPhone 記事 app，也是陪你記事的小機器人。打一句話，作業、考試、行程、待辦、記帳自動分類，到時提醒。記錄留在你的手機。">
<link rel="canonical" href="https://heynovi.app/">
<meta name="theme-color" content="#060A13">
<meta name="color-scheme" content="dark">
<!-- When Novi is live, uncomment for Safari's own banner: <meta name="apple-itunes-app" content="app-id=6829156001"> -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Novi">
<meta property="og:title" content="Novi：One line. Everything sorted.">
<meta property="og:description" content="打一句，Novi 幫你分好。Type one line; homework, exams, events, to-dos and spending sort themselves and remind you.">
<meta property="og:url" content="https://heynovi.app/">
<meta property="og:image" content="https://heynovi.app/assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Novi, a small blue robot waving, next to the words One line. Everything sorted.">
<meta property="og:locale" content="zh_TW">
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon-64.png" sizes="64x64" type="image/png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="stylesheet" href="site.css">
<script src="site.js"></script>
<script src="novi.js" defer></script>
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Novi","operatingSystem":"iOS","applicationCategory":"ProductivityApplication","url":"https://heynovi.app/","image":"https://heynovi.app/assets/og.jpg","description":"Type one line and homework, exams, events, to-dos and spending sort themselves and remind you.","inLanguage":["zh-Hant","en","ja","ko"],"offers":{{"@type":"Offer","price":"0","priceCurrency":"USD"}},"author":{{"@type":"Person","name":"Jerry Tai"}}}}
</script>
</head>
<body>
<div class="sky" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="grain" aria-hidden="true"></div>
<svg width="0" height="0" class="sprite" aria-hidden="true" focusable="false">
  <symbol id="i-homework" viewBox="0 0 24 24"><path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Z"/><path d="M5 16.5a3 3 0 0 1 3-3h11"/></symbol>
  <symbol id="i-exam" viewBox="0 0 24 24"><path d="m2.5 9.5 9.5-5 9.5 5-9.5 5-9.5-5Z"/><path d="M6.5 12v5c3.3 2.4 7.7 2.4 11 0v-5"/></symbol>
  <symbol id="i-event" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4"/></symbol>
  <symbol id="i-expense" viewBox="0 0 24 24"><path d="M16.5 7.5c-.8-1.6-2.4-2.5-4.5-2.5-2.6 0-4.5 1.4-4.5 3.4 0 4.8 9.3 2.3 9.3 7.2 0 2-2 3.4-4.8 3.4-2.2 0-4-1-4.8-2.7M12 2.5v19"/></symbol>
  <symbol id="i-timer" viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
  <symbol id="i-send" viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></symbol>
</svg>

<a class="skip" href="#demo">{both("跳到內容", "Skip to content")}</a>

<header class="nav" data-nav>
  <a class="brand" href="./"><img src="assets/icon-80.webp" alt="" width="34" height="34"> Novi</a>
  <nav class="links" aria-label="Main">
    <a href="#features">{both("功能", "Features")}</a>
    <a href="#wardrobe">{both("造型", "Outfits")}</a>
    <a href="#pro">Pro</a>
    <a href="#privacy">{both("隱私", "Privacy")}</a>
    <a href="#support">{both("支援", "Support")}</a>
  </nav>
  <div class="nav-end">
    <div class="switch" role="group" aria-label="Language 語言" data-switch hidden>
      <button type="button" data-set-lang="zh">中文</button>
      <button type="button" data-set-lang="en">EN</button>
    </div>
    <button class="menu" type="button" data-menu aria-expanded="false" aria-label="Menu 選單"><span></span></button>
  </div>
</header>

<!-- Novi walks the page: a canvas puppet with its feet on the bottom edge. Decorative; every line it says is also on the page. -->
<div class="novi" data-novi aria-hidden="true"><canvas width="2" height="2"></canvas><button type="button" data-novi-btn tabindex="-1"></button></div>
<p class="novi-say" data-novi-say aria-hidden="true"></p>

<main>
<section class="hero" data-stop="hero" data-x="0.74" data-xm="0.5" data-move="wave">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow" data-reveal>{both("iPhone 上的記事小機器人", "A notes app with a robot inside")}</p>
      <h1 data-reveal style="--d:1">
        <span lang="zh-Hant">打一句，<em>Novi 幫你分好</em></span>
        <span lang="en">One line. <em>Everything sorted.</em></span>
      </h1>
      {both("作業、考試、行程、待辦、記帳，像傳訊息一樣打一句，到時候提醒你。", "Homework, exams, events, to-dos and spending. Type it like a text, and Novi reminds you when it matters.", "p", "lead").replace('<p class="lead"', '<p class="lead" data-reveal style="--d:2"')}
      <div data-reveal style="--d:3">{store}</div>
      {both("適用 iPhone。記錄留在手機，不用帳號。", "For iPhone. Your records stay on your phone, no account.", "p", "fine").replace('<p class="fine"', '<p class="fine" data-reveal style="--d:4"')}
    </div>
    <div class="hero-stage" data-hero-stage>
      <img class="fallback" src="assets/novi-wave.webp" width="540" height="928" alt="Novi, a small blue robot with pink eyes, waving. Its chest screen says Hi!">
      <ul class="orbit" aria-hidden="true">
{orbit}
      </ul>
    </div>
  </div>
  <a class="cue" href="#demo">{both("跟著 Novi 往下", "Follow Novi")}</a>
</section>

<section class="sec" id="demo" data-stop="demo" data-x="0.045" data-xm="0.14" data-move="typing">
  <div class="wrap demo-grid">
    <div>
      <p class="eyebrow" data-reveal>{both("親手試試", "Try it yourself")}</p>
      <h2 lang="zh-Hant" data-reveal style="--d:1">不用選分類，<em>不用填表單</em></h2>
      <h2 lang="en" data-reveal style="--d:1">No categories to pick. <em>No forms to fill.</em></h2>
      {both("像傳訊息給朋友一樣打一句，Novi 自己判斷這是作業、考試、行程、待辦還是記帳。中文、英文、日文、韓文都看得懂，判斷錯了，點一下就能改。", "Type one line the way you'd text a friend. Novi works out whether it's homework, an exam, an event, a to-do or spending. It understands Chinese, English, Japanese and Korean. Guessed wrong? Tap to change it.", "p", "lead").replace('<p class="lead"', '<p class="lead" data-reveal style="--d:2"')}
      <ul class="kinds" data-reveal style="--d:3" aria-hidden="true">
        <li class="tag t-homework">{both("作業", "Homework")}</li><li class="tag t-exam">{both("考試", "Exam")}</li><li class="tag t-event">{both("行程", "Event")}</li><li class="tag t-todo">{both("待辦", "To-do")}</li><li class="tag t-expense">{both("記帳", "Spending")}</li>
      </ul>
    </div>
    <div class="console glass" data-console data-reveal style="--d:2">
      <ol class="thread" data-thread aria-live="polite"></ol>
      <div class="chips">
        <button type="button" data-line lang="zh-Hant">明天 3點 練球</button><button type="button" data-line lang="zh-Hant">數學小考 下禮拜三</button><button type="button" data-line lang="zh-Hant">午餐 120</button><button type="button" data-line lang="zh-Hant">記得買牛奶</button><button type="button" data-line lang="zh-Hant">化學報告 11/20</button>
        <button type="button" data-line lang="en">tomorrow 3pm practice</button><button type="button" data-line lang="en">Math quiz next wed</button><button type="button" data-line lang="en">lunch 12.5</button><button type="button" data-line lang="en">remember to buy milk</button><button type="button" data-line lang="en">Essay due fri 3pm</button>
      </div>
      <form class="composer" data-composer>
        <input type="text" data-input autocomplete="off" autocapitalize="off" enterkeyhint="send" maxlength="80">
        <button type="submit"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-send"/></svg></button>
      </form>
      {both("這是網頁上的簡化示範，分類在你的瀏覽器裡完成，不會送出去。App 看得懂的說法更多。", "A simplified demo that runs in your browser; nothing is sent anywhere. The app understands far more.", "p", "fine")}
    </div>
  </div>
</section>

<section class="tour" id="features" data-tour data-stop="tour" data-x="0.47" data-xm="0.14" aria-label="Features">
  <div class="tour-stage">
    <div class="tour-copy">
{slides}
    </div>
    <div class="reel">
{phones}
    </div>
    <div class="dots" role="group" aria-label="Features">
{dots}
    </div>
  </div>
</section>

<section class="sec" id="wardrobe" data-stop="wardrobe" data-x="0.955" data-xm="0.84" data-move="shy" style="--tone:var(--blush)">
  <div class="wrap closet">
    <div>
      <p class="eyebrow" data-reveal>{both("Novi 的衣櫥", "Novi's wardrobe")}</p>
      <h2 lang="zh-Hant" data-reveal style="--d:1">25+ 套造型，<em>點一件，它現在就換</em></h2>
      <h2 lang="en" data-reveal style="--d:1">25+ outfits. <em>Tap one and Novi changes now.</em></h2>
      {both("在 App 裡多開幾天就多一件衣服，節日還有限定造型。下面先挑一套，讓帶路的 Novi 穿給你看。", "In the app, the wardrobe grows as you keep coming back, and holidays bring their own outfits. Pick one below and your guide will wear it.", "p", "lead").replace('<p class="lead"', '<p class="lead" data-reveal style="--d:2"')}
    </div>
    <ul class="rack" data-rack aria-label="Outfits">
{rack}
    </ul>
  </div>
</section>

<section class="sec" id="pro" data-stop="pro" data-x="0.045" data-xm="0.14" data-move="flex" style="--tone:var(--butter)">
  <div class="wrap">
    <div class="pro-top">
      <div>
        <p class="eyebrow" data-reveal>Novi Pro</p>
        <h2 lang="zh-Hant" data-reveal style="--d:1">免費就能用，<em>想要更多再升級</em></h2>
        <h2 lang="en" data-reveal style="--d:1">Free to use. <em>More when you want it.</em></h2>
        {both("打一句分類、提醒、課業、月曆、待辦、記帳、新聞，全部免費。Pro 有買斷和訂閱兩種，各地價格以 App Store 顯示為準。", "Sorting, reminders, study, calendar, to-dos, spending and news are all free. Pro comes as a one-time purchase or a subscription; the App Store shows the price for your region.", "p", "lead").replace('<p class="lead"', '<p class="lead" data-reveal style="--d:2"')}
      </div>
      <div class="duo" data-reveal style="--d:2" aria-hidden="true">
        <figure class="phone"><img lang="zh-Hant" src="assets/shots2/zh-grades.webp" width="660" height="1434" loading="lazy" alt=""><img lang="en" src="assets/shots2/en-grades.webp" width="660" height="1434" loading="lazy" alt=""></figure>
        <figure class="phone"><img lang="zh-Hant" src="assets/shots2/zh-chat.webp" width="660" height="1434" loading="lazy" alt=""><img lang="en" src="assets/shots2/en-chat.webp" width="660" height="1434" loading="lazy" alt=""></figure>
      </div>
    </div>
    <div class="plans">
      <div class="plan-card glass" data-reveal>
        <h3>{both("免費", "Free")}</h3>
        <p class="price">US$0</p>
        {both("不用帳號，沒有廣告。", "No account, no ads.", "p")}
      </div>
      <div class="plan-card glass" data-reveal style="--d:1">
        <h3>{both("Pro 買斷", "Pro, one-time")}</h3>
        <p class="price">US$3.99</p>
        {both("付一次，下表的 Pro 功能永久擁有。", "Pay once and keep the Pro features below for good.", "p")}
      </div>
      <div class="plan-card glass best" data-reveal style="--d:2">
        <span class="flag">{both("含 AI 秘書", "WITH THE AI SECRETARY")}</span>
        <h3>{both("Pro 訂閱", "Pro subscription")}</h3>
        <p class="price">US$39.99 <small>{both("／年", "/ year")}</small></p>
        {both("或 US$5.99／月。所有 Pro 功能，再加上 AI 秘書；新訂閱可免費試用 1 週。", "Or US$5.99 a month. Every Pro feature plus the AI secretary, with a 1-week free trial for new subscribers.", "p")}
      </div>
    </div>
    <details class="compare" data-reveal>
      <summary>{both("免費版和 Pro 差在哪", "What's in Free and what's in Pro")}</summary>
      {table}
    </details>
    {both("AI 秘書看得到你接下來 7 天的行程，幫你排一週計畫、在簡報裡寫建議、提醒撞期，也能用講的一次改好幾筆。它用的是雲端 AI，所以只在訂閱方案裡。訂閱會自動續訂，可隨時到「設定 → Apple 帳號 → 訂閱」取消。買斷包含之後新增的 Pro 功能，需要持續付費的雲端服務除外。", "The AI secretary sees your next 7 days: it plans your week, writes advice into briefs, warns about clashes and changes several items from one sentence. It runs on cloud AI, so it is part of the subscription only. The subscription renews automatically; cancel any time in Settings → Apple Account → Subscriptions. The one-time purchase includes later Pro features, except cloud services with ongoing costs.", "p", "fine pro-note")}
  </div>
</section>

<section class="sec" id="privacy" data-stop="privacy" data-x="0.955" data-xm="0.84" data-move="hug" style="--tone:var(--event)">
  <div class="wrap">
    <div class="vault glass" data-reveal>
      <div>
        <p class="eyebrow">{both("隱私", "Privacy")}</p>
        <h2 lang="zh-Hant">你的記錄，<em>留在你的手機</em></h2>
        <h2 lang="en">Your records <em>stay on your phone.</em></h2>
        {both("作業、行程、記帳和聊天都存在手機裡，我們看不到。刪掉 App，資料就一起刪掉。", "Homework, plans, spending and chats are stored on your phone, where we can't see them. Delete the app and the data goes with it.", "p", "lead")}
        {both("Novi 只在三種時候連網：讀新聞、替天氣簡報查預報，以及你自己打開 AI 秘書的時候。打開後，你打的那句話和接下來 7 天的事項會經過我們的伺服器交給雲端 AI，伺服器不保存內容。", "Novi goes online for three things only: reading the news, looking up a forecast for weather briefs, and the AI secretary if you turn it on. Then the line you typed and your next 7 days of items pass through our server to a cloud AI, and the server keeps none of it.", "p", "lead")}
        <a class="more" href="privacy.html">{both("閱讀完整隱私權政策 →", "Read the full privacy policy →")}</a>
      </div>
      <ul class="trio">
        <li>{both("沒有帳號", "No account")}</li>
        <li>{both("沒有廣告", "No ads")}</li>
        <li>{both("沒有追蹤工具", "No trackers")}</li>
      </ul>
    </div>
  </div>
</section>

<section class="sec" id="support" data-stop="support" data-x="0.045" data-xm="0.14" data-move="think" style="--tone:var(--todo)">
  <div class="wrap help">
    <div class="help-head">
      <p class="eyebrow" data-reveal>{both("支援", "Support")}</p>
      <h2 lang="zh-Hant" data-reveal style="--d:1">{zh_title}</h2>
      <h2 lang="en" data-reveal style="--d:1">{en_title}</h2>
      {both('找不到答案？來信 <a href="mailto:jerrytai8888@gmail.com">jerrytai8888@gmail.com</a>，通常幾天內回覆。', 'Can&#39;t find it here? Write to <a href="mailto:jerrytai8888@gmail.com">jerrytai8888@gmail.com</a>. Replies usually come within a few days.', "p", "lead").replace('<p class="lead"', '<p class="lead" data-reveal style="--d:2"')}
    </div>
    <div class="faq" data-reveal style="--d:1">
    <section id="zh" lang="zh-Hant">
      <h2>{zh_title}</h2>
{zh_faq}
    </section>
    <section id="en" lang="en">
      <h2>{en_title}</h2>
{en_faq}
    </section>
    </div>
  </div>
</section>
</main>

<footer data-stop="bye" data-x="0.5" data-xm="0.5" data-move="wave">
  <h2 lang="zh-Hant" data-reveal>打一句，<em>剩下交給 Novi</em></h2>
  <h2 lang="en" data-reveal>One line. <em>Novi does the rest.</em></h2>
  <div data-reveal style="--d:1">{store}</div>
  <div class="foot">
    <nav aria-label="Footer">
      <a href="privacy.html">{both("隱私權政策", "Privacy Policy")}</a>
      <a href="#support">{both("支援", "Support")}</a>
      <a href="mailto:jerrytai8888@gmail.com">{both("聯絡", "Contact")}</a>
    </nav>
    <p>繁體中文 · English · 日本語 · 한국어</p>
    <p>© 2026 Jerry Tai</p>
  </div>
</footer>
</body>
</html>
'''
open(os.path.join(ROOT, "index.html"), "w").write(page)
print("index.html", len(page), "bytes")
