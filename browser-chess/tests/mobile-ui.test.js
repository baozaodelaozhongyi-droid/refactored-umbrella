const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const html = readFileSync("index.html", "utf8");
const mobileCss = readFileSync("mobile.css", "utf8");

test("mobile override stylesheet is loaded after base styles", () => {
  assert.match(html, /<link rel="stylesheet" href="styles\.css" \/>\s*<link rel="stylesheet" href="mobile\.css" \/>/);
});

test("mobile overrides make the board nearly full viewport width", () => {
  assert.match(mobileCss, /\.board-wrap\s*{[\s\S]*width:\s*min\(99vw,\s*42rem\)/);
  assert.match(mobileCss, /\.board-row\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobileCss, /\.ranks,\s*\.files-top\s*{[\s\S]*display:\s*none/);
  assert.match(mobileCss, /\.square\s*{[\s\S]*font-size:\s*clamp\(2rem,\s*10\.8vw,\s*4\.6rem\)/);
});
