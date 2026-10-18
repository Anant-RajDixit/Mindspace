"use strict";

/* Field definitions. Options and ranges come from the saved pipeline's encoders
   and from the min/max/mean of the training data (verified from the notebook + CSV). */
const FIELDS = {
  Age: { label: "Age", help: "Your age in years (the model was trained on ages 18 to 24).", type: "number", min: 18, max: 24, step: 1, def: 21, unit: "years" },
  Gender: { label: "Gender", help: "Choose the option that fits best.", type: "select", options: ["Female", "Male"] },
  Country: { label: "Country", help: "Countries outside this list are grouped as “Other”, as in the training data.", type: "select",
    options: ["Australia", "Canada", "France", "Germany", "India", "Mexico", "Turkey", "UK", "USA", "Other"] },
  Academic_Level: { label: "Academic level", help: "Your current level of study.", type: "select", options: ["High School", "Undergraduate", "Graduate"] },
  Most_Used_Platform: { label: "Most used platform", help: "The platform you spend the most time on.", type: "select",
    options: ["Facebook", "Instagram", "KakaoTalk", "LINE", "LinkedIn", "Snapchat", "TikTok", "Twitter", "VKontakte", "WeChat", "WhatsApp", "YouTube"] },
  Purpose_Of_Use: { label: "Main purpose of use", help: "What you mostly use it for.", type: "select", options: ["Education", "Entertainment", "Networking", "News"] },
  Avg_Daily_Usage_Hours: { label: "Average daily usage (hours)", help: "Typical hours per day on social media.", type: "range", min: 1, max: 8.8, step: 0.1, def: 5, mean: 5.08, unit: "h" },
  Daily_Unlocks: { label: "Daily phone unlocks", help: "Roughly how many times you unlock your phone each day.", type: "range", min: 62, max: 273, step: 1, def: 171, mean: 171.46, unit: "" },
  Study_Hours: { label: "Study hours per day", help: "Typical hours spent studying per day.", type: "range", min: 0.3, max: 8.3, step: 0.1, def: 3, mean: 3.01, unit: "h" },
  Physical_Activity_Hours: { label: "Physical activity (hours per day)", help: "Typical hours of exercise or movement per day.", type: "range", min: 0, max: 4.1, step: 0.1, def: 1.8, mean: 1.75, unit: "h" },
  Sleep_Hours_Per_Night: { label: "Sleep (hours per night)", help: "Typical hours of sleep per night.", type: "range", min: 3.6, max: 9.9, step: 0.1, def: 6.6, mean: 6.63, unit: "h" },
  Stress_Level: { label: "Usual stress level (self-reported)", help: "How you would describe your usual stress. This is an input to the model, not a clinical rating.", type: "select", options: ["Low", "Medium", "High", "Very High"] },
};

const STEPS = [
  { title: "About you", blurb: "A few basics.", fields: ["Age", "Gender", "Country", "Academic_Level"] },
  { title: "Digital habits", blurb: "How you use your devices.", fields: ["Most_Used_Platform", "Purpose_Of_Use", "Avg_Daily_Usage_Hours", "Daily_Unlocks"] },
  { title: "Daily rhythm", blurb: "Study, movement, rest and stress.", fields: ["Study_Hours", "Physical_Activity_Hours", "Sleep_Hours_Per_Night", "Stress_Level"] },
];
const SCORE_MIN = 3.6, SCORE_MAX = 9.4; // range of Mental_Health_Score in the training data

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  kids.forEach((k) => n.append(k));
  return n;
};

const values = {};
Object.entries(FIELDS).forEach(([k, f]) => { values[k] = f.def !== undefined ? String(f.def) : ""; });
let step = 0, submitting = false, touched = false;

function fieldError(name) {
  const f = FIELDS[name], v = values[name];
  if (v === "" || v === undefined) return "This field is required.";
  if (f.type === "select") return f.options.includes(v) ? "" : "Choose one of the options.";
  const n = Number(v);
  if (Number.isNaN(n)) return "Enter a number.";
  if (n < f.min || n > f.max) return `Enter a value between ${f.min} and ${f.max}.`;
  if (name === "Age" && !Number.isInteger(n)) return "Enter a whole number.";
  return "";
}

function renderField(name) {
  const f = FIELDS[name], id = "f-" + name;
  const wrap = el("div", { className: "field" });
  wrap.append(el("label", { htmlFor: id, textContent: f.label }), el("p", { className: "help", id: id + "-h", textContent: f.help }));
  const err = el("p", { className: "field-error", id: id + "-e", role: "alert" });
  const show = () => {
    const m = touched ? fieldError(name) : "";
    err.textContent = m;
    wrap.querySelectorAll("input[type=number],select").forEach((i) => i.setAttribute("aria-invalid", m ? "true" : "false"));
  };

  if (f.type === "select") {
    const s = el("select", { id }, el("option", { value: "", textContent: "Select…" }));
    f.options.forEach((o) => s.append(el("option", { value: o, textContent: o })));
    s.value = values[name];
    s.setAttribute("aria-describedby", id + "-h " + id + "-e");
    s.addEventListener("change", () => { values[name] = s.value; show(); });
    wrap.append(s);
  } else {
    const num = el("input", { type: "number", id, min: f.min, max: f.max, step: f.step, value: values[name], inputMode: "decimal" });
    num.setAttribute("aria-describedby", id + "-h " + id + "-e");
    const row = el("div", { className: "range-row" });
    if (f.type === "range") {
      const r = el("input", { type: "range", min: f.min, max: f.max, step: f.step, value: values[name] });
      r.setAttribute("aria-label", f.label + " slider");
      r.addEventListener("input", () => { values[name] = r.value; num.value = r.value; show(); });
      num.addEventListener("input", () => { values[name] = num.value; if (num.value !== "") r.value = num.value; show(); });
      row.append(r);
    } else {
      num.addEventListener("input", () => { values[name] = num.value; show(); });
    }
    row.append(num);
    wrap.append(row);
  }
  wrap.append(err);
  return wrap;
}

