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
    editJobId: null,
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
  // 职位浏览/收藏：优先读职位自身字段，缺失时回落到学生端同商家同标题职位
  function jobStats(j) {
    if (j && typeof j.views === 'number') {
      return { views: j.views, favorites: typeof j.favorites === 'number' ? j.favorites : 0 };
    }
    var merchant = state.overview && state.overview.profile ? state.overview.profile.name : '';
    var src = (MOCK.jobs || []).filter(function (s) {
      return s.merchant === merchant && s.title === j.title;
    })[0];
    return {
      views: src && typeof src.views === 'number' ? src.views : 0,
      favorites: src && typeof src.favorites === 'number' ? src.favorites : 0
    };
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
  function trendLabel(delta, invert) {
    var raw = String(delta == null ? '' : delta).trim();
    if (!raw) {
      return '<span style="font-size:11px;color:var(--ink-3);margin-left:6px">暂无对比</span>';
    }
    var up = raw.charAt(0) !== '-';
    var num = raw.replace(/^[+-]/, '');
    var color = up ? (invert ? 'var(--danger)' : 'var(--ok)') : (invert ? 'var(--ok)' : 'var(--danger)');
    return '<span style="font-size:11px;color:' + color + ';margin-left:6px">' +
      (up ? '↑' : '↓') + esc(num) + ' vs 上周</span>';
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
    var wt = (state.overview && state.overview.weeklyTrend) || {};
    $('#stat-grid').innerHTML =
      statCard('briefcase', recruiting, '本周末在招职位', trendLabel(wt.appliedDelta)) +
      statCard('user-check', pending, '待确认候选人', trendLabel(wt.appliedDelta)) +
      statCard('users', passed, '已排班人次', trendLabel(wt.appliedDelta)) +
      statCard('wallet', UI.money(cost), '本周预计工时成本', trendLabel(wt.costDelta, true));
  }

  function renderDashMiniChart() {
    var ov = state.overview;
    if (!ov || !ov.weeklyTrend) return;
    var trend = ov.weeklyTrend;
    var maxV = Math.max.apply(null, trend.applied);
    var linePts = trend.applied.map(function (v, i) {
      var x = (i / (trend.applied.length - 1)) * 100;
      var y = 100 - (v / maxV) * 100;
      return x + ',' + y;
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
              return '<circle cx="' + x + '" cy="' + y + '" r="2" fill="#F27B13"/>';
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

  function renderRatingBreakdown() {
    var stats = state.overview && state.overview.profile && state.overview.profile.stats;
    var rb = stats && stats.ratingBreakdown;
    var list = $('#review-list');
    if (!rb || !list) return;
    var box = document.getElementById('review-breakdown');
    if (!box) {
      box = document.createElement('div');
      box.id = 'review-breakdown';
      box.style.cssText = 'margin:2px 0 12px;padding-bottom:10px;border-bottom:1px solid var(--line)';
      list.before(box);
    }
    box.innerHTML = [5, 4, 3, 2, 1].map(function (star) {
      var p = Math.max(0, Math.min(100, +rb[star] || 0));
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
        '<span style="font-size:12px;width:36px;color:var(--ink-2);display:flex;align-items:center;gap:2px">' +
          star + '<span style="color:#F2A518">' + UI.icon('star-fill', 'icon-sm') + '</span>' +
        '</span>' +
        '<div style="flex:1;background:var(--ink-4);border-radius:4px;height:8px;overflow:hidden">' +
          '<i style="display:block;height:100%;width:' + p + '%;background:' + (star >= 4 ? 'var(--brand)' : 'var(--brand-soft)') + '"></i>' +
        '</div>' +
        '<span class="num" style="font-size:12px;width:34px;text-align:right">' + p + '%</span>' +
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
    renderRatingBreakdown();
    renderReviews();
  }

  /* ---------- 职位管理 ---------- */
  function jobActions(j) {
    var view = '<button class="btn btn-ghost btn-sm" data-act="view" data-id="' + j.id + '">查看候选人</button>';
    var edit = '<button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + j.id + '">' + UI.icon('edit', 'icon-sm') + '编辑</button>';
    var sched = '<button class="btn btn-ghost btn-sm" data-act="schedule" data-id="' + j.id + '">' + UI.icon('calendar', 'icon-sm') + '排班表</button>';
    var preview = '<button class="btn btn-ghost btn-sm" data-act="preview" data-id="' + j.id + '">' + UI.icon('eye', 'icon-sm') + '预览</button>';
    if (j.status === 'recruiting') {
      return '<button class="btn btn-outline btn-sm" data-act="pause" data-id="' + j.id + '">' + UI.icon('pause', 'icon-sm') + '暂停</button>' + view + edit + sched + preview;
    }
    if (j.status === 'paused') {
      return '<button class="btn btn-outline btn-sm" data-act="resume" data-id="' + j.id + '">' + UI.icon('play', 'icon-sm') + '恢复</button>' + view + edit + sched + preview;
    }
    return view + edit + sched + preview;
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
      var stat = jobStats(j);
      return '<div class="job-row">' +
        '<div class="job-main">' +
          '<div class="job-titlerow"><h3>' + esc(j.title) + '</h3>' +
            '<span class="tag">' + esc(j.category) + '</span>' +
            UI.statusBadge(UI.JOB_STATUS, j.status) +
            '<span style="font-size:11px;color:var(--ink-3);margin-left:auto">' +
              UI.icon('eye', 'icon-sm') + stat.views + ' · ' + UI.icon('star', 'icon-sm') + stat.favorites +
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
      '<button class="btn btn-outline btn-sm" id="batchCompareBtn" disabled title="请选择 2-3 人进行对比">' + UI.icon('list', 'icon-sm') + '对比</button>' +
      '<span id="compareHint" style="display:none;font-size:12px;color:var(--ink-3)"></span>' +
      '<div style="margin-left:auto;display:flex;gap:6px">' +
        '<button class="btn btn-outline btn-sm" id="candExportBtn">' + UI.icon('file-text', 'icon-sm') + '导出名单</button>' +
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

    // 批量通过 / 婉拒 / 对比 / 导出
    top.addEventListener('click', function (e) {
      var bp = e.target.closest('#batchPassBtn');
      var br = e.target.closest('#batchRejectBtn');
      var cmp = e.target.closest('#batchCompareBtn');
      var exp = e.target.closest('#candExportBtn');
      if (bp) batchDecide(true);
      if (br) batchDecide(false);
      if (cmp) openCompare();
      if (exp) exportCandidates();
    });
  }

  function checkedCandIds() {
    var ids = [];
    document.querySelectorAll('.cand-check:checked').forEach(function (cb) { ids.push(cb.dataset.cid); });
    return ids;
  }

  function updateBatchButtons() {
    var selected = document.querySelectorAll('.cand-check:checked');
    var bp = document.getElementById('batchPassBtn');
    var br = document.getElementById('batchRejectBtn');
    var cmp = document.getElementById('batchCompareBtn');
    var hint = document.getElementById('compareHint');
    if (!bp) return;
    var n = selected.length;
    var enabled = n >= 2;
    bp.disabled = !enabled;
    br.disabled = !enabled;
    if (cmp) {
      cmp.disabled = !(n >= 2 && n <= 3);
      cmp.title = n > 3 ? '最多选择 3 人进行对比' : '请选择 2-3 人进行对比';
    }
    if (hint) {
      if (n === 1) { hint.textContent = '再选 1-2 人即可对比'; hint.style.display = 'inline'; }
      else if (n > 3) { hint.textContent = '最多对比 3 人'; hint.style.display = 'inline'; }
      else { hint.style.display = 'none'; }
    }
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

  function closeMaskEl(mask) {
    if (!mask) return;
    mask.classList.remove('show');
    setTimeout(function () { if (mask.parentNode) mask.remove(); }, 220);
  }

  function numOf(v) {
    return parseFloat(String(v == null ? '' : v).replace('%', '')) || 0;
  }

  /* ---------- 候选人并排对比 ---------- */
  function openCompare() {
    var jid = state.candJobId;
    var ids = checkedCandIds();
    if (!jid) { UI.toast('请先选择职位', 'warn'); return; }
    if (ids.length < 2) { UI.toast('请选择 2-3 人进行对比', 'warn'); return; }
    if (ids.length > 3) { UI.toast('最多选择 3 人进行对比', 'warn'); return; }
    API.compareCandidates(jid, ids).then(function (rows) {
      if (!rows || !rows.length) { UI.toast('未获取到候选人数据', 'warn'); return; }
      renderCompareModal(jid, rows);
    });
  }

  function renderCompareModal(jid, rows) {
    var old = document.getElementById('ui-compare-mask');
    if (old) old.remove();

    var defs = [
      { label: '姓名', get: function (r) { return '<b>' + esc(r.name) + '</b>'; }, metric: null },
      { label: '信用分', get: function (r) { return r.credit; }, metric: function (r) { return numOf(r.credit); } },
      { label: '匹配度', get: function (r) { return r.match; }, metric: function (r) { return numOf(r.match); } },
      { label: '完成单', get: function (r) { return r.doneJobs; }, metric: function (r) { return numOf(r.doneJobs); } },
      { label: '守时率', get: function (r) { return esc(r.punctual || '—'); }, metric: function (r) { return numOf(r.punctual); } },
      {
        label: '技能命中',
        get: function (r) {
          var s = r.skills || [];
          return s.length ? esc(s.join('、')) + ' <span style="color:var(--ink-3)">(' + s.length + ')</span>' :
            '<span style="color:var(--ink-3)">无</span>';
        },
        metric: function (r) { return (r.skills || []).length; }
      },
      { label: '时段重叠', get: function (r) { return esc(r.overlap || '—'); }, metric: function (r) { return numOf(r.overlap); } },
      { label: '历史评价条数', get: function (r) { return r.historyCount; }, metric: function (r) { return numOf(r.historyCount); } }
    ];
    var maxes = defs.map(function (d) {
      return d.metric ? Math.max.apply(null, rows.map(d.metric)) : null;
    });

    var labelTd = 'padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);color:var(--ink-3);white-space:nowrap;font-size:12px';
    var cellTd = 'padding:10px 12px;text-align:center;border-bottom:1px solid var(--line)';

    var head =
      '<tr><th style="' + labelTd + ';font-weight:600">对比项</th>' +
        rows.map(function (r) {
          return '<th style="padding:12px;border-bottom:1px solid var(--line);text-align:center">' +
            '<div style="font-weight:800;font-size:14px">' + esc(r.name) + '</div>' +
            '<div style="margin-top:4px">' + UI.statusBadge(UI.CAND_STATUS, r.status) + '</div>' +
          '</th>';
        }).join('') +
      '</tr>';

    var body = defs.map(function (d, i) {
      return '<tr><td style="' + labelTd + '">' + d.label + '</td>' +
        rows.map(function (r) {
          var best = d.metric && rows.length > 1 && d.metric(r) === maxes[i] && maxes[i] > 0;
          return '<td style="' + cellTd + (best ? 'color:var(--brand);font-weight:800' : '') + '">' + d.get(r) + '</td>';
        }).join('') +
      '</tr>';
    }).join('');

    var foot =
      '<tr><td style="' + labelTd + '">排班操作</td>' +
        rows.map(function (r) {
          var html;
          if (r.status === 'pending') {
            html = '<button class="btn btn-primary btn-sm" data-cid="' + esc(r.id) + '">选择此人排班</button>';
          } else if (r.status === 'passed') {
            html = '<span class="badge b-ok">' + UI.icon('check-circle') + '已排班</span>';
          } else {
            html = '<span class="badge b-mute">已婉拒</span>';
          }
          return '<td style="' + cellTd + '">' + html + '</td>';
        }).join('') +
      '</tr>';

    var mask = document.createElement('div');
    mask.id = 'ui-compare-mask';
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="modal-card" style="max-width:720px;width:100%">' +
        '<div class="modal-head"><h3>候选人对比</h3>' +
          '<button class="modal-x" aria-label="关闭">' + UI.icon('x') + '</button></div>' +
        '<div class="modal-body" style="padding:4px 16px 10px;overflow-x:auto">' +
          '<div style="font-size:12px;color:var(--ink-3);margin-bottom:8px">每列最高值已用品牌色高亮</div>' +
          '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
            '<thead>' + head + '</thead><tbody>' + body + foot + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="modal-foot"><button class="btn btn-outline" data-act="close">关闭</button></div>' +
      '</div>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('show'); });

    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.closest('.modal-x') || e.target.closest('[data-act="close"]')) {
        closeMaskEl(mask);
        return;
      }
      var pick = e.target.closest('[data-cid]');
      if (!pick) return;
      var cid = pick.dataset.cid;
      var row = rows.filter(function (r) { return r.id === cid; })[0];
      pick.disabled = true;
      API.decideCandidate(jid, cid, true).then(function (res) {
        if (res && res.ok === false) {
          pick.disabled = false;
          UI.toast(res.reason || '排班失败', 'err');
          return;
        }
        (state.candMap[jid] || []).forEach(function (c) {
          if (c.id === cid) c.status = 'passed';
        });
        UI.toast('已选择 ' + (row ? row.name : '候选人') + ' 并完成排班', 'ok');
        closeMaskEl(mask);
        renderCandidates();
        renderCandChips();
        renderStats();
      });
    });
  }

  /* ---------- 导出候选人名单 ---------- */
  function exportCandidates() {
    var jid = state.candJobId;
    if (!jid) { UI.toast('请先选择职位', 'warn'); return; }
    var btn = document.getElementById('candExportBtn');
    if (btn) btn.disabled = true;
    API.exportCandidatesCsv(jid).then(function (csv) {
      var name = (state.overview && state.overview.profile && state.overview.profile.name) || '商家';
      var filename = '候选人名单_' + name + '_2026-11-01.csv';
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      var n = (state.candMap[jid] || []).length;
      UI.toast('已导出 ' + n + ' 位候选人', 'ok');
    }).then(function () {
      if (btn) btn.disabled = false;
    }, function () {
      if (btn) btn.disabled = false;
      UI.toast('导出失败，请重试', 'err');
    });
  }

  /* ---------- 职位排班周表 ---------- */
  function openSchedule(jobId) {
    var job = state.jobs.filter(function (j) { return j.id === jobId; })[0];
    API.getScheduleGrid(jobId).then(function (grid) {
      if (!grid || !grid.days || !grid.days.length || !grid.rows || !grid.rows.length) {
        UI.toast('该职位暂无排班时段', 'warn');
        return;
      }
      renderScheduleModal(job, grid);
    });
  }

  function renderScheduleModal(job, grid) {
    var old = document.getElementById('ui-schedule-mask');
    if (old) old.remove();

    var days = grid.days;
    var rows = grid.rows;
    var need = (job && job.headcount) || 0;
    var seen = {};
    var passedTotal = 0;
    rows.forEach(function (row) {
      days.forEach(function (d) {
        (row.cells[d] || []).forEach(function (c) {
          if (c.status !== 'passed') return;
          var key = d + '|' + c.name;
          if (!seen[key]) { seen[key] = 1; passedTotal += 1; }
        });
      });
    });
    var gapTotal = Math.max(0, need - passedTotal);

    var th = 'padding:10px 12px;font-size:12px;color:var(--ink-3);text-align:left;border-bottom:1px solid var(--line);white-space:nowrap';
    var td = 'padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top';

    var body = rows.map(function (row) {
      return '<tr><td style="' + td + ';font-size:12px;color:var(--ink-3);white-space:nowrap">' + esc(row.time) + '</td>' +
        days.map(function (d) {
          var cell = row.cells[d] || [];
          var passed = cell.filter(function (c) { return c.status === 'passed'; });
          var gap = Math.max(0, need - passed.length);
          var chips = passed.map(function (c) {
            return '<span class="badge b-ok" style="margin:2px 4px 2px 0">' + esc(c.name) + '</span>';
          }).join('');
          var gapHtml = gap > 0 ?
            '<span data-gap="1" style="display:inline-block;border:1px dashed var(--ink-4);border-radius:8px;padding:3px 9px;font-size:12px;color:var(--ink-3);cursor:pointer">待补 ' + gap + ' 人</span>' : '';
          return '<td style="' + td + '">' + (chips || gapHtml ? chips + gapHtml : '<span style="font-size:12px;color:var(--ink-3)">已排满</span>') + '</td>';
        }).join('') + '</tr>';
    }).join('');

    var mask = document.createElement('div');
    mask.id = 'ui-schedule-mask';
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="modal-card" style="max-width:640px;width:100%">' +
        '<div class="modal-head"><h3>排班表 · ' + esc(job ? job.title : '') + '</h3>' +
          '<button class="modal-x" aria-label="关闭">' + UI.icon('x') + '</button></div>' +
        '<div class="modal-body" style="padding:12px 18px 8px;overflow-x:auto">' +
          '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px;font-size:13px">' +
            '<span>本周末共排 <b class="num" style="color:var(--brand);font-size:16px">' + passedTotal + '</b> 人</span>' +
            '<span>缺口 <b class="num" style="color:var(--warn);font-size:16px">' + gapTotal + '</b> 人</span>' +
            '<span style="font-size:12px;color:var(--ink-3);margin-left:auto">' + UI.icon('info', 'icon-sm') + '点击虚线缺口可快速处理</span>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
            '<thead><tr><th style="' + th + '">时段</th>' +
              days.map(function (d) { return '<th style="' + th + '">' + esc(UI.DAY[d] || d) + '</th>'; }).join('') +
            '</tr></thead>' +
            '<tbody>' + body + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="modal-foot"><button class="btn btn-outline" data-act="close">关闭</button></div>' +
      '</div>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('show'); });

    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.closest('.modal-x') || e.target.closest('[data-act="close"]')) {
        closeMaskEl(mask);
        return;
      }
      if (e.target.closest('[data-gap]')) {
        UI.toast('去候选人页确认排班', 'ok');
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

  function setPublishMode() {
    state.editJobId = null;
    var head = $('#pub-mask .modal-head h3');
    if (head) head.textContent = '发布周末职位';
    var submit = $('#pub-submit');
    if (submit) submit.innerHTML = '发布职位';
    var preview = $('#pub-preview');
    if (preview) preview.style.display = '';
    var draft = $('#pub-save-draft');
    if (draft) draft.style.display = '';
  }

  function openPublish() {
    if (state.editJobId) { setPublishMode(); resetPublishForm(); }
    UI.openOverlay($('#pub-mask'));
    updatePubPreview();
  }

  function closePublish() {
    var wasEdit = !!state.editJobId;
    UI.closeOverlay($('#pub-mask'));
    if (wasEdit) { setPublishMode(); resetPublishForm(); }
  }

  function openEditJob(jobId) {
    var j = state.jobs.filter(function (x) { return x.id === jobId; })[0];
    if (!j) return;
    state.editJobId = jobId;

    var head = $('#pub-mask .modal-head h3');
    if (head) head.textContent = '编辑职位';
    var submit = $('#pub-submit');
    if (submit) submit.textContent = '保存修改';
    var preview = $('#pub-preview');
    if (preview) preview.style.display = 'none';
    var draft = $('#pub-save-draft');
    if (draft) draft.style.display = 'none';

    $('#f-title').value = j.title || '';
    $('#f-category').value = j.category || '';
    $('#f-pay').value = j.pay || '';
    $('#f-headcount').value = j.headcount || '';
    $('#f-addr').value = j.addr || '';
    $('#f-desc').value = j.desc || '';

    var settle = j.settle || '日结';
    if (!$('#f-settle .chip[data-v="' + settle + '"]')) settle = '日结';
    $$('#f-settle .chip').forEach(function (c) {
      c.classList.toggle('on', c.dataset.v === settle);
    });

    var days = j.days || [];
    $$('#f-days .chip').forEach(function (c) {
      c.classList.toggle('on', days.indexOf(c.dataset.v) > -1);
    });
    var skills = j.skills || [];
    $$('#f-skills .chip').forEach(function (c) {
      c.classList.toggle('on', skills.indexOf(c.dataset.v) > -1);
    });

    var parts = String(j.time || '').split('-');
    var start = (parts[0] || '09:00').trim();
    var end = (parts[1] || '18:00').trim();
    $('#f-start').value = start;
    $('#f-end').value = end;

    UI.openOverlay($('#pub-mask'));
    updatePubPreview();
  }

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
    var editingId = state.editJobId;
    var btn = $('#pub-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>' + (editingId ? '保存中…' : '发布中…');
    var payload = {
      title: title, category: category, pay: pay,
      settle: selectedVals('#f-settle')[0] || '日结',
      days: days, time: start + ' - ' + end,
      headcount: headcount,
      addr: $('#f-addr').value.trim(),
      desc: $('#f-desc').value.trim(),
      skills: selectedVals('#f-skills')
    };
    var req = editingId ? API.updateJob(editingId, payload) : API.createJob(payload);
    req.then(function (res) {
      btn.disabled = false;
      btn.innerHTML = editingId ? '保存修改' : '发布职位';
      if (res && res.ok === false) {
        UI.toast(res.reason || '操作失败，请重试', 'err');
        return;
      }
      UI.toast(editingId ? '职位已更新' : '发布成功，已进入招募列表');
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

  /* ---------- 轮询（每 20s，仅轻量刷新，不重复 toast） ---------- */
  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(function () {
      API.getMerchantJobs().then(function (jobs) {
        var changed = false;
        jobs.forEach(function (nj) {
          var old = state.jobs.find(function (x) { return x.id === nj.id; });
          if (old && nj.applied > old.applied) changed = true;
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
    }, 20000);
  }

  /* ---------- 自动确认事件 ---------- */
  function handleAutoConfirmed(e) {
    var detail = (e && e.detail) || {};
    UI.toast('系统自动确认了 ' + (detail.candName || '候选人') + ' 的排班', 'ok');
    var jid = detail.jobId;
    var p = Promise.resolve();
    if (jid) {
      p = p.then(function () {
        return API.getCandidates(jid).then(function (list) { state.candMap[jid] = list; });
      });
    }
    p.then(function () { return API.getMerchantJobs(); })
      .then(function (jobs) { state.jobs = jobs; return loadAllCandidates(); })
      .then(function () {
        if (state.page === 'jobs') renderJobs();
        if (state.page === 'candidates') { renderCandChips(); renderCandidates(); }
        renderStats();
        renderGaps();
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
      else if (btn.dataset.act === 'edit') openEditJob(id);
      else if (btn.dataset.act === 'schedule') openSchedule(id);
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

    // 候选人勾选：联动批量按钮/对比按钮
    $('#cand-grid').addEventListener('change', function (e) {
      if (!e.target.classList.contains('cand-check')) return;
      updateBatchButtons();
      var n = document.querySelectorAll('.cand-check:checked').length;
      if (n === 4) UI.toast('最多选择 3 人进行对比', 'warn');
    });

    // 自动确认事件（API 30s 扫描后派发）
    window.addEventListener('autoConfirmed', handleAutoConfirmed);

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
      renderRatingBreakdown();
      renderReviews();
      renderStats();
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
