const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const html = readFileSync("index.html", "utf8");
const css = readFileSync("styles.css", "utf8");
const script = readFileSync("script.js", "utf8");

test("board grid explicitly defines eight columns and eight rows", () => {
  assert.match(css, /\.board\s*{[^}]*grid-template-columns:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.board\s*{[^}]*grid-template-rows:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.square\s*{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
});

test("enhanced controls have matching markup and script hooks", () => {
  ["reset", "undo", "flip", "sound", "captured-white", "captured-black", "move-list", "promotion"].forEach((id) => {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(script, new RegExp(`#${id}`));
  });
});

test("promotion choices expose all supported piece types", () => {
  ["queen", "rook", "bishop", "knight"].forEach((piece) => {
    assert.match(html, new RegExp(`data-piece="${piece}"`));
  });
});


test("sound controls and synthesized move audio are wired", () => {
  assert.match(html, /id="sound"[^>]*aria-pressed="true"/);
  assert.match(script, /function playMoveSound\(isCapture\)/);
  assert.match(script, /function playTone\(frequency, startTime, duration, volume, type\)/);
  assert.match(script, /playMoveSound\(Boolean\(lastMove\.captured\)\)/);
});
