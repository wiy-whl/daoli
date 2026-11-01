/* ============================================================
   兼职蜂 · 商家端逻辑
   数据一律经由 API.* 获取，渲染使用字符串模板 + innerHTML
   ============================================================ */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var TITLES = { dashboard: '工作台', jobs: '职位管理', candidates: '候选人' };

  var state = {
    page: 'dashboard',
    jobFilter: 'all',
    jobs: [],
    overview: null,
    candMap: {},      // jobId -> 候选人列表
    candJobId: null
  };

  /* ---------- 小工具 ---------- */
  function skel(h, w, mb) {
    return '<div class="skeleton" style="height:' + h + 'px;width:' + (w || '100%') + (mb ? ';margin-bottom:' + mb + 'px' : '') + '"></div>';
  }
  function hoursOf(time) {
    var m = String(time || '').split('-');
    if (m.length < 2) return 0;
    function t(s) { var p = s.trim().split(':'); return (+p[0]) + (+p[1] || 0) / 60; }
    return Math.max(0, t(m[1]) - t(m[0]));
  }
  function daysText(days) {
    return (days || []).map(function (d) { return UI.DAY[d] || d; }).join(' / ');
  }
  function pct(a, b) { return b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0; }
  function allCandidates() {
    var out = [];
    Object.keys(state.candMap).forEach(function (k) { out = out.concat(state.candMap[k] || []); });
    return out;
  }

  /* ---------- 页面切换 ---------- */
  function switchPage(page) {
    state.page = page;
    $$('.side-nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.page === page); });
    $$('.page').forEach(function (s) { s.hidden = s.id !== 'page-' + page; });
    var sec = $('#page-' + page);
    sec.classList.remove('fade-in');
    void sec.offsetWidth;
    sec.classList.add('fade-in');
    $('#page-title').textContent = TITLES[page];
    if (page === 'dashboard') renderDashboard();
    if (page === 'jobs') renderJobs();
    if (page === 'candidates') { renderCandChips(); renderCandidates(); }
  }

  /* ---------- 侧边栏商家档案 ---------- */
  function renderMerchantCard() {
    var p = state.overview && state.overview.profile;
    if (!p) return;
    $('#merchant-card').innerHTML =
      '<div class="avatar">' + esc(p.avatarText) + '</div>' +
      '<div class="mcard-t">' +
        '<b>' + esc(p.name) + '</b>' +
        (p.verified ? '<span class="badge b-ok">' + UI.icon('shield-check') + '已认证商家</span>' : '') +
      '</div>';
  }

  /* ---------- 工作台 ---------- */
  function statCard(icon, val, sub) {
    return '<div class="stat">' +
      '<div class="stat-ico">' + UI.icon(icon, 'icon-lg') + '</div>' +
      '<div><b class="num">' + val + '</b><span>' + sub + '</span></div>' +
    '</div>';
  }

  function renderStats() {
    var jobs = state.jobs;
    var recruiting = jobs.filter(function (j) { return j.status === 'recruiting'; }).length;
    var cands = allCandidates();
    var pending = cands.filter(function (c) { return c.status === 'pending'; }).length;
    var passed = cands.filter(function (c) { return c.status === 'passed'; }).length;
    var cost = Math.round(jobs.reduce(function (sum, j) {
      return sum + j.headcount * (j.days ? j.days.length : 1) * hoursOf(j.time) * j.pay;
    }, 0));
    $('#stat-grid').innerHTML =
      statCard('briefcase', recruiting, '本周末在招职位') +
      statCard('user-check', pending, '待确认候选人') +
      statCard('users', passed, '已排班人次') +
      statCard('wallet', UI.money(cost), '本周预计工时成本 · 预估');
  }

  function renderTodos() {
    var todos = (state.overview && state.overview.todos) || [];
    $('#todo-list').innerHTML = todos.map(function (t, i) {
      return '<div class="list-row' + (i === 0 ? ' todo-hot' : '') + '"' + (i === 0 ? ' data-act="go-cand"' : '') + '>' +
        '<span class="todo-ico">' + UI.icon(t.icon) + '</span>' +
        '<span class="todo-text">' + esc(t.text) + '</span>' +
        '<span class="badge ' + t.badge[1] + '">' + esc(t.badge[0]) + '</span>' +
        (i === 0 ? UI.icon('chevron-right', 'icon-sm todo-arrow') : '') +
      '</div>';
    }).join('');
  }

  function renderGaps() {
    var list = state.jobs.filter(function (j) { return j.gap; });
    var box = $('#gap-list');
    if (!list.length) {
      box.innerHTML = '<div class="empty" style="padding:24px 12px">' +
        '<div class="empty-ico">' + UI.icon('check-circle', 'icon-xl') + '</div>' +
        '<h4>班次已排满</h4><p>本周末暂无用工缺口</p></div>';
      return;
    }
    box.innerHTML = list.map(function (j) {
      return '<div class="gap-row">' +
        '<div class="gap-top"><b>' + esc(j.title) + '</b>' +
          '<span class="gap-date">' + daysText(j.days) + '</span>' +
          '<span class="badge b-warn">' + esc(j.gap) + '</span></div>' +
        '<div class="gap-bar"><div class="bar"><i style="width:' + pct(j.applied, j.headcount) + '%"></i></div>' +
          '<span class="num">已报名 ' + j.applied + '/' + j.headcount + '</span></div>' +
      '</div>';
    }).join('');
  }

  function renderReviews() {
    var list = (state.overview && state.overview.reviews) || [];
    $('#review-list').innerHTML = list.map(function (r) {
      return '<div class="review">' +
        '<div>' + UI.stars(r.stars) + '</div>' +
        '<p class="review-text">' + esc(r.text) + '</p>' +
        '<div class="review-who">—— ' + esc(r.who) + '</div>' +
      '</div>';
    }).join('');
  }

  function renderDashboard() {
    if (!state.overview) return;
    renderStats();
    renderTodos();
    renderGaps();
    renderReviews();
  }

  /* ---------- 职位管理 ---------- */
  function jobActions(j) {
    var view = '<button class="btn btn-ghost btn-sm" data-act="view" data-id="' + j.id + '">查看候选人</button>';
    if (j.status === 'recruiting') {
      return '<button class="btn btn-outline btn-sm" data-act="pause" data-id="' + j.id + '">' + UI.icon('pause', 'icon-sm') + '暂停招募</button>' + view;
    }
    if (j.status === 'paused') {
      return '<button class="btn btn-outline btn-sm" data-act="resume" data-id="' + j.id + '">' + UI.icon('play', 'icon-sm') + '恢复招募</button>' + view;
    }
    return view;
  }

  function renderJobs() {
    var f = state.jobFilter;
    var list = state.jobs.filter(function (j) { return f === 'all' ? true : j.status === f; });
    var box = $('#job-list');
    if (!list.length) {
      box.innerHTML = '<div class="card"><div class="empty">' +
        '<div class="empty-ico">' + UI.icon('briefcase', 'icon-xl') + '</div>' +
        '<h4>暂无该状态的职位</h4><p>点击右上角「发布职位」创建新的周末岗位</p></div></div>';
      return;
    }
    box.innerHTML = list.map(function (j) {
      return '<div class="job-row">' +
        '<div class="job-main">' +
          '<div class="job-titlerow"><h3>' + esc(j.title) + '</h3>' +
            '<span class="tag">' + esc(j.category) + '</span>' +
            UI.statusBadge(UI.JOB_STATUS, j.status) + '</div>' +
          '<div class="job-meta">' +
            '<span class="pay num">' + UI.money(j.pay) + '/' + esc(j.unit) + '</span>' +
            '<span class="dot-sep"></span>' +
            '<span class="kv">' + esc(j.settle) + '</span>' +
            '<span class="kv">' + UI.icon('calendar') + daysText(j.days) + ' · ' + esc(j.time) + '</span>' +
          '</div>' +
          '<div class="job-foot">' +
            '<div class="job-progress"><div class="bar"><i style="width:' + pct(j.applied, j.headcount) + '%"></i></div>' +
              '<span class="num">' + j.applied + '/' + j.headcount + ' 人</span></div>' +
            '<span class="kv">' + UI.icon('map-pin') + esc(j.addr) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="job-actions">' + jobActions(j) + '</div>' +
      '</div>';
    }).join('');
  }

  function changeJobStatus(jobId, to) {
    var pause = to === 'paused';
    UI.confirm({
      title: pause ? '暂停招募？' : '恢复招募？',
      sub: pause ? '暂停后学生端将看不到该职位' : '恢复后学生端将重新看到该职位',
      danger: pause,
      okText: pause ? '暂停' : '恢复',
      onOk: function () {
        API.setJobStatus(jobId, to).then(function () {
          UI.toast(pause ? '已暂停招募' : '已恢复招募');
          return API.getMerchantJobs();
        }).then(function (jobs) {
          state.jobs = jobs;
          renderJobs();
          renderStats();
          renderGaps();
        });
      }
    });
  }

  function viewCandidates(jobId) {
    state.candJobId = jobId;
    switchPage('candidates');
  }

  /* ---------- 候选人 ---------- */
  function candJobList() {
    var has = state.jobs.filter(function (j) { return (state.candMap[j.id] || []).length > 0; });
    if (state.candJobId) {
      var inList = has.some(function (j) { return j.id === state.candJobId; });
      var job = null;
      state.jobs.forEach(function (j) { if (j.id === state.candJobId) job = j; });
      if (job && !inList) has = [job].concat(has);
    }
    return has;
  }

  function renderCandChips() {
    var list = candJobList();
    if (!state.candJobId && list.length) state.candJobId = list[0].id;
    $('#cand-chips').innerHTML = list.map(function (j) {
      return '<span class="chip' + (j.id === state.candJobId ? ' on' : '') + '" data-id="' + j.id + '">' + esc(j.title) + '</span>';
    }).join('');
    var cands = state.candMap[state.candJobId] || [];
    var pending = cands.filter(function (c) { return c.status === 'pending'; }).length;
    $('#cand-count').innerHTML = list.length ? '待确认 <b class="num">' + pending + '</b> 人' : '';
  }

  function candCard(c, jobId) {
    var slots = (c.applySlots || []).map(function (s) {
      return '<span>' + (UI.DAY[s.d] || s.d) + ' ' + esc(s.s) + ' - ' + esc(s.e) + '</span>';
    }).join('');
    var foot;
    if (c.status === 'pending') {
      foot = '<button class="btn btn-outline btn-sm" data-act="reject" data-jid="' + jobId + '" data-cid="' + c.id + '">不合适</button>' +
             '<button class="btn btn-primary btn-sm" data-act="pass" data-jid="' + jobId + '" data-cid="' + c.id + '">' + UI.icon('check', 'icon-sm') + '通过排班</button>';
    } else if (c.status === 'passed') {
      foot = '<span class="badge b-ok">' + UI.icon('check-circle') + '已排班</span>';
    } else {
      foot = '<span class="badge b-mute">已婉拒</span>';
    }
    return '<div class="card cand">' +
      '<div class="cand-head">' +
        '<div class="avatar lg">' + esc(c.avatarText) + '</div>' +
        '<div class="cand-id"><b>' + esc(c.name) + '</b>' +
          '<span class="badge b-brand">' + UI.icon('shield') + '信用 ' + c.credit + '</span></div>' +
        '<div class="cand-match"><div class="ring" style="--p:' + c.match + '"><b class="num">' + c.match + '</b></div><span>匹配度</span></div>' +
      '</div>' +
      '<div class="cand-info">' +
        '<div class="cand-item">' + UI.icon('zap') + '技能命中 <b>' + c.skillMatch + '/' + c.skillTotal + '</b></div>' +
        '<div class="cand-item">' + UI.icon('clock') + '时段重叠 <b>' + esc(c.timeOverlap) + '</b></div>' +
        '<div class="cand-item">' + UI.icon('briefcase') + '历史完成 <b>' + c.doneJobs + ' 单</b></div>' +
        '<div class="cand-item cand-slots">' + UI.icon('calendar') + '<div>到岗时段<div class="slot-rows">' + slots + '</div></div></div>' +
      '</div>' +
      '<div class="cand-note">“' + esc(c.note) + '”</div>' +
      '<div class="cand-foot">' + foot + '</div>' +
    '</div>';
  }

  function candSkeleton() {
    var inner = skel(22, '45%', 16) + skel(14, '85%', 10) + skel(14, '70%', 10) + skel(14, '78%', 0);
    return '<div class="card cand">' + inner + '</div><div class="card cand">' + inner + '</div>';
  }

  function renderCandidates() {
    var box = $('#cand-grid');
    if (!state.jobs.length) { box.innerHTML = candSkeleton(); return; }
    var jid = state.candJobId;
    if (!jid) {
      box.innerHTML = '<div class="card empty-wrap"><div class="empty">' +
        '<div class="empty-ico">' + UI.icon('users', 'icon-xl') + '</div>' +
        '<h4>暂无候选人</h4><p>职位发布后，报名学生将按匹配度展示在这里</p></div></div>';
      return;
    }
    var list = state.candMap[jid];
    if (!list) {
      box.innerHTML = candSkeleton();
      API.getCandidates(jid).then(function (l) {
        state.candMap[jid] = l;
        renderCandChips();
        renderCandidates();
      });
      return;
    }
    if (!list.length) {
      box.innerHTML = '<div class="card empty-wrap"><div class="empty">' +
        '<div class="empty-ico">' + UI.icon('users', 'icon-xl') + '</div>' +
        '<h4>该职位暂无候选人</h4><p>学生报名后将按匹配度排序展示在这里</p></div></div>';
      return;
    }
    box.innerHTML = list.map(function (c) { return candCard(c, jid); }).join('');
  }

  function decide(jobId, candId, pass) {
    var done = function () {
      API.decideCandidate(jobId, candId, pass).then(function () {
        UI.toast(pass ? '已排班，已通知学生' : '已婉拒该候选人');
        (state.candMap[jobId] || []).forEach(function (c) {
          if (c.id === candId) c.status = pass ? 'passed' : 'rejected';
        });
        renderCandidates();
        renderCandChips();
        renderStats();
      });
    };
    if (pass) {
      UI.confirm({ title: '确认排班？', sub: '将向学生发送排班确认通知', onOk: done });
    } else {
      UI.confirm({ title: '婉拒该候选人？', sub: '婉拒后该学生将收到结果通知', danger: true, okText: '婉拒', onOk: done });
    }
  }

  /* ---------- 发布职位弹窗 ---------- */
  function buildPublishForm() {
    $('#f-category').innerHTML = '<option value="">请选择类目</option>' + MOCK.CATEGORIES.map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    $('#f-days').innerHTML = ['sat', 'sun'].map(function (d) {
      return '<span class="chip" data-v="' + d + '">' + UI.DAY[d] + '</span>';
    }).join('');
    $('#f-skills').innerHTML = MOCK.SKILL_POOL.map(function (s) {
      return '<span class="chip" data-v="' + esc(s) + '">' + esc(s) + '</span>';
    }).join('');
    var opts = '';
    for (var h = 6; h <= 23; h++) {
      var hh = (h < 10 ? '0' : '') + h;
      opts += '<option value="' + hh + ':00">' + hh + ':00</option>';
      if (h < 23) opts += '<option value="' + hh + ':30">' + hh + ':30</option>';
    }
    $('#f-start').innerHTML = opts;
    $('#f-end').innerHTML = opts;
    $('#f-start').value = '09:00';
    $('#f-end').value = '18:00';
  }

  function selectedVals(sel) {
    return $$('.chip.on', $(sel)).map(function (c) { return c.dataset.v; });
  }

  function bindChipGroup(sel, multi) {
    var box = $(sel);
    box.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip || !box.contains(chip)) return;
      if (multi) {
        chip.classList.toggle('on');
      } else {
        $$('.chip', box).forEach(function (c) { c.classList.remove('on'); });
        chip.classList.add('on');
      }
    });
  }

  function openPublish() { UI.openOverlay($('#pub-mask')); }
  function closePublish() { UI.closeOverlay($('#pub-mask')); }

  function resetPublishForm() {
    $('#f-title').value = '';
    $('#f-category').value = '';
    $('#f-pay').value = '';
    $('#f-headcount').value = '';
    $('#f-addr').value = '临江大学南门·糖水街 3 号';
    $('#f-desc').value = '';
    $$('#f-days .chip, #f-skills .chip').forEach(function (c) { c.classList.remove('on'); });
    $$('#f-settle .chip').forEach(function (c) { c.classList.toggle('on', c.dataset.v === '日结'); });
    $('#f-start').value = '09:00';
    $('#f-end').value = '18:00';
  }

  function submitPublish() {
    var title = $('#f-title').value.trim();
    var category = $('#f-category').value;
    var pay = +$('#f-pay').value;
    var days = selectedVals('#f-days');
    var headcount = +$('#f-headcount').value;
    if (!title || !category || !pay || !days.length || !headcount) {
      UI.toast('请完整填写必填项', 'warn');
      return;
    }
    if (pay < 12) {
      UI.toast('时薪不得低于本市兼职最低标准 12 元/小时', 'warn');
      return;
    }
    var start = $('#f-start').value, end = $('#f-end').value;
    if (end <= start) {
      UI.toast('结束时间需晚于开始时间', 'warn');
      return;
    }
    var btn = $('#pub-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>发布中…';
    API.createJob({
      title: title, category: category, pay: pay,
      settle: selectedVals('#f-settle')[0] || '日结',
      days: days, start: start, end: end,
      headcount: headcount,
      addr: $('#f-addr').value.trim(),
      desc: $('#f-desc').value.trim(),
      skills: selectedVals('#f-skills')
    }).then(function () {
      btn.disabled = false;
      btn.innerHTML = '发布职位';
      UI.toast('发布成功，已进入招募列表');
      closePublish();
      resetPublishForm();
      return API.getMerchantJobs();
    }).then(function (jobs) {
      if (!jobs) return;
      state.jobs = jobs;
      renderStats();
      renderGaps();
      if (state.page === 'jobs') renderJobs();
    });
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    $$('.side-nav a').forEach(function (a) {
      a.addEventListener('click', function () { switchPage(a.dataset.page); });
    });
    $('#btn-publish').addEventListener('click', openPublish);
    $('#pub-x').addEventListener('click', closePublish);
    $('#pub-cancel').addEventListener('click', closePublish);
    $('#pub-mask').addEventListener('click', function (e) { if (e.target === e.currentTarget) closePublish(); });
    $('#pub-submit').addEventListener('click', submitPublish);
    $('#btn-reply').addEventListener('click', function () { UI.toast('演示版暂未开放'); });

    $('#todo-list').addEventListener('click', function (e) {
      if (e.target.closest('[data-act="go-cand"]')) switchPage('candidates');
    });

    var filter = $('#jobs-filter');
    filter.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', filter).forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
      state.jobFilter = chip.dataset.f;
      renderJobs();
    });

    $('#job-list').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var id = btn.dataset.id;
      if (btn.dataset.act === 'pause') changeJobStatus(id, 'paused');
      else if (btn.dataset.act === 'resume') changeJobStatus(id, 'recruiting');
      else if (btn.dataset.act === 'view') viewCandidates(id);
    });

    $('#cand-chips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      state.candJobId = chip.dataset.id;
      renderCandChips();
      renderCandidates();
    });

    $('#cand-grid').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      decide(btn.dataset.jid, btn.dataset.cid, btn.dataset.act === 'pass');
    });

    bindChipGroup('#f-settle', false);
    bindChipGroup('#f-days', true);
    bindChipGroup('#f-skills', true);
  }

  /* ---------- 初始化 ---------- */
  function loadAllCandidates() {
    return Promise.all(state.jobs.map(function (j) {
      return API.getCandidates(j.id).then(function (list) { state.candMap[j.id] = list; });
    }));
  }

  function init() {
    buildPublishForm();
    bindEvents();

    $('#stat-grid').innerHTML =
      '<div class="stat"><div class="skeleton" style="width:46px;height:46px;border-radius:14px"></div><div style="flex:1">' + skel(24, '50%', 6) + skel(12, '80%', 0) + '</div></div>' +
      '<div class="stat"><div class="skeleton" style="width:46px;height:46px;border-radius:14px"></div><div style="flex:1">' + skel(24, '50%', 6) + skel(12, '80%', 0) + '</div></div>' +
      '<div class="stat"><div class="skeleton" style="width:46px;height:46px;border-radius:14px"></div><div style="flex:1">' + skel(24, '50%', 6) + skel(12, '80%', 0) + '</div></div>' +
      '<div class="stat"><div class="skeleton" style="width:46px;height:46px;border-radius:14px"></div><div style="flex:1">' + skel(24, '50%', 6) + skel(12, '80%', 0) + '</div></div>';
    $('#todo-list').innerHTML = skel(16, '90%', 12) + skel(16, '80%', 12) + skel(16, '85%', 0);
    $('#gap-list').innerHTML = skel(16, '70%', 12) + skel(6, '100%', 0);
    $('#review-list').innerHTML = skel(14, '60%', 8) + skel(14, '95%', 12) + skel(14, '55%', 8) + skel(14, '90%', 0);
    $('#job-list').innerHTML =
      '<div class="job-row"><div class="job-main">' + skel(18, '30%', 10) + skel(14, '60%', 10) + skel(6, '40%', 0) + '</div></div>' +
      '<div class="job-row"><div class="job-main">' + skel(18, '30%', 10) + skel(14, '60%', 10) + skel(6, '40%', 0) + '</div></div>' +
      '<div class="job-row"><div class="job-main">' + skel(18, '30%', 10) + skel(14, '60%', 10) + skel(6, '40%', 0) + '</div></div>';

    API.getMerchantOverview().then(function (ov) {
      state.overview = ov;
      renderMerchantCard();
      renderTodos();
      renderReviews();
    });

    API.getMerchantJobs().then(function (jobs) {
      state.jobs = jobs;
      renderJobs();
      renderGaps();
      return loadAllCandidates();
    }).then(function () {
      renderStats();
      renderCandChips();
      if (state.page === 'candidates') renderCandidates();
    });
  }

  init();
})();
