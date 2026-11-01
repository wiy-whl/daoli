/* ============================================================
   兼职蜂 · 共享 UI 工具（图标 sprite / toast / 弹层 / 格式化）
   ============================================================ */
(function () {
  /* lucide 风格线性图标（24x24, stroke=currentColor, fill=none） */
  var ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    'star-fill': '<path fill="currentColor" stroke="none" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
    zap: '<path fill="currentColor" stroke="none" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    sparkles: '<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8M16 13H8M16 17H8"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    wifi: '<path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M12 20h.01"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    'thumb-up': '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<path fill="currentColor" stroke="none" d="M6 4.5v15a1 1 0 0 0 1.54.84l12-7.5a1 1 0 0 0 0-1.68l-12-7.5A1 1 0 0 0 6 4.5z"/>',
    phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20v3a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-2 2 2 2 0 0 1-2-2Z"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    navigation: '<path d="m3 11 19-9-9 19-2-8-8-2z"/>',
    'trending-up': '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    graduation: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>'
  };

  var SPRITE_ID = 'jianzhi-bee-sprite';
  function injectSprite() {
    if (document.getElementById(SPRITE_ID)) return;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" id="' + SPRITE_ID + '" style="display:none">';
    for (var k in ICONS) {
      s += '<symbol id="i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</symbol>';
    }
    s += '</svg>';
    document.body.insertAdjacentHTML('afterbegin', s);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSprite);
  } else {
    injectSprite();
  }

  var UI = {
    /** 生成图标 svg 字符串 */
    icon: function (name, cls) {
      return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
    },

    /** 金额格式化：¥120 / ¥86.5 */
    money: function (n) {
      return '¥' + (Number.isInteger(+n) ? n : (+n).toFixed(1));
    },

    /** 星级：返回 5 颗星（含半星简化为实心） */
    stars: function (v) {
      var full = Math.round(v), out = '';
      for (var i = 1; i <= 5; i++) {
        out += '<svg class="icon icon-sm" style="color:' + (i <= full ? '#F2A518' : '#E4D8C4') + '" aria-hidden="true"><use href="#i-star-fill"/></svg>';
      }
      return out;
    },

    /** 信用/匹配分六边形徽章 */
    hexBadge: function (score, size, sub) {
      size = size || 72;
      return '<svg class="hexbadge" width="' + size + '" height="' + (size * 80 / 72) + '" viewBox="0 0 72 80" aria-hidden="true">' +
        '<defs><linearGradient id="hexg' + score + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#FFB25C"/><stop offset="1" stop-color="#F27B13"/></linearGradient></defs>' +
        '<path d="M36 4 66 22 66 58 36 76 6 58 6 22Z" fill="url(#hexg' + score + ')"/>' +
        '<path d="M36 12 59 26 59 54 36 68 13 54 13 26Z" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1"/>' +
        '<text x="36" y="44" text-anchor="middle" font-size="22" fill="#fff">' + score + '</text>' +
        (sub ? '<text x="36" y="58" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.85)">' + sub + '</text>' : '') +
        '</svg>';
    },

    /** toast：UI.toast('文案') / UI.toast('文案','warn') */
    toast: function (msg, type) {
      type = type || 'ok';
      var root = document.getElementById('toast-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'toast-root';
        document.body.appendChild(root);
      }
      var iconName = type === 'ok' ? 'check-circle' : (type === 'err' ? 'x-circle' : 'alert');
      var el = document.createElement('div');
      el.className = 'toast t-' + type;
      el.innerHTML = UI.icon(iconName) + '<span>' + msg + '</span>';
      root.appendChild(el);
      setTimeout(function () {
        el.classList.add('out');
        setTimeout(function () { el.remove(); }, 260);
      }, 2200);
    },

    /** 通用确认弹窗：UI.confirm({title, sub, okText, danger, onOk}) */
    confirm: function (opt) {
      var old = document.getElementById('ui-confirm-mask');
      if (old) old.remove();
      var mask = document.createElement('div');
      mask.id = 'ui-confirm-mask';
      mask.className = 'mask';
      mask.innerHTML =
        '<div class="modal-card" style="max-width:360px">' +
        '  <div class="modal-body" style="padding:24px 22px 18px;text-align:center">' +
        '    <h3 style="font-size:16px;margin-bottom:6px">' + opt.title + '</h3>' +
        (opt.sub ? '<p style="font-size:13px;color:var(--ink-3)">' + opt.sub + '</p>' : '') +
        '  </div>' +
        '  <div class="modal-foot" style="justify-content:center;padding-top:0;border-top:none">' +
        '    <button class="btn btn-outline" data-act="no" style="flex:1">取消</button>' +
        '    <button class="btn ' + (opt.danger ? 'btn-danger-soft' : 'btn-primary') + '" data-act="yes" style="flex:1">' + (opt.okText || '确认') + '</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(mask);
      requestAnimationFrame(function () { mask.classList.add('show'); });
      function close() {
        mask.classList.remove('show');
        setTimeout(function () { mask.remove(); }, 220);
      }
      mask.addEventListener('click', function (e) {
        if (e.target === mask || e.target.closest('[data-act="no"]')) close();
        if (e.target.closest('[data-act="yes"]')) { close(); opt.onOk && opt.onOk(); }
      });
    },

    /** 打开/关闭遮罩类弹层（modal-mask 或 sheet-mask） */
    openOverlay: function (el) { el && el.classList.add('show'); },
    closeOverlay: function (el) { el && el.classList.remove('show'); },

    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
      };
    },

    /** 状态徽章映射 */
    JOB_STATUS: {
      recruiting: ['招募中', 'b-ok'],
      paused: ['已暂停', 'b-mute'],
      full: ['已满员', 'b-warn'],
      ended: ['已结束', 'b-mute']
    },
    APP_STATUS: {
      pending: ['待商家确认', 'b-warn'],
      scheduled: ['已排班', 'b-ok'],
      done: ['已完成', 'b-brand'],
      rejected: ['未通过', 'b-danger']
    },
    CAND_STATUS: {
      pending: ['待确认', 'b-warn'],
      passed: ['已排班', 'b-ok'],
      rejected: ['已婉拒', 'b-mute']
    },
    DAY: { sat: '周六 11.1', sun: '周日 11.2' },

    statusBadge: function (map, key) {
      var it = map[key];
      return it ? '<span class="badge ' + it[1] + '">' + it[0] + '</span>' : '';
    }
  };

  window.UI = UI;
})();
