/* ============================================================
   兼职蜂 · 商家端逻辑（增强版）
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
    candMap: {},
    candJobId: null,
    candListView: 'grid',
    pollTimer: null,
    drafts: [],
    trendStats: {}
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
    if (page === 'candidates') { renderCandTop(); renderCandChips(); renderCandidates(); }
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
  function trendLabel() {
    // 简化：给统计卡加环比标签（随机 8-15%）
    return Math.random() > 0.5 ?
      '<span style="font-size:11px;color:var(--ok);margin-left:6px">↑' + (8 + Math.floor(Math.random() * 8)) + '% vs 上周</span>' :
      '<span style="font-size:11px;color:var(--danger);margin-left:6px">↓' + (3 + Math.floor(Math.random() * 5)) + '% vs 上周</span>';
  }

  function statCard(icon, val, sub, trend) {
    return '<div class="stat">' +
      '<div class="stat-ico">' + UI.icon(icon, 'icon-lg') + '</div>' +
      '<div><b class="num">' + val + '</b>' + trend + '<span>' + sub + '</span></div>' +
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
      statCard('briefcase', recruiting, '本周末在招职位', trendLabel()) +
      statCard('user-check', pending, '待确认候选人', trendLabel()) +
      statCard('users', passed, '已排班人次', trendLabel()) +
      statCard('wallet', UI.money(cost), '本周预计工时成本', trendLabel());
  }

  function renderDashMiniChart() {
    var ov = state.overview;
    if (!ov || !ov.weeklyTrend) return;
    var trend = ov.weeklyTrend;
    var maxV = Math.max.apply(null, trend.applied);
    var linePts = trend.applied.map(function (v, i) {
      var x = (i / (trend.applied.length - 1)) * 100;
      var y = 100 - (v / maxV) * 100;
      return x + '%,' + y + '%';
    }).join(' ');
    var labelMap = { '餐饮': 0, '家教': 1, '活动': 2, '零售': 3, '仓储': 4 };
    var maxCat = Math.max.apply(null, Object.keys(ov.hourDistribution).map(function (k) { return ov.hourDistribution[k]; }));

    // 注入位置：在 stat-grid 下面插入数据报表 mini 卡
    var existing = $('#dash-mini-report');
    if (existing) existing.remove();
    var grid = $('#stat-grid');
    if (!grid) return;
    var mini = document.createElement('div');
    mini.id = 'dash-mini-report';
    mini.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px';
    mini.innerHTML =
      '<div class="card card-pad">' +
        '<div class="card-title">' + UI.icon('trending-up') + '近 7 日申请量趋势</div>' +
        '<div style="margin-top:10px;height:80px;position:relative">' +
          '<svg style="width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
            '<polyline fill="none" stroke="#F27B13" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="' + linePts + '"/>' +
            trend.applied.map(function (v, i) {
              var x = (i / (trend.applied.length - 1)) * 100;
              var y = 100 - (v / maxV) * 100;
              return '<circle cx="' + x + '%" cy="' + y + '%" r="2" fill="#F27B13"/>';
            }).join('') +
          '</svg>' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink-3);margin-top:4px">' +
            trend.labels.map(function (l) { return '<span>' + l + '</span>'; }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card card-pad">' +
        '<div class="card-title">' + UI.icon('pie-chart') + '岗位类型分布</div>' +
        '<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">' +
          Object.keys(ov.hourDistribution).map(function (k) {
            var v = ov.hourDistribution[k];
            var p = Math.round(v / maxCat * 100);
            return '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:12px;width:42px">' + k + '</span>' +
              '<div style="flex:1;background:var(--ink-4);border-radius:4px;height:8px;overflow:hidden">' +
                '<i style="display:block;background:var(--brand);height:100%;width:' + p + '%"></i>' +
              '</div>' +
              '<span class="num" style="font-size:12px;width:26px;text-align:right">' + v + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    grid.after(mini);
  }

  function renderQuickActions() {
    var existing = $('#dash-quick-actions');
    if (existing) existing.remove();
    var grid = $('#stat-grid');
    if (!grid) return;
    var qa = document.createElement('div');
    qa.id = 'dash-quick-actions';
    qa.style.cssText = 'display:flex;gap:8px;margin-bottom:12px';
    qa.innerHTML =
      '<button class="btn btn-primary" data-qa="publish" style="flex:1">' + UI.icon('plus', 'icon-sm') + '发布职位</button>' +
      '<button class="btn btn-outline" data-qa="cand" style="flex:1">' + UI.icon('users', 'icon-sm') + '查看候选人</button>' +
      '<button class="btn btn-outline" data-qa="review" style="flex:1">' + UI.icon('star', 'icon-sm') + '查看评价</button>';
    grid.after(qa);
    qa.addEventListener('click', function (e) {
      var act = e.target.closest('[data-qa]');
      if (!act) return;
      if (act.dataset.qa === 'publish') $('#btn-publish').click();
      else if (act.dataset.qa === 'cand') switchPage('candidates');
      else if (act.dataset.qa === 'review') {
        UI.toast('评价详情在工作台右侧卡片，向下滚动查看', 'ok');
      }
    });
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
      var pctVal = pct(j.applied, j.headcount);
      var isWarn = pctVal < 70; // 缺口 > 30% 时
      return '<div class="gap-row' + (isWarn ? ' gap-warn' : '') + '"' + (isWarn ? ' style="border:1px solid var(--danger);border-radius:12px;padding:10px;margin-bottom:10px"' : '') + '>' +
        '<div class="gap-top"><b>' + esc(j.title) + '</b>' +
          '<span class="gap-date">' + daysText(j.days) + '</span>' +
          '<span class="badge b-warn">' + esc(j.gap) + '</span></div>' +
        '<div class="gap-bar"><div class="bar"><i style="width:' + pctVal + '%"></i></div>' +
          '<span class="num">已报名 ' + j.applied + '/' + j.headcount + '</span>' +
          (isWarn ? '<span style="color:var(--danger);font-size:11px;margin-left:6px">' + UI.icon('alert-triangle', 'icon-sm') + '缺口超过 30%，建议尽快确认候选人</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderReviews() {
    var list = (state.overview && state.overview.reviews) || [];
    $('#review-list').innerHTML = list.map(function (r) {
      return '<div class="review" data-rvid="' + r.id + '">' +
        '<div>' + UI.stars(r.stars) + '</div>' +
        '<p class="review-text">' + esc(r.text) + '</p>' +
        '<div class="review-who">—— ' + esc(r.who) + '</div>' +
        (r.merchantReply ?
          '<div style="margin-top:8px;padding:8px 10px;background:var(--ink-5);border-radius:8px;font-size:12px">' +
            '<div style="color:var(--ink-3);margin-bottom:4px">你的回复</div>' +
            '<div>' + esc(r.merchantReply) + '</div>' +
          '</div>' :
          '<div style="margin-top:8px" class="review-reply-row">' +
            '<div class="chips" style="margin-bottom:6px">' +
              '<button class="chip reply-tpl" data-tpl="感谢你的努力，欢迎常来~">感谢+邀请再来</button>' +
              '<button class="chip reply-tpl" data-tpl="结算预计本周到账，请注意查收">结算提醒</button>' +
              '<button class="chip reply-tpl" data-tpl="抱歉给你带来不好的体验，我们已改进">抱歉改进</button>' +
            '</div>' +
            '<div style="display:flex;gap:6px">' +
              '<input class="input reply-input" placeholder="输入回复..." style="flex:1">' +
              '<button class="btn btn-primary btn-sm reply-send">发送</button>' +
            '</div>' +
          '</div>'
        ) +
      '</div>';
    }).join('');
  }

  function renderDashboard() {
    if (!state.overview) return;
    renderStats();
    renderQuickActions();
    renderDashMiniChart();
    renderTodos();
    renderGaps();
    renderReviews();
  }

  /* ---------- 职位管理 ---------- */
  function jobActions(j) {
    var view = '<button class="btn btn-ghost btn-sm" data-act="view" data-id="' + j.id + '">查看候选人</button>';
    var preview = '<button class="btn btn-ghost btn-sm" data-act="preview" data-id="' + j.id + '">' + UI.icon('eye', 'icon-sm') + '预览</button>';
    if (j.status === 'recruiting') {
      return '<button class="btn btn-outline btn-sm" data-act="pause" data-id="' + j.id + '">' + UI.icon('pause', 'icon-sm') + '暂停</button>' + view + preview;
    }
    if (j.status === 'paused') {
      return '<button class="btn btn-outline btn-sm" data-act="resume" data-id="' + j.id + '">' + UI.icon('play', 'icon-sm') + '恢复</button>' + view + preview;
    }
    return view + preview;
  }

  function renderJobsFilters() {
    var existing = $('#jobs-extra-filters');
    if (existing) existing.remove();
    var filter = $('#jobs-filter');
    if (!filter) return;
    var extra = document.createElement('div');
    extra.id = 'jobs-extra-filters';
    extra.style.cssText = 'display:flex;gap:6px;margin:8px 0 12px;flex-wrap:wrap';
    extra.innerHTML =
      '<span style="font-size:12px;color:var(--ink-3);align-self:center">品类</span>' +
      '<div class="chips" id="jobs-cat-filter">' +
        '<span class="chip on" data-f="cat-all">全部</span>' +
        MOCK.CATEGORIES.slice(0, 5).map(function (c) { return '<span class="chip" data-f="cat-' + c + '">' + c + '</span>'; }).join('') +
      '</div>' +
      '<span style="font-size:12px;color:var(--ink-3);align-self:center;margin-left:10px">时薪</span>' +
      '<div class="chips" id="jobs-pay-filter">' +
        '<span class="chip on" data-f="pay-all">全部</span>' +
        '<span class="chip" data-f="pay-20">≥20/h</span>' +
        '<span class="chip" data-f="pay-lt20"><20/h</span>' +
      '</div>';
    filter.after(extra);

    $('#jobs-cat-filter').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', this).forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
      state.jobCatFilter = chip.dataset.f;
      renderJobs();
    });
    $('#jobs-pay-filter').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', this).forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
      state.jobPayFilter = chip.dataset.f;
      renderJobs();
    });
  }

  function renderJobs() {
    var f = state.jobFilter;
    var catF = state.jobCatFilter || 'cat-all';
    var payF = state.jobPayFilter || 'pay-all';
    var list = state.jobs.filter(function (j) {
      if (f !== 'all' && j.status !== f) return false;
      if (catF !== 'cat-all' && j.category !== catF.replace('cat-', '')) return false;
      if (payF === 'pay-20' && j.pay < 20) return false;
      if (payF === 'pay-lt20' && j.pay >= 20) return false;
      return true;
    });

    var box = $('#job-list');
    if (!list.length) {
      box.innerHTML = '<div class="card"><div class="empty">' +
        '<div class="empty-ico">' + UI.icon('briefcase', 'icon-xl') + '</div>' +
        '<h4>暂无该状态的职位</h4><p>点击右上角「发布职位」创建新的周末岗位</p></div></div>';
      return;
    }
    box.innerHTML = list.map(function (j) {
      var views = Math.floor(Math.random() * 200) + 50;
      var favs = Math.floor(Math.random() * 20) + 3;
      return '<div class="job-row">' +
        '<div class="job-main">' +
          '<div class="job-titlerow"><h3>' + esc(j.title) + '</h3>' +
            '<span class="tag">' + esc(j.category) + '</span>' +
            UI.statusBadge(UI.JOB_STATUS, j.status) +
            '<span style="font-size:11px;color:var(--ink-3);margin-left:auto">' +
              UI.icon('eye', 'icon-sm') + views + ' · ' + UI.icon('star', 'icon-sm') + favs +
            '</span>' +
          '</div>' +
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

  function previewJob(jobId) {
    // 模拟一个学生端职位卡样式的预览弹窗
    var j = state.jobs.find(function (x) { return x.id === jobId; });
    if (!j) return;
    var old = document.getElementById('ui-preview-mask');
    if (old) old.remove();

    var mask = document.createElement('div');
    mask.id = 'ui-preview-mask';
    mask.className = 'mask show';
    // 把商家端职位转成学生端职位卡
    var studentCard =
      '<article class="card job-card" style="margin:0">' +
        '<div class="jc-top"><div class="jc-main">' +
          '<div class="jc-title">' + esc(j.title) + '<span class="badge b-ok">实名</span></div>' +
          '<div class="jc-mer">预览效果 · 学生端看到的职位卡</div>' +
          '<div class="jc-rate">' + UI.stars(4.7) + '<b class="num">4.7</b></div>' +
        '</div><div class="jc-pay num">' + UI.money(j.pay) + '<small>/' + esc(j.unit) + '</small></div></div>' +
        '<div class="jc-meta">' +
          '<span class="kv">' + UI.icon('map-pin') + '距离商家地址</span>' +
          '<span class="kv">' + UI.icon('clock') + daysText(j.days) + ' · ' + esc(j.time) + '</span>' +
          '<span class="tag">' + esc(j.settle) + '</span>' +
        '</div>' +
        '<div class="jc-skills">' + (j.skills || []).slice(0, 3).map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join('') + '</div>' +
        '<div class="jc-foot"><span class="jc-applied">已报名 <b class="num">' + j.applied + '/' + j.headcount + '</b></span>' +
        '<span class="badge b-brand">匹配度参考</span></div>' +
      '</article>';

    mask.innerHTML =
      '<div class="modal-card" style="max-width:420px">' +
        '<div class="modal-head"><h3>学生端预览</h3><button class="modal-x" aria-label="关闭">' + UI.icon('x') + '</button></div>' +
        '<div class="modal-body" style="padding:14px 16px">' +
          '<div style="margin-bottom:10px;font-size:12px;color:var(--ink-3)">这是学生端「职位大厅」会看到的样式，发布后即可展示给学生浏览</div>' +
          studentCard +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.closest('.modal-x')) mask.remove();
    });
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
          // 自动刷新候选人数
          return loadAllCandidates();
        }).then(function () {
          if (state.page === 'candidates') renderCandidates();
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

  function renderCandTop() {
    var existing = $('#cand-extra-top');
    if (existing) existing.remove();
    var candGrid = $('#cand-grid');
    if (!candGrid) return;
    var top = document.createElement('div');
    top.id = 'cand-extra-top';
    top.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap';
    top.innerHTML =
      '<label style="display:flex;align-items:center;gap:6px;font-size:12px">' +
        '<input type="checkbox" id="candSelectAll">' + '全选' +
      '</label>' +
      '<button class="btn btn-primary btn-sm" id="batchPassBtn" disabled>' + UI.icon('check', 'icon-sm') + '批量通过</button>' +
      '<button class="btn btn-outline btn-sm" id="batchRejectBtn" disabled>' + UI.icon('x', 'icon-sm') + '批量婉拒</button>' +
      '<div style="margin-left:auto;display:flex;gap:6px">' +
        '<button class="btn btn-ghost btn-sm cand-view-toggle" data-view="grid">' + UI.icon('list', 'icon-sm') + '网格</button>' +
        '<button class="btn btn-ghost btn-sm cand-view-toggle" data-view="list">' + UI.icon('file-text', 'icon-sm') + '列表</button>' +
      '</div>';
    candGrid.before(top);

    // 视图切换
    top.addEventListener('click', function (e) {
      var vBtn = e.target.closest('.cand-view-toggle');
      if (vBtn) {
        state.candListView = vBtn.dataset.view;
        renderCandidates();
        return;
      }
    });

    // 全选
    top.addEventListener('change', function (e) {
      if (e.target.id === 'candSelectAll') {
        var checkboxes = document.querySelectorAll('.cand-check');
        checkboxes.forEach(function (cb) { cb.checked = e.target.checked; });
        updateBatchButtons();
      }
    });

    // 批量通过 / 婉拒
    top.addEventListener('click', function (e) {
      var bp = e.target.closest('#batchPassBtn');
      var br = e.target.closest('#batchRejectBtn');
      if (bp) batchDecide(true);
      if (br) batchDecide(false);
    });
  }

  function updateBatchButtons() {
    var selected = document.querySelectorAll('.cand-check:checked');
    var bp = document.getElementById('batchPassBtn');
    var br = document.getElementById('batchRejectBtn');
    if (!bp) return;
    var enabled = selected.length >= 2;
    bp.disabled = !enabled;
    br.disabled = !enabled;
  }

  function batchDecide(pass) {
    var checkboxes = document.querySelectorAll('.cand-check:checked');
    var jid = state.candJobId;
    var ids = [];
    checkboxes.forEach(function (cb) { ids.push(cb.dataset.cid); });
    if (!ids.length) return;

    UI.confirm({
      title: pass ? '批量通过 ' + ids.length + ' 人？' : '批量婉拒 ' + ids.length + ' 人？',
      sub: pass ? '将向所选学生发送排班确认通知' : '婉拒后学生将收到结果',
      danger: !pass,
      okText: pass ? '通过' : '婉拒',
      onOk: function () {
        var chain = Promise.resolve();
        ids.forEach(function (cid) {
          chain = chain.then(function () { return API.decideCandidate(jid, cid, pass); });
        });
        chain.then(function () {
          UI.toast((pass ? '已批量通过 ' : '已批量婉拒 ') + ids.length + ' 人');
          if (state.candMap[jid]) {
            state.candMap[jid].forEach(function (c) {
              if (ids.indexOf(c.id) > -1) c.status = pass ? 'passed' : 'rejected';
            });
          }
          renderCandidates();
          renderStats();
        });
      }
    });
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

  function matchBreakdown(c, jid) {
    // 匹配度来源：时段重叠 + 距离 + 技能 + 信用
    var overlapScore = 20;
    var distScore = 22;
    var skillScore = Math.round(c.skillMatch / c.skillTotal * 18);
    var creditScore = Math.round(c.credit / 100 * 14);
    // 时段重叠
    var overlapPct = c.timeOverlap || '0%';
    var overlapN = parseInt(String(overlapPct).replace('%', ''), 10) || 0;
    overlapScore = Math.round(overlapN / 100 * 40);

    return '<div class="card card-pad" style="padding:10px 14px;margin-top:8px">' +
      '<div style="font-size:12px;color:var(--ink-3);margin-bottom:6px">匹配度来源说明</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;font-size:12px">' +
        '<div style="display:flex;justify-content:space-between"><span>时段重叠 ' + esc(overlapPct) + '</span><span class="num">+' + overlapScore + '</span></div>' +
        '<div style="display:flex;justify-content:space-between"><span>信用 ' + c.credit + '</span><span class="num">+' + creditScore + '</span></div>' +
        '<div style="display:flex;justify-content:space-between"><span>技能 ' + c.skillMatch + '/' + c.skillTotal + '</span><span class="num">+' + skillScore + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;color:var(--brand);font-weight:600;border-top:1px solid var(--ink-4);padding-top:4px;margin-top:4px">' +
          '<span>合计</span><span class="num">=' + c.match + '</span></div>' +
      '</div>' +
    '</div>';
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

    // 历史评价折叠
    var history = (c.historyReviews || []).map(function (h) {
      return '<div style="font-size:12px;color:var(--ink-2);padding:4px 0">' +
        UI.stars(h.stars) + ' —— ' + esc(h.who) + '<div style="color:var(--ink-3)">"' + esc(h.text) + '"</div></div>';
    }).join('');

    var expandId = 'hist-' + c.id;
    var histBlock = history ?
      '<div style="margin-top:8px">' +
        '<button class="btn btn-ghost btn-sm hist-toggle" data-target="' + expandId + '" style="padding:0;font-size:12px;color:var(--brand)">' +
          UI.icon('chevron-down', 'icon-sm') + '查看历史评价 (' + (c.historyReviews || []).length + ')' +
        '</button>' +
        '<div id="' + expandId + '" style="display:none;margin-top:4px">' + history + '</div>' +
      '</div>' : '';

    return '<div class="card cand" style="position:relative">' +
      '<input type="checkbox" class="cand-check" data-cid="' + c.id + '" style="position:absolute;top:12px;right:12px;z-index:3">' +
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
      '<div class="cand-note">"' + esc(c.note) + '"</div>' +
      matchBreakdown(c, jobId) +
      histBlock +
      '<div class="cand-foot">' +
        '<button class="btn btn-ghost btn-sm" data-act="interview" data-jid="' + jobId + '" data-cid="' + c.id + '">' + UI.icon('calendar', 'icon-sm') + '面试时间</button>' +
        foot +
      '</div>' +
    '</div>';
  }

  function candCardList(c, jobId) {
    // 列表视图
    return candCard(c, jobId); // 复用网格卡，实际可以简化，这里保持一致
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
    if (state.candListView === 'list') {
      box.style.display = 'block';
      box.innerHTML = list.map(function (c) { return candCardList(c, jid); }).join('');
    } else {
      box.style.display = '';
      box.innerHTML = list.map(function (c) { return candCard(c, jid); }).join('');
    }
    updateBatchButtons();
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

  function openInterview(jobId, candId) {
    var old = document.getElementById('ui-interview-mask');
    if (old) old.remove();
    var mask = document.createElement('div');
    mask.id = 'ui-interview-mask';
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="modal-card" style="max-width:360px">' +
        '<div class="modal-head"><h3>设置面试时间</h3><button class="modal-x" aria-label="关闭">' + UI.icon('x') + '</button></div>' +
        '<div class="modal-body" style="padding:18px 20px">' +
          '<div class="field"><label>面试时段</label>' +
            '<div class="chips" id="interview-chips">' +
              '<span class="chip" data-v="周六 14:00 - 15:00">周六下午</span>' +
              '<span class="chip" data-v="周六 16:00 - 17:00">周六傍晚</span>' +
              '<span class="chip" data-v="周日 10:00 - 11:00">周日上午</span>' +
              '<span class="chip" data-v="周日 14:00 - 15:00">周日下午</span>' +
            '</div>' +
          '</div>' +
          '<div class="field"><label>备注（可选）</label><input class="input" id="interview-note" placeholder="填写地址或联系方式"></div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-outline" id="interview-cancel">取消</button>' +
          '<button class="btn btn-primary" id="interview-confirm">发送面试邀请</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('show'); });

    $$('#interview-chips .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('#interview-chips .chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
      });
    });

    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.closest('.modal-x') || e.target.closest('#interview-cancel')) { mask.remove(); return; }
      if (e.target.closest('#interview-confirm')) {
        var on = document.querySelector('#interview-chips .chip.on');
        if (!on) { UI.toast('请选择一个时段', 'warn'); return; }
        UI.toast('面试邀请已发送给候选人', 'ok');
        mask.remove();
      }
    });
  }

  /* ---------- 发布职位弹窗（增强版） ---------- */
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

    // 在结算方式 chips 上增加选项
    var settleBox = $('#f-settle');
    settleBox.innerHTML =
      '<span class="chip on" data-v="日结">日结</span>' +
      '<span class="chip" data-v="周结">周结</span>' +
      '<span class="chip" data-v="月结">月结</span>' +
      '<span style="margin-left:auto;font-size:11px;color:var(--danger)">' + UI.icon('alert-triangle', 'icon-sm') + '禁止收押金</span>';

    // 注入实时预览区和保存草稿按钮
    var pubForm = $('#pub-form');
    var previewDiv = document.createElement('div');
    previewDiv.id = 'pub-preview';
    previewDiv.style.cssText = 'margin-top:16px;padding:14px;background:var(--ink-5);border-radius:12px';
    previewDiv.innerHTML =
      '<div style="font-size:12px;color:var(--ink-3);margin-bottom:8px">' + UI.icon('eye', 'icon-sm') + '实时预览（学生端看到的职位卡效果）</div>' +
      '<div id="pub-preview-card">' +
        '<div style="color:var(--ink-3);font-size:12px">填写信息后实时预览将自动更新</div>' +
      '</div>';
    pubForm.appendChild(previewDiv);

    // 在 pub-submit 左边加保存草稿按钮
    var foot = document.querySelector('#pub-mask .modal-foot');
    if (foot && !$('#pub-save-draft')) {
      var draftBtn = document.createElement('button');
      draftBtn.className = 'btn btn-outline';
      draftBtn.id = 'pub-save-draft';
      draftBtn.textContent = '保存草稿';
      foot.insertBefore(draftBtn, foot.querySelector('#pub-submit'));
    }
  }

  function updatePubPreview() {
    var title = $('#f-title').value.trim() || '职位名称';
    var catSel = $('#f-category');
    var category = catSel && catSel.value ? catSel.value : '类目';
    var pay = $('#f-pay').value || '时薪';
    var settleChips = $$('#f-settle .chip.on');
    var settle = settleChips.length ? settleChips[0].dataset.v : '日结';
    var start = $('#f-start').value || '09:00';
    var end = $('#f-end').value || '18:00';
    var days = $$('#f-days .chip.on').map(function (c) { return c.dataset.v; });
    var headcount = $('#f-headcount').value || '人数';
    var skills = $$('#f-skills .chip.on').map(function (c) { return c.dataset.v; });
    var timeTxt = days.length ? daysText(days) + ' · ' + start + ' - ' + end : start + ' - ' + end;

    var card =
      '<article class="card job-card" style="margin:0">' +
        '<div class="jc-top"><div class="jc-main">' +
          '<div class="jc-title">' + esc(title) + '<span class="badge b-ok">实名</span></div>' +
          '<div class="jc-mer">预览效果 · ' + esc(category) + '</div>' +
          '<div class="jc-rate">' + UI.stars(4.7) + '<b class="num">4.7</b></div>' +
        '</div><div class="jc-pay num">' + UI.money(pay) + '<small>/' + UI.icon('clock', 'icon-sm') + ' 单位</small></div></div>' +
        '<div class="jc-meta">' +
          '<span class="kv">' + UI.icon('map-pin') + '距离商家地址</span>' +
          '<span class="kv">' + UI.icon('clock') + esc(timeTxt) + '</span>' +
          '<span class="tag">' + esc(settle) + '</span>' +
        '</div>' +
        '<div class="jc-skills">' + skills.slice(0, 3).map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join('') +
          (skills.length === 0 ? '<span class="tag">无</span>' : '') + '</div>' +
        '<div class="jc-foot"><span class="jc-applied">招募 <b class="num">' + headcount + ' 人</b></span>' +
        '<span class="badge b-brand">匹配度参考</span></div>' +
      '</article>';

    var box = $('#pub-preview-card');
    if (box) box.innerHTML = card;
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
      updatePubPreview();
    });
  }

  function openPublish() { UI.openOverlay($('#pub-mask')); updatePubPreview(); }
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
    updatePubPreview();
  }

  function saveDraft() {
    var title = $('#f-title').value.trim();
    if (!title) { UI.toast('请先填写职位名称', 'warn'); return; }
    var draft = {
      id: 'd' + Date.now(),
      title: title,
      category: $('#f-category').value,
      pay: $('#f-pay').value,
      settle: selectedVals('#f-settle')[0] || '日结',
      days: selectedVals('#f-days'),
      start: $('#f-start').value,
      end: $('#f-end').value,
      headcount: $('#f-headcount').value,
      addr: $('#f-addr').value,
      desc: $('#f-desc').value,
      skills: selectedVals('#f-skills')
    };
    state.drafts.push(draft);
    UI.toast('已保存草稿 · ' + title);
    closePublish();
    resetPublishForm();
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

  /* ---------- 轮询（每 20s） ---------- */
  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(function () {
      // 检测 merchantJobs.applied 变化
      API.getMerchantJobs().then(function (jobs) {
        var changed = false;
        jobs.forEach(function (nj) {
          var old = state.jobs.find(function (x) { return x.id === nj.id; });
          if (old && nj.applied > old.applied) {
            UI.toast('新申请！候选人已同步到候选人列表', 'ok');
            changed = true;
          }
        });
        state.jobs = jobs;
        if (state.page === 'jobs') renderJobs();
        if (state.page === 'dashboard') { renderStats(); renderGaps(); }
        if (changed) {
          loadAllCandidates().then(function () {
            if (state.page === 'candidates') renderCandidates();
            renderStats();
          });
        }
      });
      // 检测候选人自动通过
      Object.keys(state.candMap).forEach(function (jid) {
        API.getCandidates(jid).then(function (list) {
          if (!state.candMap[jid]) state.candMap[jid] = list;
          else {
            var oldList = state.candMap[jid];
            var newPass = list.filter(function (c) {
              var o = oldList.find(function (x) { return x.id === c.id; });
              return o && o.status !== 'passed' && c.status === 'passed';
            });
            if (newPass.length) {
              UI.toast('候选人自动被系统排班，工作台统计已更新', 'ok');
            }
            state.candMap[jid] = list;
          }
        });
      });
    }, 20000);
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
    $('#btn-reply').addEventListener('click', function () { UI.toast('可直接在评价卡片下方回复', 'ok'); });

    // 保存草稿
    $('#pub-save-draft').addEventListener('click', saveDraft);

    // 发布表单输入实时预览
    ['input', 'select', 'textarea'].forEach(function (tag) {
      $$('#pub-form ' + tag).forEach(function (el) {
        el.addEventListener('input', updatePubPreview);
        el.addEventListener('change', updatePubPreview);
      });
    });

    // Ctrl+Enter 提交发布表单
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        var mask = $('#pub-mask');
        if (mask && mask.classList.contains('show')) {
          submitPublish();
        }
        // / 聚焦工作台搜索（商家端暂时没搜索框，先不处理）
      }
    });

    // 评价回复事件委托
    $('#review-list').addEventListener('click', function (e) {
      var tpl = e.target.closest('.reply-tpl');
      var send = e.target.closest('.reply-send');
      var expand = e.target.closest('.hist-toggle');
      if (tpl) {
        var input = tpl.closest('.review').querySelector('.reply-input');
        if (input) input.value = tpl.dataset.tpl;
        return;
      }
      if (send) {
        var row = send.closest('.review');
        var inp = row.querySelector('.reply-input');
        var rvId = row.dataset.rvid;
        if (!inp || !inp.value.trim()) { UI.toast('请输入回复内容', 'warn'); return; }
        // 直接更新到 overview.reviews（api.js 无回复接口，模拟更新）
        if (state.overview) {
          var rv = state.overview.reviews.find(function (r) { return r.id === rvId; });
          if (rv) rv.merchantReply = inp.value.trim();
        }
        UI.toast('回复已发送');
        renderReviews();
        return;
      }
      if (expand) {
        var target = document.getElementById(expand.dataset.target);
        if (target) target.style.display = target.style.display === 'none' ? 'block' : 'none';
      }
    });

    // 职位管理 chips
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
      else if (btn.dataset.act === 'preview') previewJob(id);
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
      if (btn.dataset.act === 'interview') {
        openInterview(btn.dataset.jid, btn.dataset.cid);
      } else {
        decide(btn.dataset.jid, btn.dataset.cid, btn.dataset.act === 'pass');
      }
    });

    // Esc 关闭 mask
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var masks = document.querySelectorAll('.mask.show');
        masks.forEach(function (m) { m.classList.remove('show'); setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 220); });
      }
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
      renderJobsFilters();
      renderJobs();
      renderGaps();
      return loadAllCandidates();
    }).then(function () {
      renderStats();
      renderQuickActions();
      renderDashMiniChart();
      renderCandTop();
      renderCandChips();
      if (state.page === 'candidates') renderCandidates();
    });

    // 启动自动确认 + 轮询
    try { API.startAutoConfirm(); } catch (e) {}
    startPolling();

    // 页面卸载时清理
    window.addEventListener('beforeunload', function () {
      try { API.stopAutoConfirm(); } catch (e) {}
      if (state.pollTimer) clearInterval(state.pollTimer);
    });
  }

  init();
})();
