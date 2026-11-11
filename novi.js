/* The jointed Novi from the app, drawn on a canvas, guiding the page.
   The rig, the poses and the drawing order are a port of PuppetRobot.swift:
   a 512-unit scene, left and right always the viewer's. */
(function () {
  "use strict";

  const INK = "#4D4963", SCREEN = "#F6BECB";
  const rad = (d) => (d * Math.PI) / 180;
  const vec = (deg, len) => [Math.cos(rad(deg)) * len, Math.sin(rad(deg)) * len];
  const heading = (a, b) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const plus = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const v = clamp(x, 0, 1); return v * v * (3 - 2 * v); };
  const spring = (x) => { const v = Math.max(0, x); return v >= 1 ? 1 : 1 - Math.exp(-7 * v) * Math.cos(8 * v); };

  /* ---------- poses ---------- */

  function Pose() {
    return { uL: 0, uR: 0, fL: 0, fR: 0, hL: 0, hR: 0, head: 0, headDrop: 0, bob: 0, sway: 0, blink: 0,
             step: 0, liftL: 0, liftR: 0, kickL: 0, kickR: 0, lean: 0, turn: 0, lookX: 0, lookY: 0,
             walking: false, raised: null, handsFront: false };
  }

  const LENGTH = { wave: 1.2, celebrate: 1.0, point: 1.2, typing: 1.4, clap: 1.2, think: 1.6, nod: 1.0, jump: 1.0,
                   dance: 1.6, shy: 1.2, look: 1.6, tilt: 1.0, spin: 1.2, shrug: 1.2, hug: 1.6, flex: 1.2,
                   peekaboo: 1.8, bow: 1.1, stretch: 1.4 };
  const LAG = 0.06;

  function stride(phase, env, lift) {
    const s = Math.sin(phase), trail = Math.sin(phase - 0.6) * env, last = Math.sin(phase - 1.1) * env;
    const p = Pose();
    p.walking = true;
    p.step = s * env;
    p.liftL = 7 * Math.pow(Math.max(0, s), 1.5) * env * lift;
    p.liftR = 7 * Math.pow(Math.max(0, -s), 1.5) * env * lift;
    p.bob = 1.2 * s * s * env;
    p.sway = 1.8 * s * env;
    p.uL = 10 * p.step; p.uR = 10 * p.step; p.fL = 8 * trail; p.fR = 8 * trail;
    p.hL = 6 * last; p.hR = 6 * last; p.head = -1.2 * trail;
    return p;
  }

  function raw(move, t) {
    const g = spring(t / 0.25) * smooth((1 - t) / 0.25), w = Math.sin(t * 6 * Math.PI) * g, e = Math.sin(Math.PI * t);
    const p = Pose();
    const both = (u = 0, f = 0, h = 0) => { p.uL += u; p.uR -= u; p.fL += f; p.fR -= f; p.hL += h; p.hR -= h; };
    switch (move) {
      case "wave":
        p.uL = 20 * g; p.fL = 190 * g + 14 * w; p.hL = 175 * g + 20 * w; p.head = -2 * g; p.raised = "left"; break;
      case "celebrate":
        p.uL = 20 * g; p.uR = -20 * g; p.fL = 180 * g; p.fR = -180 * g;
        p.hL = 165 * g - 5 * w; p.hR = -165 * g + 5 * w; p.bob = -4 * e; break;
      case "shy":
        p.uL = -10 * g; p.uR = 10 * g; p.fL = -115 * g; p.fR = 115 * g; p.hL = -130 * g; p.hR = 130 * g; p.head = 5 * g; break;
      case "bow":
        p.head = 2 * g; p.headDrop = 12 * g; p.bob = 6 * g; p.uL = -8 * g; p.uR = 8 * g; p.walking = true; break;
      case "stretch":
        p.uL = 45 * g; p.uR = -45 * g; p.fL = 195 * g; p.fR = -195 * g; p.hL = 170 * g; p.hR = -170 * g; p.head = -4 * g; p.bob = -4 * e; break;
      case "jump": {
        const air = clamp((t - 0.28) / 0.44, 0, 1), h = 4 * air * (1 - air);
        const squat = t < 0.28 ? Math.sin((t / 0.28) * Math.PI) : t > 0.72 ? Math.sin(((t - 0.72) / 0.28) * Math.PI) : 0;
        const up = smooth((t - 0.2) / 0.15) * smooth((0.8 - t) / 0.15);
        p.walking = true; p.bob = 9 * squat - 24 * h; p.liftL = 32 * h; p.liftR = 32 * h;
        p.uL = 20 * up; p.uR = -20 * up; p.fL = 180 * up; p.fR = -180 * up; p.hL = 165 * up; p.hR = -165 * up; break;
      }
      case "dance": {
        const s = Math.sin(t * 4 * Math.PI);
        p.walking = true; p.sway = 6 * s * g; p.bob = 3 * s * s * g; p.head = 5 * s * g;
        p.liftL = 5 * Math.max(0, -s) * g; p.liftR = 5 * Math.max(0, s) * g;
        p.uL = 20 * g; p.uR = -20 * g; p.fL = (130 + 50 * s) * g; p.fR = (-130 + 50 * s) * g;
        p.hL = (120 + 50 * s) * g; p.hR = (-120 + 50 * s) * g; break;
      }
      case "clap": {
        const k = (1 - Math.cos(t * 8 * Math.PI)) / 2;
        p.uL = (-30 - 12 * k) * g; p.uR = (30 + 12 * k) * g; p.fL = -85 * g; p.fR = 85 * g; p.hL = -100 * g; p.hR = 100 * g; break;
      }
      case "nod":
        p.headDrop = 10 * Math.pow(Math.sin(t * 2 * Math.PI), 2); p.head = g; break;
      case "think":
        p.uL = -70 * g; p.fL = -145 * g + 3 * w; p.hL = -165 * g; p.head = 5 * g; p.raised = "left"; p.handsFront = g > 0.5; break;
      case "flex":
        p.uL = 60 * g; p.uR = -60 * g; p.fL = 205 * g + 10 * w; p.fR = -205 * g - 10 * w; p.hL = 190 * g; p.hR = -190 * g; p.bob = -2 * e; break;
      case "spin": {
        const h = Math.pow(Math.sin(Math.PI * t), 2);
        p.walking = true; p.bob = -20 * h; p.liftL = 26 * h; p.liftR = 26 * h; p.turn = smooth(t); both(20 * g, 40 * g, 30 * g); break;
      }
      case "look": {
        const s = Math.sin(t * 2 * Math.PI);
        p.head = 6 * s * g; p.lookX = 8 * s * g; break;
      }
      case "tilt":
        p.head = 11 * g; p.lookX = 5 * g; p.lookY = -4 * g; break;
      case "peekaboo": {
        const hide = smooth(t / 0.22) * smooth((0.74 - t) / 0.1), boo = smooth((t - 0.68) / 0.1) * smooth((1 - t) / 0.14);
        both(150 * hide + 45 * boo, 205 * hide + 90 * boo, 190 * hide + 80 * boo);
        p.handsFront = hide > 0.6; p.bob = -3 * boo; break;
      }
      case "point":
        p.uR = -60 * g; p.fR = -115 * g + 4 * w; p.hR = -100 * g; p.head = 5 * g; p.lookX = 8 * g; p.raised = "right"; break;
      case "hug": {
        const open = smooth(t / 0.25) * smooth((0.5 - t) / 0.15), hold = smooth((t - 0.4) / 0.2) * smooth((1 - t) / 0.15);
        both(45 * open - 30 * hold, 60 * open - 95 * hold, 50 * open - 110 * hold);
        p.sway = 3 * Math.sin(t * 4 * Math.PI) * hold; p.head = 3 * hold; break;
      }
      case "shrug":
        both(-10 * g, 105 * g, 110 * g); p.headDrop = 4 * g; p.head = 4 * g; p.lookY = -3 * g; break;
      case "typing": {
        const k = Math.sin(t * 16 * Math.PI);
        both(-30 * g, -70 * g, -90 * g); p.fL += 8 * k * g; p.fR += 8 * k * g; p.lookY = 5 * g; p.head = 2 * g; break;
      }
    }
    return p;
  }

  /* Forearms and hands trail the upper arm, so a limb swings from the shoulder. */
  function movePose(move, t) {
    const len = LENGTH[move] || 1, now = t * (len + 2 * LAG);
    const at = (time) => raw(move, clamp(time / len, 0, 1));
    const p = at(now), fore = at(now - LAG), hand = at(now - 2 * LAG);
    p.fL = fore.fL; p.fR = fore.fR; p.hL = hand.hL; p.hR = hand.hR; p.head = fore.head;
    return p;
  }

  function breathing(time) {
    const a = (time * 2 * Math.PI) / 3.4, p = Pose();
    p.walking = true; p.bob = 0.9 * Math.sin(a); p.head = 1.1 * Math.sin(a * 0.37 + 1);
    p.uL = 1.6 * Math.sin(a); p.uR = -1.6 * Math.sin(a); p.fL = 1.2 * Math.sin(a - 0.6); p.fR = -1.2 * Math.sin(a - 0.6);
    return p;
  }

  function blinkAt(time, period) {
    const t = time % period, len = 0.36;
    if (t >= len) return 0;
    const x = t / len;
    return x < 0.35 ? x / 0.35 : x < 0.5 ? 1 : (1 - x) / 0.5;
  }

  function sum(a, b) {
    const p = Pose();
    for (const k of ["uL", "uR", "fL", "fR", "hL", "hR", "head", "headDrop", "bob", "sway", "step", "liftL", "liftR", "kickL", "kickR", "lean", "turn", "lookX", "lookY"]) p[k] = a[k] + b[k];
    p.blink = Math.max(a.blink, b.blink);
    p.walking = a.walking || b.walking; p.raised = a.raised || b.raised; p.handsFront = a.handsFront || b.handsFront;
    return p;
  }

  /* ---------- rig ---------- */

  const CAPES = new Set(["ghost", "candycorn", "bat", "devil", "vampire", "cobweb", "pumpkin", "mummy"]);

  function arm(rig, side, p) {
    const left = side === "left", holding = rig.prop === side;
    let u = (left ? 120 : 60) + (left ? p.uL : p.uR);
    let f = (left ? 65 : 115) + (left ? p.fL : p.fR);
    let h = (left ? 80 : 100) + (left ? p.hL : p.hR);
    if (rig.prop === "left" && p.raised === "left" && !left) { u = 60 - p.uL; f = 115 - p.fL; h = 100 - p.hL; }
    if (rig.prop === "right" && p.raised === "right" && left) { u = 120 - p.uR; f = 65 - p.fR; h = 80 - p.hR; }
    if (holding) {
      const hold = rig.propAngles || (left ? [120, 65] : [60, 115]);
      u = hold[0] + (p.walking ? 2 * p.step : 0);
      f = hold[1] + (p.walking ? 1.5 * p.step : 0);
      h = left ? 80 : 100;
    }
    const shoulder = rig.shoulders[left ? 0 : 1];
    const elbow = plus(shoulder, vec(u, 42)), wrist = plus(elbow, vec(f, 40));
    return [["Upper", shoulder, u], ["Fore", elbow, f], ["Hand", wrist, h]].map(([name, at, angle], i) => {
      const key = side + name, bone = rig.arms[key];
      return { key, source: key, pivot: bone.pivot, at,
               angle: i === 2 && holding ? 0 : angle - heading(bone.pivot, bone.end),
               scale: i === 0 ? 42 / dist(bone.pivot, bone.end) : i === 1 ? 40 / dist(bone.pivot, bone.end) : rig.handScale };
    });
  }

  /* Thigh, shin and shoe, with the knee solved from the foot's target. */
  function leg(rig, i, p) {
    const side = i === 1 ? "right" : "left", source = side + "Leg", bone = rig.legs[i], scale = bone.scale;
    const top = [i === 1 ? 278 : 235, rig.hip];
    const rest = [(bone.ankle[0] - bone.pivot[0]) * scale, (bone.ankle[1] - bone.pivot[1]) * scale];
    const lift = i === 1 ? p.liftR : p.liftL;
    const target = plus(top, [rest[0] + (p.walking ? -p.sway + 2 * p.step : 0) + (i === 1 ? p.kickR : p.kickL),
                              rest[1] - (p.walking ? p.bob + lift : 0)]);
    const a = dist(bone.pivot, bone.knee) * scale, d = dist(bone.knee, bone.ankle) * scale;
    const reach = Math.min(a + d, Math.max(0.001, dist(top, target)));
    const bend = (Math.acos(clamp((a * a + reach * reach - d * d) / (2 * a * reach), -1, 1)) * 180) / Math.PI;
    const upper = heading(top, target) + (i === 1 ? -bend : bend);
    const joint = plus(top, vec(upper, a));
    const footAngle = p.walking ? (i === 1 ? 1 : -1) * 3 * Math.max(0, i === 1 ? -p.step : p.step) : 0;
    return [
      { key: side + "Thigh", source, pivot: bone.pivot, at: top, angle: upper - heading(bone.pivot, bone.knee), scale, cut: ["thigh", i] },
      { key: side + "Shin", source, pivot: bone.knee, at: joint, angle: heading(joint, target) - heading(bone.knee, bone.ankle), scale, cut: ["shin", i] },
      { key: side + "Foot", source, pivot: bone.ankle, at: target, angle: footAngle, scale, cut: ["foot", i] },
    ];
  }

  /* Back to front: legs, upper arms, body, forearms and hands, head. */
  function layers(rig, p) {
    const l = arm(rig, "left", p), r = arm(rig, "right", p), box = rig.parts.head.size;
    const eyeGap = rig.eyes.length === 2 ? Math.max(1, Math.hypot(rig.eyes[1][0] - rig.eyes[0][0], rig.eyes[1][1] - rig.eyes[0][1])) : box[0] / 3;
    const head = { key: "head", source: "head", pivot: rig.headPivot, at: [256, 245 + p.headDrop], angle: -3 + p.head,
                   scale: Math.min(94 / eyeGap, 245 / rig.headPivot[1]) * (rig.headFix || 1) };
    const torso = { key: "torso", source: "torso", pivot: rig.torsoPivot, at: [256, 245], angle: 0, scale: rig.torsoScale };
    const hands = [l[2], l[1], r[2], r[1]];
    const body = CAPES.has(rig.id) ? [torso, l[0], r[0]] : [l[0], r[0], torso];
    return leg(rig, 0, p).concat(leg(rig, 1, p), body, p.handsFront ? [head].concat(hands) : hands.concat([head]));
  }

  /* Each leg picture is shared by three pieces; these keep each to its own stretch. */
  function clipLeg(ctx, rig, cut) {
    const b = rig.legs[cut[1]], knee = b.knee, ankle = b.ankle, r1 = b.radius, r2 = b.radius * 0.8;
    const region = (rect, c, r) => {
      const path = new Path2D();
      path.rect(rect[0], rect[1], rect[2], rect[3]);
      path.moveTo(c[0] + r, c[1]);
      path.arc(c[0], c[1], r, 0, Math.PI * 2);
      ctx.clip(path);
    };
    const above = (y) => [-300, -300, 1200, y + 300], below = (y) => [-300, y, 1200, 1200];
    if (cut[0] === "thigh") region(above(knee[1]), knee, r1);
    if (cut[0] === "shin") { region(below(knee[1]), knee, r1); region(above(ankle[1]), ankle, r2); }
    if (cut[0] === "foot") region(below(ankle[1]), ankle, r2);
  }

  const EYE_ASPECT = 0.9, EYE_GAP = 0.6, EYE_FACE = 0.58;

  /* The painted head has no eyes, so they can blink and look around. */
  function drawEyes(ctx, rig, pose, gaze) {
    const squeeze = rig.headSqueeze || 1;
    const midX = rig.eyes.reduce((s, e) => s + e[0], 0) / Math.max(1, rig.eyes.length);
    for (const eye of rig.eyes) {
      const h = rig.faceHeight ? rig.faceHeight * EYE_FACE : eye[3], w = (h * EYE_ASPECT) / squeeze;
      const side = eye[0] < midX ? -1 : 1;
      ctx.save();
      ctx.translate(midX + (side * w * (1 + EYE_GAP)) / 2, eye[1]);
      ctx.rotate(rad(eye[4]));
      ctx.save();
      const lid = (h + 12) * (1 - pose.blink);
      ctx.beginPath(); ctx.rect(-w, -lid / 2, 2 * w, lid); ctx.clip();
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2 + 4);
      ctx.quadraticCurveTo(0, -h / 2 - 5, w / 2 - 2, -h / 2);
      ctx.lineTo(w / 2, h / 2 - 2);
      ctx.quadraticCurveTo(0, h / 2 + 3, -w / 2 + 2, h / 2);
      ctx.closePath();
      ctx.fillStyle = SCREEN; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.stroke();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 8); else ctx.rect(-w / 2, -h / 2, w, h);
      ctx.clip();
      const rx = (h * 0.14) / squeeze, ry = h * 0.22;
      const px = -w * 0.17 + gaze[0] + pose.lookX, py = h * 0.12 + gaze[1] + pose.lookY;
      ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
      ctx.restore();
      if (pose.blink > 0.94) {
        ctx.beginPath(); ctx.moveTo(-w * 0.4, 0); ctx.quadraticCurveTo(0, 8, w * 0.4, 0);
        ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.stroke();
      }
      ctx.restore();
    }
  }

  function footLine(rig) {
    return Math.max(...rig.legs.map((b, i) => rig.hip + ((rig.parts[i === 0 ? "leftLeg" : "rightLeg"].size[1]) - b.pivot[1]) * b.scale));
  }

  /* One frame: `px` is the canvas's side in device pixels. */
  function draw(ctx, px, rig, images, pose, gaze, flip) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.scale(px / 512, px / 512);
    if (flip) { ctx.translate(512, 0); ctx.scale(-1, 1); }
    if (pose.turn !== 0) {
      const width = Math.cos(pose.turn * 2 * Math.PI);
      ctx.translate(256, 0);
      ctx.scale(Math.abs(width) < 0.33 ? (width < 0 ? -0.33 : 0.33) : width, 1);
      ctx.translate(-256, 0);
    }
    if (pose.lean !== 0) {
      const floor = footLine(rig);
      ctx.translate(256, floor); ctx.rotate(rad(pose.lean)); ctx.translate(-256, -floor);
    }
    ctx.translate(pose.sway, pose.bob);
    for (const layer of layers(rig, pose)) {
      const part = rig.parts[layer.source], image = images[layer.source];
      if (!part || !image) continue;
      ctx.save();
      ctx.translate(layer.at[0], layer.at[1]);
      ctx.rotate(rad(layer.angle));
      ctx.scale(layer.scale * (layer.key === "head" ? rig.headSqueeze || 1 : 1), layer.scale);
      ctx.translate(-layer.pivot[0], -layer.pivot[1]);
      ctx.save();
      if (layer.cut) clipLeg(ctx, rig, layer.cut);
      ctx.drawImage(image, 0, 0, part.size[0], part.size[1]);
      ctx.restore();
      if (layer.key === "head") drawEyes(ctx, rig, pose, gaze);
      ctx.restore();
    }
  }

  /* ---------- the guide ---------- */

  const SAY = {
    hero: { zh: "嗨，我是 Novi！往下滑，我帶你逛一圈。", en: "Hi, I'm Novi! Scroll down and I'll show you around." },
    demo: { zh: "在這裡打一句試試，我來分。", en: "Type a line here. I'll sort it." },
    home: { zh: "一打開，今天有什麼都在這。", en: "Open the app and today is right here." },
    study: { zh: "作業和考試，我幫你倒數。", en: "Homework and exams: I keep the countdown." },
    plans: { zh: "整個月我都排好了。", en: "The whole month, laid out." },
    spending: { zh: "錢花去哪，我都記著。", en: "I remember where the money went." },
    focus: { zh: "要專心的時候，我陪你。", en: "Time to focus? I'll sit with you." },
    timetable: { zh: "課表和成績也交給我算。", en: "Timetable and grades, worked out." },
    wardrobe: { zh: "幫我挑一套？點衣服我就換。", en: "Pick an outfit and I'll change." },
    pro: { zh: "想要更多，看這裡。", en: "Want more? It's all here." },
    privacy: { zh: "你的記錄留在手機裡，我不外傳。", en: "Your records stay on your phone." },
    support: { zh: "卡住了？問我就對了。", en: "Stuck? Ask me." },
    bye: { zh: "上架那天見！", en: "See you on launch day!" },
    worn: { zh: "好看嗎？", en: "How do I look?" },
    filed: { zh: "記好了！", en: "Got it!" },
    poke: [
      { zh: "嘿，會癢！", en: "Hey, that tickles!" },
      { zh: "我在，請說。", en: "I'm here. Go on." },
      { zh: "再點我要跳舞囉。", en: "One more tap and I dance." },
      { zh: "今天也辛苦了。", en: "You're doing great today." },
    ],
  };
  const FUN = ["wave", "celebrate", "dance", "jump", "spin", "peekaboo", "flex", "clap", "shy", "hug"];

  function start() {
    const host = document.querySelector("[data-novi]");
    const canvas = host && host.querySelector("canvas");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const bubble = document.querySelector("[data-novi-say]");
    const button = host.querySelector("[data-novi-btn]");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;

    let rigs = null, rig = null, images = {};
    let outfit = "none";
    try { outfit = sessionStorage.getItem("novi-outfit") || "none"; } catch (e) { /* private window */ }

    // Where Novi stands, and what it is doing.
    let gx = null, face = 1, phase = 0, walking = 0;
    let stop = null, cue = { x: 0.74, xm: 0.5, move: "wave", say: "hero" }, arrived = false;
    let playing = null, saying = null, sayTimer = 0;
    let pointer = null, lastFrame = 0, lastScroll = scrollY, scrollV = 0, size = 0, bubbleWidth = 0;
    const blinkEvery = 4.3 + Math.random() * 2.3;

    function load(id) {
      const parts = Object.keys(rigs[id].parts);
      return Promise.all(parts.map((part) => new Promise((done) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => done([part, image]);
        image.onerror = () => done([part, null]);
        image.src = "assets/puppet/" + id + "/" + part + ".webp";
      }))).then((pairs) => Object.fromEntries(pairs));
    }

    function lang() { return root.dataset.lang === "en" ? "en" : "zh"; }

    function say(key, hold) {
      const line = typeof key === "string" ? SAY[key] : key;
      if (!line || !bubble) return;
      saying = line;
      bubble.textContent = line[lang()];
      bubbleWidth = bubble.offsetWidth;
      bubble.classList.add("on");
      clearTimeout(sayTimer);
      sayTimer = setTimeout(() => bubble.classList.remove("on"), hold || 5200);
    }

    function play(move) {
      if (still.matches && move !== "nod") return;
      playing = { move, t0: performance.now() / 1000 };
    }

    function wear(id) {
      if (!rigs || !rigs[id]) return Promise.resolve(false);
      host.classList.add("changing");
      return load(id).then((next) => {
        rig = rigs[id]; images = next; outfit = id;
        try { sessionStorage.setItem("novi-outfit", id); } catch (e) { /* private window */ }
        host.classList.remove("changing");
        play("spin");
        say("worn", 3200);
        return true;
      });
    }

    /* A stop is a section that tells Novi where to stand and what to say. */
    function setCue(next) {
      cue = Object.assign({ x: 0.5, xm: 0.5 }, next);
      arrived = false;
      if (cue.say) say(cue.say);
    }

    const stops = [...document.querySelectorAll("[data-stop]")];
    function findStop() {
      const line = innerHeight * 0.6;
      let found = stops[0];
      for (const el of stops) if (el.getBoundingClientRect().top < line) found = el;
      if (found && found !== stop) {
        stop = found;
        setCue({ x: parseFloat(found.dataset.x || "0.5"), xm: parseFloat(found.dataset.xm || found.dataset.x || "0.5"),
                 move: found.dataset.move || null, say: found.dataset.stop });
        document.dispatchEvent(new CustomEvent("novi:stop", { detail: found.dataset.stop }));
      }
    }

    function frame(ms) {
      requestAnimationFrame(frame);
      if (!rig) return;
      const now = ms / 1000, dt = Math.min(0.05, now - lastFrame || 0.016);
      lastFrame = now;
      const vw = innerWidth, vh = innerHeight, mobile = vw < 760;
      scrollV = lerp(scrollV, (scrollY - lastScroll) / dt, 0.2); lastScroll = scrollY;
      findStop();

      // The dock: a small Novi with its feet on the bottom edge.
      const dockSize = mobile ? 108 : clamp(vw * 0.115, 136, 172);
      const edge = dockSize * 0.36;
      const want = clamp((mobile ? cue.xm : cue.x) * vw, edge, vw - edge);
      if (gx === null) gx = want;

      // The hero: Novi stands large in its stage and steps down into the dock as the page moves.
      const stage = document.querySelector("[data-hero-stage]");
      const box = stage ? stage.getBoundingClientRect() : null;
      const k = still.matches ? (scrollY > vh * 0.45 ? 1 : 0) : smooth(scrollY / (vh * 0.62));
      const heroSize = box ? Math.min(box.height * 1.06, box.width * 1.25, 640) : dockSize;

      let pose = breathing(now);
      const d = want - gx;
      if (k >= 1 && Math.abs(d) > 1.5 && !still.matches) {
        const speed = clamp(Math.abs(d) * 3.2, 240, 1500), stepX = Math.sign(d) * Math.min(Math.abs(d), speed * dt);
        gx += stepX; face = Math.sign(d); phase += dt * (7 + speed / 110);
        walking = lerp(walking, 1, 0.25);
        pose = sum(pose, stride(phase, walking, 2.2));
        pose.lean = clamp(speed / 190, 0, 7);
        arrived = false;
      } else {
        gx = want;
        walking = lerp(walking, 0, 0.2);
        if (walking > 0.02) pose = sum(pose, stride(phase, walking, 2.2));
        if (!arrived) {
          arrived = true;
          face = want > vw * 0.5 ? -1 : 1;
          if (cue.move) play(cue.move);
        }
      }
      if (k < 1) face = 1;

      if (playing) {
        const len = (LENGTH[playing.move] || 1) + 2 * LAG, t = (now - playing.t0) / len;
        if (t >= 1) playing = null; else pose = sum(pose, movePose(playing.move, t));
      }
      pose.blink = Math.max(pose.blink, blinkAt(now, blinkEvery));
      // A quick scroll lifts the arms a little, as if the page rushed past.
      const rush = clamp(Math.abs(scrollV) / 2600, 0, 1) * (still.matches ? 0 : 1);
      pose.uL += 26 * rush; pose.uR -= 26 * rush; pose.fL += 30 * rush; pose.fR -= 30 * rush; pose.bob -= 3 * rush;

      size = lerp(heroSize, dockSize, k);
      const floor = footLine(rig) / 512;
      const heroX = box ? box.left + box.width / 2 : gx, heroFeet = box ? box.bottom : vh;
      const x = lerp(heroX, gx, k), feet = lerp(heroFeet, vh - (mobile ? 4 : 10), k);
      host.style.setProperty("--novi-size", size.toFixed(1) + "px");
      host.style.transform = "translate3d(" + (x - size / 2).toFixed(1) + "px," + (feet - size * floor).toFixed(1) + "px,0)";
      host.classList.toggle("docked", k >= 1);
      if (bubble) {
        // The line floats by the head, on the side with more room, and never leaves the screen.
        const right = x > vw * 0.5, by = Math.max(74, feet - size * (k < 1 ? 0.8 : 0.9));
        const bx = right ? Math.max(bubbleWidth + 8, x - size * 0.14) : Math.min(vw - bubbleWidth - 8, x + size * 0.14);
        bubble.style.transform = "translate3d(" + bx.toFixed(1) + "px," + by.toFixed(1) + "px,0) translate(" + (right ? "-100%" : "0") + ",-100%)";
        bubble.classList.toggle("right", right);
        bubble.classList.toggle("big", k < 1);
      }

      // Eyes follow the pointer; with none, they rest toward the page.
      let gaze = [face > 0 ? 3 : -3, 2];
      if (pointer) {
        const hx = x, hy = feet - size * 0.62;
        gaze = [clamp(((pointer[0] - hx) / vw) * 46, -9, 9), clamp(((pointer[1] - hy) / vh) * 34, -7, 7)];
      }
      const flip = face < 0;
      if (flip) gaze[0] = -gaze[0];

      const px = Math.round(size * Math.min(2, devicePixelRatio || 1));
      if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
      draw(ctx, px, rig, images, pose, gaze, flip);
    }

    addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") pointer = [e.clientX, e.clientY]; }, { passive: true });
    addEventListener("pointerleave", () => { pointer = null; });
    document.addEventListener("novi:lang", () => { if (saying && bubble) { bubble.textContent = saying[lang()]; bubbleWidth = bubble.offsetWidth; } });

    let pokes = 0;
    if (button) button.addEventListener("click", () => {
      play(FUN[Math.floor(Math.random() * FUN.length)]);
      say(SAY.poke[pokes++ % SAY.poke.length], 3000);
    });

    window.Novi = { say, play, wear, cue: setCue, outfit: () => outfit, has: (id) => !!(rigs && rigs[id]) };

    fetch("assets/puppet/rig.json").then((r) => r.json()).then((data) => {
      rigs = data;
      if (!rigs[outfit]) outfit = "none";
      return load(outfit);
    }).then((first) => {
      rig = rigs[outfit]; images = first;
      root.classList.add("novi-ready");
      document.dispatchEvent(new CustomEvent("novi:ready"));
      say("hero", 7000);
      play("wave");
      requestAnimationFrame(frame);
    }).catch(() => { root.classList.add("novi-missing"); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
