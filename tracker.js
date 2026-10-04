// language: JavaScript, file: tracker.js
// *Recolector v2 — sin preflight CORS*

(function () {
  'use strict';

  var WEBHOOK_URL = "https://webhook.site/b5442b12-8160-44e8-a32d-f8e1cb26d2e4";

  var data = {};

  // ─── Básicos ───
  data.user_agent = navigator.userAgent;
  data.language = navigator.language;
  data.languages = navigator.languages || [];
  data.platform = navigator.platform || null;
  data.cookies_enabled = navigator.cookieEnabled;
  data.do_not_track = navigator.doNotTrack || null;
  data.timezone = (function () {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    catch (e) { return null; }
  })();
  data.timezone_offset = new Date().getTimezoneOffset();
  data.local_time = new Date().toString();

  // ─── Pantalla ───
  data.screen = {
    width: screen.width,
    height: screen.height,
    avail_width: screen.availWidth,
    avail_height: screen.availHeight,
    color_depth: screen.colorDepth,
    pixel_ratio: window.devicePixelRatio,
    orientation: (screen.orientation && screen.orientation.type) || null
  };

  // ─── Ventana ───
  data.window = {
    inner_width: window.innerWidth,
    inner_height: window.innerHeight,
    outer_width: window.outerWidth,
    outer_height: window.outerHeight
  };

  // ─── Hardware ───
  data.hardware = {
    cores: navigator.hardwareConcurrency || null,
    memory: navigator.deviceMemory || null,
    max_touch_points: navigator.maxTouchPoints || 0
  };

  // ─── Conexión ───
  data.connection = (function () {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return null;
    return {
      effective_type: c.effectiveType || null,
      downlink: c.downlink || null,
      rtt: c.rtt || null,
      save_data: c.saveData || null
    };
  })();

  // ─── WebGL / GPU ───
  data.webgl = (function () {
    try {
      var canvas = document.createElement("canvas");
      var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return null;
      var dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        unmasked_vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
        unmasked_renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null,
        version: gl.getParameter(gl.VERSION)
      };
    } catch (e) { return null; }
  })();

  // ─── Canvas fingerprint ───
  data.canvas_fingerprint = (function () {
    try {
      var canvas = document.createElement("canvas");
      canvas.width = 220; canvas.height = 60;
      var ctx = canvas.getContext("2d");
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("AXION-LUNAR-99", 2, 15);
      ctx.fillStyle = "rgba(102,204,0,0.7)";
      ctx.fillText("AXION-LUNAR-99", 4, 17);
      return canvas.toDataURL().slice(-64);
    } catch (e) { return null; }
  })();

  // ─── Fuentes detectadas ───
  data.fonts = (function () {
    var baseFonts = ["monospace", "sans-serif", "serif"];
    var testFonts = [
      "Arial", "Verdana", "Times New Roman", "Courier New", "Georgia",
      "Comic Sans MS", "Trebuchet MS", "Impact", "Webdings", "Calibri",
      "Cambria", "Consolas", "Segoe UI", "Roboto", "Helvetica", "Tahoma"
    ];
    var detected = [];
    var testString = "mmmmmmmmmmlli";
    var span = document.createElement("span");
    span.style.position = "absolute";
    span.style.left = "-9999px";
    span.style.fontSize = "72px";
    span.innerHTML = testString;
    var defaults = {};
    baseFonts.forEach(function (base) {
      span.style.fontFamily = base;
      document.body.appendChild(span);
      defaults[base] = [span.offsetWidth, span.offsetHeight];
      document.body.removeChild(span);
    });
    testFonts.forEach(function (font) {
      var hit = false;
      baseFonts.forEach(function (base) {
        span.style.fontFamily = "'" + font + "', " + base;
        document.body.appendChild(span);
        var w = span.offsetWidth, h = span.offsetHeight;
        document.body.removeChild(span);
        if (w !== defaults[base][0] || h !== defaults[base][1]) hit = true;
      });
      if (hit) detected.push(font);
    });
    return detected;
  })();

  // ─── Input ───
  data.input = {
    touch: "ontouchstart" in window,
    pointer: "onpointerdown" in window,
    max_touch_points: navigator.maxTouchPoints || 0
  };

  // ─── Plugins ───
  data.plugins = (function () {
    var list = [];
    for (var i = 0; i < navigator.plugins.length; i++) {
      list.push(navigator.plugins[i].name);
    }
    return list;
  })();

  // ─── Timestamps ───
  data.timestamp = Date.now();
  data.referer = document.referrer || null;
  data.url = window.location.href;

  // ─── Batería ───
  data.battery = null;
  function tryBattery(cb) {
    if (!navigator.getBattery) { cb(); return; }
    navigator.getBattery().then(function (b) {
      data.battery = {
        level: b.level,
        charging: b.charging,
        charging_time: b.chargingTime,
        discharging_time: b.dischargingTime
      };
      cb();
    }).catch(function () { cb(); });
  }

  // ─── WebRTC (IP local filtrada) ───
  data.webrtc = [];
  function tryWebRTC(cb) {
    try {
      var pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.onicecandidate = function (e) {
        if (!e.candidate) return;
        var m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){7})/.exec(e.candidate.candidate);
        if (m && data.webrtc.indexOf(m[1]) === -1) {
          data.webrtc.push(m[1]);
        }
      };
      pc.createOffer().then(function (o) { pc.setLocalDescription(o); });
      setTimeout(function () { cb(); }, 1200);
    } catch (e) { cb(); }
  }

  // ═══════════════════════════════════════════════════════
  // ENVÍO — SIN PREFLIGHT CORS
  // ═══════════════════════════════════════════════════════
  function send() {
    data.time_on_page = (Date.now() - data.timestamp) / 1000;
    var payload = JSON.stringify(data);

    // Opción 1: sendBeacon con text/plain → sin preflight
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
        navigator.sendBeacon(WEBHOOK_URL, blob);
        console.log("[tracker] enviado via sendBeacon");
        return;
      } catch (e) {
        console.warn("[tracker] sendBeacon falló, usando fetch", e);
      }
    }

    // Opción 2: fetch sin headers custom → sin preflight
    try {
      fetch(WEBHOOK_URL, {
        method: "POST",
        body: payload
      }).then(function () {
        console.log("[tracker] enviado via fetch");
      }).catch(function (e) {
        console.warn("[tracker] fetch falló", e);
      });
    } catch (e) {
      console.warn("[tracker] error total", e);
    }
  }

  tryBattery(function () {
    tryWebRTC(function () {
      send();
    });
  });

})();
