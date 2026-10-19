/*!
 * assets/js/widgets.js — 《Attention Is All You Need》中文注疏本 · 互动组件
 *
 * 纯原生 JS + SVG，无外部依赖，不 import/export。
 * 暴露 window.Widgets.mount(el, id, caption)：
 *   el      空的挂载点（通常是一个 <div class="widget-slot" data-widget="…">）
 *   id      组件 id，见下方 BUILDERS
 *   caption 组件说明，渲染为 <p class="widget-caption">
 *
 * 所有样式由本文件自注入（<style id="widgets-style">），类名统一 .w- 前缀；
 * 颜色、字号只引用 style.css :root 里的变量；不用圆角、渐变、阴影。
 * Node 下可 require 做语法检查；浏览器里挂 window.Widgets。
 */
(function (global) {
  "use strict";

  var doc = global.document;

  /* ========================================================================== *
   * 0. 样式（只注入一次）
   * ========================================================================== */

  var STYLE_ID = "widgets-style";

  var CSS = `
.w-widget {
  --w-rule: color-mix(in srgb, var(--ink) 17%, transparent);
  --w-rule-soft: color-mix(in srgb, var(--ink) 9%, transparent);
  --w-wash: color-mix(in srgb, var(--ink) 5%, transparent);
  container-type: inline-size;
  font-family: var(--serif-cn);
  font-size: var(--fs-small);
  line-height: 1.65;
  color: var(--ink);
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.w-widget *,
.w-widget *::before,
.w-widget *::after { box-sizing: border-box; }
.w-widget p { margin: 0; }
.w-widget button { font-family: inherit; color: inherit; }
.w-widget :focus-visible { outline: 2px solid var(--rubric); outline-offset: 2px; }
.w-widget button:focus:not(:focus-visible) { outline: none; }

/* 头部：细线 + 小字标签，和正文里的图注同一套语气 */
.w-widget .w-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0 7px;
  border-top: 1px solid var(--w-rule);
  border-bottom: 1px solid var(--w-rule-soft);
  margin-bottom: 14px;
}
.w-widget .w-kicker {
  font-family: var(--serif-latin);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rubric);
  white-space: nowrap;
}
.w-widget .w-hint {
  font-size: 0.7rem;
  color: var(--ink-faint);
  text-align: right;
}

/* 两栏：图表 + 读数面板；窄屏改纵向 */
.w-widget .w-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(198px, 236px);
  gap: 16px;
  align-items: start;
}
.w-widget .w-main { min-width: 0; }
.w-widget .w-panel {
  min-width: 0;
  border-left: 1px solid var(--w-rule-soft);
  padding-left: 16px;
}
.w-widget .w-panel--wide { border-left: 0; padding-left: 0; }
.w-widget .w-cols--detail { grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); }

/* 读数表 */
.w-widget .w-read {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1px 10px;
  margin: 0;
  font-size: 0.75rem;
}
.w-widget .w-read dt { color: var(--ink-faint); }
.w-widget .w-read dd {
  margin: 0;
  text-align: right;
  font-family: var(--serif-latin);
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.w-widget .w-read dd b { font-weight: 600; color: var(--rubric); }

.w-widget .w-sub {
  font-family: var(--serif-latin);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: var(--ink-faint);
  margin: 14px 0 6px;
}
.w-widget .w-note {
  margin-top: 10px;
  font-size: 0.74rem;
  line-height: 1.75;
  color: var(--ink-soft);
}
.w-widget .w-note b { font-weight: 600; color: var(--rubric); }
.w-widget .w-note + .w-note { margin-top: 5px; }
.w-widget .widget-caption {
  margin-top: 12px;
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--ink-faint);
}

/* 按钮 */
.w-widget .w-btns { display: flex; flex-wrap: wrap; gap: 5px; }
.w-widget .w-btn {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--w-rule);
  border-radius: 0;
  background: transparent;
  font-family: var(--serif-cn);
  font-size: 0.73rem;
  line-height: 1.35;
  color: var(--ink-soft);
  padding: 4px 9px;
  cursor: pointer;
  transition: color 0.18s var(--ease), background-color 0.18s var(--ease), border-color 0.18s var(--ease);
}
.w-widget .w-btn:hover { color: var(--ink); border-color: var(--ink-faint); }
.w-widget .w-btn[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--ground); }
.w-widget .w-btn.w-accent[aria-pressed="true"] { background: var(--rubric); border-color: var(--rubric); color: var(--ground); }
.w-widget .w-btn.w-rolebtn-q[aria-pressed="true"] { background: var(--rubric); border-color: var(--rubric); color: var(--ground); }
.w-widget .w-btn.w-rolebtn-k[aria-pressed="true"] { background: var(--verdigris); border-color: var(--verdigris); color: var(--ground); }
.w-widget .w-btn.w-rolebtn-v[aria-pressed="true"] { background: var(--gold); border-color: var(--gold); color: var(--night); }

/* 滑杆：label / range / 数值 */
.w-widget .w-ctl {
  display: grid;
  grid-template-columns: 4.9em minmax(0, 1fr) 3.6em;
  align-items: center;
  gap: 8px;
  font-size: 0.73rem;
}
.w-widget .w-ctl label { color: var(--ink-faint); white-space: nowrap; }
.w-widget .w-ctl output {
  font-family: var(--serif-latin);
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--ink);
}
.w-widget .w-controls { display: grid; gap: 7px; margin-top: 10px; }
.w-widget .w-controls--2 { grid-template-columns: 1fr 1fr; gap: 7px 18px; }
.w-widget .w-range {
  width: 100%;
  height: 18px;
  margin: 0;
  padding: 0;
  accent-color: var(--rubric);
  background: transparent;
  cursor: pointer;
}

/* SVG 图表的公共笔画与文字 */
.w-widget .w-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  font-family: var(--serif-latin);
}
.w-widget .w-svg text { font-size: 11px; fill: var(--ink-soft); font-family: var(--serif-latin); }
.w-widget .w-svg .t-cn { font-family: var(--serif-cn); }
.w-widget .w-svg .t-tiny { font-size: 9.5px; fill: var(--ink-faint); }
.w-widget .w-svg .t-mid { font-size: 12px; }
.w-widget .w-svg .t-big { font-size: 15px; }
.w-widget .w-svg .t-num { font-family: var(--serif-latin); font-variant-numeric: tabular-nums; }
.w-widget .w-svg .t-ink { fill: var(--ink); }
.w-widget .w-svg .t-soft { fill: var(--ink-soft); }
.w-widget .w-svg .t-faint { fill: var(--ink-faint); }
.w-widget .w-svg .t-rubric { fill: var(--rubric); }
.w-widget .w-svg .t-gold { fill: var(--gold); }
.w-widget .w-svg .t-verdigris { fill: var(--verdigris); }
.w-widget .w-svg .t-ground { fill: var(--ground); }
.w-widget .w-svg .f-ink { fill: var(--ink); }
.w-widget .w-svg .f-soft { fill: var(--ink-soft); }
.w-widget .w-svg .f-faint { fill: var(--ink-faint); }
.w-widget .w-svg .f-rubric { fill: var(--rubric); }
.w-widget .w-svg .f-gold { fill: var(--gold); }
.w-widget .w-svg .f-verdigris { fill: var(--verdigris); }
.w-widget .w-svg .f-night { fill: var(--night); }
.w-widget .w-svg .f-ground { fill: var(--ground); }
.w-widget .w-svg .f-none { fill: none; }
.w-widget .w-svg .st-ink { stroke: var(--ink); fill: none; }
.w-widget .w-svg .st-soft { stroke: var(--ink-soft); fill: none; }
.w-widget .w-svg .st-faint { stroke: var(--ink-faint); fill: none; }
.w-widget .w-svg .st-rule { stroke: var(--w-rule); fill: none; }
.w-widget .w-svg .st-rubric { stroke: var(--rubric); fill: none; }
.w-widget .w-svg .st-gold { stroke: var(--gold); fill: none; }
.w-widget .w-svg .st-verdigris { stroke: var(--verdigris); fill: none; }
.w-widget .w-svg .st-ground { stroke: var(--ground); fill: none; }
.w-widget .w-svg--drag { touch-action: none; cursor: crosshair; user-select: none; -webkit-user-select: none; }

/* 图例 */
.w-widget .w-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
  font-size: 0.68rem;
  color: var(--ink-faint);
}
.w-widget .w-legend > span { display: inline-flex; align-items: center; gap: 5px; }
.w-widget .w-swatch { display: inline-block; width: 9px; height: 9px; background: var(--ink); flex: none; }
.w-widget .w-swatch--rubric { background: var(--rubric); }
.w-widget .w-swatch--gold { background: var(--gold); }
.w-widget .w-swatch--verdigris { background: var(--verdigris); }
.w-widget .w-swatch--line { width: 16px; height: 0; border-top: 1px solid var(--ink); }
.w-widget .w-swatch--line-rubric { width: 16px; height: 0; border-top: 1px solid var(--rubric); }
.w-widget .w-swatch--line-gold { width: 16px; height: 0; border-top: 2px solid var(--gold); }

/* 概率柱 */
.w-widget .w-bars {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  align-items: end;
  gap: 12px;
  height: 170px;
  border-bottom: 1px solid var(--ink-soft);
  margin: 6px 2px 0;
}
.w-widget .w-bcol {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 5px;
  height: 100%;
  min-width: 0;
}
.w-widget .w-bval {
  font-family: var(--serif-latin);
  font-size: 0.72rem;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.w-widget .w-bar {
  width: 100%;
  max-width: 64px;
  height: 0;
  background: var(--ink);
  transition: height 0.22s var(--ease);
}
.w-widget .w-bar.is-max { background: var(--rubric); }
.w-widget .w-blabels {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 12px;
  margin: 6px 2px 0;
  text-align: center;
  font-size: 0.68rem;
  line-height: 1.35;
  color: var(--ink-faint);
}
.w-widget .w-blabels .w-blabel-z {
  display: block;
  font-family: var(--serif-latin);
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

/* 横向进度条（注意力排序 / softmax 最大值） */
.w-widget .w-meter { display: grid; gap: 9px; margin-top: 6px; }
.w-widget .w-meter-row {
  display: grid;
  grid-template-columns: 5.6em minmax(0, 1fr) 3.4em;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
}
.w-widget .w-meter-row > span:first-child { color: var(--ink-faint); }
.w-widget .w-meter-val {
  font-family: var(--serif-latin);
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--ink);
}
.w-widget .w-meter-track { height: 9px; background: var(--w-wash); position: relative; }
.w-widget .w-meter-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--ink);
  transition: width 0.22s var(--ease);
}
.w-widget .w-meter-fill.is-hot { background: var(--rubric); }

.w-widget .w-rank { display: grid; gap: 5px; margin-top: 4px; }
.w-widget .w-rank-row {
  display: grid;
  grid-template-columns: 5.2em minmax(0, 1fr) 3.2em;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
}
.w-widget .w-rank-word {
  font-family: var(--serif-latin);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.w-widget .w-rank-track { height: 6px; background: var(--w-wash); position: relative; }
.w-widget .w-rank-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--rubric); }
.w-widget .w-rank-val {
  font-family: var(--serif-latin);
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--ink-soft);
}

/* 矩阵 / 网格 */
.w-widget .w-matrix {
  display: grid;
  gap: 1px;
  background: var(--w-rule);
  border: 1px solid var(--w-rule);
  margin-top: 6px;
}
.w-widget .w-cell {
  background: var(--ground);
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  font-family: var(--serif-latin);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  text-align: center;
}
.w-widget .w-cell--head {
  background: transparent;
  color: var(--ink-faint);
  font-family: var(--serif-cn);
  font-size: 0.64rem;
  min-height: 20px;
}
.w-widget .w-cell--label {
  background: transparent;
  color: var(--ink-faint);
  font-family: var(--serif-cn);
  font-size: 0.64rem;
  justify-content: flex-end;
  padding-right: 4px;
}
.w-widget .w-cell--hit { background: var(--gold); color: var(--night); }
.w-widget .w-cell--input { background: var(--ground-2); color: var(--ink); }
.w-widget .w-cell--focus { background: var(--rubric); color: var(--ground); }
.w-widget .w-cellbtn {
  appearance: none;
  border: 0;
  border-radius: 0;
  background: var(--w-wash);
  font-family: var(--serif-latin);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 2px;
  transition: background-color 0.18s var(--ease), color 0.18s var(--ease);
}
.w-widget .w-cellbtn:hover { background: var(--ground-3); }
.w-widget .w-cellbtn[aria-pressed="true"] { background: var(--rubric); color: var(--ground); }

.w-widget .w-prole { min-width: 0; }
.w-widget .w-prole__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding-top: 6px;
  margin-bottom: 4px;
  border-top: 2px solid var(--ink);
  font-size: 0.7rem;
  color: var(--ink-faint);
}
.w-widget .w-prole__head b {
  font-family: var(--serif-latin);
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.03em;
}
.w-widget .w-prole--q .w-prole__head { border-top-color: var(--rubric); }
.w-widget .w-prole--q .w-prole__head b { color: var(--rubric); }
.w-widget .w-prole--k .w-prole__head { border-top-color: var(--verdigris); }
.w-widget .w-prole--k .w-prole__head b { color: var(--verdigris); }
.w-widget .w-prole--v .w-prole__head { border-top-color: var(--gold); }
.w-widget .w-prole--v .w-prole__head b { color: var(--gold); }
.w-widget .w-proj {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
}
.w-widget .w-formula {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--w-rule-soft);
  font-family: var(--serif-latin);
  font-size: 0.78rem;
  line-height: 1.9;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.w-widget .w-formula b { color: var(--rubric); font-weight: 600; }
.w-widget .w-formula .w-dim { color: var(--ink-faint); }

/* 句子里的词 */
.w-widget .w-tokens { display: flex; flex-wrap: wrap; gap: 3px 4px; margin: 0 0 10px; }
.w-widget .w-token {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  font-family: var(--serif-latin);
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-soft);
  padding: 1px 5px;
  cursor: pointer;
  transition: color 0.18s var(--ease), border-color 0.18s var(--ease), background-color 0.18s var(--ease);
}
.w-widget .w-token:hover { color: var(--ink); border-color: var(--w-rule); }
.w-widget .w-token[aria-pressed="true"] { color: var(--rubric); border-color: var(--rubric); font-weight: 600; }
.w-widget .w-token--q[aria-pressed="true"] { color: var(--rubric); border-color: var(--rubric); }
.w-widget .w-token--k[aria-pressed="true"] { color: var(--verdigris); border-color: var(--verdigris); }
.w-widget .w-token--v[aria-pressed="true"] { color: var(--gold); border-color: var(--gold); }

/* 流程列表（shapes / stack） */
.w-widget .w-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--w-rule-soft);
}
.w-widget .w-step {
  appearance: none;
  display: grid;
  grid-template-columns: 2.4em minmax(0, 1fr);
  gap: 0 10px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--w-rule-soft);
  border-left: 2px solid transparent;
  border-radius: 0;
  padding: 7px 5px 7px 8px;
  font: inherit;
  font-family: var(--serif-cn);
  color: var(--ink);
  cursor: pointer;
  transition: background-color 0.18s var(--ease), border-color 0.18s var(--ease);
}
.w-widget .w-step:hover { background: var(--w-wash); }
.w-widget .w-step[aria-pressed="true"] { background: var(--w-wash); border-left-color: var(--rubric); }
.w-widget .w-step__no {
  grid-row: 1 / span 2;
  font-family: var(--serif-latin);
  font-size: 0.72rem;
  color: var(--ink-faint);
  align-self: center;
}
.w-widget .w-step__name { font-size: 0.78rem; line-height: 1.45; }
.w-widget .w-step__shape {
  font-family: var(--serif-latin);
  font-size: 0.72rem;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.w-widget .w-tag {
  font-family: var(--serif-latin);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.w-widget .w-shape-big {
  font-family: var(--serif-latin);
  font-size: 1.15rem;
  color: var(--rubric);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  margin: 2px 0 4px;
}

/* 编码器 / 解码器堆叠 */
.w-widget .w-stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 10px;
}
.w-widget .w-stack__col { min-width: 0; }
.w-widget .w-stack__title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 5px;
  margin-bottom: 7px;
  border-bottom: 1px solid var(--w-rule);
  font-size: 0.76rem;
  color: var(--ink-soft);
}
.w-widget .w-stack__title .w-tag { letter-spacing: 0.16em; }
.w-widget .w-stack__layers {
  display: flex;
  flex-direction: column-reverse;
  gap: 4px;
}
.w-widget .w-layer {
  appearance: none;
  border: 1px solid var(--w-rule);
  border-radius: 0;
  background: transparent;
  display: grid;
  grid-template-columns: 2.2em minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  text-align: left;
  font: inherit;
  font-family: var(--serif-cn);
  font-size: 0.7rem;
  line-height: 1.45;
  color: var(--ink);
  cursor: pointer;
  transition: background-color 0.18s var(--ease), color 0.18s var(--ease), border-color 0.18s var(--ease);
}
.w-widget .w-layer:hover { background: var(--w-wash); }
.w-widget .w-layer[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--ground); }
.w-widget .w-layer__no { font-family: var(--serif-latin); font-size: 0.8rem; color: inherit; opacity: 0.85; }
.w-widget .w-layer__name { color: inherit; opacity: 0.9; }
.w-widget .w-box {
  border: 1px solid var(--w-rule-soft);
  padding: 5px 8px;
  text-align: center;
  font-size: 0.66rem;
  line-height: 1.5;
  color: var(--ink-faint);
}
.w-widget .w-box b { color: var(--ink-soft); font-weight: 600; }
.w-widget .w-link-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 8px;
  border-top: 1px solid var(--w-rule-soft);
  font-size: 0.7rem;
  color: var(--ink-soft);
}
.w-widget .w-link-note::before {
  content: "";
  width: 26px;
  height: 0;
  border-top: 1px solid var(--rubric);
  flex: none;
}

/* PE 数值格 */
.w-widget .w-pegrid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 1px;
  background: var(--w-rule);
  border: 1px solid var(--w-rule);
  margin-top: 6px;
}
.w-widget .w-pe {
  background: var(--ground);
  padding: 3px 2px;
  text-align: center;
  font-family: var(--serif-latin);
  font-size: 0.64rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
  color: var(--ink);
}
.w-widget .w-pe i { display: block; font-style: normal; font-size: 0.55rem; color: var(--ink-faint); }
.w-widget .w-pe.is-neg { color: var(--verdigris); }

/* Q / K / V 向量列 */
.w-widget .w-qkv {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 10px;
}
.w-widget .w-qkv__col {
  min-width: 0;
  padding-top: 6px;
  border-top: 2px solid var(--w-rule);
  opacity: 0.55;
  transition: opacity 0.18s var(--ease);
}
.w-widget .w-qkv__col.is-on { opacity: 1; }
.w-widget .w-qkv__col--q { border-top-color: var(--rubric); }
.w-widget .w-qkv__col--k { border-top-color: var(--verdigris); }
.w-widget .w-qkv__col--v { border-top-color: var(--gold); }
.w-widget .w-qkv__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.7rem;
  color: var(--ink-faint);
}
.w-widget .w-qkv__head b {
  font-family: var(--serif-latin);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--ink);
}
.w-widget .w-qkv__col--q .w-qkv__head b { color: var(--rubric); }
.w-widget .w-qkv__col--k .w-qkv__head b { color: var(--verdigris); }
.w-widget .w-qkv__col--v .w-qkv__head b { color: var(--gold); }
.w-widget .w-vec {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--w-rule);
  border: 1px solid var(--w-rule);
  margin-top: 6px;
}
.w-widget .w-vec span {
  background: var(--ground);
  text-align: center;
  font-family: var(--serif-latin);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
  padding: 3px 0;
  color: var(--ink);
}
.w-widget .w-vec span.is-neg { color: var(--verdigris); }

.w-widget .w-missing {
  color: var(--ink-faint);
  font-size: var(--fs-small);
  padding: 10px 0;
}
.w-widget .w-error {
  color: var(--rubric);
  font-size: var(--fs-small);
  padding: 10px 0;
}

/* 窄屏：一律纵向 */
@media (max-width: 700px) {
  .w-widget .w-cols,
  .w-widget .w-cols--detail { grid-template-columns: 1fr; gap: 14px; }
  .w-widget .w-panel { border-left: 0; border-top: 1px solid var(--w-rule-soft); padding-left: 0; padding-top: 12px; }
  .w-widget .w-proj { grid-template-columns: 1fr; gap: 18px; }
  .w-widget .w-qkv { grid-template-columns: 1fr; gap: 14px; }
  .w-widget .w-stack { grid-template-columns: 1fr; gap: 22px; }
  .w-widget .w-controls--2 { grid-template-columns: 1fr; }
  .w-widget .w-pegrid { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  .w-widget .w-bars { gap: 8px; }
  .w-widget .w-blabels { gap: 8px; }
  .w-widget .w-step { grid-template-columns: 2.2em minmax(0, 1fr); }
}

/* 组件宽度自适应：文章栏可能远窄于视口，用容器查询把两栏压成一栏 */
@container (max-width: 700px) {
  .w-widget .w-cols,
  .w-widget .w-cols--detail { grid-template-columns: 1fr; gap: 14px; }
  .w-widget .w-panel { border-left: 0; border-top: 1px solid var(--w-rule-soft); padding-left: 0; padding-top: 12px; }
  .w-widget .w-proj { grid-template-columns: 1fr; gap: 18px; }
  .w-widget .w-qkv { grid-template-columns: 1fr; gap: 14px; }
  .w-widget .w-stack { grid-template-columns: 1fr; gap: 22px; }
  .w-widget .w-controls--2 { grid-template-columns: 1fr; }
  .w-widget .w-bars { gap: 8px; }
  .w-widget .w-blabels { gap: 8px; }
}

/* 减少动态：去掉所有过渡 */
@media (prefers-reduced-motion: reduce) {
  .w-widget *,
  .w-widget *::before,
  .w-widget *::after {
    transition: none !important;
    animation: none !important;
  }
}
`;

  function ensureStyle() {
    if (!doc) return;
    if (doc.getElementById(STYLE_ID)) return;
    var style = doc.createElement("style");
    style.id = STYLE_ID;
    style.appendChild(doc.createTextNode(CSS));
    (doc.head || doc.documentElement).appendChild(style);
  }

  /* ========================================================================== *
   * 1. 基础工具
   * ========================================================================== */

  var SVG_NS = "http://www.w3.org/2000/svg";
  var uidSeq = 0;

  function uid(prefix) {
    uidSeq += 1;
    return (prefix || "w") + "-" + uidSeq;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /** HTML 元素 */
  function h(tag, cls, text) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.appendChild(doc.createTextNode(String(text)));
    return node;
  }

  /** SVG 元素 */
  function s(tag, attrs) {
    var node = doc.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined) continue;
        node.setAttribute(k, String(v));
      }
    }
    return node;
  }

  function add(parent, child) {
    if (child) parent.appendChild(child);
    return child;
  }

  function svgText(x, y, str, cls, anchor) {
    var t = s("text", { x: x, y: y, "text-anchor": anchor || "middle" });
    if (cls) t.setAttribute("class", cls);
    t.appendChild(doc.createTextNode(String(str)));
    return t;
  }

  function svgLine(x1, y1, x2, y2, cls, width) {
    var node = s("line", { x1: x1, y1: y1, x2: x2, y2: y2 });
    node.setAttribute("class", cls || "st-faint");
    if (width !== undefined) node.setAttribute("stroke-width", width);
    return node;
  }

  function svgRect(x, y, w, hgt, cls) {
    var node = s("rect", { x: x, y: y, width: w, height: hgt });
    if (cls) node.setAttribute("class", cls);
    return node;
  }

  function svgPath(d, cls, width) {
    var node = s("path", { d: d });
    if (cls) node.setAttribute("class", cls);
    if (width !== undefined) node.setAttribute("stroke-width", width);
    return node;
  }

  function svgChart(w, hgt, title) {
    var root = s("svg", {
      viewBox: "0 0 " + w + " " + hgt,
      preserveAspectRatio: "xMidYMid meet",
      "aria-hidden": "true",
      focusable: "false"
    });
    root.setAttribute("class", "w-svg");
    if (title) {
      var t = s("title");
      t.appendChild(doc.createTextNode(title));
      root.appendChild(t);
    }
    return root;
  }

  /** 数值格式化（负零归一） */
  function fmt(value, digits) {
    var d = digits === undefined ? 2 : digits;
    var x = Number(value);
    if (!isFinite(x)) return "—";
    var str = Math.abs(x).toFixed(d);
    if (Number(str) === 0) return str;
    return (x < 0 ? "\u2212" : "") + str;
  }

  function fmtSigned(value, digits) {
    var x = Number(value);
    if (!isFinite(x)) return "—";
    var str = fmt(Math.abs(x), digits === undefined ? 2 : digits);
    if (Number(str) === 0) return "0." + new Array((digits === undefined ? 2 : digits) + 1).join("0");
    return (x < 0 ? "−" : "+") + str;
  }

  function pct(value, digits) {
    return (Number(value) * 100).toFixed(digits === undefined ? 1 : digits) + "%";
  }

  function clamp(value, lo, hi) {
    return value < lo ? lo : value > hi ? hi : value;
  }

  function deg(rad) {
    return (rad * 180) / Math.PI;
  }

  function rad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function normDeg(degrees) {
    var d = degrees % 360;
    return d < 0 ? d + 360 : d;
  }

  /** 数值稳定的 softmax；temperature 可调；-Infinity 分数视为被遮掉 */
  function softmax(scores, temperature) {
    var temp = typeof temperature === "number" && temperature > 0 ? temperature : 1;
    var i;
    var max = -Infinity;
    var scaled = new Array(scores.length);
    for (i = 0; i < scores.length; i += 1) {
      var score = scores[i];
      scaled[i] = score === -Infinity ? -Infinity : score / temp;
      if (scaled[i] > max) max = scaled[i];
    }
    var out = new Array(scores.length);
    var sum = 0;
    for (i = 0; i < scores.length; i += 1) {
      var v = scaled[i] === -Infinity ? 0 : Math.exp(scaled[i] - max);
      out[i] = v;
      sum += v;
    }
    if (sum <= 0) {
      for (i = 0; i < out.length; i += 1) out[i] = 1 / out.length;
      return out;
    }
    for (i = 0; i < out.length; i += 1) out[i] = out[i] / sum;
    return out;
  }

  /** 头行：互动 id + 操作提示 */
  function headRow(root, name, hint) {
    var head = h("div", "w-head");
    add(head, h("span", "w-kicker", "互动 · " + name));
    add(head, h("span", "w-hint", hint || ""));
    root.appendChild(head);
    return head;
  }

  /** 读数表：返回 { el, add(label) -> dd } */
  function readout() {
    var dl = h("dl", "w-read");
    return {
      el: dl,
      add: function (label) {
        var dt = h("dt", null, label);
        var dd = h("dd", null, "—");
        dl.appendChild(dt);
        dl.appendChild(dd);
        return dd;
      }
    };
  }

  /** 滑杆：返回 { el, input, out, value(), set(v) }，set 不触发 oninput */
  function rangeCtl(opts) {
    var id = uid("w-range");
    var wrap = h("div", "w-ctl");
    var lab = h("label", null, opts.label);
    lab.setAttribute("for", id);
    var input = h("input", "w-range");
    input.type = "range";
    input.id = id;
    input.min = String(opts.min);
    input.max = String(opts.max);
    input.step = String(opts.step === undefined ? 1 : opts.step);
    input.value = String(opts.value);
    var out = h("output", null, "");
    out.setAttribute("for", id);
    wrap.appendChild(lab);
    wrap.appendChild(input);
    wrap.appendChild(out);
    var format = opts.format || function (v) { return String(v); };
    function syncOut() { out.textContent = format(Number(input.value)); }
    input.addEventListener("input", function () {
      syncOut();
      if (opts.oninput) opts.oninput(Number(input.value));
    });
    syncOut();
    return {
      el: wrap,
      input: input,
      out: out,
      value: function () { return Number(input.value); },
      set: function (v) {
        input.value = String(v);
        syncOut();
      }
    };
  }

  /**
   * 按钮组：items = [{ value, label, ariaLabel?, cls? }]
   * 返回 { el, set(value) }
   */
  function buttonGroup(items, active, onPick) {
    var wrap = h("div", "w-btns");
    var buttons = [];
    var current = active;
    function apply(value) {
      current = value;
      for (var i = 0; i < buttons.length; i += 1) {
        buttons[i].node.setAttribute("aria-pressed", buttons[i].value === value ? "true" : "false");
      }
    }
    items.forEach(function (item) {
      var btn = h("button", "w-btn" + (item.cls ? " " + item.cls : ""), item.label);
      btn.type = "button";
      if (item.ariaLabel) btn.setAttribute("aria-label", item.ariaLabel);
      else if (item.title) btn.title = item.title;
      btn.setAttribute("aria-pressed", item.value === active ? "true" : "false");
      btn.addEventListener("click", function () {
        apply(item.value);
        if (onPick) onPick(item.value);
      });
      buttons.push({ node: btn, value: item.value });
      wrap.appendChild(btn);
    });
    return {
      el: wrap,
      set: apply,
      value: function () { return current; }
    };
  }

  /** 横向 meter 行 */
  function meterRow(label, valueText, ratio, hot) {
    var row = h("div", "w-meter-row");
    add(row, h("span", null, label));
    var track = h("div", "w-meter-track");
    var fill = h("div", "w-meter-fill" + (hot ? " is-hot" : ""));
    fill.style.width = clamp(ratio, 0, 1) * 100 + "%";
    track.appendChild(fill);
    add(row, track);
    add(row, h("span", "w-meter-val", valueText));
    return { el: row, fill: fill, value: row.lastChild };
  }

  /* ========================================================================== *
   * 2. dotproduct —— 两个可拖动向量：点积、夹角、余弦
   * ========================================================================== */

  function buildDotProduct(root) {
    headRow(root, "dotproduct", "拖动向量尖端，或调下方滑杆");

    var cols = h("div", "w-cols");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    var state = {
      a: { ang: 26, len: 0.96 },
      b: { ang: 72, len: 0.98 }
    };
    var W = 460;
    var H = 380;
    var cx = 230;
    var cy = 190;
    var R = 150;
    var LIMIT = 1.12;
    var SC = R / LIMIT;

    var chart = svgChart(W, H, "两个二维向量、它们的夹角与点积");
    chart.setAttribute("class", "w-svg w-svg--drag");
    main.appendChild(chart);

    /* 箭头标记 */
    var defs = s("defs");
    function makeMarker(cls) {
      var id = uid("w-arrow");
      var marker = s("marker", {
        id: id,
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: "auto"
      });
      var p = s("path", { d: "M0,1 L10,5 L0,9 z" });
      p.setAttribute("class", cls);
      marker.appendChild(p);
      defs.appendChild(marker);
      return "url(#" + id + ")";
    }
    var markerA = makeMarker("f-rubric");
    var markerB = makeMarker("f-verdigris");
    chart.appendChild(defs);

    /* 静态网格 */
    var grid = s("g");
    chart.appendChild(grid);
    for (var gx = -2; gx <= 2; gx += 1) {
      var gridX = cx + (gx * SC) / 2;
      grid.appendChild(svgLine(gridX, cy - R - 10, gridX, cy + R + 10, gx === 0 ? "st-soft" : "st-rule", gx === 0 ? 1 : 1));
      var gridY = cy - (gx * SC) / 2;
      grid.appendChild(svgLine(cx - R - 10, gridY, cx + R + 10, gridY, gx === 0 ? "st-soft" : "st-rule", gx === 0 ? 1 : 1));
    }
    chart.appendChild(s("circle", { cx: cx, cy: cy, r: SC, class: "st-rule" }));
    grid.appendChild(svgText(cx + R + 16, cy + 4, "+x", "t-tiny", "start"));
    grid.appendChild(svgText(cx + 6, cy - R - 16, "+y", "t-tiny", "start"));
    grid.appendChild(svgText(cx + SC + 4, cy - 6, "1", "t-tiny", "start"));
    grid.appendChild(svgText(cx - SC - 4, cy - 6, "−1", "t-tiny", "end"));
    grid.appendChild(s("circle", { cx: cx, cy: cy, r: 2.2, class: "f-ink" }));

    var dyn = s("g");
    chart.appendChild(dyn);

    function toXY(vec) {
      return { x: cx + vec.x * SC, y: cy - vec.y * SC };
    }

    function vectorOf(p) {
      return { x: p.len * Math.cos(rad(p.ang)), y: p.len * Math.sin(rad(p.ang)) };
    }

    function roundTo(v, digits) {
      var m = Math.pow(10, digits);
      return Math.round(v * m) / m;
    }

    function drawVector(vec, marker, colorCls, label) {
      var tip = toXY(vec);
      dyn.appendChild(svgLine(cx, cy, tip.x, tip.y, "st-" + colorCls, 2.4));
      var lineEl = dyn.lastChild;
      lineEl.setAttribute("marker-end", marker);
      dyn.appendChild(s("circle", { cx: tip.x, cy: tip.y, r: 7.5, class: "f-ground st-" + colorCls }));
      dyn.lastChild.setAttribute("stroke-width", 2.4);
      dyn.appendChild(s("circle", { cx: tip.x, cy: tip.y, r: 2.2, class: "f-" + colorCls }));
      var lx = tip.x + (vec.x >= 0 ? 12 : -12);
      var ly = tip.y + (vec.y >= 0 ? -10 : 16);
      dyn.appendChild(svgText(lx, ly, label, "t-" + colorCls + " t-mid t-num", vec.x >= 0 ? "start" : "end"));
    }

    function render() {
      clear(dyn);
      var va = vectorOf(state.a);
      var vb = vectorOf(state.b);
      var dot = va.x * vb.x + va.y * vb.y;
      var lenA = Math.sqrt(va.x * va.x + va.y * va.y);
      var lenB = Math.sqrt(vb.x * vb.x + vb.y * vb.y);
      var cos = dot / (lenA * lenB);
      cos = clamp(cos, -1, 1);
      var angle = deg(Math.acos(cos));

      /* 夹角扇形 */
      var angA = Math.atan2(va.y, va.x);
      var angB = Math.atan2(vb.y, vb.x);
      var diff = angB - angA;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > 0.02) {
        var arcR = 42;
        var pA = { x: cx + arcR * Math.cos(angA), y: cy - arcR * Math.sin(angA) };
        var pB = { x: cx + arcR * Math.cos(angB), y: cy - arcR * Math.sin(angB) };
        var large = Math.abs(diff) > Math.PI ? 1 : 0;
        var sweep = diff > 0 ? 0 : 1;
        dyn.appendChild(svgPath(
          "M" + pA.x + "," + pA.y + " A" + arcR + "," + arcR + " 0 " + large + " " + sweep + " " + pB.x + "," + pB.y,
          "st-gold",
          1.4
        ));
        var mid = angA + diff / 2;
        dyn.appendChild(svgText(
          cx + 60 * Math.cos(mid),
          cy - 60 * Math.sin(mid) + 4,
          fmt(angle, 0) + "°",
          "t-gold t-num",
          "middle"
        ));
      }

      drawVector(va, markerA, "rubric", "a");
      drawVector(vb, markerB, "verdigris", "b");

      /* 读数 */
      ddA.textContent = "(" + fmt(va.x, 2) + ", " + fmt(va.y, 2) + ")";
      ddB.textContent = "(" + fmt(vb.x, 2) + ", " + fmt(vb.y, 2) + ")";
      ddDot.textContent = fmt(dot, 3);
      ddLenA.textContent = fmt(lenA, 3);
      ddLenB.textContent = fmt(lenB, 3);
      ddCos.textContent = fmt(cos, 3);
      ddAngle.textContent = fmt(angle, 1) + "°";
      ddFormula.textContent = "= " + fmt(va.x, 2) + "×" + fmt(vb.x, 2) + " + " + fmt(va.y, 2) + "×" + fmt(vb.y, 2);

      var verdict;
      if (cos > 0.995) verdict = "同向：点积取最大值 |a||b|，两个向量在说同一件事。";
      else if (cos > 0.7) verdict = "锐角很小：点积接近最大，方向高度一致。";
      else if (cos > 0.15) verdict = "锐角：点积为正，方向大体一致。";
      else if (cos >= -0.15) verdict = "垂直：点积为 0，两个方向互不相干。";
      else if (cos > -0.7) verdict = "钝角：点积为负，方向大体相反。";
      else if (cos > -0.995) verdict = "接近反向：点积接近 −|a||b|。";
      else verdict = "反向：点积取最小值 −|a||b|。";
      liveVerdict.textContent = verdict;
      liveMark.textContent = "θ = " + fmt(angle, 1) + "°, cos θ = " + fmt(cos, 3);
    }

    function syncSliders() {
      ctlAAng.set(state.a.ang);
      ctlALen.set(state.a.len);
      ctlBAng.set(state.b.ang);
      ctlBLen.set(state.b.len);
    }

    /* 拖动 */
    var dragging = null;

    function dataPoint(evt) {
      var box = chart.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      var x = (evt.clientX - box.left) * (W / box.width);
      var y = (evt.clientY - box.top) * (H / box.height);
      return { x: (x - cx) / SC, y: (cy - y) / SC };
    }

    function moveActive(evt) {
      var pt = dataPoint(evt);
      if (!pt || !dragging) return;
      var target = state[dragging];
      var x = clamp(pt.x, -LIMIT, LIMIT);
      var y = clamp(pt.y, -LIMIT, LIMIT);
      var len = Math.sqrt(x * x + y * y);
      if (len < 0.22) {
        if (len < 0.0001) {
          x = 0.22 * Math.cos(rad(target.ang));
          y = 0.22 * Math.sin(rad(target.ang));
          len = 0.22;
        } else {
          x = (x / len) * 0.22;
          y = (y / len) * 0.22;
        }
      }
      target.len = roundTo(Math.min(1.1, Math.max(0.22, len)), 2);
      target.ang = normDeg(Math.round(deg(Math.atan2(y, x))));
      syncSliders();
      render();
    }

    chart.addEventListener("pointerdown", function (evt) {
      var pt = dataPoint(evt);
      if (!pt) return;
      var va = vectorOf(state.a);
      var vb = vectorOf(state.b);
      var da = Math.hypot(pt.x - va.x, pt.y - va.y);
      var db = Math.hypot(pt.x - vb.x, pt.y - vb.y);
      dragging = da <= db ? "a" : "b";
      if (chart.setPointerCapture) {
        try { chart.setPointerCapture(evt.pointerId); } catch (err) { /* ignore */ }
      }
      evt.preventDefault();
      moveActive(evt);
    });
    chart.addEventListener("pointermove", function (evt) {
      if (!dragging) return;
      evt.preventDefault();
      moveActive(evt);
    });
    function endDrag() { dragging = null; }
    chart.addEventListener("pointerup", endDrag);
    chart.addEventListener("pointercancel", endDrag);

    /* 滑杆 */
    var controls = h("div", "w-controls w-controls--2");
    main.appendChild(controls);

    function bindSlider(ctl, target, key, digits) {
      ctl.input.addEventListener("input", function () {
        target[key] = digits === 2 ? roundTo(Number(ctl.input.value), 2) : Math.round(Number(ctl.input.value));
        render();
      });
    }

    var ctlAAng = rangeCtl({
      label: "a 方向",
      min: 0, max: 359, step: 1, value: state.a.ang,
      format: function (v) { return Math.round(v) + "°"; }
    });
    var ctlALen = rangeCtl({
      label: "a 长度",
      min: 0.2, max: 1.1, step: 0.01, value: state.a.len,
      format: function (v) { return fmt(v, 2); }
    });
    var ctlBAng = rangeCtl({
      label: "b 方向",
      min: 0, max: 359, step: 1, value: state.b.ang,
      format: function (v) { return Math.round(v) + "°"; }
    });
    var ctlBLen = rangeCtl({
      label: "b 长度",
      min: 0.2, max: 1.1, step: 0.01, value: state.b.len,
      format: function (v) { return fmt(v, 2); }
    });
    controls.appendChild(ctlAAng.el);
    controls.appendChild(ctlALen.el);
    controls.appendChild(ctlBAng.el);
    controls.appendChild(ctlBLen.el);
    bindSlider(ctlAAng, state.a, "ang", 0);
    bindSlider(ctlALen, state.a, "len", 2);
    bindSlider(ctlBAng, state.b, "ang", 0);
    bindSlider(ctlBLen, state.b, "len", 2);

    /* 面板 */
    add(panel, h("p", "w-tag", "实时读数"));
    var out = readout();
    panel.appendChild(out.el);
    var ddA = out.add("a = (x, y)");
    var ddB = out.add("b = (x, y)");
    var ddDot = out.add("a · b");
    var ddLenA = out.add("|a|");
    var ddLenB = out.add("|b|");
    var ddCos = out.add("cos θ");
    var ddAngle = out.add("夹角 θ");
    var ddFormula = out.add("ax·bx + ay·by");

    add(panel, h("p", "w-sub", "预设"));
    var presets = buttonGroup([
      { value: "same", label: "同向" },
      { value: "perp", label: "垂直" },
      { value: "opp", label: "反向" },
      { value: "reset", label: "重置" }
    ], "", function (kind) {
      if (kind === "reset") {
        state.a.ang = 26; state.a.len = 0.96;
        state.b.ang = 72; state.b.len = 0.98;
      } else if (kind === "same") {
        state.b.ang = state.a.ang; state.b.len = state.a.len;
      } else if (kind === "perp") {
        state.b.ang = normDeg(state.a.ang + 90); state.b.len = state.a.len;
      } else if (kind === "opp") {
        state.b.ang = normDeg(state.a.ang + 180); state.b.len = state.a.len;
      }
      syncSliders();
      render();
    });
    panel.appendChild(presets.el);

    add(panel, h("p", "w-sub", "它是什么"));
    panel.appendChild(h("p", "w-note", "点积把两个方向压成一个数。同向越大，垂直为 0，反向为负。"));
    var liveMark = h("p", "w-note", "");
    panel.appendChild(liveMark);

    var liveVerdict = h("p", "w-note", "");
    main.appendChild(liveVerdict);
    main.appendChild(h("p", "w-note", "拖动两个向量尖端试试：把 b 转到 a 的方向上，点积会变成 |a||b|；转到垂直，点积归零。"));

    render();
  }

  /* ========================================================================== *
   * 3. softmax —— logits 滑杆、温度、概率柱状图
   * ========================================================================== */

  function buildSoftmax(root) {
    headRow(root, "softmax", "拖动 logits，切换温度");

    var state = {
      logits: [2.0, 1.0, 0.3, -1.0],
      temp: 1
    };
    var count = state.logits.length;

    var cols = h("div", "w-cols");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    var bars = h("div", "w-bars");
    var barCols = [];
    for (var i = 0; i < count; i += 1) {
      var bcol = h("div", "w-bcol");
      var bval = h("span", "w-bval", "");
      var bar = h("div", "w-bar");
      bcol.appendChild(bval);
      bcol.appendChild(bar);
      bars.appendChild(bcol);
      barCols.push({ value: bval, bar: bar });
    }
    main.appendChild(bars);

    var blabels = h("div", "w-blabels");
    var labelEls = [];
    for (var j = 0; j < count; j += 1) {
      var lab = h("div", "w-blabel");
      var zspan = h("span", "w-blabel-z", "");
      lab.appendChild(document.createTextNode("z" + (j + 1)));
      lab.appendChild(zspan);
      blabels.appendChild(lab);
      labelEls.push({ node: lab, z: zspan });
    }
    main.appendChild(blabels);

    /* 滑杆 */
    var controls = h("div", "w-controls w-controls--2");
    main.appendChild(controls);
    var sliders = [];
    for (var k = 0; k < count; k += 1) {
      (function (index) {
        var ctl = rangeCtl({
          label: "logit z" + (index + 1),
          min: -4, max: 4, step: 0.05, value: state.logits[index],
          format: function (v) { return fmt(v, 2); }
        });
        ctl.input.addEventListener("input", function () {
          state.logits[index] = Number(ctl.input.value);
          render();
        });
        controls.appendChild(ctl.el);
        sliders.push(ctl);
      })(k);
    }

    /* 面板：温度 */
    add(panel, h("p", "w-tag", "温度 T"));
    var tempGroup = buttonGroup([
      { value: "0.5", label: "0.5 · 尖", cls: "w-accent" },
      { value: "1", label: "1 · 标准", cls: "w-accent" },
      { value: "2", label: "2 · 平", cls: "w-accent" }
    ], "1", function (value) {
      state.temp = Number(value);
      render();
    });
    panel.appendChild(tempGroup.el);

    add(panel, h("p", "w-sub", "指数 exp(z / T)"));
    var exps = readout();
    panel.appendChild(exps.el);
    var expEls = [];
    for (var m = 0; m < count; m += 1) expEls.push(exps.add("exp(z" + (m + 1) + " / T)"));
    var ddSum = exps.add("Σ exp");
    var ddMax = exps.add("最大概率 p");
    var ddTop = exps.add("最可能的词");

    add(panel, h("p", "w-sub", "公式"));
    panel.appendChild(h("p", "w-note", "pᵢ = exp(zᵢ / T) ÷ Σⱼ exp(zⱼ / T)。除以 T 就是调温度。"));
    var tempNote = h("p", "w-note", "");
    panel.appendChild(tempNote);

    function render() {
      var expsRaw = [];
      var i;
      for (i = 0; i < count; i += 1) expsRaw.push(Math.exp(state.logits[i] / state.temp));
      var sum = 0;
      for (i = 0; i < count; i += 1) sum += expsRaw[i];
      var probs = softmax(state.logits, state.temp);
      var maxP = 0;
      var maxIndex = 0;
      for (i = 0; i < count; i += 1) {
        if (probs[i] > maxP) { maxP = probs[i]; maxIndex = i; }
      }

      for (i = 0; i < count; i += 1) {
        var p = probs[i];
        barCols[i].bar.style.height = clamp(p * 100, 0.5, 100) + "%";
        barCols[i].bar.className = "w-bar" + (i === maxIndex ? " is-max" : "");
        barCols[i].value.textContent = fmt(p, 3);
        labelEls[i].z.textContent = "z = " + fmt(state.logits[i], 2);
        expEls[i].textContent = fmt(expsRaw[i], 3);
      }
      ddSum.textContent = fmt(sum, 3);
      ddMax.textContent = pct(maxP, 1);
      ddTop.textContent = "z" + (maxIndex + 1);

      if (state.temp < 1) tempNote.textContent = "T = 0.5：指数被放大，分布变尖，最高分几乎吞掉全部概率。";
      else if (state.temp > 1) tempNote.textContent = "T = 2：指数被压扁，分布变平，低分也能分到可观概率。";
      else tempNote.textContent = "T = 1：论文里的标准 softmax，分数直接进指数。";
    }

    main.appendChild(h("p", "w-note", "柱子高度 = 概率 p。拉大某个 logit 的差距，再看 T 取 0.5、1、2 时分布怎么变尖或变平。"));
    render();
  }

  /* ========================================================================== *
   * 2.5 共享语料：一句话、词性、预置注意力
   *     attention / multihead / mask / shapes / qkv 共用同一句话。
   * ========================================================================== */

  var SENTENCE = [
    { w: "The", t: "art" },
    { w: "animal", t: "animal" },
    { w: "didn't", t: "aux" },
    { w: "cross", t: "verb" },
    { w: "the", t: "art" },
    { w: "street", t: "place" },
    { w: "because", t: "conj" },
    { w: "it", t: "pron" },
    { w: "was", t: "aux" },
    { w: "too", t: "adv" },
    { w: "tired", t: "adj" }
  ];

  /* 查询词性 → 被看词性 的预置语义分数（0 表示没有特别关系） */
  var AFFINITY = {
    art: { animal: 1.0, place: 0.9, adj: 0.3, verb: 0.2, adv: 0.1 },
    animal: { verb: 2.6, pron: 1.2, adj: 1.5, art: 1.0, aux: 1.2, place: 0.6, conj: 0.3, adv: 0.2 },
    aux: { verb: 2.2, adj: 1.5, pron: 0.8, art: 0.6, place: 0.4, adv: 0.5 },
    verb: { animal: 2.4, place: 2.0, pron: 1.6, art: 1.2, aux: 1.0, adv: 1.4, adj: 0.9, conj: 0.5 },
    place: { art: 0.9, verb: 1.4, pron: 1.0, adj: 1.2, aux: 0.6, animal: 0.8 },
    conj: { pron: 1.8, adj: 2.0, verb: 1.4, aux: 1.2, animal: 0.8, place: 0.6 },
    pron: { animal: 3.2, place: 1.0, adj: 1.2, verb: 0.5, aux: 0.4, art: 0.1, conj: 0.1, pron: 0.2, adv: 0.2 },
    adj: { animal: 1.2, place: 1.4, pron: 1.0, verb: 0.8, aux: 0.8, art: 0.4, adv: 0.9 },
    adv: { adj: 1.8, verb: 1.4, aux: 1.0, pron: 0.6, animal: 0.4, place: 0.4 }
  };

  var ATT_TEMP = 0.65;

  /** 某一行的原始分数 */
  function attentionScores(i) {
    var scores = [];
    var type = SENTENCE[i].t;
    var table = AFFINITY[type] || {};
    for (var j = 0; j < SENTENCE.length; j += 1) {
      var score = table[SENTENCE[j].t] || 0;
      score += 0.55 * Math.exp(-Math.abs(i - j) / 3.2);
      if (i === j) score += 0.35;
      scores.push(score);
    }
    return scores;
  }

  /** 某一行的注意力权重（softmax 后，和为 1） */
  function attentionWeights(i) {
    return softmax(attentionScores(i), ATT_TEMP);
  }

  var ATT_MATRIX = (function () {
    var rows = [];
    for (var i = 0; i < SENTENCE.length; i += 1) rows.push(attentionWeights(i));
    return rows;
  })();

  function topKeys(weights, count) {
    var order = [];
    for (var i = 0; i < weights.length; i += 1) order.push(i);
    order.sort(function (a, b) { return weights[b] - weights[a]; });
    return order.slice(0, count);
  }

  function entropyBits(weights) {
    var total = 0;
    for (var i = 0; i < weights.length; i += 1) {
      var p = weights[i];
      if (p > 1e-9) total -= p * (Math.log(p) / Math.LN2);
    }
    return total;
  }

  var SUB_DIGITS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
  function sub(number) {
    return String(number).split("").map(function (ch) { return SUB_DIGITS[Number(ch)]; }).join("");
  }

  function roundTo(value, digits) {
    var m = Math.pow(10, digits);
    return Math.round(value * m) / m;
  }

  /* ========================================================================== *
   * 4. projection —— x(1×4) 分别乘 W_Q / W_K / W_V，逐格高亮乘加
   * ========================================================================== */

  var PROJ_ROLES = [
    {
      key: "q", cls: "q", name: "查询 query",
      W: [
        [0.5, -0.2, 0.1],
        [-0.3, 0.6, 0.2],
        [0.4, 0.1, -0.5],
        [0.2, -0.4, 0.7]
      ]
    },
    {
      key: "k", cls: "k", name: "键 key",
      W: [
        [-0.2, 0.5, 0.3],
        [0.6, -0.1, 0.2],
        [0.1, 0.4, -0.3],
        [-0.5, 0.2, 0.6]
      ]
    },
    {
      key: "v", cls: "v", name: "值 value",
      W: [
        [0.3, 0.2, -0.4],
        [-0.2, 0.5, 0.1],
        [0.6, -0.3, 0.2],
        [0.1, 0.4, 0.5]
      ]
    }
  ];

  function buildProjection(root) {
    headRow(root, "projection", "点输出格，逐格看四个乘加");

    var x = [0.8, -0.4, 0.6, 0.2];
    var state = { role: 0, col: 0 };

    /* 输入 x */
    add(root, h("p", "w-note", "输入 x（1 × 4）· 同一份输入，三种角色"));
    var xRow = h("div", "w-matrix");
    xRow.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    var xCells = [];
    for (var i = 0; i < 4; i += 1) {
      var cell = h("div", "w-cell w-cell--input", "0.00");
      xRow.appendChild(cell);
      xCells.push(cell);
    }
    root.appendChild(xRow);

    var xControls = h("div", "w-controls w-controls--2");
    root.appendChild(xControls);
    var xSliders = [];
    for (var xi = 0; xi < 4; xi += 1) {
      (function (index) {
        var ctl = rangeCtl({
          label: "x" + sub(index + 1),
          min: -1, max: 1, step: 0.05, value: x[index],
          format: function (v) { return fmt(v, 2); }
        });
        ctl.input.addEventListener("input", function () {
          x[index] = Number(ctl.input.value);
          render();
        });
        xControls.appendChild(ctl.el);
        xSliders.push(ctl);
      })(xi);
    }

    /* 三组投影 */
    var proj = h("div", "w-proj");
    root.appendChild(proj);
    var roleRefs = [];
    PROJ_ROLES.forEach(function (role, roleIndex) {
      var col = h("div", "w-prole w-prole--" + role.cls);
      var head = h("div", "w-prole__head");
      head.appendChild(h("b", null, role.key));
      head.appendChild(h("span", null, role.name));
      col.appendChild(head);
      col.appendChild(h("p", "w-note", role.key + " = x · W_" + role.key));

      var matrix = h("div", "w-matrix");
      matrix.style.gridTemplateColumns = "auto repeat(3, minmax(0, 1fr))";
      matrix.appendChild(h("div", "w-cell w-cell--label", ""));
      for (var d = 0; d < 3; d += 1) matrix.appendChild(h("div", "w-cell w-cell--head", "d" + sub(d + 1)));
      var matCells = [];
      for (var row = 0; row < 4; row += 1) {
        matrix.appendChild(h("div", "w-cell w-cell--label", "x" + sub(row + 1)));
        var rowCells = [];
        for (var colIndex = 0; colIndex < 3; colIndex += 1) {
          var mc = h("div", "w-cell", fmt(role.W[row][colIndex], 2));
          matrix.appendChild(mc);
          rowCells.push(mc);
        }
        matCells.push(rowCells);
      }
      col.appendChild(matrix);

      var outLabel = h("p", "w-note", "→ " + role.key + " = ( … )");
      col.appendChild(outLabel);
      var outRow = h("div", "w-matrix");
      outRow.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
      var outButtons = [];
      for (var oi = 0; oi < 3; oi += 1) {
        (function (outIndex) {
          var btn = h("button", "w-cellbtn", "0.00");
          btn.type = "button";
          btn.setAttribute("aria-label", role.key + " 的第 " + (outIndex + 1) + " 维");
          btn.addEventListener("click", function () {
            state.role = roleIndex;
            state.col = outIndex;
            render();
          });
          btn.addEventListener("focus", function () {
            state.role = roleIndex;
            state.col = outIndex;
            render();
          });
          outRow.appendChild(btn);
          outButtons.push(btn);
        })(oi);
      }
      col.appendChild(outRow);
      proj.appendChild(col);
      roleRefs.push({ role: role, matCells: matCells, outButtons: outButtons, outLabel: outLabel });
    });

    /* 步骤控制 + 公式 */
    var stepRow = h("div", "w-btns");
    stepRow.style.marginTop = "14px";
    root.appendChild(stepRow);
    var prevBtn = h("button", "w-btn", "← 上一格");
    prevBtn.type = "button";
    var nextBtn = h("button", "w-btn", "下一格 →");
    nextBtn.type = "button";
    stepRow.appendChild(prevBtn);
    stepRow.appendChild(nextBtn);

    var formula = h("div", "w-formula");
    root.appendChild(formula);

    add(root, h("p", "w-note", "同一个 x 乘三个不同的矩阵：W_Q 把它变成“我要找什么”，W_K 变成“我能被什么找到”，W_V 变成“我能交出什么”。矩阵是固定的，变的是 x。"));

    function step(delta) {
      var flat = state.role * 3 + state.col;
      flat = (flat + delta + 9) % 9;
      state.role = Math.floor(flat / 3);
      state.col = flat % 3;
      render();
    }
    prevBtn.addEventListener("click", function () { step(-1); });
    nextBtn.addEventListener("click", function () { step(1); });

    function render() {
      var xi2;
      for (xi2 = 0; xi2 < 4; xi2 += 1) {
        xCells[xi2].textContent = fmt(x[xi2], 2);
        xCells[xi2].className = "w-cell w-cell--input";
      }
      var outputs = [];
      roleRefs.forEach(function (ref) {
        var out = [0, 0, 0];
        for (var i2 = 0; i2 < 4; i2 += 1) {
          for (var j2 = 0; j2 < 3; j2 += 1) out[j2] += x[i2] * ref.role.W[i2][j2];
        }
        outputs.push(out);
        for (var j3 = 0; j3 < 3; j3 += 1) {
          ref.outButtons[j3].textContent = fmt(out[j3], 2);
          ref.outButtons[j3].setAttribute("aria-pressed", "false");
          ref.outLabel.textContent = "→ " + ref.role.key + " = (" + fmt(out[0], 2) + ", " + fmt(out[1], 2) + ", " + fmt(out[2], 2) + ")";
        }
      });

      var activeRole = roleRefs[state.role];
      var activeCol = state.col;
      var activeOutput = outputs[state.role][activeCol];

      roleRefs.forEach(function (ref, roleIndex) {
        for (var i3 = 0; i3 < 4; i3 += 1) {
          for (var j4 = 0; j4 < 3; j4 += 1) {
            var cell = ref.matCells[i3][j4];
            var hit = roleIndex === state.role && j4 === activeCol;
            cell.className = "w-cell" + (hit ? " w-cell--hit" : "");
          }
        }
        ref.outButtons.forEach(function (btn, btnIndex) {
          btn.setAttribute("aria-pressed", roleIndex === state.role && btnIndex === activeCol ? "true" : "false");
        });
      });
      xCells.forEach(function (cell) { cell.className = "w-cell w-cell--input"; });

      var t1 = [];
      var t2 = [];
      for (var t = 0; t < 4; t += 1) {
        t1.push("x" + sub(t + 1) + "·W" + sub(t + 1) + sub(activeCol + 1));
        var xv = x[t];
        var wv = activeRole.role.W[t][activeCol];
        t2.push("(" + fmt(xv, 2) + ")×(" + fmt(wv, 2) + ")");
      }
      clear(formula);
      formula.appendChild(h("div", null, "第 " + (state.role * 3 + activeCol + 1) + " / 9 格 · " + activeRole.role.name + " 的第 " + (activeCol + 1) + " 维："));
      formula.appendChild(h("div", null, activeRole.role.key + sub(activeCol + 1) + " = " + t1.join(" + ")));
      formula.appendChild(h("div", null, "= " + t2.join(" + ")));
      var valueLine = h("div", null, "");
      valueLine.appendChild(h("b", null, activeRole.role.key + sub(activeCol + 1) + " = " + fmt(activeOutput, 2)));
      formula.appendChild(valueLine);
    }

    render();
  }

  /* ========================================================================== *
   * 5. attention —— 点一个词，看它的注意力弧线与 softmax 权重
   * ========================================================================== */

  function buildAttention(root) {
    headRow(root, "attention", "点一个词作为查询，默认 it");

    var n = SENTENCE.length;
    var query = 7;

    var tokenWrap = h("div", "w-tokens");
    root.appendChild(tokenWrap);
    var tokenButtons = [];
    for (var ti = 0; ti < n; ti += 1) {
      (function (index) {
        var btn = h("button", "w-token", SENTENCE[index].w);
        btn.type = "button";
        btn.setAttribute("aria-pressed", index === query ? "true" : "false");
        btn.addEventListener("click", function () {
          query = index;
          render();
        });
        tokenWrap.appendChild(btn);
        tokenButtons.push(btn);
      })(ti);
    }

    var cols = h("div", "w-cols");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    var W = 720;
    var H = 310;
    var chart = svgChart(W, H, "一句话中某个词对其余词的注意力权重");
    main.appendChild(chart);
    var PNG = { left: 24, right: 696 };
    function xOf(index) {
      return PNG.left + (index * (PNG.right - PNG.left)) / (n - 1);
    }
    var baseY = 236;

    var grid = s("g");
    grid.appendChild(svgLine(18, baseY + 8, 702, baseY + 8, "st-rule", 1));
    chart.appendChild(grid);

    var dyn = s("g");
    chart.appendChild(dyn);

    add(panel, h("p", "w-tag", "注意力读数"));
    var out = readout();
    panel.appendChild(out.el);
    var ddQuery = out.add("查询词");
    var ddTop = out.add("最关注");
    var ddTopP = out.add("权重");
    var ddSelf = out.add("看自身");
    var ddEntropy = out.add("分布熵");

    add(panel, h("p", "w-sub", "权重前 5"));
    var rank = h("div", "w-rank");
    panel.appendChild(rank);

    var note = h("p", "w-note", "");
    panel.appendChild(note);
    add(panel, h("p", "w-note", "每一行 softmax 后加起来是 1。弧线只画“查询 → 被看的词”，数字是 %。"));

    var legend = h("div", "w-legend");
    var legendItem = h("span");
    var sw = h("span", "w-swatch w-swatch--line-rubric");
    legendItem.appendChild(sw);
    legendItem.appendChild(document.createTextNode("注意力权重"));
    legend.appendChild(legendItem);
    main.appendChild(legend);
    main.appendChild(h("p", "w-note", "横轴是词的位置；弧线越粗、下面的数字越大，权重越高。"));

    function render() {
      for (var b = 0; b < tokenButtons.length; b += 1) {
        tokenButtons[b].setAttribute("aria-pressed", b === query ? "true" : "false");
      }
      var weights = ATT_MATRIX[query];
      var maxW = 0;
      for (var i = 0; i < n; i += 1) if (weights[i] > maxW) maxW = weights[i];
      var sorted = topKeys(weights, n);
      var top = sorted.filter(function (idx) { return idx !== query; }).slice(0, 5);

      clear(dyn);

      /* 弧线：从查询出发，按权重排序，粗的压在上面 */
      var arcOrder = [];
      for (var j = 0; j < n; j += 1) if (j !== query) arcOrder.push(j);
      arcOrder.sort(function (a, b) { return weights[a] - weights[b]; });
      arcOrder.forEach(function (key) {
        var w = weights[key];
        if (w < 0.008) return;
        var ratio = maxW > 0 ? w / maxW : 0;
        var height = 22 + 152 * Math.pow(ratio, 0.9);
        var xq = xOf(query);
        var xk = xOf(key);
        var mid = (xq + xk) / 2;
        var controlY = (baseY - 4) - 2 * height;
        var opacity = 0.16 + 0.84 * ratio;
        var arc = svgPath(
          "M" + xq + "," + (baseY - 2) + " Q" + mid + "," + controlY + " " + xk + "," + (baseY - 2),
          "st-rubric",
          clamp(0.55 + 4.8 * w, 0.6, 5.2)
        );
        arc.setAttribute("stroke-opacity", fmt(opacity, 2));
        dyn.appendChild(arc);
        var endDot = s("circle", { cx: xk, cy: baseY - 2, r: 2.1, class: "f-rubric" });
        endDot.setAttribute("fill-opacity", fmt(opacity, 2));
        dyn.appendChild(endDot);
      });

      /* 词 + 权重条 + 百分比 */
      for (var k = 0; k < n; k += 1) {
        var x = xOf(k);
        var isQuery = k === query;
        dyn.appendChild(svgText(x, 262, SENTENCE[k].w, isQuery ? "t-rubric t-mid t-lat" : "t-soft t-mid t-lat", "middle"));
        dyn.appendChild(svgLine(x, baseY - 1, x, baseY + 4, isQuery ? "st-rubric" : "st-faint", isQuery ? 2 : 1));
        var ratio2 = maxW > 0 ? weights[k] / maxW : 0;
        var barW = 46 * ratio2;
        var bar = svgRect(x - barW / 2, 274, Math.max(barW, 0.8), 4.5, "f-rubric");
        bar.setAttribute("fill-opacity", fmt(0.2 + 0.8 * ratio2, 2));
        dyn.appendChild(bar);
        if (weights[k] >= 0.03) {
          dyn.appendChild(svgText(x, 296, pct(weights[k], 0), "t-tiny t-num", "middle"));
        }
      }

      /* 查询标记 */
      var qx = xOf(query);
      dyn.appendChild(svgPath(
        "M" + (qx - 4.5) + "," + (baseY + 10) + " L" + (qx + 4.5) + "," + (baseY + 10) + " L" + qx + "," + (baseY + 2) + " Z",
        "f-rubric",
        0
      ));

      /* 面板 */
      ddQuery.textContent = SENTENCE[query].w;
      ddTop.textContent = SENTENCE[top[0]].w;
      ddTopP.textContent = pct(weights[top[0]], 1);
      ddSelf.textContent = pct(weights[query], 1);
      ddEntropy.textContent = fmt(entropyBits(weights), 2) + " bit";

      clear(rank);
      top.forEach(function (idx) {
        var row = h("div", "w-rank-row");
        add(row, h("span", "w-rank-word", SENTENCE[idx].w));
        var track = h("div", "w-rank-track");
        var fill = h("div", "w-rank-fill");
        fill.style.width = clamp(weights[idx] / maxW, 0, 1) * 100 + "%";
        track.appendChild(fill);
        add(row, track);
        add(row, h("span", "w-rank-val", pct(weights[idx], 0)));
        rank.appendChild(row);
      });

      var names = top.slice(0, 3).map(function (idx) {
        return SENTENCE[idx].w + "（" + pct(weights[idx], 0) + "）";
      });
      note.textContent = SENTENCE[query].w + " 主要看 " + names.join("、") + "。";
    }

    render();
  }

  /* ========================================================================== *
   * 6. scaled —— d_k 与点积的方差：为什么除以 √d_k
   * ========================================================================== */

  var Z_SAMPLES = null;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalSamples() {
    if (Z_SAMPLES) return Z_SAMPLES;
    var rnd = mulberry32(20170612);
    var out = [];
    while (out.length < 1200) {
      var u1 = Math.max(rnd(), 1e-12);
      var u2 = rnd();
      var radius = Math.sqrt(-2 * Math.log(u1));
      out.push(radius * Math.cos(2 * Math.PI * u2));
      if (out.length < 1200) out.push(radius * Math.sin(2 * Math.PI * u2));
    }
    Z_SAMPLES = out;
    return Z_SAMPLES;
  }

  var SCALED_CANDIDATES = [2.2, 0.8, 0.1, -0.4, -1.0, -1.5, -2.0, -2.8];
  var SCALED_BINS = 28;

  function histogramZ(samples, binCount) {
    var counts = new Array(binCount);
    var i;
    for (i = 0; i < binCount; i += 1) counts[i] = 0;
    for (i = 0; i < samples.length; i += 1) {
      var z = samples[i];
      var idx = Math.floor(((z + 4) / 8) * binCount);
      if (idx < 0) idx = 0;
      if (idx >= binCount) idx = binCount - 1;
      counts[idx] += 1;
    }
    return counts;
  }

  function buildScaled(root) {
    headRow(root, "scaled", "拖动 d_k，看分布宽度与 softmax 饱和");

    var state = { dk: 64 };
    var samples = normalSamples();
    var counts = histogramZ(samples, SCALED_BINS);
    var maxCount = 0;
    for (var ci = 0; ci < counts.length; ci += 1) if (counts[ci] > maxCount) maxCount = counts[ci];

    var cols = h("div", "w-cols");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    var W = 660;
    var H = 340;
    var chart = svgChart(W, H, "未缩放与缩放后的 q·k 分布，以及 softmax 最大权重");
    main.appendChild(chart);
    var X0 = 66;
    var X1 = 638;
    var plotW = X1 - X0;
    var rowA = { baseline: 142, height: 96 };
    var rowB = { baseline: 276, height: 96 };

    var stock = s("g");
    chart.appendChild(stock);
    stock.appendChild(svgText(12, 32, "未缩放 q · k", "t-cn t-soft t-mid", "start"));
    stock.appendChild(svgText(12, 170, "缩放后 q · k / √d_k", "t-cn t-soft t-mid", "start"));
    stock.appendChild(svgText(12, 328, "横轴：q·k（两条分布用同一批随机样本，同一横轴）", "t-tiny", "start"));

    var dyn = s("g");
    chart.appendChild(dyn);

    /* 滑杆 */
    var controls = h("div", "w-controls");
    main.appendChild(controls);
    var ctlDk = rangeCtl({
      label: "d_k",
      min: 1, max: 512, step: 1, value: state.dk,
      format: function (v) { return String(Math.round(v)); }
    });
    ctlDk.input.addEventListener("input", function () {
      state.dk = Number(ctlDk.input.value);
      render();
    });
    controls.appendChild(ctlDk.el);

    var legend = h("div", "w-legend");
    var l1 = h("span");
    l1.appendChild(h("span", "w-swatch w-swatch--rubric"));
    l1.appendChild(document.createTextNode("未缩放：宽度随 √d_k 增长"));
    legend.appendChild(l1);
    var l2 = h("span");
    l2.appendChild(h("span", "w-swatch"));
    l2.appendChild(document.createTextNode("缩放后：被压到中间一窄条"));
    legend.appendChild(l2);
    main.appendChild(legend);

    /* 面板 */
    add(panel, h("p", "w-tag", "分布"));
    var out = readout();
    panel.appendChild(out.el);
    var ddDk = out.add("d_k");
    var ddSd = out.add("标准差 √d_k");
    var ddSpread = out.add("±4σ 的跨度");
    var ddRangeRaw = out.add("未缩放 logits 跨度");
    var ddRangeScaled = out.add("缩放后 logits 跨度");
    var ddMax = out.add("未缩放 max p");
    var ddMaxScaled = out.add("缩放后 max p");
    var ddGrad = out.add("max p 的梯度");

    add(panel, h("p", "w-sub", "8 个候选词的 softmax"));
    var meter = h("div", "w-meter");
    panel.appendChild(meter);
    var meterRaw = meterRow("未缩放", "—", 0, true);
    var meterScaled = meterRow("缩放后", "—", 0, false);
    meter.appendChild(meterRaw.el);
    meter.appendChild(meterScaled.el);

    var saturation = h("p", "w-note", "");
    panel.appendChild(saturation);

    add(panel, h("p", "w-sub", "为什么"));
    panel.appendChild(h("p", "w-note", "论文脚注：q、k 各分量独立、均值 0、方差 1 时，q·k 的均值是 0、方差是 d_k。d_k 越大，点积的绝对值越大，softmax 越容易被推到饱和区；除以 √d_k 把方差拉回 1。"));
    panel.appendChild(h("p", "w-note", "上面 8 个候选分数的跨度是 5σ。σ 从 1 涨到 22.6，跨度就从 5 涨到约 113——softmax 只看相对大小，却会被这么大的绝对值推到饱和。"));

    function drawRow(row, scaleFactor, sigma, cls, labelDigits, compressed) {
      var pxPerUnit = plotW / (8 * sigma);
      var barW = plotW / SCALED_BINS;
      for (var i = 0; i < SCALED_BINS; i += 1) {
        var count = counts[i];
        if (!count) continue;
        var zCenter = -4 + ((i + 0.5) / SCALED_BINS) * 8;
        var value = zCenter * scaleFactor;
        var x = X0 + (value + 4 * sigma) * pxPerUnit - barW / 2;
        var height = (count / maxCount) * row.height;
        var width = compressed ? Math.max(barW / sigma, 1.2) : Math.max(barW - 1.5, 1);
        var rect = svgRect(x, row.baseline - height, width, height, cls);
        dyn.appendChild(rect);
      }
      dyn.appendChild(svgLine(X0, row.baseline, X1, row.baseline, "st-soft", 1));
      if (labelDigits) {
        for (var t = -4; t <= 4; t += 2) {
          var tx = X0 + ((t / 4 + 1) / 2) * plotW;
          var label = fmt(t * sigma, sigma >= 10 ? 0 : 1);
          dyn.appendChild(svgText(tx, row.baseline + 14, label, "t-tiny t-num", t === -4 ? "start" : t === 4 ? "end" : "middle"));
        }
      }
    }

    function render() {
      var sigma = Math.sqrt(state.dk);
      clear(dyn);
      drawRow(rowA, sigma, sigma, "f-rubric", false, false);
      drawRow(rowB, 1, sigma, "f-ink", true, true);

      var rawWeights = softmax(SCALED_CANDIDATES.map(function (z) { return z * sigma; }));
      var scaledWeights = softmax(SCALED_CANDIDATES);
      var rawMax = Math.max.apply(null, rawWeights);
      var scaledMax = Math.max.apply(null, scaledWeights);
      var grad = rawMax * (1 - rawMax);

      ddDk.textContent = String(state.dk);
      ddSd.textContent = fmt(sigma, 2);
      ddSpread.textContent = "±" + fmt(4 * sigma, 1);
      ddRangeRaw.textContent = fmt(5 * sigma, 1);
      ddRangeScaled.textContent = "5.0";
      ddMax.textContent = fmt(rawMax, 3);
      ddMaxScaled.textContent = fmt(scaledMax, 3);
      ddGrad.textContent = fmt(grad, 3);

      meterRaw.fill.style.width = rawMax * 100 + "%";
      meterRaw.value.textContent = fmt(rawMax, 3);
      meterScaled.fill.style.width = scaledMax * 100 + "%";
      meterScaled.value.textContent = fmt(scaledMax, 3);

      if (rawMax > 0.999) saturation.textContent = "未缩放时最高分几乎吞掉全部概率（p ≈ 1）：softmax 饱和，梯度 p(1−p) ≈ 0，几乎学不动。";
      else if (rawMax > 0.9) saturation.textContent = "未缩放时分布已经很尖（p ≈ " + fmt(rawMax, 2) + "）：大部分概率压在最高分上。";
      else saturation.textContent = "此刻未缩放也不算尖；把 d_k 拉大，看 max p 怎么逼近 1。";
    }

    render();
  }

  /* ========================================================================== *
   * 7. multihead —— 8 个头看同一句话的 8 种注意力模式
   * ========================================================================== */

  var HEADS = [
    { name: "指代", cls: "rubric", desc: "代词把注意力放到它指代的名词上：it 主要看 animal。" },
    { name: "相邻", cls: "gold", desc: "局部窗口：每个词只看左右邻近的词，把相邻词黏在一起。" },
    { name: "句法", cls: "verdigris", desc: "动词、助动词去找它的主语和宾语：cross → street，was → tired。" },
    { name: "动宾", cls: "rubric", desc: "动宾搭配：cross 盯着 street，animal 盯着 cross。" },
    { name: "冠词", cls: "gold", desc: "限定词贴住它修饰的名词：the → animal / street。" },
    { name: "从句", cls: "verdigris", desc: "because 把从句和结果连起来：because → it / tired。" },
    { name: "位置", cls: "ink", desc: "位置偏好：越靠后的位置越容易被看到，权重沿句尾聚集。" },
    { name: "全局", cls: "night", desc: "权重分散，粗略收集全句信息，像一份平均摘要。" }
  ];

  function headScores(head, i, j) {
    var ti = SENTENCE[i].t;
    var tj = SENTENCE[j].t;
    var self = i === j ? 1 : 0;
    switch (head) {
      case 0:
        return (ti === "pron" && tj === "animal" ? 4.4 : 0) +
          (ti === "pron" && tj === "place" ? 1.2 : 0) +
          (ti === "pron" && tj === "adj" ? 0.9 : 0) +
          (ti === "animal" && tj === "pron" ? 1.8 : 0) +
          (ti === "place" && tj === "pron" ? 0.8 : 0) + 0.2 + self * 0.4;
      case 1:
        return -1.15 * Math.abs(i - j) + self * 1.2;
      case 2:
        return (ti === "verb" ? (tj === "animal" ? 2.7 : tj === "place" ? 2.3 : tj === "pron" ? 1.2 : 0) : 0) +
          (ti === "aux" ? (tj === "verb" ? 2.4 : tj === "adj" ? 2.1 : tj === "pron" ? 1.0 : 0) : 0) +
          (ti === "place" && tj === "art" ? 1.2 : 0) + 0.25;
      case 3:
        return (i === 3 && j === 5 ? 4.4 : 0) + (i === 3 && j === 1 ? 1.6 : 0) +
          (i === 1 && j === 3 ? 2.7 : 0) + (i === 5 && j === 3 ? 2.2 : 0) + 0.25;
      case 4:
        return (ti === "art" ? (tj === "animal" || tj === "place" ? 3.1 : tj === "adj" ? 0.7 : 0) : 0) +
          ((ti === "animal" || ti === "place") && tj === "art" ? 1.4 : 0) + 0.2;
      case 5:
        return (i === 6 && j === 7 ? 3.3 : 0) + (i === 6 && j === 10 ? 2.8 : 0) +
          (i === 6 && j === 8 ? 1.5 : 0) + (i === 7 && j === 6 ? 1.4 : 0) +
          (i === 10 && j === 6 ? 1.7 : 0) + 0.2;
      case 6:
        return (j / (SENTENCE.length - 1)) * 2.2 + self * 0.2 + 0.15;
      default:
        return 0.55 + 0.45 * Math.abs(Math.sin((i + 1) * (j + 2) * 0.7)) + self * 0.25;
    }
  }

  var HEAD_MATRICES = HEADS.map(function (item, head) {
    var rows = [];
    for (var i = 0; i < SENTENCE.length; i += 1) {
      var scores = [];
      for (var j = 0; j < SENTENCE.length; j += 1) scores.push(headScores(head, i, j));
      rows.push(softmax(scores, 0.85));
    }
    return rows;
  });

  function buildMultihead(root) {
    headRow(root, "multihead", "切换 8 个头，看注意力矩阵");

    var state = { head: 0 };
    var n = SENTENCE.length;

    var cols = h("div", "w-cols");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    var headButtons = buttonGroup(HEADS.map(function (item, index) {
      return { value: String(index), label: "0" + (index + 1) + " " + item.name };
    }), "0", function (value) {
      state.head = Number(value);
      render();
    });
    main.appendChild(headButtons.el);

    var W = 560;
    var H = 510;
    var chart = svgChart(W, H, "同一个句子在所选头下的注意力矩阵");
    chart.style.marginTop = "10px";
    main.appendChild(chart);
    var LEFT = 132;
    var TOP = 112;
    var CELL = 34;
    var gridGroup = s("g");
    var labelGroup = s("g");
    chart.appendChild(gridGroup);
    chart.appendChild(labelGroup);

    for (var j = 0; j < n; j += 1) {
      var lx = LEFT + j * CELL + CELL / 2;
      var label = svgText(lx, TOP - 10, SENTENCE[j].w, "t-soft t-num", "start");
      label.setAttribute("transform", "rotate(-55 " + lx + " " + (TOP - 10) + ")");
      labelGroup.appendChild(label);
    }
    for (var i = 0; i < n; i += 1) {
      var ly = TOP + i * CELL + CELL / 2 + 4;
      labelGroup.appendChild(svgText(LEFT - 8, ly, SENTENCE[i].w, "t-soft t-num", "end"));
    }
    labelGroup.appendChild(svgText(LEFT + (n * CELL) / 2, H - 8, "列：被看的词（key）", "t-tiny", "middle"));
    labelGroup.appendChild(svgText(LEFT - 10, TOP - 52, "行：查询词", "t-tiny", "end"));

    var readLine = h("p", "w-note", "");
    main.appendChild(readLine);

    var legend = h("div", "w-legend");
    var sw1 = h("span");
    sw1.appendChild(h("span", "w-swatch w-swatch--rubric"));
    sw1.appendChild(document.createTextNode("权重越高，颜色越实"));
    legend.appendChild(sw1);
    var sw2 = h("span");
    var lineSample = h("span", "w-swatch w-swatch--line");
    lineSample.className = "w-swatch w-swatch--line";
    sw2.appendChild(lineSample);
    sw2.appendChild(document.createTextNode("每格 1px 细线只是分隔"));
    legend.appendChild(sw2);
    main.appendChild(legend);

    add(panel, h("p", "w-tag", "这个头在做什么"));
    var headName = h("p", "w-heads-name", "");
    headName.style.margin = "2px 0 4px";
    headName.style.fontSize = "0.95rem";
    panel.appendChild(headName);
    var headDesc = h("p", "w-note", "");
    panel.appendChild(headDesc);

    add(panel, h("p", "w-sub", "读一行"));
    var out = readout();
    panel.appendChild(out.el);
    var ddTop = out.add("it 看得最重");
    var ddTopP = out.add("权重");
    var ddEntropy = out.add("这一行的熵");
    var ddSum = out.add("行和");

    var lineInfo = h("p", "w-note", "");
    panel.appendChild(lineInfo);

    add(panel, h("p", "w-sub", "为什么八个"));
    panel.appendChild(h("p", "w-note", "8 个头各有一套 W_Q、W_K、W_V，在 64 维的子空间里各学一种“看法”；把 8 个头拼起来（512 维），模型才能同时用上指代、相邻、句法这些关系。"));

    function render() {
      var head = state.head;
      var matrix = HEAD_MATRICES[head];
      var maxW = 0;
      for (var r = 0; r < n; r += 1) {
        for (var c = 0; c < n; c += 1) if (matrix[r][c] > maxW) maxW = matrix[r][c];
      }
      clear(gridGroup);
      var cellClass = "f-" + HEADS[head].cls;
      for (var ri = 0; ri < n; ri += 1) {
        for (var ci = 0; ci < n; ci += 1) {
          var weight = matrix[ri][ci];
          var ratio = maxW > 0 ? weight / maxW : 0;
          var rect = svgRect(LEFT + ci * CELL, TOP + ri * CELL, CELL, CELL, cellClass);
          rect.setAttribute("fill-opacity", fmt(0.04 + 0.96 * ratio, 2));
          (function (rowIndex, colIndex, cellWeight) {
            rect.addEventListener("mouseenter", function () {
              readLine.textContent = "行 " + SENTENCE[rowIndex].w + " × 列 " + SENTENCE[colIndex].w + "：权重 " + fmt(cellWeight, 3) + "（" + pct(cellWeight, 1) + "）";
            });
            rect.addEventListener("click", function () {
              readLine.textContent = "行 " + SENTENCE[rowIndex].w + " × 列 " + SENTENCE[colIndex].w + "：权重 " + fmt(cellWeight, 3) + "（" + pct(cellWeight, 1) + "）";
            });
          })(ri, ci, weight);
          gridGroup.appendChild(rect);
        }
      }
      /* 细网格线 */
      for (var gx = 0; gx <= n; gx += 1) {
        gridGroup.appendChild(svgLine(LEFT + gx * CELL, TOP, LEFT + gx * CELL, TOP + n * CELL, "st-ground", 1));
        gridGroup.appendChild(svgLine(LEFT, TOP + gx * CELL, LEFT + n * CELL, TOP + gx * CELL, "st-ground", 1));
      }

      var row = matrix[7];
      var order = topKeys(row, n);
      ddTop.textContent = SENTENCE[order[0]].w;
      ddTopP.textContent = pct(row[order[0]], 1);
      ddEntropy.textContent = fmt(entropyBits(row), 2) + " bit";
      ddSum.textContent = fmt(row.reduce(function (a, b) { return a + b; }, 0), 2);
      headName.textContent = "0" + (head + 1) + " · " + HEADS[head].name;
      headDesc.textContent = HEADS[head].desc;
      lineInfo.textContent = "行 it：" + order.slice(0, 3).map(function (idx) {
        return SENTENCE[idx].w + " " + pct(row[idx], 0);
      }).join("、");
      readLine.textContent = "把指针移到格子上，读出那一对词的权重。";
      headButtons.set(String(head));
    }

    render();
  }

  /* ========================================================================== *
   * 8. posenc —— 正弦位置编码：热力图、正弦曲线、PE 数值
   * ========================================================================== */

  var PE_DIM = 64;
  var PE_POSITIONS = 50;
  var PE_ROWS = 32;

  var PE_TABLE = (function () {
    var table = [];
    for (var pos = 0; pos < PE_POSITIONS; pos += 1) {
      var row = [];
      for (var dim = 0; dim < PE_DIM; dim += 1) {
        var i = Math.floor(dim / 2);
        var exponent = (2 * i) / PE_DIM;
        var angle = pos / Math.pow(10000, exponent);
        row.push(dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
      }
      table.push(row);
    }
    return table;
  })();

  function peWavelength(dim) {
    var i = Math.floor(dim / 2);
    return 2 * Math.PI * Math.pow(10000, (2 * i) / PE_DIM);
  }

  function buildPosenc(root) {
    headRow(root, "posenc", "拖位置与维度，看热力图和正弦曲线");

    var state = { pos: 17, dim: 6 };
    var lastOffset = -1;
    var HEAT_W = 570;
    var HEAT_H = 224;
    var LEFT = 40;
    var TOP = 18;
    var CW = 8;
    var CH = 5.2;
    var heatW = PE_DIM * CW;
    var heatH = PE_ROWS * CH;

    add(root, h("p", "w-tag", "位置编码热力图 · 32 个位置 × 64 维（示意）"));
    var heatChart = svgChart(HEAT_W, HEAT_H, "正弦位置编码热力图");
    root.appendChild(heatChart);
    var heatBg = s("g");
    var heatCells = s("g");
    heatChart.appendChild(heatBg);
    heatChart.appendChild(heatCells);

    heatBg.appendChild(svgText(LEFT + heatW / 2, TOP - 6, "维度 → 0 … 63", "t-tiny", "middle"));
    heatBg.appendChild(svgText(6, TOP + 12, "pos", "t-tiny", "start"));
    var rowTickLabels = [];
    [0, 8, 16, 24, 31].forEach(function (tickRow) {
      var tickLabel = svgText(LEFT - 6, TOP + tickRow * CH + 4, "0", "t-tiny t-num", "end");
      heatBg.appendChild(tickLabel);
      rowTickLabels.push({ node: tickLabel, row: tickRow });
    });
    for (var colTick = 0; colTick < PE_DIM; colTick += 8) {
      heatBg.appendChild(svgText(LEFT + colTick * CW, TOP + heatH + 13, String(colTick), "t-tiny t-num", "start"));
    }

    /* 2048 个格子只建一次，滑动时只改 class 与透明度 */
    var cells = [];
    for (var row = 0; row < PE_ROWS; row += 1) {
      var rowCells = [];
      for (var col = 0; col < PE_DIM; col += 1) {
        var cell = svgRect(LEFT + col * CW, TOP + row * CH, CW - 0.4, CH - 0.4, "f-rubric");
        heatCells.appendChild(cell);
        rowCells.push(cell);
      }
      cells.push(rowCells);
    }
    var rowMarker = svgRect(LEFT - 1.5, TOP, heatW + 3, CH + 1, "f-none");
    rowMarker.style.stroke = "var(--ink)";
    rowMarker.style.strokeWidth = "1.2";
    heatCells.appendChild(rowMarker);
    var colMarker = svgRect(LEFT, TOP - 1.5, CW, heatH + 3, "f-none");
    colMarker.style.stroke = "var(--rubric)";
    colMarker.style.strokeWidth = "1.2";
    heatCells.appendChild(colMarker);

    var heatLegend = h("div", "w-legend");
    var l1 = h("span");
    l1.appendChild(h("span", "w-swatch w-swatch--rubric"));
    l1.appendChild(document.createTextNode("PE 为正（sin/cos > 0）"));
    heatLegend.appendChild(l1);
    var l2 = h("span");
    l2.appendChild(h("span", "w-swatch w-swatch--verdigris"));
    l2.appendChild(document.createTextNode("PE 为负"));
    heatLegend.appendChild(l2);
    var l3 = h("span");
    l3.appendChild(document.createTextNode("颜色越实，绝对值越接近 1"));
    heatLegend.appendChild(l3);
    root.appendChild(heatLegend);

    /* 控制 */
    var controls = h("div", "w-controls w-controls--2");
    root.appendChild(controls);
    var ctlPos = rangeCtl({
      label: "位置 pos",
      min: 0, max: PE_POSITIONS - 1, step: 1, value: state.pos,
      format: function (v) { return String(Math.round(v)); }
    });
    var ctlDim = rangeCtl({
      label: "维度 d",
      min: 0, max: PE_DIM - 1, step: 1, value: state.dim,
      format: function (v) { return String(Math.round(v)); }
    });
    ctlPos.input.addEventListener("input", function () {
      state.pos = Math.round(Number(ctlPos.input.value));
      render();
    });
    ctlDim.input.addEventListener("input", function () {
      state.dim = Math.round(Number(ctlDim.input.value));
      render();
    });
    controls.appendChild(ctlPos.el);
    controls.appendChild(ctlDim.el);

    /* 曲线 + 面板 */
    var cols = h("div", "w-cols");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);
    add(main, h("p", "w-sub", "选中维度的正弦曲线（横轴：位置 0–49）"));
    var curve = svgChart(600, 156, "选中维度的位置编码曲线");
    main.appendChild(curve);
    var CX0 = 44;
    var CX1 = 588;
    var CY = 78;
    var CY_AMP = 48;
    var curveStatic = s("g");
    curve.appendChild(curveStatic);
    curveStatic.appendChild(svgLine(CX0, CY - CY_AMP, CX1, CY - CY_AMP, "st-rule", 1));
    curveStatic.appendChild(svgLine(CX0, CY + CY_AMP, CX1, CY + CY_AMP, "st-rule", 1));
    curveStatic.appendChild(svgLine(CX0, CY, CX1, CY, "st-faint", 1));
    curveStatic.appendChild(svgText(CX0 - 8, CY - CY_AMP + 4, "+1", "t-tiny t-num", "end"));
    curveStatic.appendChild(svgText(CX0 - 8, CY + CY_AMP + 4, "−1", "t-tiny t-num", "end"));
    curveStatic.appendChild(svgText(CX0 - 8, CY + 4, "0", "t-tiny t-num", "end"));
    for (var tick = 0; tick <= PE_POSITIONS - 1; tick += 10) {
      var tx = CX0 + (tick / (PE_POSITIONS - 1)) * (CX1 - CX0);
      curveStatic.appendChild(svgText(tx, 148, String(tick), "t-tiny t-num", "middle"));
    }
    var curveDyn = s("g");
    curve.appendChild(curveDyn);

    add(panel, h("p", "w-tag", "这一维"));
    var out = readout();
    panel.appendChild(out.el);
    var ddPos = out.add("位置 pos");
    var ddDim = out.add("维度 d");
    var ddI = out.add("i = ⌊d/2⌋");
    var ddFn = out.add("用 sin 还是 cos");
    var ddWave = out.add("波长 λ");
    var ddValue = out.add("PE(pos, d)");
    var ddWindow = out.add("热力图窗口");

    add(panel, h("p", "w-sub", "公式"));
    panel.appendChild(h("p", "w-note", "偶数维：PE(pos, 2i) = sin(pos / 10000^(2i/64))"));
    panel.appendChild(h("p", "w-note", "奇数维：PE(pos, 2i+1) = cos(pos / 10000^(2i/64))"));
    panel.appendChild(h("p", "w-note", "这里的 64 就是 d_model。波长从 2π 一路涨到 10000·2π，成几何级数：低维转得快，高维几乎不动。"));
    var waveNote = h("p", "w-note", "");
    panel.appendChild(waveNote);

    /* PE 数值格 */
    add(root, h("p", "w-tag", "当前 PE 向量（64 维，数值保留两位）"));
    var peGrid = h("div", "w-pegrid");
    root.appendChild(peGrid);
    var peCells = [];
    for (var p = 0; p < PE_DIM; p += 1) {
      var item = h("div", "w-pe");
      var indexEl = h("i", null, String(p));
      var valueEl = h("span", null, "0.00");
      item.appendChild(indexEl);
      item.appendChild(valueEl);
      peGrid.appendChild(item);
      peCells.push({ node: item, value: valueEl });
    }
    root.appendChild(h("p", "w-note", "热力图只显示 32 个位置；位置滑块到 32 以后，窗口会跟着滑动。d_model 在这里取 64 是为了让 64 列画得下；论文里是 512。"));

    function render() {
      var offset = clamp(state.pos - 16, 0, PE_POSITIONS - PE_ROWS);
      var rowIndex = state.pos - offset;
      if (offset !== lastOffset) {
        lastOffset = offset;
        for (var r = 0; r < PE_ROWS; r += 1) {
          var actual = offset + r;
          var values = PE_TABLE[actual];
          for (var c = 0; c < PE_DIM; c += 1) {
            var v = values[c];
            var cell = cells[r][c];
            cell.setAttribute("class", v >= 0 ? "f-rubric" : "f-verdigris");
            cell.setAttribute("fill-opacity", fmt(Math.max(0.05, Math.abs(v)), 2));
          }
        }
      }
      rowMarker.setAttribute("y", TOP + rowIndex * CH);
      colMarker.setAttribute("x", LEFT + state.dim * CW);
      for (var rt = 0; rt < rowTickLabels.length; rt += 1) {
        rowTickLabels[rt].node.textContent = String(offset + rowTickLabels[rt].row);
      }

      /* 曲线 */
      clear(curveDyn);
      var points = [];
      for (var pos = 0; pos < PE_POSITIONS; pos += 1) {
        var value = PE_TABLE[pos][state.dim];
        var x = CX0 + (pos / (PE_POSITIONS - 1)) * (CX1 - CX0);
        var y = CY - value * CY_AMP;
        points.push(x + "," + y);
        if (pos % 10 === 0) {
          curveDyn.appendChild(s("circle", { cx: x, cy: y, r: 1.6, class: "f-rubric" }));
        }
      }
      curveDyn.appendChild(svgPath("M" + points.join(" L"), "st-rubric", 1.8));
      var currentX = CX0 + (state.pos / (PE_POSITIONS - 1)) * (CX1 - CX0);
      var currentY = CY - PE_TABLE[state.pos][state.dim] * CY_AMP;
      curveDyn.appendChild(svgLine(currentX, CY - CY_AMP, currentX, CY + CY_AMP, "st-gold", 1));
      curveDyn.appendChild(s("circle", { cx: currentX, cy: currentY, r: 4, class: "f-ground st-rubric" }));
      curveDyn.lastChild.setAttribute("stroke-width", "1.6");
      curveDyn.appendChild(svgText(currentX, currentY - 10, "pos " + state.pos, "t-gold t-tiny t-num", "middle"));

      var i = Math.floor(state.dim / 2);
      var even = state.dim % 2 === 0;
      var exponent = (2 * i) / PE_DIM;
      var lambda = peWavelength(state.dim);
      var peValue = PE_TABLE[state.pos][state.dim];
      ddPos.textContent = String(state.pos);
      ddDim.textContent = String(state.dim);
      ddI.textContent = String(i);
      ddFn.textContent = even ? "sin" : "cos";
      ddWave.textContent = lambda >= 1000 ? fmt(lambda, 0) : fmt(lambda, 2);
      ddValue.textContent = fmt(peValue, 4);
      ddWindow.textContent = offset + "–" + (offset + PE_ROWS - 1);
      waveNote.textContent = even
        ? "这一维的波长约 " + (lambda >= 1000 ? fmt(lambda, 0) : fmt(lambda, 2)) + " 个位置：每 " + (lambda >= 1000 ? fmt(lambda, 0) : fmt(lambda, 1)) + " 个位置循环一次。"
        : "这一维用 cos；它的波长和相邻的 " + (state.dim - 1) + " 维相同。";

      for (var d = 0; d < PE_DIM; d += 1) {
        var pv = PE_TABLE[state.pos][d];
        peCells[d].value.textContent = fmt(pv, 2);
        peCells[d].node.className = "w-pe" + (pv < 0 ? " is-neg" : "");
      }
    }

    render();
  }

  /* ========================================================================== *
   * 9. mask —— 下三角因果遮罩
   * ========================================================================== */

  function buildMask(root) {
    headRow(root, "mask", "切换遮罩，点一行看它能看见谁");

    var state = { masked: true, row: 3 };
    var n = 6;
    var tokens = SENTENCE.slice(0, n);
    var LEFT = 112;
    var TOP = 98;
    var CELL = 42;
    var W = LEFT + n * CELL + 18;
    var H = TOP + n * CELL + 30;

    var toggleRow = h("div", "w-btns");
    var toggleBtn = h("button", "w-btn w-accent", "");
    toggleBtn.type = "button";
    toggleBtn.setAttribute("aria-pressed", "true");
    toggleBtn.textContent = "因果遮罩：开";
    toggleBtn.addEventListener("click", function () {
      state.masked = !state.masked;
      toggleBtn.setAttribute("aria-pressed", state.masked ? "true" : "false");
      toggleBtn.textContent = state.masked ? "因果遮罩：开" : "因果遮罩：关";
      render();
    });
    toggleRow.appendChild(toggleBtn);
    root.appendChild(toggleRow);

    var chart = svgChart(W, H, "6×6 的因果遮罩矩阵");
    chart.style.margin = "10px auto 0";
    chart.style.maxWidth = "440px";
    root.appendChild(chart);
    var labelGroup = s("g");
    chart.appendChild(labelGroup);
    for (var c = 0; c < n; c += 1) {
      var lx = LEFT + c * CELL + CELL / 2;
      var lab = svgText(lx, TOP - 10, tokens[c].w, "t-soft t-lat", "start");
      lab.setAttribute("transform", "rotate(-42 " + lx + " " + (TOP - 10) + ")");
      labelGroup.appendChild(lab);
    }
    for (var r = 0; r < n; r += 1) {
      labelGroup.appendChild(svgText(LEFT - 8, TOP + r * CELL + CELL / 2 + 4, String(r), "t-faint t-num", "end"));
      labelGroup.appendChild(svgText(LEFT - 22, TOP + r * CELL + CELL / 2 + 4, tokens[r].w, "t-soft t-lat", "end"));
    }
    labelGroup.appendChild(svgText(LEFT + (n * CELL) / 2, H - 6, "列：被看的位置（key）", "t-tiny", "middle"));
    labelGroup.appendChild(svgText(LEFT - 22, TOP - 52, "行：当前位置", "t-tiny", "end"));

    var cellsGroup = s("g");
    chart.appendChild(cellsGroup);

    var readLine = h("p", "w-note", "");
    root.appendChild(readLine);

    var legend = h("div", "w-legend");
    var lg1 = h("span");
    lg1.appendChild(h("span", "w-swatch w-swatch--rubric"));
    lg1.appendChild(document.createTextNode("可见（权重可以分到这里）"));
    legend.appendChild(lg1);
    var lg2 = h("span");
    var lineSample = h("span", "w-swatch w-swatch--line");
    lineSample.className = "w-swatch w-swatch--line";
    lg2.appendChild(lineSample);
    lg2.appendChild(document.createTextNode("被遮住（置为 −∞）"));
    legend.appendChild(lg2);
    root.appendChild(legend);

    var rowButtons = buttonGroup(tokens.map(function (token, index) {
      return { value: String(index), label: index + " · " + token.w };
    }), "3", function (value) {
      state.row = Number(value);
      render();
    });
    root.appendChild(h("p", "w-tag", "选一行（当前位置 i）"));
    root.appendChild(rowButtons.el);

    var cols = h("div", "w-cols");
    var panel = h("div", "w-panel w-panel--wide");
    panel.style.maxWidth = "480px";
    cols.appendChild(panel);
    root.appendChild(cols);

    add(panel, h("p", "w-tag", "这一行"));
    var out = readout();
    panel.appendChild(out.el);
    var ddMask = out.add("遮罩");
    var ddRow = out.add("当前位置");
    var ddSee = out.add("能看见");
    var ddCant = out.add("被遮住");

    var explain = h("p", "w-note", "");
    panel.appendChild(explain);
    add(panel, h("p", "w-sub", "公式"));
    panel.appendChild(h("p", "w-note", "softmax(QKᵀ / √d_k + M) V，其中 Mᵢⱼ = 0（j ≤ i）、Mᵢⱼ = −∞（j > i）。遮罩加在 softmax 之前，被遮的位置权重就是 0。"));

    function render() {
      clear(cellsGroup);
      var row = state.row;
      var visible = state.masked ? row + 1 : n;
      for (var ri = 0; ri < n; ri += 1) {
        for (var ci = 0; ci < n; ci += 1) {
          var allowed = !state.masked || ci <= ri;
          var x = LEFT + ci * CELL;
          var y = TOP + ri * CELL;
          if (allowed) {
            var fill = svgRect(x, y, CELL, CELL, "f-rubric");
            fill.setAttribute("fill-opacity", state.masked ? "0.18" : "0.08");
            cellsGroup.appendChild(fill);
          } else {
            cellsGroup.appendChild(svgRect(x, y, CELL, CELL, "f-none"));
            cellsGroup.appendChild(svgLine(x + 4, y + CELL - 4, x + CELL - 4, y + 4, "st-faint", 1));
          }
        }
      }
      for (var gx = 0; gx <= n; gx += 1) {
        cellsGroup.appendChild(svgLine(LEFT + gx * CELL, TOP, LEFT + gx * CELL, TOP + n * CELL, "st-soft", 0.8));
        cellsGroup.appendChild(svgLine(LEFT, TOP + gx * CELL, LEFT + n * CELL, TOP + gx * CELL, "st-soft", 0.8));
      }
      var outline = svgRect(LEFT, TOP + row * CELL, n * CELL, CELL, "f-none");
      outline.style.stroke = "var(--ink)";
      outline.style.strokeWidth = "1.6";
      cellsGroup.appendChild(outline);

      ddMask.textContent = state.masked ? "开" : "关";
      ddRow.textContent = row + " · " + tokens[row].w;
      ddSee.textContent = state.masked ? "位置 0–" + row + "（" + (row + 1) + " 个）" : "全部 6 个位置";
      ddCant.textContent = state.masked ? (row === n - 1 ? "无" : "位置 " + (row + 1) + "–" + (n - 1)) : "无";

      if (state.masked) {
        readLine.textContent = "位置 " + row + "（" + tokens[row].w + "）只能看位置 0–" + row + "：它右侧的 " + (n - 1 - row) + " 个位置被设为 −∞，softmax 后权重为 0。";
        explain.textContent = "解码器生成第 i 个词时，只允许看已经生成的位置 0…i。否则训练时答案就摆在眼前，模型学不会一步一步往外写。";
      } else {
        readLine.textContent = "遮罩关掉后，位置 " + row + "（" + tokens[row].w + "）能看见全部 6 个位置，包括它右边的未来。";
        explain.textContent = "关掉遮罩等于允许偷看未来。训练时这会泄漏答案；这就是解码器自注意力必须加下三角遮罩的原因。";
      }
      rowButtons.set(String(row));
    }

    render();
  }

  /* ========================================================================== *
   * 10. shapes —— 一句话的张量形状流水线
   * ========================================================================== */

  var SHAPE_TOKENS = SENTENCE.slice(0, 6);
  var SHAPE_CONST = { batch: 1, seq: 6, dmodel: 512, heads: 8, dk: 64, dff: 2048, vocab: 37000 };

  var SHAPES = [
    {
      name: "词嵌入", shape: "[1, 6, 512]", kind: "seq",
      desc: "6 个 token 各自查一张 512 维的嵌入表。batch = 1，所以整句是一个 [1, 6, 512] 的张量：1 句 × 6 个位置 × 512 维。"
    },
    {
      name: "+ 位置编码", shape: "[1, 6, 512]", kind: "seq",
      desc: "位置编码同样是 512 维，逐元素加到嵌入上。加法要求形状完全一致，所以形状不变。"
    },
    {
      name: "投影 Q / K / V", shape: "3 × [1, 6, 512]", kind: "triple",
      desc: "同一份 x 分别乘 512×512 的 W_Q、W_K、W_V，得到三份 [1, 6, 512]：查询、键、值。"
    },
    {
      name: "拆成 8 个头", shape: "[1, 8, 6, 64]", kind: "heads",
      desc: "每个 512 维向量平均切成 8 段，每段 64 维。512 = 8 × 64，于是形状多出一维 h：[1, 8, 6, 64]。"
    },
    {
      name: "打分 QKᵀ / √d_k", shape: "[1, 8, 6, 6]", kind: "matrix",
      desc: "每个头里，6 个查询和 6 个键两两点积，得到一张 6×6 的分数表；8 个头就有 8 张。除以 √64 = 8 控制数值。"
    },
    {
      name: "softmax", shape: "[1, 8, 6, 6]", kind: "matrix",
      desc: "对每一行的 6 个分数做 softmax，使它们加起来等于 1。解码器的这一行还会先加上因果遮罩。"
    },
    {
      name: "加权取回 V", shape: "[1, 8, 6, 64]", kind: "heads",
      desc: "6×6 的权重乘 6×64 的值矩阵，输出仍是 6×64：每个位置拿到一份按相关性混合过的信息。"
    },
    {
      name: "拼接 8 个头", shape: "[1, 6, 512]", kind: "concat",
      desc: "8 个头的 64 维结果首尾相接：8 × 64 = 512，形状回到 [1, 6, 512]。这一层把 8 个子空间的信息并排放在一起。"
    },
    {
      name: "输出投影 W_O", shape: "[1, 6, 512]", kind: "seq",
      desc: "再乘一次 512×512 的 W_O，让 8 个头的信息互相混合，再交给下一个子层。"
    },
    {
      name: "前馈 FFN", shape: "[1, 6, 512] → [1, 6, 2048] → [1, 6, 512]", kind: "ffn",
      desc: "逐位置的两层全连接：512 → 2048 → 512。6 个位置共享同一组权重，形状最后回到 [1, 6, 512]。"
    },
    {
      name: "输出 softmax", shape: "[1, 6, 37000]", kind: "vocab",
      desc: "解码器最后用线性层 + softmax，把每个位置的 512 维变成词表上的概率：[1, 6, 37000]。训练时每个位置都要预测下一个词。"
    }
  ];

  function shapeGlyph(kind) {
    var chart = svgChart(360, 150, "张量形状示意");
    var i;
    if (kind === "seq") {
      for (i = 0; i < 6; i += 1) {
        var bar = svgRect(74, 16 + i * 20, 218, 12, "f-ink");
        bar.setAttribute("fill-opacity", "0.14");
        chart.appendChild(bar);
        chart.appendChild(svgText(64, 27 + i * 20, String(i), "t-tiny t-num", "end"));
      }
      chart.appendChild(svgText(300, 80, "512 维 →", "t-tiny", "start"));
      chart.appendChild(svgText(74, 144, "6 个位置 × 512 维（一个 batch）", "t-tiny t-cn", "start"));
    } else if (kind === "triple") {
      var names = ["Q", "K", "V"];
      var colors = ["t-rubric", "t-verdigris", "t-gold"];
      for (i = 0; i < 3; i += 1) {
        var top = 18 + i * 42;
        chart.appendChild(svgText(42, top + 24, names[i], "t-mid " + colors[i], "middle"));
        for (var r = 0; r < 6; r += 1) {
          var cellRow = svgRect(62, top + r * 6, 200, 4.2, "f-ink");
          cellRow.setAttribute("fill-opacity", "0.16");
          chart.appendChild(cellRow);
        }
        chart.appendChild(svgText(270, top + 25, "6 × 512", "t-tiny t-num", "start"));
      }
      chart.appendChild(svgText(62, 145, "同一份 x，三个矩阵，三份输出", "t-tiny t-cn", "start"));
    } else if (kind === "heads") {
      for (i = 0; i < 8; i += 1) {
        var hx = 24 + i * 40;
        for (var hr = 0; hr < 6; hr += 1) {
          for (var hc = 0; hc < 4; hc += 1) {
            var sq = svgRect(hx + hc * 7.6, 24 + hr * 9.5, 6.6, 8.2, "f-rubric");
            sq.setAttribute("fill-opacity", "0.32");
            chart.appendChild(sq);
          }
        }
        chart.appendChild(svgText(hx + 15, 96, "h" + (i + 1), "t-tiny t-num", "middle"));
      }
      chart.appendChild(svgText(24, 122, "每个头：6 行 × 64 列（这里每格代表若干维）", "t-tiny t-cn", "start"));
      chart.appendChild(svgText(24, 140, "总形状 [1, 8, 6, 64]", "t-mid t-num", "start"));
    } else if (kind === "matrix") {
      var startX = 100;
      var startY = 22;
      var cellSize = 16;
      for (i = 0; i < 6; i += 1) {
        for (var j = 0; j < 6; j += 1) {
          var m = svgRect(startX + j * cellSize, startY + i * cellSize, cellSize, cellSize, "f-rubric");
          m.setAttribute("fill-opacity", fmt(0.06 + 0.14 * ((i + j) % 4), 2));
          chart.appendChild(m);
        }
      }
      chart.appendChild(svgText(startX - 8, startY + 52, "6 查询", "t-tiny t-cn", "end"));
      chart.appendChild(svgText(startX + 48, startY + 6 * cellSize + 14, "6 键", "t-tiny t-cn", "middle"));
      chart.appendChild(svgText(220, 52, "× 8 头", "t-mid t-num", "start"));
      chart.appendChild(svgText(220, 72, "每行 softmax 和为 1", "t-tiny t-cn", "start"));
      chart.appendChild(svgText(220, 92, "8 张 6 × 6", "t-tiny t-num", "start"));
    } else if (kind === "concat") {
      for (i = 0; i < 8; i += 1) {
        var strip = svgRect(30 + i * 14, 24, 10, 74, "f-ink");
        strip.setAttribute("fill-opacity", "0.3");
        chart.appendChild(strip);
        chart.appendChild(svgText(35 + i * 14, 112, String(i + 1), "t-tiny t-num", "middle"));
      }
      chart.appendChild(svgText(30, 18, "8 个头各 64 维", "t-tiny t-cn", "start"));
      chart.appendChild(svgPath("M130,60 L170,60", "st-faint", 1));
      chart.appendChild(svgText(150, 52, "→", "t-mid", "middle"));
      var merged = svgRect(178, 24, 160, 74, "f-ink");
      merged.setAttribute("fill-opacity", "0.14");
      chart.appendChild(merged);
      chart.appendChild(svgText(258, 68, "6 × 512", "t-mid t-num", "middle"));
      chart.appendChild(svgText(178, 138, "8 × 64 = 512，拼回 d_model", "t-tiny t-cn", "start"));
    } else if (kind === "ffn") {
      chart.appendChild(svgRect(100, 16, 160, 22, "f-ink")).setAttribute("fill-opacity", "0.16");
      chart.appendChild(svgText(90, 32, "512", "t-tiny t-num", "end"));
      chart.appendChild(svgRect(52, 56, 256, 34, "f-rubric")).setAttribute("fill-opacity", "0.2");
      chart.appendChild(svgText(42, 79, "2048", "t-tiny t-num", "end"));
      chart.appendChild(svgRect(100, 108, 160, 22, "f-ink")).setAttribute("fill-opacity", "0.16");
      chart.appendChild(svgText(90, 124, "512", "t-tiny t-num", "end"));
      chart.appendChild(svgText(180, 148, "逐位置共享同一个前馈网络", "t-tiny t-cn", "middle"));
    } else {
      for (i = 0; i < 6; i += 1) {
        var vrow = svgRect(46, 14 + i * 17, 186, 11, "f-ink");
        vrow.setAttribute("fill-opacity", "0.14");
        chart.appendChild(vrow);
      }
      chart.appendChild(svgText(238, 80, "→", "t-mid", "middle"));
      for (i = 0; i < 60; i += 1) {
        var hgt = 8 + 46 * Math.abs(Math.sin(i * 0.9 + 0.4));
        var vb = svgRect(256 + i * 1.6, 104 - hgt, 1.2, hgt, "f-rubric");
        vb.setAttribute("fill-opacity", "0.6");
        chart.appendChild(vb);
      }
      chart.appendChild(svgText(300, 124, "37000 列", "t-tiny t-num", "middle"));
      chart.appendChild(svgText(46, 144, "每个位置输出一个词表概率分布", "t-tiny t-cn", "start"));
    }
    return chart;
  }

  function buildShapes(root) {
    headRow(root, "shapes", "点一步，看形状怎么变");

    add(root, h("p", "w-note", "输入：batch = 1，6 个 token，d_model = 512"));
    add(root, h("p", "w-note", SHAPE_TOKENS.map(function (token) { return token.w; }).join(" · ")));

    var consts = h("div", "w-legend");
    [["batch", "1"], ["seq", "6"], ["d_model", "512"], ["h", "8"], ["d_k", "64"]].forEach(function (pair) {
      var item = h("span", null, pair[0] + " = " + pair[1]);
      consts.appendChild(item);
    });
    root.appendChild(consts);

    var cols = h("div", "w-cols w-cols--detail");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    var list = h("div", "w-list");
    main.appendChild(list);
    var buttons = [];
    var active = 0;
    var pinned = 0;

    function select(index) {
      active = index;
      for (var i = 0; i < buttons.length; i += 1) {
        buttons[i].node.setAttribute("aria-pressed", i === index ? "true" : "false");
      }
      var step = SHAPES[index];
      shapeValue.textContent = step.shape;
      stepName.textContent = String(index + 1).padStart(2, "0") + " · " + step.name;
      stepDesc.textContent = step.desc;
      clear(glyphWrap);
      glyphWrap.appendChild(shapeGlyph(step.kind));
    }

    SHAPES.forEach(function (step, index) {
      var btn = h("button", "w-step");
      btn.type = "button";
      btn.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      btn.appendChild(h("span", "w-step__no", String(index + 1).padStart(2, "0")));
      btn.appendChild(h("span", "w-step__name", step.name));
      btn.appendChild(h("span", "w-step__shape", step.shape));
      btn.addEventListener("click", function () {
        pinned = index;
        select(index);
      });
      btn.addEventListener("mouseenter", function () { select(index); });
      btn.addEventListener("mouseleave", function () { select(pinned); });
      btn.addEventListener("focus", function () { select(index); });
      btn.addEventListener("blur", function () { select(pinned); });
      list.appendChild(btn);
      buttons.push({ node: btn });
    });

    add(panel, h("p", "w-tag", "现在的形状"));
    var shapeValue = h("p", "w-shape-big", SHAPES[0].shape);
    panel.appendChild(shapeValue);
    var stepName = h("p", "w-tag", "");
    panel.appendChild(stepName);
    var glyphWrap = h("div", null, "");
    panel.appendChild(glyphWrap);
    var stepDesc = h("p", "w-note", SHAPES[0].desc);
    panel.appendChild(stepDesc);
    panel.appendChild(h("p", "w-note", "所有形状都按 batch = 1 写。真实训练时第一维可能是 32、256，其它维不变。"));
    shapeValue.className = "w-shape-big";
    stepName.style.marginTop = "2px";

    select(0);
  }

  /* ========================================================================== *
   * 11. stack —— 编码器 / 解码器各 6 层
   * ========================================================================== */

  var LAYER_PARAMS = 4 * 512 * 512 + 2 * 512 * 2048;

  function buildStack(root) {
    headRow(root, "stack", "点一层，看它的输入输出");

    add(root, h("p", "w-tag", "N = 6：结构相同，参数不共享"));
    add(root, h("p", "w-note", "编码器和解码器各堆 6 层。每层有自己的一套权重：第 3 层和第 4 层形状一模一样，但参数不同。"));

    var state = { side: "enc", layer: 6 };
    var stack = h("div", "w-stack");
    root.appendChild(stack);

    var layerButtons = [];

    function layerName(side) {
      if (side === "enc") return "自注意力 + 前馈";
      return "掩码自注意力 + 交叉注意力 + 前馈";
    }

    [["enc", "编码器 Encoder"], ["dec", "解码器 Decoder"]].forEach(function (pair) {
      var side = pair[0];
      var col = h("div", "w-stack__col");
      var title = h("div", "w-stack__title");
      add(title, h("span", null, pair[1]));
      add(title, h("span", "w-tag", "N = 6"));
      col.appendChild(title);

      col.appendChild(h("div", "w-box", side === "enc" ? "→ z：交给解码器的记忆" : "线性 + softmax → 输出概率"));

      var layers = h("div", "w-stack__layers");
      for (var layer = 1; layer <= 6; layer += 1) {
        (function (layerNo) {
          var btn = h("button", "w-layer");
          btn.type = "button";
          btn.appendChild(h("span", "w-layer__no", "0" + layerNo));
          btn.appendChild(h("span", "w-layer__name", layerName(side)));
          btn.setAttribute("aria-pressed", "false");
          btn.addEventListener("click", function () {
            state.side = side;
            state.layer = layerNo;
            render();
          });
          layers.appendChild(btn);
          layerButtons.push({ node: btn, side: side, layer: layerNo });
        })(layer);
      }
      col.appendChild(layers);

      col.appendChild(h("div", "w-box", side === "enc" ? "输入嵌入 + 位置编码" : "输出嵌入（右移一位）+ 位置编码"));
      stack.appendChild(col);
    });

    var linkNote = h("div", "w-link-note");
    add(linkNote, document.createTextNode("编码器最后一层的输出，作为解码器每一层交叉注意力的 K 和 V（Q 来自解码器自己）。"));
    root.appendChild(linkNote);

    var cols = h("div", "w-cols w-cols--detail");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    add(panel, h("p", "w-tag", "选中的层"));
    var layerTitle = h("p", "w-shape-big", "");
    layerTitle.style.fontFamily = "var(--serif-cn)";
    layerTitle.style.fontSize = "1rem";
    panel.appendChild(layerTitle);

    var out = readout();
    panel.appendChild(out.el);
    var ddIn = out.add("输入形状");
    var ddOut = out.add("输出形状");
    var ddSub = out.add("子层数");
    var ddParams = out.add("每层参数量");

    var desc = h("p", "w-note", "");
    panel.appendChild(desc);
    var paramsNote = h("p", "w-note", "");
    panel.appendChild(paramsNote);

    main.appendChild(h("p", "w-tag", "每层内部的顺序"));
    var flow = h("div", "w-list");
    main.appendChild(flow);
    var flowRows = [];
    for (var f = 0; f < 4; f += 1) {
      var row = h("div", "w-step");
      row.style.cursor = "default";
      row.style.borderLeftColor = "transparent";
      row.appendChild(h("span", "w-step__no", "0" + (f + 1)));
      row.appendChild(h("span", "w-step__name", ""));
      flow.appendChild(row);
      flowRows.push(row.lastChild);
    }

    function render() {
      layerButtons.forEach(function (item) {
        item.node.setAttribute("aria-pressed", item.side === state.side && item.layer === state.layer ? "true" : "false");
      });
      var isEnc = state.side === "enc";
      layerTitle.textContent = (isEnc ? "编码器" : "解码器") + " · 第 " + state.layer + " 层";
      ddIn.textContent = "[1, 6, 512]";
      ddOut.textContent = "[1, 6, 512]";
      ddSub.textContent = isEnc ? "2" : "3";
      ddParams.textContent = isEnc ? "≈ 3.15M" : "≈ 4.19M";
      desc.textContent = isEnc
        ? "第 1 个子层是多头自注意力（8 头 × 64 维）：每个位置看本层全部 6 个位置。第 2 个子层是前馈 512 → 2048 → 512。每个子层都套残差 + LayerNorm。"
        : "第 1 个子层是带因果遮罩的自注意力（只能看左边），第 2 个子层是交叉注意力（Q 来自本层，K、V 来自编码器输出），第 3 个子层是前馈。每个子层都套残差 + LayerNorm。";
      paramsNote.textContent = isEnc
        ? "粗算：4 个 512×512 的投影矩阵（4 × 262,144）+ 前馈 2 × 512 × 2048 ≈ 3.15M 参数；6 层约 18.9M，且各层独立。"
        : "粗算：自注意力 4 个 512×512 矩阵 + 交叉注意力 4 个 512×512 矩阵 + 前馈 2 × 512 × 2048 ≈ 4.19M 参数；6 层约 25.2M，各层独立。";

      var sublayers = isEnc
        ? [
          "① 多头自注意力（8 头，每头 64 维）",
          "② 前馈网络 512 → 2048 → 512",
          "每个子层：LayerNorm(x + Sublayer(x))",
          "输入输出形状都是 [1, 6, 512]"
        ]
        : [
          "① 掩码多头自注意力（不看未来）",
          "② 交叉注意力（K、V 来自编码器）",
          "③ 前馈网络 512 → 2048 → 512",
          "每个子层：LayerNorm(x + Sublayer(x))"
        ];
      for (var i2 = 0; i2 < flowRows.length; i2 += 1) {
        flowRows[i2].textContent = sublayers[i2];
      }
    }

    render();
  }

  /* ========================================================================== *
   * 12. qkv —— 同一个词在 Q / K / V 三种角色下的向量
   * ========================================================================== */

  var QKV_ROLES = [
    { key: "q", letter: "q", label: "Q · 查询", cls: "q", name: "查询 query" },
    { key: "k", letter: "k", label: "K · 键", cls: "k", name: "键 key" },
    { key: "v", letter: "v", label: "V · 值", cls: "v", name: "值 value" }
  ];

  function baseTokenVector(index) {
    var out = [];
    for (var d = 0; d < 8; d += 1) {
      var value = 0.62 * Math.sin((index + 1) * (d + 1) * 0.83) + 0.3 * Math.cos((index + 2) * (d + 2) * 0.37);
      out.push(clamp(value, -0.96, 0.96));
    }
    return out;
  }

  function roleVector(index, role) {
    var base = baseTokenVector(index);
    var out = [];
    for (var d = 0; d < 8; d += 1) {
      var value;
      if (role === "q") value = base[d] * 0.9 + 0.32 * Math.sin(index + 1 + (d + 1) * 0.8);
      else if (role === "k") value = base[(d + 3) % 8] * 0.85 + 0.26 * Math.cos((index + 1) * 0.9 + d * 0.6);
      else value = base[d] * 0.8 + 0.28 * Math.cos((d + 1) * (index + 1) * 0.45);
      out.push(roundTo(clamp(value, -0.98, 0.98), 2));
    }
    return out;
  }

  function buildQkv(root) {
    headRow(root, "qkv", "点词、切换角色");

    var state = { word: 7, role: "q" };
    var n = SENTENCE.length;

    var tokenWrap = h("div", "w-tokens");
    root.appendChild(tokenWrap);
    var tokenButtons = [];
    for (var i = 0; i < n; i += 1) {
      (function (index) {
        var btn = h("button", "w-token", SENTENCE[index].w);
        btn.type = "button";
        btn.setAttribute("aria-pressed", index === state.word ? "true" : "false");
        btn.addEventListener("click", function () {
          state.word = index;
          render();
        });
        tokenWrap.appendChild(btn);
        tokenButtons.push(btn);
      })(i);
    }

    var roleRow = buttonGroup(QKV_ROLES.map(function (role) {
      return { value: role.key, label: role.label, cls: "w-rolebtn-" + role.key };
    }), state.role, function (value) {
      state.role = value;
      render();
    });
    root.appendChild(roleRow.el);

    var cols = h("div", "w-cols");
    var main = h("div", "w-main");
    var panel = h("div", "w-panel");
    cols.appendChild(main);
    cols.appendChild(panel);
    root.appendChild(cols);

    add(main, h("p", "w-note", "同一个词，三种向量（这里缩成 8 维；论文里每个头 64 维）"));
    var qkv = h("div", "w-qkv");
    main.appendChild(qkv);
    var vecRefs = [];
    QKV_ROLES.forEach(function (role) {
      var col = h("div", "w-qkv__col w-qkv__col--" + role.cls);
      var head = h("div", "w-qkv__head");
      head.appendChild(h("b", null, role.letter));
      head.appendChild(h("span", null, role.name));
      col.appendChild(head);
      var vec = h("div", "w-vec");
      var spans = [];
      for (var d = 0; d < 8; d += 1) {
        var cell = h("span", null, "0.00");
        vec.appendChild(cell);
        spans.push(cell);
      }
      col.appendChild(vec);
      qkv.appendChild(col);
      vecRefs.push({ key: role.key, col: col, spans: spans });
    });

    add(panel, h("p", "w-tag", "当前"));

    var roleDesc = h("p", "w-note", "");
    panel.appendChild(roleDesc);

    var out = readout();
    panel.appendChild(out.el);
    var ddWord = out.add("词");
    var ddRole = out.add("角色");
    var ddTarget = out.add("主要去找 / 被找");
    var ddWeight = out.add("权重");

    add(panel, h("p", "w-sub", "这一角色下的前 3"));
    var rank = h("div", "w-rank");
    panel.appendChild(rank);

    panel.appendChild(h("p", "w-note", "同一份嵌入经 W_Q、W_K、W_V 三个矩阵投影，得到 q、k、v 三个不同的向量：q 决定“找谁”，k 决定“被谁找”，v 决定“交出什么”。"));
    var hint = h("p", "w-note", "");
    panel.appendChild(hint);

    function roleSentence(word, role, targets) {
      var wordName = SENTENCE[word].w;
      var names = targets.map(function (item) {
        return SENTENCE[item.index].w + "（" + pct(item.weight, 0) + "）";
      });
      if (role === "q") {
        return "作为查询：" + wordName + " 拿着 q 去和每个词的 k 打分，最匹配 " + names.join("、") + "。";
      }
      if (role === "k") {
        return "作为键：" + wordName + " 提供被检索的标签，最常来找它的是 " + names.join("、") + " 的 q。";
      }
      return "作为值：" + wordName + " 把 v 交给需要它的位置，取回最多的是 " + names.join("、") + "。";
    }

    function targetsFor(word, role) {
      var items = [];
      var i2;
      if (role === "q") {
        var row = ATT_MATRIX[word];
        for (i2 = 0; i2 < n; i2 += 1) {
          if (i2 !== word) items.push({ index: i2, weight: row[i2] });
        }
      } else {
        for (i2 = 0; i2 < n; i2 += 1) {
          if (i2 !== word) items.push({ index: i2, weight: ATT_MATRIX[i2][word] });
        }
      }
      items.sort(function (a, b) { return b.weight - a.weight; });
      return items;
    }

    function render() {
      for (var i2 = 0; i2 < tokenButtons.length; i2 += 1) {
        var active = i2 === state.word;
        tokenButtons[i2].className = "w-token" + (active ? " w-token--" + state.role : "");
        tokenButtons[i2].setAttribute("aria-pressed", active ? "true" : "false");
      }
      QKV_ROLES.forEach(function (role) {
        roleRow.set(state.role);
      });

      QKV_ROLES.forEach(function (role) {
        var vec = roleVector(state.word, role.key);
        var ref = vecRefs.filter(function (item) { return item.key === role.key; })[0];
        ref.col.className = "w-qkv__col w-qkv__col--" + role.cls + (role.key === state.role ? " is-on" : "");
        for (var d = 0; d < 8; d += 1) {
          ref.spans[d].textContent = fmt(vec[d], 2);
          ref.spans[d].className = vec[d] < 0 ? "is-neg" : "";
        }
      });

      var targets = targetsFor(state.word, state.role);
      var top = targets.slice(0, 3);
      ddWord.textContent = SENTENCE[state.word].w;
      ddRole.textContent = QKV_ROLES.filter(function (role) { return role.key === state.role; })[0].name;
      ddTarget.textContent = SENTENCE[top[0].index].w;
      ddWeight.textContent = pct(top[0].weight, 1);

      roleDesc.textContent = roleSentence(state.word, state.role, top);
      clear(rank);
      top.forEach(function (item) {
        var row = h("div", "w-rank-row");
        add(row, h("span", "w-rank-word", SENTENCE[item.index].w));
        var track = h("div", "w-rank-track");
        var fill = h("div", "w-rank-fill");
        fill.style.width = clamp(item.weight / top[0].weight, 0, 1) * 100 + "%";
        track.appendChild(fill);
        add(row, track);
        add(row, h("span", "w-rank-val", pct(item.weight, 0)));
        rank.appendChild(row);
      });
      hint.textContent = state.role === "q"
        ? "提示：切到 K 或 V，看同一个词的向量和“关系方向”怎么反过来。"
        : "提示：同一组权重，既决定 K 被谁匹配，也决定 V 交给谁。";
    }

    render();
  }

  /* ========================================================================== *
   * 99. 注册表 / 挂载
   * ========================================================================== */

  var BUILDERS = {
    dotproduct: buildDotProduct,
    softmax: buildSoftmax,
    projection: buildProjection,
    attention: buildAttention,
    scaled: buildScaled,
    multihead: buildMultihead,
    posenc: buildPosenc,
    mask: buildMask,
    shapes: buildShapes,
    stack: buildStack,
    qkv: buildQkv
  };

  var Widgets = {
    version: "1.0.0",
    ids: function () { return Object.keys(BUILDERS); },
    mount: function (el, id, caption) {
      if (!doc || !el) return null;
      ensureStyle();
      clear(el);
      var root = h("div", "w-widget");
      root.setAttribute("data-widget-id", id);
      el.appendChild(root);
      var builder = BUILDERS[id];
      if (!builder) {
        add(root, h("p", "w-missing", "组件待补：" + id));
      } else {
        try {
          builder(root);
        } catch (err) {
          add(root, h("p", "w-error", "组件加载失败：" + (err && err.message ? err.message : "未知错误")));
        }
      }
      if (caption) {
        var cap = h("p", "widget-caption", caption);
        root.appendChild(cap);
      }
      return root;
    }
  };

  if (typeof global !== "undefined" && global) {
    global.Widgets = Widgets;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Widgets;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
