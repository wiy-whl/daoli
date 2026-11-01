/* ============================================================
   兼职蜂 · 学生端原型逻辑
   数据一律走 API.*，渲染使用字符串模板 + innerHTML
   ============================================================ */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var DAY_SHORT = { sat: '周六', sun: '周日' };
  var HOUR_OPTS = [];
  for (var h = 8; h <= 22; h++) HOUR_OPTS.push((h < 10 ? '0' : '') + h + ':00');

  var state = {
    tab: 'jobs',
    kw: '', cat: '全部', day: 'all', sort: 'smart',
    student: null,
    loaded: {}, dirty: {},
    sheetJob: null, sheetSlots: [], needHallRefresh: false
  };

  /* ---------- 小工具 ---------- */
  function toMin(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function slotHours(s) { return (toMin(s.e) - toMin(s.s)) / 60; }
  function fmtHours(h) { return String(Math.round(h * 10) / 10); }

  function slotSummary(job) {
    var days = [];
    job.slots.forEach(function (s) { if (days.indexOf(s.d) < 0) days.push(s.d); });
    var dtxt = days.map(function (d) { return DAY_SHORT[d]; }).join('·');
    if (job.slots.length === 1) {
      var s = job.slots[0];
      return dtxt + ' ' + s.s + '-' + s.e;
    }
    return dtxt + ' · ' + job.slots.length + '个时段可选';
  }

  function freeTimeText(ft) {
    function one(d) {
      return (ft[d] && ft[d].on) ? DAY_SHORT[d] + ' ' + ft[d].start + '-' + ft[d].end : DAY_SHORT[d] + ' 休息';
    }
    return one('sat') + ' · ' + one('sun');
  }
  function freeTimeHtml(ft) {
    return ['sat', 'sun'].map(function (d) {
      var f = ft[d], on = f && f.on;
      return '<div class="ft-line"><span class="badge ' + (on ? 'b-brand' : 'b-mute') + '">' + DAY_SHORT[d] + '</span>' +
        '<span class="num">' + (on ? f.start + ' - ' + f.end : '休息') + '</span></div>';
    }).join('');
  }

  function skCard() {
    return '<div class="card" style="padding:16px">' +
      '<div class="skeleton" style="height:16px;width:58%"></div>' +
      '<div class="skeleton" style="height:12px;width:38%;margin-top:10px"></div>' +
      '<div class="skeleton" style="height:12px;width:86%;margin-top:14px"></div>' +
      '<div class="skeleton" style="height:12px;width:70%;margin-top:8px"></div></div>';
  }
  function skList(n) { var s = ''; for (var i = 0; i < n; i++) s += skCard(); return s; }

  function emptyHtml(icon, title, sub) {
    return '<div class="card empty"><div class="empty-ico">' + UI.icon(icon, 'icon-xl') + '</div>' +
      '<h4>' + title + '</h4><p>' + sub + '</p></div>';
  }

  /* ---------- Tab1 职位大厅 ---------- */
  function jobCard(j) {
    var skills = j.skills.slice(0, 3).map(function (s) { return '<span class="tag">' + s + '</span>'; }).join('');
    return '<article class="card job-card" data-id="' + j.id + '">' +
      '<div class="jc-top"><div class="jc-main">' +
        '<div class="jc-title">' + j.title + '<span class="badge b-ok">实名</span></div>' +
        '<div class="jc-mer">' + j.merchant + '</div>' +
        '<div class="jc-rate">' + UI.stars(j.rating) + '<b class="num">' + j.rating + '</b></div>' +
      '</div><div class="jc-pay num">' + UI.money(j.pay) + '<small>/' + j.unit + '</small></div></div>' +
      '<div class="jc-meta">' +
        '<span class="kv">' + UI.icon('map-pin') + j.distance + 'km</span>' +
        '<span class="kv">' + UI.icon('clock') + slotSummary(j) + '</span>' +
        '<span class="tag">' + j.settle + '</span>' +
      '</div>' +
      '<div class="jc-skills">' + skills + '</div>' +
      '<div class="jc-foot"><span class="jc-applied">已报名 <b class="num">' + j.applied + '/' + j.headcount + '</b></span>' +
      '<span class="badge b-brand">匹配 ' + j.match + '</span></div></article>';
  }

  function loadHall() {
    var box = $('#jobList');
    box.innerHTML = skList(3);
    API.listJobs({ kw: state.kw, cat: state.cat, day: state.day, sort: state.sort }).then(function (list) {
      box.innerHTML = list.length
        ? list.map(jobCard).join('')
        : emptyHtml('search', '没有找到符合条件的职位', '试试放宽筛选条件');
    });
  }

  /* ---------- 职位详情底部弹层 ---------- */
  function openJob(id) {
    $('#sheetBody').innerHTML =
      '<div class="skeleton" style="height:18px;width:46%"></div>' +
      '<div class="skeleton" style="height:13px;width:78%;margin-top:14px"></div>' +
      '<div class="skeleton" style="height:13px;width:62%;margin-top:10px"></div>' +
      '<div class="skeleton" style="height:110px;width:100%;margin-top:18px"></div>';
    $('#sheetFoot').innerHTML = '';
    UI.openOverlay($('#sheetMask'));
    UI.openOverlay($('#jobSheet'));
    Promise.all([API.getJob(id), API.getMyApplications()]).then(function (rs) {
      var job = rs[0], apps = rs[1];
      state.sheetJob = job;
      state.sheetSlots = [];
      var applied = apps.some(function (a) { return a.jobId === job.id && a.status !== 'rejected'; });
      renderSheet(job, applied);
    });
  }

  function renderSheet(job, applied) {
    var days = [];
    job.slots.forEach(function (s) { if (days.indexOf(s.d) < 0) days.push(s.d); });
    var slotHtml = days.map(function (d) {
      var chips = '';
      job.slots.forEach(function (s, i) {
        if (s.d === d) {
          chips += '<button class="chip slot-chip" data-idx="' + i + '"' + (applied ? ' disabled' : '') + '>' +
            s.s + ' - ' + s.e + '</button>';
        }
      });
      return '<div class="slot-day">' + UI.DAY[d] + '</div><div class="chips">' + chips + '</div>';
    }).join('');

    $('#sheetBody').innerHTML =
      '<div class="sh-mer"><div class="avatar">' + job.merchant.charAt(0) + '</div><div>' +
        '<div class="sh-mer-name">' + job.merchant + ' <span class="badge b-ok">实名</span></div>' +
        '<div class="jc-rate">' + UI.stars(job.rating) + '<b class="num">' + job.rating + '</b></div>' +
      '</div></div>' +
      '<div class="kv sh-addr">' + UI.icon('map-pin') + job.addr + ' · ' + job.distance + 'km</div>' +
      '<div class="sh-pay"><b class="num">' + UI.money(job.pay) + '/' + job.unit + '</b>' +
        '<span class="tag">' + job.settle + '</span>' +
        '<span class="kv">' + UI.icon('users') + '招 ' + job.headcount + ' 人 · 已报 ' + job.applied + '</span></div>' +
      '<div class="sh-sec"><h4>' + UI.icon('file-text') + '职位描述</h4><p>' + job.desc + '</p></div>' +
      '<div class="sh-sec"><h4>' + UI.icon('shield-check') + '岗位要求</h4><p>' + job.req + '</p></div>' +
      '<div class="sh-sec"><h4>' + UI.icon('clock') + '选择到岗时段（可多选）</h4>' + slotHtml + '</div>';

    $('#sheetFoot').innerHTML =
      '<div class="sh-count">已选 <b class="num" id="slotCount">0</b> 个时段</div>' +
      '<button class="btn btn-primary" id="applyBtn" style="flex:1"' + (applied ? ' disabled' : '') + '>' +
      (applied ? '已报名' : '立即报名') + '</button>';
  }

  function closeSheet() {
    UI.closeOverlay($('#sheetMask'));
    UI.closeOverlay($('#jobSheet'));
    if (state.needHallRefresh) {
      state.needHallRefresh = false;
      loadHall();
    }
  }

  function doApply(btn) {
    if (!state.sheetSlots.length) { UI.toast('请先选择可到岗时段', 'warn'); return; }
    var job = state.sheetJob;
    var slots = state.sheetSlots.map(function (i) {
      var s = job.slots[i];
      return { d: s.d, s: s.s, e: s.e };
    });
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>提交中';
    API.applyJob(job.id, slots).then(function () {
      btn.innerHTML = '已报名 · 待商家确认';
      UI.toast('报名成功，等待商家确认');
      state.needHallRefresh = true;
      state.dirty.schedule = true;
      state.dirty.me = true;
    });
  }

  /* ---------- Tab2 智能匹配 ---------- */
  function overlapInfo(job, ft) {
    var total = 0, full = true;
    job.slots.forEach(function (s) {
      var f = ft[s.d], oh = 0;
      if (f && f.on) {
        oh = Math.max(0, Math.min(toMin(s.e), toMin(f.end)) - Math.max(toMin(s.s), toMin(f.start))) / 60;
      }
      total += oh;
      if (oh < slotHours(s)) full = false;
    });
    if (full && total > 0) return '时段完全重叠';
    if (total > 0) return '时段重叠 ' + fmtHours(total) + ' 小时';
    return '时段不重叠';
  }

  function matchCard(j, stu) {
    var hit = 0;
    j.skills.forEach(function (s) { if (stu.skills.indexOf(s) > -1) hit++; });
    return '<article class="card match-card" data-id="' + j.id + '">' +
      '<div class="ring" style="--p:' + j.match + '"><b class="num">' + j.match + '</b></div>' +
      '<div class="mc-main">' +
        '<div class="jc-title">' + j.title + '</div>' +
        '<div class="mc-sub">' + j.merchant + ' · <b class="num">' + UI.money(j.pay) + '/' + j.unit + '</b></div>' +
        '<div class="mc-reasons">' +
          '<span class="kv">' + UI.icon('clock') + overlapInfo(j, stu.freeTime) + '</span>' +
          '<span class="kv">' + UI.icon('map-pin') + '距离 ' + j.distance + 'km</span>' +
          '<span class="kv">' + UI.icon('zap') + '技能命中 ' + hit + '/' + j.skills.length + '</span>' +
          '<span class="kv">' + UI.icon('shield') + '信用 ' + stu.credit + '</span>' +
        '</div></div>' +
      UI.icon('chevron-right', 'mc-arr') + '</article>';
  }

  function loadMatch() {
    var box = $('#matchList');
    box.innerHTML = skList(3);
    Promise.all([API.listJobs({ sort: 'smart' }), API.getStudent()]).then(function (rs) {
      var list = rs[0].slice(0, 6), stu = rs[1];
      state.student = stu;
      $('#ftSummary').textContent = freeTimeText(stu.freeTime);
      box.innerHTML = list.length
        ? list.map(function (j) { return matchCard(j, stu); }).join('')
        : emptyHtml('zap', '暂无匹配职位', '完善空闲时段后再来看看');
    });
  }

  /* ---------- Tab3 日程 ---------- */
  function dayCard(d, shifts) {
    var items = [];
    shifts.forEach(function (a) {
      a.slots.forEach(function (s) { if (s.d === d) items.push({ a: a, s: s }); });
    });
    items.sort(function (x, y) { return toMin(x.s.s) - toMin(y.s.s); });
    var blocks = items.map(function (it) {
      var a = it.a, s = it.s;
      return '<div class="shift">' +
        '<div class="shift-top"><span class="shift-time num">' + s.s + ' - ' + s.e + '</span><span class="shift-badges">' +
        UI.statusBadge(UI.APP_STATUS, a.status) + (a.status === 'done' ? '<span class="badge b-ok">已结算</span>' : '') +
        '</span></div>' +
        '<div class="shift-job">' + a.job.title + '</div>' +
        '<div class="shift-meta kv">' + UI.icon('store') + a.job.merchant + ' · ' + UI.money(a.job.pay) + '/' + a.job.unit + '</div>' +
      '</div>';
    }).join('');
    return '<div class="card day-card">' +
      '<div class="card-title">' + UI.icon('calendar') + UI.DAY[d] + '</div>' +
      (blocks || '<div class="day-empty">' + UI.icon('coffee') + '这一天还没有排班</div>') +
    '</div>';
  }

  function incomeCard(shifts) {
    var lines = '', total = 0;
    shifts.forEach(function (a) {
      a.slots.forEach(function (s) {
        var h = slotHours(s), amt = h * a.job.pay;
        total += amt;
        lines += '<div class="income-line"><span>' + DAY_SHORT[s.d] + ' · ' + a.job.title + '</span>' +
          '<span class="num">' + fmtHours(h) + 'h × ' + UI.money(a.job.pay) + ' = ' + UI.money(amt) + '</span></div>';
      });
    });
    if (!lines) return '';
    return '<div class="card card-pad">' +
      '<div class="card-title">' + UI.icon('wallet') + '本周预计收入</div>' +
      '<div class="income-lines">' + lines + '</div>' +
      '<div class="income-total"><span>合计</span><b class="num">' + UI.money(total) + '</b></div></div>';
  }

  function loadSchedule() {
    var box = $('#scheduleBody');
    box.innerHTML = skList(2);
    API.getMyApplications().then(function (apps) {
      var shifts = apps.filter(function (a) { return a.status === 'scheduled' || a.status === 'done'; });
      box.innerHTML = dayCard('sat', shifts) + dayCard('sun', shifts) + incomeCard(shifts);
    });
  }

  /* ---------- Tab4 我的 ---------- */
  function loadMe() {
    var box = $('#page-me');
    box.innerHTML = '<div class="list">' + skList(3) + '</div>';
    Promise.all([API.getStudent(), API.getMyApplications()]).then(function (rs) {
      var stu = rs[0], apps = rs[1];
      state.student = stu;

      var profile =
        '<div class="card me-profile">' +
          '<div class="avatar lg">' + stu.avatarText + '</div>' +
          '<div class="me-id"><b>' + stu.name + '</b><p>' + stu.school + ' · ' + stu.major + ' · ' + stu.grade + '</p></div>' +
          '<div class="me-hex">' + UI.hexBadge(stu.credit, 72, '信用分') + '<small>' + stu.creditLevel + '</small></div>' +
        '</div>' +
        '<div class="card stat3">' +
          '<div><b class="num">' + stu.stats.doneJobs + '</b><span>完成单数</span></div>' +
          '<div><b class="num">' + stu.stats.punctual + '</b><span>守时率</span></div>' +
          '<div><b class="num">' + stu.stats.goodRate + '</b><span>好评率</span></div>' +
        '</div>';

      var skills =
        '<div class="card card-pad">' +
          '<div class="card-title">' + UI.icon('zap') + '我的技能' +
            '<button class="card-edit" data-act="skill-edit">' + UI.icon('edit', 'icon-sm') + '编辑</button></div>' +
          '<div class="jc-skills" style="margin-top:12px">' +
            stu.skills.map(function (s) { return '<span class="tag">' + s + '</span>'; }).join('') +
          '</div></div>';

      var ft =
        '<div class="card card-pad">' +
          '<div class="card-title">' + UI.icon('clock') + '周末空闲时段' +
            '<button class="card-edit" data-act="ft-edit">' + UI.icon('edit', 'icon-sm') + '编辑</button></div>' +
          '<div id="ftView" style="margin-top:10px">' + freeTimeHtml(stu.freeTime) + '</div></div>';

      var appRows = apps.map(function (a) {
        var slotTxt = a.slots.map(function (s) { return UI.DAY[s.d] + ' ' + s.s + '-' + s.e; }).join('、');
        return '<div class="list-row app-row' + (a.status === 'rejected' ? ' rejected' : '') + '">' +
          '<div class="app-main"><b>' + a.job.title + '</b><p>' + a.job.merchant + ' · ' + slotTxt + '</p></div>' +
          '<div class="app-side">' + UI.statusBadge(UI.APP_STATUS, a.status) +
            '<span class="app-date num">' + a.appliedAt + ' 报名</span></div></div>';
      }).join('');
      var appsCard =
        '<div class="card card-pad">' +
          '<div class="card-title">' + UI.icon('file-text') + '我的报名</div>' +
          '<div style="margin-top:6px">' +
            (appRows || '<div class="day-empty">' + UI.icon('coffee') + '还没有报名记录</div>') +
          '</div></div>';

      var recMap = { settled: ['已到账', 'b-ok'], settling: ['结算中', 'b-warn'] };
      var recs = stu.wallet.records.map(function (r) {
        var st = recMap[r.status] || ['已到账', 'b-ok'];
        return '<div class="list-row"><div class="app-main"><b>' + r.title + '</b><p class="num">' + r.date + '</p></div>' +
          '<div class="app-side"><b class="num" style="color:var(--ok)">+' + UI.money(r.amount) + '</b>' +
          '<span class="badge ' + st[1] + '">' + st[0] + '</span></div></div>';
      }).join('');
      var wallet =
        '<div class="card card-pad">' +
          '<div class="card-title">' + UI.icon('wallet') + '我的钱包</div>' +
          '<div class="wallet-top"><div><span class="wallet-label">余额（元）</span>' +
            '<b class="wallet-num num">' + stu.wallet.balance + '</b></div>' +
            '<div class="wallet-frozen"><span>冻结中</span><b class="num">' + UI.money(stu.wallet.frozen) + '</b></div></div>' +
          '<hr class="divider">' + recs + '</div>';

      box.innerHTML = '<div class="list">' + profile + skills + ft + appsCard + wallet + '</div>';
    });
  }

  /* ---------- 空闲时段编辑弹窗 ---------- */
  function fillFreeTime(stu) {
    state.student = stu;
    $$('.ft-row').forEach(function (row) {
      var d = row.getAttribute('data-day');
      var f = stu.freeTime[d] || { on: false, start: '09:00', end: '18:00' };
      $('[data-role="sw"]', row).classList.toggle('on', !!f.on);
      var ss = $('[data-role="start"]', row), ee = $('[data-role="end"]', row);
      ss.value = f.start;
      ee.value = f.end;
      ss.disabled = ee.disabled = !f.on;
    });
    UI.openOverlay($('#ftMask'));
  }
  function openFreeTime() {
    if (state.student) fillFreeTime(state.student);
    else API.getStudent().then(fillFreeTime);
  }
  function saveFreeTime(btn) {
    var data = {}, valid = true;
    $$('.ft-row').forEach(function (row) {
      var d = row.getAttribute('data-day');
      var on = $('[data-role="sw"]', row).classList.contains('on');
      var s = $('[data-role="start"]', row).value, e = $('[data-role="end"]', row).value;
      if (on && toMin(s) >= toMin(e)) valid = false;
      data[d] = { on: on, start: s, end: e };
    });
    if (!valid) { UI.toast('结束时间需晚于开始时间', 'warn'); return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>保存中';
    API.saveFreeTime(data).then(function () {
      btn.disabled = false;
      btn.textContent = '保存';
      UI.closeOverlay($('#ftMask'));
      UI.toast('空闲时段已更新');
      if (state.student) state.student.freeTime = data;
      var a = $('#ftSummary'); if (a) a.textContent = freeTimeText(data);
      var b = $('#ftView'); if (b) b.innerHTML = freeTimeHtml(data);
      state.dirty.match = true;
      if (state.tab === 'match') { state.dirty.match = false; loadMatch(); }
    });
  }

  /* ---------- Tab 切换 ---------- */
  function loadTab(t) {
    state.loaded[t] = true;
    state.dirty[t] = false;
    if (t === 'match') loadMatch();
    else if (t === 'schedule') loadSchedule();
    else if (t === 'me') loadMe();
  }
  function switchTab(btn) {
    var t = btn.getAttribute('data-tab');
    if (t === state.tab) return;
    state.tab = t;
    $$('.tab').forEach(function (b) { b.classList.toggle('on', b === btn); });
    $$('.page').forEach(function (p) {
      var show = p.id === 'page-' + t;
      p.hidden = !show;
      if (show) { p.classList.remove('fade-in'); void p.offsetWidth; p.classList.add('fade-in'); }
    });
    if (!state.loaded[t] || state.dirty[t]) loadTab(t);
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    // 搜索（防抖 250ms）
    $('#kw').addEventListener('input', UI.debounce(function () {
      state.kw = $('#kw').value;
      loadHall();
    }, 250));

    // 大厅筛选 chips
    $('#jobFilters').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var g = chip.getAttribute('data-g'), v = chip.getAttribute('data-v');
      if (g === 'cat') state.cat = v;
      else if (g === 'day') state.day = v;
      else if (g === 'sort') state.sort = v;
      $$('.chip[data-g="' + g + '"]', this).forEach(function (c) { c.classList.toggle('on', c === chip); });
      loadHall();
    });

    // Tab 栏
    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn); });
    });

    // 页面区：卡片点击 + 动作按钮（编辑空闲时段 / 技能编辑占位）
    $('.pages').addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (act) {
        var a = act.getAttribute('data-act');
        if (a === 'ft-edit') openFreeTime();
        else if (a === 'skill-edit') UI.toast('演示版暂未开放', 'warn');
        return;
      }
      var card = e.target.closest('[data-id]');
      if (card) openJob(card.getAttribute('data-id'));
    });

    // 详情弹层：选时段 / 报名
    $('#jobSheet').addEventListener('click', function (e) {
      var chip = e.target.closest('.slot-chip');
      if (chip && !chip.disabled) {
        var idx = +chip.getAttribute('data-idx');
        var i = state.sheetSlots.indexOf(idx);
        if (i > -1) { state.sheetSlots.splice(i, 1); chip.classList.remove('on'); }
        else { state.sheetSlots.push(idx); chip.classList.add('on'); }
        var c = $('#slotCount');
        if (c) c.textContent = state.sheetSlots.length;
        return;
      }
      var btn = e.target.closest('#applyBtn');
      if (btn && !btn.disabled) doApply(btn);
    });
    $('#sheetMask').addEventListener('click', closeSheet);

    // 空闲时段弹窗
    $('#ftMask').addEventListener('click', function (e) {
      if (e.target === this || e.target.closest('#ftClose') || e.target.closest('#ftCancel')) {
        UI.closeOverlay(this);
        return;
      }
      var sw = e.target.closest('.sw');
      if (sw) {
        sw.classList.toggle('on');
        var on = sw.classList.contains('on');
        var row = sw.closest('.ft-row');
        $('[data-role="start"]', row).disabled = !on;
        $('[data-role="end"]', row).disabled = !on;
        return;
      }
      var save = e.target.closest('#ftSave');
      if (save && !save.disabled) saveFreeTime(save);
    });

    // 铃铛
    $('#bellBtn').addEventListener('click', function () { UI.toast('暂无新通知'); });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    // 分类 chips（「全部」+ MOCK.CATEGORIES）
    $('#catChips').innerHTML = '<button class="chip on" data-g="cat" data-v="全部">全部</button>' +
      MOCK.CATEGORIES.map(function (c) {
        return '<button class="chip" data-g="cat" data-v="' + c + '">' + c + '</button>';
      }).join('');

    // 时段编辑弹窗的整点选项
    $$('.ft-row .select').forEach(function (sel) {
      sel.innerHTML = HOUR_OPTS.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');
    });

    bind();
    state.loaded.jobs = true;
    loadHall();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