function render() {
  const total = STEPS.length + 1, review = step === STEPS.length;
  $("step-label").textContent = `Step ${step + 1} of ${total}`;
  $("progress-bar").style.width = ((step + 1) / total) * 100 + "%";
  document.querySelector(".progress").setAttribute("aria-valuenow", step + 1);
  $("step-title").textContent = review ? "Review your answers" : STEPS[step].title;
  $("step-blurb").textContent = review ? "Check everything looks right, then run the prediction." : STEPS[step].blurb;

  const body = $("step-body");
  body.replaceChildren();
  if (review) {
    const dl = el("dl", { className: "review" });
    Object.keys(FIELDS).forEach((k) => {
      const u = FIELDS[k].unit ? " " + FIELDS[k].unit : "";
      dl.append(el("div", {}, el("dt", { textContent: FIELDS[k].label }), el("dd", { textContent: values[k] + u })));
    });
    body.append(dl);
  } else {
    STEPS[step].fields.forEach((n) => body.append(renderField(n)));
  }

  $("back-btn").disabled = step === 0 || submitting;
  const next = $("next-btn");
  next.textContent = review ? (submitting ? "Running…" : "Get prediction") : "Next";
  next.disabled = submitting;
  hideError();
}

const showError = (m) => { const e = $("form-error"); e.textContent = m; e.hidden = false; };
const hideError = () => { $("form-error").hidden = true; };

function stepValid() {
  touched = true;
  const bad = STEPS[step].fields.filter((n) => fieldError(n));
  if (bad.length) {
    body_refresh();
    const first = document.getElementById("f-" + bad[0]);
    if (first) first.focus();
  }
  return bad.length === 0;
}
function body_refresh() { // re-render current step keeping typed values, showing errors
  const body = $("step-body");
  body.replaceChildren();
  STEPS[step].fields.forEach((n) => body.append(renderField(n)));
  STEPS[step].fields.forEach((n) => {
    const m = fieldError(n), e = document.getElementById("f-" + n + "-e");
    if (e) e.textContent = m;
    document.querySelectorAll("#f-" + n).forEach((i) => i.setAttribute("aria-invalid", m ? "true" : "false"));
  });
}

async function submit() {
  submitting = true; render();
  const payload = {};
  Object.keys(FIELDS).forEach((k) => {
    payload[k] = FIELDS[k].type === "select" ? values[k] : Number(values[k]);
  });
  try {
    let res;
    try {
      res = await fetch("/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch {
      throw new Error("Can't reach the server. Check your connection and try again.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = data.detail;
      throw new Error(Array.isArray(d) ? d.map((x) => `${(x.loc || []).slice(-1)[0]}: ${x.msg}`).join("; ") : d || "Something went wrong.");
    }
    showResult(data.prediction);
  } catch (e) {
    submitting = false; render(); showError(e.message);
    return;
  }
  submitting = false;
}

function showResult(p) {
  $("score-value").textContent = p.toFixed(2);
  const pos = Math.min(1, Math.max(0, (p - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  $("form-view").hidden = true;
  $("result-view").hidden = false;
  requestAnimationFrame(() => { $("gauge-marker").style.left = pos * 100 + "%"; });

  const bars = $("habit-bars");
  bars.replaceChildren();
  ["Avg_Daily_Usage_Hours", "Daily_Unlocks", "Study_Hours", "Physical_Activity_Hours", "Sleep_Hours_Per_Night"].forEach((k) => {
    const f = FIELDS[k], v = Number(values[k]);
    const unit = f.unit ? " " + f.unit : "";
    const row = el("div", { className: "bar-row" });
    row.append(el("div", { className: "bar-head" }, el("span", { textContent: f.label }), el("strong", { textContent: v + unit })));
    const fill = el("div", { className: "bar-fill" });
    fill.style.width = "0%";
    const track = el("div", { className: "bar-track", role: "img" }, fill, el("span", { className: "bar-mean" }));
    track.setAttribute("aria-label", `${f.label}: ${v}${unit}. Training-data average: ${f.mean}${unit}.`);
    track.lastChild.style.left = (f.mean / f.max) * 100 + "%";
    row.append(track);
    bars.append(row);
    requestAnimationFrame(() => { fill.style.width = Math.min(100, (v / f.max) * 100) + "%"; });
  });

  const dl = $("answers");
  dl.replaceChildren();
  Object.keys(FIELDS).forEach((k) => {
    const u = FIELDS[k].unit ? " " + FIELDS[k].unit : "";
    dl.append(el("div", {}, el("dt", { textContent: FIELDS[k].label }), el("dd", { textContent: values[k] + u })));
  });
  $("assessment").scrollIntoView();
}

$("next-btn").addEventListener("click", () => {
  if (step === STEPS.length) return submit();
  if (stepValid()) { touched = false; step += 1; render(); }
});
$("back-btn").addEventListener("click", () => { touched = false; step = Math.max(0, step - 1); render(); });
$("edit-btn").addEventListener("click", () => {
  $("result-view").hidden = true; $("form-view").hidden = false;
  $("gauge-marker").style.left = "0%";
  step = 0; touched = false; render();
  $("assessment").scrollIntoView();
});

render();
