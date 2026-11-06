/* NAS Bays card for Home Assistant. Read-only: nothing on this card can change the NAS. MIT licence. */
(() => {
const VERSION = "0.3.3";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const fmt = (v, d = 1) => (v == null ? "–" : (+v).toFixed(d));
const decSize = (b) => { if (!b) return ""; const t = b / 1e12; return t >= 1 ? `${Math.round(t)} TB` : `${Math.round(b / 1e9)} GB`; };
const binSize = (b) => (b == null ? "–" : b >= 2 ** 40 ? `${(b / 2 ** 40).toFixed(1)} TiB` : `${(b / 2 ** 30).toFixed(0)} GiB`);
const WARN_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19L12 4Z"/></svg>';

/* Everything the card shows comes from the integration's sensors. */
function readModel(hass, cfg) {
  const regs = Object.values(hass.entities || {}).filter((e) => e.platform === "nas_bays");
  const ids = regs.map((e) => e.entity_id);
  if (!ids.length) return { missing: true };
  const deviceName = hass.devices?.[regs[0].device_id]?.name;
  const roles = {}, disks = {}, pools = {}, ghosts = [];
  for (const id of ids) {
    const st = hass.states[id];
    if (!st) continue;
    const a = st.attributes;
    if (cfg.entry && a.nas_bays_entry && a.nas_bays_entry !== cfg.entry) continue;
    if (a.nas_bays_role === "disk") disks[a.serial] = { ...a, temperature: num(st.state), entity: id };
    else if (a.nas_bays_role === "pool") pools[a.name] = { ...a, percent: num(st.state) };
    else if (a.nas_bays_role) roles[a.nas_bays_role] = st;
    else ghosts.push(st);
  }
  const health = roles.health;
  const unavailable = ghosts.filter((g) => g.entity_id.endsWith("_health")).length > 0 || !health;
  const healthGhost = ghosts.find((g) => g.entity_id.endsWith("_health"));
  const v = (r) => (roles[r] ? num(roles[r].state) : null);
  const boot = roles.boot_time ? new Date(roles.boot_time.state) : null;
  return {
    offline: unavailable, since: healthGhost ? new Date(healthGhost.last_changed) : null,
    state: health ? health.state : "unknown", ghosts,
    summary: health ? health.attributes.summary : "No data",
    host: (health && health.attributes.hostname) || cfg.name || deviceName || "NAS",
    version: health ? health.attributes.version : "", cpuModel: health ? health.attributes.model : "",
    memTotal: health ? health.attributes.memory_total : null, netSpeed: health ? health.attributes.net_speed : null, nics: health ? health.attributes.interfaces || [] : [],
    boot, cpu: v("cpu_usage"), temp: v("cpu_temperature"), load: v("load"),
    memApps: v("memory_apps"), memCache: v("memory_cache"), memFree: v("memory_free"),
    down: v("net_down"), up: v("net_up"), alerts: v("alerts"),
    alertList: roles.alerts ? roles.alerts.attributes.alert_list || [] : [],
    appsRunning: v("apps_running"), appsTotal: roles.apps_running ? roles.apps_running.attributes.apps_total : null,
    snapshots: v("snapshots"), backup: roles.snapshots?.attributes.backup,
    disks, pools,
  };
}

function uptime(boot) {
  if (!boot || isNaN(boot)) return "";
  const s = (Date.now() - boot) / 1000, d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return d ? `up ${d}d ${h}h` : `up ${h}h ${Math.floor((s % 3600) / 60)}m`;
}

const CHECK_ICON = '<svg class="ico2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 15-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9Z"/></svg>';
const CROSS_ICON = '<svg class="ico2" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4Z"/></svg>';

/* [number, unit] so the number can be big and the unit small. */
function rate(mbps) {
  if (mbps == null) return ["–", "Mb/s"];
  const a = Math.abs(mbps);
  if (a >= 1000) return [(a / 1000).toFixed(2), "Gb/s"];
  if (a >= 1) return [a.toFixed(1), "Mb/s"];
  return [(a * 1000).toFixed(0), "kb/s"];
}

const ago = (iso) => {
  const t = Date.parse(iso);
  if (!t) return null;
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.floor(hours / 24)} days ago`;
};
const shown = (cfg, name) => !(cfg.hide || []).includes(name);
const statusLine = (title, level, parts) => `<div class="sline ${level}"><span class="pico">${LEVEL_ICON[level]}</span><b>${title}</b><span class="stext">${parts.filter(Boolean).map(esc).join(" · ")}</span></div>`;

const VPN_WORDS = { connected: "Connected", not_connected: "Not connected", connecting: "Connecting", running: "Running", stopped: "Stopped", missing: "Not found", on: "Connected", off: "Not connected" };
/* Any sensor works. A "checked" time, which the helper script sends, lets the card spot a script that has stopped. */
function vpnLine(hass, cfg) {
  if (!cfg.vpn_entity || !shown(cfg, "vpn")) return "";
  const st = hass.states[cfg.vpn_entity];
  if (!st || st.state === "unavailable" || st.state === "unknown") return statusLine("VPN", "bad", [cfg.vpn_label, "No data"]);
  const a = st.attributes, label = cfg.vpn_label || [a.provider, a.vpn_type].filter(Boolean).join(" ");
  const checked = Date.parse(a.checked);
  if (checked && Date.now() - checked > 300000) return statusLine("VPN", "bad", [label, `No data for ${Math.round((Date.now() - checked) / 60000)} min`]);
  const good = ["connected", "on"].includes(st.state);
  const words = VPN_WORDS[st.state] || st.state;
  return statusLine("VPN", good ? "ok" : "warn", [label, words, a.location, a.issue || (good ? "No issues" : "")]);
}

function backupLine(m, cfg) {
  const b = m.backup;
  if (!b?.known || !shown(cfg, "backups")) return "";
  const problems = [];
  const hours = cfg.snapshot_warn_hours ?? 48;
  const age = b.last_snapshot ? (Date.now() - Date.parse(b.last_snapshot)) / 3600000 : null;
  let snap;
  if (!b.snapshot_tasks) { snap = "No snapshot tasks"; problems.push(1); }
  else if (b.snapshot_failed) { snap = `${b.snapshot_failed} snapshot task${b.snapshot_failed === 1 ? "" : "s"} failed`; problems.push(1); }
  else if (age == null) { snap = "No snapshots yet"; problems.push(1); }
  else { snap = `Last snapshot ${ago(b.last_snapshot)}`; if (age > hours) problems.push(1); }
  let remote;
  if (b.remote_failed) { remote = `${b.remote_failed} off-pool backup${b.remote_failed === 1 ? "" : "s"} failed`; problems.push(1); }
  else if (!b.remote_tasks) { remote = "No replication, cloud or rsync task"; if (cfg.warn_no_replication) problems.push(1); }
  else remote = b.last_remote ? `Last off-pool backup ${ago(b.last_remote)}` : "Off-pool backup not run yet";
  return statusLine("Backups", problems.length ? "warn" : "ok", [snap, m.snapshots != null ? `${m.snapshots} snapshots` : "", remote]);
}

const LEVEL_ICON = { ok: CHECK_ICON, warn: WARN_ICON, bad: CROSS_ICON, none: "" };
function poolTile(p, cfg) {
  const pct = p.total && p.used != null ? (p.used / p.total) * 100 : p.percent;
  const ended = p.scrub_end ? new Date(p.scrub_end).toLocaleDateString([], { day: "numeric", month: "short" }) : null;
  const overdue = p.scrub_state !== "SCANNING" && p.scrub_end && (Date.now() - Date.parse(p.scrub_end)) / 864e5 > (cfg.scrub_warn_days ?? 45);
  const scan = p.scrub_state === "SCANNING" ? "Scrub running" : ended ? `Scrubbed ${ended}` : "Never scrubbed";
  const scanWarn = overdue || (p.scrub_errors > 0);
  const barColor = !p.healthy || pct >= 90 ? "var(--nb-bad)" : pct >= 80 ? "var(--nb-warn)" : "var(--nb-a)";
  const notes = [p.disks_with_errors ? `${p.disks_with_errors} of ${p.disks_total} disks with errors` : "", p.scrub_errors ? `${p.scrub_errors} scrub errors` : ""].filter(Boolean).join(" · ");
  return `<div class="ptile"><div class="ptop"><b class="pname">${esc(p.name)}</b><span class="st ${p.healthy ? "good" : "bad"}">${esc(p.status || "Unknown")}</span><span class="pfree">${fmt(pct, 0)}% · ${binSize(p.available)} free</span></div>
    <div class="bar" role="img" aria-label="${esc(p.name)} ${fmt(pct, 0)} percent full"><i style="width:${Math.min(100, pct || 0)}%;background:${barColor}"></i></div>
    <div class="small"><span class="${scanWarn ? "warnword" : ""}">${esc(scan)}</span>${notes ? ` · <span class="warnword">${esc(notes)}</span>` : ""}</div></div>`;
}

const CSS = `
:host { --nb-fg: var(--primary-text-color); --nb-muted: var(--secondary-text-color); --nb-panel: rgba(127,127,127,.13); --nb-well: rgba(127,127,127,.1); --nb-bay: rgba(127,127,127,.16); --nb-line: rgba(127,127,127,.45); --nb-bar: rgba(127,127,127,.25);
  --nb-ok: #0a7d57; --nb-warn: #8a5a00; --nb-bad: #b3261e; --nb-warnbg: rgba(255,180,40,.2); --nb-badbg: rgba(230,60,50,.16); --nb-okbg: rgba(40,190,140,.16); --nb-a: #1b6fb8; --nb-b: #66a9dc; }
.dark { --nb-ok: #63e6be; --nb-warn: #ffc24b; --nb-bad: #ff9d94; --nb-a: #7cc4ff; --nb-b: #3d8fd1; --nb-well: rgba(0,0,0,.28); }
.force { --nb-fg: #fff; --nb-muted: #c3d4e6; }
ha-card { padding: 12px; color: var(--nb-fg); display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; }
.dark.force ha-card, .force ha-card { color: #fff; }
.head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.head .who { flex: 1 1 200px; min-width: 0; }
.host { font-size: 20px; font-weight: 700; line-height: 1.15; }
.sub, .cap, .small { color: var(--nb-muted); font-size: 13px; line-height: 1.35; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap; }
.s-ok { background: var(--nb-okbg); color: var(--nb-ok); } .s-warning { background: var(--nb-warnbg); color: var(--nb-warn); }
.s-critical { background: var(--nb-badbg); color: var(--nb-bad); } .s-off { background: var(--nb-panel); color: var(--nb-fg); }
.ico { width: 15px; height: 15px; fill: currentColor; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; flex: none; }
.bay.warning .ico, .strip.warning .ico { color: var(--nb-warn); } .bay.critical .ico, .strip.critical .ico { color: var(--nb-bad); }
.chassis { padding: 8px; border-radius: 12px; background: var(--nb-well); display: flex; flex-direction: column; gap: 8px; }
.cage.std { flex: 1 1 100%; }

.dock { display: flex; flex-wrap: wrap; gap: 8px; } .dock .strip { flex: 1 1 210px; width: auto; min-height: 40px; } .dock .detail { flex: 3 1 320px; min-width: 0; padding: 6px 10px; justify-content: center; }
.cages { display: flex; flex-wrap: wrap; gap: 12px; }
.cage { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.cage.vertical { flex: 2 1 340px; } .cage.horizontal { flex: 1 1 210px; }
.label { font-size: 12px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--nb-muted); }
.slots { display: grid; gap: 6px; } .vertical .slots { grid-template-columns: repeat(auto-fit, minmax(44px, 1fr)); } .horizontal .slots { grid-template-columns: minmax(0, 1fr); }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible { outline: 2px solid var(--nb-fg); outline-offset: 2px; }
.bay { box-sizing: border-box; border-radius: 7px; border: 2px solid var(--nb-line); background: var(--nb-bay); padding: 0; min-width: 0; }
.bay.warning { border-color: var(--nb-warn); background: var(--nb-warnbg); } .bay.critical, .bay.gone { border-color: var(--nb-bad); background: var(--nb-badbg); }
.bay.sel { outline: 2px solid var(--nb-fg); outline-offset: 1px; }
.vertical .bay { width: 100%; height: 190px; padding: 7px 3px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.horizontal .bay { width: 100%; min-height: 44px; padding: 0 9px; display: flex; align-items: center; gap: 8px; }
.led { width: 10px; height: 10px; border-radius: 50%; background: var(--nb-ok); flex: none; }
.vents { flex: 1; align-self: stretch; margin-inline: 8px; background: repeating-linear-gradient(0deg, var(--nb-line) 0 2px, transparent 2px 6px); opacity: .7; }
.horizontal .vents { flex: 1 1 24px; align-self: center; height: 22px; margin: 0; background: repeating-linear-gradient(90deg, var(--nb-line) 0 2px, transparent 2px 6px); min-width: 24px; }
.horizontal .tag { flex: 0 1 auto; min-width: 0; max-width: 38%; }
.t { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 16px; font-weight: 600; line-height: 1; } .t.hot { color: var(--nb-warn); }
.tag { font-size: 12px; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: var(--nb-muted); }
.vertical .sz { font-size: 12px; color: var(--nb-muted); } .horizontal .sz { font-size: 12px; color: var(--nb-muted); white-space: nowrap; }
.empty { box-sizing: border-box; border: 1px dashed var(--nb-line); border-radius: 7px; color: var(--nb-muted); font-size: 12px; display: flex; align-items: center; justify-content: center; }
.vertical .empty { height: 190px; align-items: flex-end; padding-bottom: 8px; } .horizontal .empty { min-height: 44px; }
.strip { box-sizing: border-box; width: 100%; min-height: 44px; padding: 0 10px; border-radius: 7px; border: 2px solid var(--nb-line); background: var(--nb-bay); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; text-align: left; }
.strip.warning { border-color: var(--nb-warn); background: var(--nb-warnbg); } .strip.critical { border-color: var(--nb-bad); background: var(--nb-badbg); } .strip.sel { outline: 2px solid var(--nb-fg); outline-offset: 1px; }
.strip .sp { margin-left: auto; } .strip b { font-size: 14px; }
.detail { padding: 10px 12px; border-radius: 8px; background: var(--nb-bay); display: flex; flex-direction: column; gap: 3px; }
.detail.warning { background: var(--nb-warnbg); } .detail.critical { background: var(--nb-badbg); }
.detail .title { display: flex; flex-wrap: wrap; gap: 3px 12px; align-items: baseline; } .detail .ser { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 600; }
.msg { font-size: 14px; } .msg.ok { color: var(--nb-ok); } .msg.warning { color: var(--nb-warn); } .msg.critical { color: var(--nb-bad); }
.tiles { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
.tile { padding: 10px; border-radius: 12px; background: var(--nb-panel); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.tile h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--nb-muted); }
.big { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 25px; font-weight: 600; line-height: 1; } .big small { font-size: 14px; }
.bar { display: flex; height: 12px; border-radius: 3px; overflow: hidden; background: var(--nb-bar); margin-block: 4px; }
.bar i { display: block; height: 100%; }
.pools { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 8px; }
.ptile { padding: 9px 10px; border-radius: 12px; background: var(--nb-panel); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.slines { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 8px; }
.sline { display: flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 10px; background: var(--nb-panel); font-size: 13px; line-height: 1.35; min-width: 0; }
.sline b { flex: none; } .stext { min-width: 0; overflow-wrap: anywhere; } .sline.ok .pico { color: var(--nb-ok); } .sline.warn { background: var(--nb-warnbg); } .sline.warn .pico, .sline.warn b { color: var(--nb-warn); } .sline.bad { background: var(--nb-badbg); } .sline.bad .pico, .sline.bad b { color: var(--nb-bad); }
.pooltop { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; } .pooltop b { font-size: 16px; overflow-wrap: anywhere; }
.st { font-size: 13px; font-weight: 600; } .st.good { color: var(--nb-ok); } .st.bad { color: var(--nb-bad); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 5px 10px; border-radius: 8px; background: var(--nb-panel); font-size: 13px; border: 0; } .chip.warn { background: var(--nb-warnbg); color: var(--nb-warn); } .chip b { font-weight: 700; }
.alerts { margin: 0; padding: 10px 12px 10px 28px; border-radius: 8px; background: var(--nb-panel); font-size: 14px; display: grid; gap: 4px; }
.leds { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 4px; } .leds i { height: 12px; border-radius: 3px; background: var(--nb-ok); }
.leds .warning { background: var(--nb-warn); } .leds .critical, .leds .gone { background: var(--nb-bad); } .leds .off { background: var(--nb-line); }
.ico2 { width: 16px; height: 16px; fill: currentColor; flex: none; }
.nrate span:last-child { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 600; }
ha-card { container-type: inline-size; width: 100%; max-width: var(--nb-max, none); margin-inline: auto; }
.cage.std .slots { grid-template-columns: repeat(var(--c, 12), minmax(0, 1fr)); gap: 5px; }
.cage.std .bay, .cage.std .empty { height: 104px; } .cage.std .bay { padding: 6px 2px; justify-content: flex-start; gap: 4px; } .cage.std .bay .mono { margin-top: auto; } .cage.std .empty { padding-bottom: 6px; font-size: 11px; } .cage.std .tag { font-size: 11px; } .cage.std .t { font-size: 15px; } .cage.std .sz { font-size: 11px; }
@container (max-width: 560px) { .cage.std .slots { grid-template-columns: repeat(6, minmax(0, 1fr)); } .cage.std .empty { display: none; } }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } .stats b { display: block; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 18px; }

.pico { display: inline-flex; flex: none; }
.warnword { color: var(--nb-warn); font-weight: 600; }
.tiles { grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr)); }
@media (min-width: 620px) {
.fill ha-card { min-height: var(--nb-fill-h, 0); }
.fill .chassis { flex: 3 1 auto; } .fill .cages { flex: 1 1 auto; } .fill .cage.std { display: flex; } .fill .cage.std .slots { flex: 1 1 auto; grid-auto-rows: 1fr; }
.fill .cage.std .bay, .fill .cage.std .empty { height: auto; min-height: 104px; } .fill .cage.std .bay { gap: 8px; padding: 10px 2px; }
.fill .cage.std .t { font-size: 21px; } .fill .cage.std .tag, .fill .cage.std .sz, .fill .cage.std .mono, .fill .cage.std .empty { font-size: 13px; } .fill .led { width: 12px; height: 12px; }
.fill .tiles { flex: 2 1 auto; grid-auto-rows: 1fr; } .fill .tile { justify-content: center; gap: 10px; padding: 14px; } .fill .tile h3 { font-size: 15px; }
.fill .tile .big { font-size: 36px; } .fill .tile .big small { font-size: 16px; } .fill .big.nsecond { font-size: 22px; } .fill .big.nsecond small { font-size: 14px; } .fill .tile .bar { height: 16px; margin: 2px 0; } .fill .small { font-size: 14px; }
.fill .sline { font-size: 14px; padding: 9px 12px; }
.fill .pools { flex: 1.4 1 auto; grid-auto-rows: 1fr; } .fill .ptile { justify-content: center; gap: 9px; padding: 12px 14px; } .fill .pname { font-size: 17px; } .fill .pfree { font-size: 14px; } .fill .ptile .bar { height: 16px; }
}
.big.nsecond { font-size: 16px; } .big.nsecond small { font-size: 12px; }
.ptop { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; } .pname { font-size: 15px; overflow-wrap: anywhere; } .pfree { margin-left: auto; font-size: 13px; color: var(--nb-muted); white-space: nowrap; }
.ptile .bar { margin: 0; }
`;

class NasBaysCard extends HTMLElement {
  static getConfigElement() { return document.createElement("nas-bays-card-editor"); }
  static getStubConfig() { return {}; }
  setConfig(config) { this._cfg = { mode: "full", theme: "auto", ...config }; this._sig = null; if (this._hass) this._render(); }
  getCardSize() { return this._cfg?.mode === "compact" ? 3 : 10; }
  getGridOptions() { return this._cfg?.mode === "compact" ? { columns: 6, rows: "auto", min_columns: 4 } : { columns: "full", rows: "auto" }; }
  set hass(hass) { this._hass = hass; this._render(); }

  /* fill: stretch from where the card starts to the bottom of the screen. Measured, because dashboards differ. Not on phones, where it scrolls anyway. */
  _fit() {
    if (!this._cfg?.fill || this._cfg.mode === "compact" || window.innerWidth < 620) { this.style.removeProperty("--nb-fill-h"); return; }
    const top = this.getBoundingClientRect().top;
    if (top < 0) return;
    this.style.setProperty("--nb-fill-h", `${Math.max(0, window.innerHeight - top - (this._cfg.fill_bottom ?? 16))}px`);
  }

  disconnectedCallback() { if (this._onResize) window.removeEventListener("resize", this._onResize); this._onResize = null; }
  connectedCallback() {
    if (!this._onResize) { this._onResize = () => this._fit(); window.addEventListener("resize", this._onResize); }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.addEventListener("click", (e) => {
        const b = e.target.closest("[data-sel],[data-alerts]");
        if (!b) return;
        if (b.dataset.sel) this._sel = this._sel === b.dataset.sel ? "__none" : b.dataset.sel;
        if (b.dataset.alerts !== undefined) this._showAlerts = !this._showAlerts;
        this._render();
      });
    }
  }

  /* Standard layout: 12 bays across the top. TrueNAS can't see physical positions, so drives fill the bays in order
     unless the owner sets slots. A custom case layout (cages in YAML) replaces the row. */
  _layout(m) {
    const all = Object.values(m.disks);
    const cages = this._cfg.cages?.length ? this._cfg.cages : null;
    if (cages) {
      const placed = new Set(cages.flatMap((c) => c.slots || []).filter(Boolean));
      const rest = all.filter((d) => !placed.has(d.serial));
      return { cages, internal: rest.filter((d) => d.boot), unplaced: rest.filter((d) => !d.boot) };
    }
    const internal = all.filter((d) => d.boot), data = all.filter((d) => !d.boot);
    const count = Math.max(1, +this._cfg.bays || 12);
    let slots, unplaced = [];
    if (this._cfg.slots?.length) {
      slots = Array.from({ length: Math.max(count, this._cfg.slots.length) }, (_, i) => this._cfg.slots[i] ?? null);
      const placed = new Set(slots.filter(Boolean));
      unplaced = data.filter((d) => !placed.has(d.serial));
    } else {
      const list = data.sort((a, b) => !a.pool - !b.pool || String(a.pool ?? "").localeCompare(String(b.pool ?? "")) || a.serial.localeCompare(b.serial)).map((d) => d.serial);
      slots = [...list, ...Array(Math.max(0, count - list.length)).fill(null)];
    }
    return { cages: [{ standard: true, orientation: "vertical", slots }], internal, unplaced };
  }

  _tag(d) {
    if (d.boot) return "boot";
    if (!d.pool) return "none";
    return (this._cfg.pool_names || {})[d.pool] || d.pool;
  }

  _bay(serial, m, orient) {
    if (!serial) return `<div class="empty">Empty</div>`;
    const d = m.disks[serial], sel = this._current === serial ? " sel" : "";
    if (!d) {
      const off = m.offline;
      return `<button class="bay ${off ? "" : "gone"}${sel}" data-sel="${esc(serial)}" aria-label="${esc(serial)} ${off ? "no data" : "missing"}">${orient === "vertical"
        ? `<span class="tag">${off ? "?" : "Gone"}</span><span class="vents"></span><span class="mono">${esc(serial.slice(-4))}</span>`
        : `<span class="tag">${off ? "No data" : "Missing"}</span><span class="vents"></span><span class="mono">${esc(serial.slice(-4))}</span>`}</button>`;
    }
    const icon = d.health === "ok" ? `<span class="led"></span>` : WARN_ICON;
    const hot = d.temperature != null && d.temperature >= (this._cfg.temp_warn ?? 50) ? " hot" : "";
    const temp = `<span class="t${hot}">${d.temperature == null ? "–" : Math.round(d.temperature) + "°"}</span>`;
    const label = `${d.serial}, ${d.temperature ?? "unknown"} degrees, ${d.health === "ok" ? "healthy" : "needs attention"}`;
    const inner = orient === "vertical"
      ? `${icon}<span class="tag">${esc(this._tag(d))}</span>${this._std ? "" : `<span class="vents"></span>`}${temp}<span class="sz">${esc(decSize(d.size))}</span><span class="mono">${esc(d.serial.slice(-4))}</span>`
      : `${icon}${temp}<span class="vents"></span><span class="tag">${esc(this._tag(d))}</span><span class="sz">${esc(decSize(d.size))}</span><span class="mono">${esc(d.serial.slice(-4))}</span>`;
    return `<button class="bay ${d.health === "ok" ? "" : d.health}${sel}" data-sel="${esc(d.serial)}" aria-pressed="${!!sel}" aria-label="${esc(label)}">${inner}</button>`;
  }

  _strip(d, title) {
    const sel = this._current === d.serial ? " sel" : "";
    return `<button class="strip ${d.health === "ok" ? "" : d.health}${sel}" data-sel="${esc(d.serial)}" aria-pressed="${!!sel}">${d.health === "ok" ? `<span class="led"></span>` : WARN_ICON}<b>${esc(title)}</b><span class="sub">${esc(decSize(d.size))} · ${esc(this._tag(d))}</span><span class="t sp">${d.temperature == null ? "–" : Math.round(d.temperature) + "°"}</span><span class="mono">${esc(d.serial.slice(-4))}</span></button>`;
  }

  _detail(m) {
    const serial = this._current;
    if (!serial) return `<div class="detail"><span class="sub">Tap a drive for its details.</span></div>`;
    const d = m.disks[serial];
    if (!d) return `<div class="detail ${m.offline ? "" : "critical"}"><span class="ser">${esc(serial)}</span><span class="msg ${m.offline ? "" : "critical"}">${m.offline ? "No data from the NAS." : "The NAS isn't reporting this drive. It may have been removed or failed."}</span></div>`;
    const pool = d.pool || "not in a pool";
    let msg;
    if (d.issues?.length) msg = d.issues.join(" ");
    else if (d.health === "ok") msg = `Healthy. ${d.pool ? `${d.read_errors} read, ${d.write_errors} write and ${d.checksum_errors} checksum errors.` : "No alerts. Not in a pool."}`;
    else msg = `${d.state || "Problem"}: ${d.read_errors} read, ${d.write_errors} write and ${d.checksum_errors} checksum errors.`;
    return `<div class="detail ${d.health === "ok" ? "" : d.health}"><div class="title"><span class="ser">${esc(d.serial)}</span><span class="sub">${esc(d.model)} · ${esc(d.device)} · ${esc(pool)}</span></div><span class="msg ${d.health}">${esc(msg)}</span></div>`;
  }

  _full(m) {
    const { cages, internal, unplaced } = this._layout(m);
    this._std = !!cages[0]?.standard;
    const nic = (m.nics || [])[0] || {}, linkDown = nic.link && nic.link !== "LINK_STATE_UP";
    const upRate = rate(m.up), downRate = rate(m.down);
    const total = m.memTotal || (m.memApps ?? 0) + (m.memCache ?? 0) + (m.memFree ?? 0) || null;
    const stateClass = m.offline ? "s-off" : `s-${m.state}`;
    const pill = m.offline ? "No data" : m.summary;
    const sub = m.offline ? (m.since ? `Nothing received since ${m.since.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for the NAS") : [m.version && `TrueNAS ${m.version}`, m.cpuModel && m.cpuModel.replace(/ with .*/, "").replace(/^AMD |^Intel\(R\) /, ""), uptime(m.boot)].filter(Boolean).join(" · ");
    const apps = m.appsTotal ? [`<div class="chip"><b>${m.appsRunning} of ${m.appsTotal}</b> apps running</div>`] : [];
    const cfg = this._cfg;
    const lines = vpnLine(this._hass, cfg) + backupLine(m, cfg);
    return `
    <div class="head"><div class="who"><div class="host">${esc(this._cfg.name || m.host)}</div><div class="sub">${esc(sub)}</div></div>
      <div class="chips">${apps.join("")}
      ${m.alerts != null ? `<button class="chip ${m.alerts ? "warn" : ""}" data-alerts aria-expanded="${!!this._showAlerts}"><b>${m.alerts}</b> alert${m.alerts === 1 ? "" : "s"}</button>` : ""}</div>
      <span class="pill ${stateClass}" role="status">${!m.offline && m.state !== "ok" ? WARN_ICON : ""}${esc(pill)}</span></div>
    ${this._showAlerts && m.alertList.length ? `<ul class="alerts">${m.alertList.map((a) => `<li>${esc(a.text)}</li>`).join("")}</ul>` : ""}
    <div class="chassis">
      <div class="cages">${cages.map((c) => {
        const o = c.orientation === "horizontal" ? "horizontal" : "vertical", slots = c.slots || [];
        if (c.standard) return `<div class="cage vertical std"><div class="slots" style="--c:${Math.min(slots.length, 12)}">${slots.map((s) => this._bay(s, m, o)).join("")}</div></div>`;
        return `<div class="cage ${o}"><div class="label">${esc(c.name || "Bays")}</div><div class="slots" style="--n:${Math.max(slots.length, 1)}">${slots.map((s) => this._bay(s, m, o)).join("")}</div></div>`;
      }).join("")}</div>
      ${unplaced.length ? `<div class="label">Not placed in a bay yet</div>${unplaced.map((d) => this._strip(d, d.serial)).join("")}` : ""}
      <div class="dock">${internal.map((d) => this._strip(d, "Internal")).join("")}${this._detail(m)}</div>
    </div>
    <div class="tiles">
      ${shown(cfg, "cpu") ? `<div class="tile"><h3>CPU</h3><div class="big">${fmt(m.cpu, 0)}<small>%</small></div>
        <div class="bar" role="img" aria-label="CPU ${fmt(m.cpu, 0)} percent"><i style="width:${Math.min(100, m.cpu || 0)}%;background:var(--nb-a)"></i></div>
        <div class="small">${m.temp != null ? `${fmt(m.temp, 0)}°C · ` : ""}load ${fmt(m.load, 2)}</div></div>` : ""}
      ${shown(cfg, "memory") ? `<div class="tile"><h3>Memory</h3><div class="big">${fmt(m.memApps)}<small> GiB</small></div>
        <div class="bar" role="img" aria-label="Of ${fmt(total)} GiB: ${fmt(m.memApps)} apps and system, ${fmt(m.memCache)} ZFS cache, ${fmt(m.memFree)} free"><i style="width:${total ? ((m.memApps || 0) / total) * 100 : 0}%;background:var(--nb-a)"></i><i style="width:${total ? ((m.memCache || 0) / total) * 100 : 0}%;background:var(--nb-b)"></i></div>
        <div class="small">${fmt(m.memCache)} cache · ${fmt(m.memFree)} free of ${fmt(total)} GiB</div></div>` : ""}
      ${shown(cfg, "network") ? `<div class="tile"><h3>Network${m.netSpeed ? ` · ${m.netSpeed >= 1000 ? `${m.netSpeed / 1000} Gb/s` : `${m.netSpeed} Mb/s`}` : ""}</h3><div class="big">${upRate[0]}<small> ${upRate[1]} up</small></div>
        <div class="big nsecond">${downRate[0]}<small> ${downRate[1]} down</small></div>
        ${linkDown ? `<div class="small warnword">${esc(nic.name)}: link down</div>` : ""}</div>` : ""}
    </div>
    ${lines ? `<div class="slines">${lines}</div>` : ""}
    ${shown(cfg, "storage") ? `<div class="pools" aria-label="Storage">${Object.values(m.pools).map((p) => poolTile(p, cfg)).join("")}</div>` : ""}`;
  }

  _compact(m) {
    const { cages, internal, unplaced } = this._layout(m);
    const serials = [...cages.flatMap((c) => (c.slots || []).filter(Boolean)), ...unplaced.map((d) => d.serial), ...internal.map((d) => d.serial)];
    const bad = Object.values(m.disks).find((d) => d.issues?.length);
    const firstPool = Object.values(m.pools)[0];
    let msg, cls = "";
    if (m.offline) msg = m.since ? `Nothing received since ${m.since.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for the NAS";
    else if (m.state !== "ok") { msg = bad ? bad.issues[0] : m.alertList[0]?.text || m.summary; cls = m.state; }
    else msg = [uptime(m.boot), m.appsTotal ? `${m.appsRunning} of ${m.appsTotal} apps running` : ""].filter(Boolean).join(" · ");
    return `<div class="head"><div class="who"><div class="host" style="font-size:20px">${esc(this._cfg.name || m.host)}</div></div><span class="pill ${m.offline ? "s-off" : `s-${m.state}`}">${esc(m.offline ? "No data" : m.summary)}</span></div>
      <div class="msg ${cls}">${esc(msg)}</div>
      <div class="leds" style="--n:${Math.max(serials.length, 1)}" role="img" aria-label="${serials.length} drives">${serials.map((s) => { const d = m.disks[s]; return `<i class="${m.offline ? "off" : !d ? "gone" : d.health === "ok" ? "" : d.health}"></i>`; }).join("")}</div>
      <div class="stats"><div><b>${fmt(m.cpu, 0)}%</b><span class="small">CPU</span></div><div><b>${fmt(m.memApps)} GiB</b><span class="small">Apps memory</span></div><div><b>${firstPool ? fmt(firstPool.percent, 0) + "%" : "–"}</b><span class="small">${esc(firstPool ? firstPool.name : "Pool")} full</span></div></div>`;
  }

  _render() {
    if (!this._hass || !this._cfg || !this.shadowRoot) return;
    const m = readModel(this._hass, this._cfg);
    this._model = m;
    if (m.host && !m.offline) this._lastHost = m.host;
    if (m.offline && this._lastHost) m.host = this._lastHost;
    const dark = this._cfg.theme === "dark" || (this._cfg.theme !== "light" && this._hass.themes?.darkMode);
    const wrap = `${dark ? "dark" : ""} ${this._cfg.theme === "dark" ? "force" : ""} ${this._cfg.fill && this._cfg.mode !== "compact" ? "fill" : ""}`;
    let body;
    if (m.missing) body = `<div class="msg">Add the <b>NAS Bays for TrueNAS</b> integration first: Settings → Devices &amp; services → Add integration.</div>`;
    else {
      const list = Object.values(m.disks);
      const worst = list.find((d) => d.health === "critical") || list.find((d) => d.health === "warning");
      this._current = this._sel === "__none" ? null : this._sel || worst?.serial || null;
      body = this._cfg.mode === "compact" ? this._compact(m) : this._full(m);
    }
    if (body === this._sig) return;
    this._sig = body;
    /* The full card is designed for up to about 1100 px. On a wider screen it stays that size, centred, instead of stretching. 0 turns this off. */
    const widest = this._cfg.mode === "compact" ? 0 : parseInt(this._cfg.max_width ?? 1100, 10) || 0;
    const vars = [this._cfg.background && `--ha-card-background:${esc(this._cfg.background)};--card-background-color:${esc(this._cfg.background)}`, widest > 0 && `--nb-max:${widest}px`].filter(Boolean).join(";");
    const style = vars ? `style="${vars}"` : "";
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="${wrap}" ${style}><ha-card>${body}</ha-card></div>`;
    this._fit();
    if (!this._fitted) { this._fitted = true; requestAnimationFrame(() => this._fit()); setTimeout(() => this._fit(), 800); }
  }
}

const SECTIONS = [["cpu", "CPU"], ["memory", "Memory"], ["network", "Network"], ["vpn", "VPN line"], ["backups", "Backups line"], ["storage", "Storage"]];

class NasBaysCardEditor extends HTMLElement {
  setConfig(config) { this._cfg = { ...config }; this._draw(); }
  set hass(hass) { const first = !this._hass; this._hass = hass; if (first) this._draw(); }
  _emit() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._cfg }, bubbles: true, composed: true })); this._draw(); }
  _disks() { return this._hass ? Object.values(readModel(this._hass, this._cfg).disks || {}) : []; }
  _draw() {
    if (!this._cfg) return;
    if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._wire(); }
    const disks = this._disks().filter((d) => !d.boot), custom = this._cfg.cages?.length > 0, count = Math.max(1, +this._cfg.bays || 12);
    const slots = this._cfg.slots || [], used = new Set(slots.filter(Boolean));
    const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;
    this.shadowRoot.innerHTML = `<style>
      :host{display:grid;gap:14px;color:var(--primary-text-color)} label{display:grid;gap:4px;font-size:14px} select,input{font:inherit;padding:8px;color:inherit;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:6px;min-width:0}
      .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px} fieldset{border:1px solid var(--divider-color);border-radius:8px;display:grid;gap:8px;padding:10px} legend{font-weight:600;padding:0 6px} .slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px} .checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px} label.check{display:flex;align-items:center;gap:6px} button{font:inherit;padding:8px 12px;border-radius:6px;border:1px solid var(--divider-color);background:none;color:inherit;cursor:pointer} p{margin:0;color:var(--secondary-text-color);font-size:13px}
    </style>
    <div class="row">
      <label for="mode">Size<select id="mode" data-key="mode">${opt("full", "Full", this._cfg.mode || "full")}${opt("compact", "Compact", this._cfg.mode || "full")}</select></label>
      <label for="theme">Colours<select id="theme" data-key="theme">${opt("auto", "Follow Home Assistant", this._cfg.theme || "auto")}${opt("light", "Dark text", this._cfg.theme || "auto")}${opt("dark", "White text", this._cfg.theme || "auto")}</select></label>
    </div>
    <fieldset><legend>Show on the card</legend><div class="checks">${SECTIONS.map(([k, label]) => `<label class="check"><input type="checkbox" data-hide="${k}" ${(this._cfg.hide || []).includes(k) ? "" : "checked"}> ${esc(label)}</label>`).join("")}</div></fieldset>
    <label class="check"><input type="checkbox" data-bool="fill" ${this._cfg.fill ? "checked" : ""}> Fill the height of the screen (not on phones)</label>
    <label for="maxw">Maximum width in pixels (0 fills the whole space)<input id="maxw" type="number" min="0" step="10" data-text="max_width" value="${esc(this._cfg.max_width ?? 1100)}"></label>
    <fieldset><legend>VPN line (optional)</legend><p>Pick any sensor that says whether your VPN is connected. Leave it empty to hide the line. The Gluetun helper script in the README sets this up for you.</p>
      <div class="row"><label for="vpne">VPN sensor<input id="vpne" data-text="vpn_entity" value="${esc(this._cfg.vpn_entity || "")}" placeholder="sensor.nas_vpn"></label>
      <label for="vpnl">Label (optional)<input id="vpnl" data-text="vpn_label" value="${esc(this._cfg.vpn_label || "")}" placeholder="Proton WireGuard"></label></div></fieldset>
    ${custom ? `<p>This card uses a custom case layout, set in its YAML.</p>` : `<fieldset><legend>Drive bays</legend>
      <p>Drives fill the bays automatically. TrueNAS can't tell which physical bay a drive is in, so to match your case, pick the drive for each bay using the serial on its label.</p>
      <label for="bays">Number of bays<input id="bays" type="number" min="1" max="60" data-num="bays" value="${count}"></label>
      <div class="slots">${Array.from({ length: Math.max(count, slots.length) }, (_, i) => { const s = slots[i] ?? null; return `<label for="b${i}">Bay ${i + 1}<select id="b${i}" data-slot="${i}"><option value="">${slots.length ? "Empty" : "Automatic"}</option>${disks.filter((d) => d.serial === s || !used.has(d.serial)).map((d) => opt(d.serial, `${d.serial} (${decSize(d.size)}, ${d.pool || "no pool"})`, s)).join("")}${s && !disks.some((d) => d.serial === s) ? opt(s, `${s} (missing)`, s) : ""}</select></label>`; }).join("")}</div>
      ${slots.length ? `<button type="button" data-auto>Back to automatic order</button>` : ""}</fieldset>`}`;
  }
  _wire() {
    const root = this.shadowRoot;
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.key) this._cfg = { ...this._cfg, [t.dataset.key]: t.value };
      else if (t.dataset.bool) { this._cfg = { ...this._cfg }; if (t.checked) this._cfg[t.dataset.bool] = true; else delete this._cfg[t.dataset.bool]; }
      else if (t.dataset.hide) {
        const hide = new Set(this._cfg.hide || []);
        if (t.checked) hide.delete(t.dataset.hide); else hide.add(t.dataset.hide);
        this._cfg = { ...this._cfg, hide: [...hide] };
        if (!hide.size) delete this._cfg.hide;
      } else if (t.dataset.text) {
        this._cfg = { ...this._cfg, [t.dataset.text]: t.value.trim() };
        if (!this._cfg[t.dataset.text]) delete this._cfg[t.dataset.text];
      }
      else if (t.dataset.slot !== undefined) {
        const count = Math.max(1, +this._cfg.bays || 12), next = Array.from({ length: count }, (_, i) => (this._cfg.slots || [])[i] ?? null);
        next[+t.dataset.slot] = t.value || null;
        this._cfg = { ...this._cfg, slots: next };
        if (!next.some(Boolean)) delete this._cfg.slots;
      } else if (t.dataset.num) {
        const n = Math.min(60, Math.max(1, +t.value || 12));
        this._cfg = { ...this._cfg, [t.dataset.num]: n };
        if (this._cfg.slots) this._cfg.slots = Array.from({ length: n }, (_, i) => this._cfg.slots[i] ?? null);
        if (n === 12) delete this._cfg[t.dataset.num];
      }
      else return;
      this._emit();
    });
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.dataset.auto !== undefined) { this._cfg = { ...this._cfg }; delete this._cfg.slots; this._emit(); }
    });
  }
}

const register = (tag, cls) => { try { if (!customElements.get(tag)) customElements.define(tag, cls); } catch (err) { console.debug(`nas-bays: ${tag} already registered`, err); } };
/* The integration can load this file before HA's app has wrapped customElements. Anything defined before
   then is invisible to HA's customElements.get and the card shows "Configuration error", so wait for the app. */
const registerAll = () => { register("nas-bays-card", NasBaysCard); register("nas-bays-card-editor", NasBaysCardEditor); };
let tries = 0;
const whenAppReady = () => {
  if (customElements.get("home-assistant") || ++tries > 600) registerAll();
  else setTimeout(whenAppReady, 50);
};
whenAppReady();
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "nas-bays-card")) window.customCards.push({ type: "nas-bays-card", name: "NAS Bays", description: "Monitor a TrueNAS server: 12 drive bays, pools, CPU, memory and network. Read-only.", preview: false, documentationURL: "https://github.com/spikey1965/ha-nas-bays" });
console.info(`%c NAS-BAYS-CARD %c v${VERSION} `, "background:#1b6fb8;color:#fff", "");
})();
