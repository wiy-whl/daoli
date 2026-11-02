/* ============================================================
   兼职蜂 · 学生端原型逻辑（增强版）
   数据一律走 API.*，渲染使用字符串模板 + innerHTML
   ============================================================ */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var DAY_SHORT = { sat: '周六', sun: '周日' };
  var HOUR_OPTS = [];
  for (var h = 8; h <= 22; h++) HOUR_OPTS.push((h < 10 ? '0' : '') + h + ':00');
  var LS_RECENT = 'jzbee.recentSearch';

  var state = {
    tab: 'jobs',
    kw: '', cat: '全部', day: 'all', sort: 'smart', favoriteOnly: false,
    scheduleView: 'week',
    student: null,
    loaded: {}, dirty: {},
    sheetJob: null, sheetSlots: [], needHallRefresh: false,
    messages: [], announcements: [], unread: 0,
    showAutoConfirmDot: false,
    searchSuggestTimer: null
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

  function getRecentSearches() {
    try { return JSON.parse(localStorage.getItem(LS_RECENT) || '[]'); } catch (e) { return []; }
  }
  function saveRecentSearch(kw) {
    if (!kw) return;
    var list = getRecentSearches();
    list = list.filter(function (k) { return k !== kw; });
    list.unshift(kw);
    list = list.slice(0, 5);
    try { localStorage.setItem(LS_RECENT, JSON.stringify(list)); } catch (e) {}
  }

  function renderSearchSuggestions(suggestions) {
    var box = $('#search-suggest');
    if (!box) return;
    if (!suggestions || !suggestions.length) { box.innerHTML = ''; box.classList.remove('show'); return; }
    box.innerHTML = suggestions.slice(0, 6).map(function (s) {
      return '<div class="suggest-item" data-kw="' + s + '">' + UI.icon('search') + '<span>' + s + '</span></div>';
    }).join('');
    box.classList.add('show');
  }

  /* ---------- Tab 增强：新增消息 Tab + 5 Tab 结构 ---------- */
  function enhanceTabBar() {
    // 把 page-me 改成 hidden 模板，插入 page-messages
    var mePage = $('#page-me');
    var messagesHtml = '<section class="page" id="page-messages" hidden></section>';
    mePage.insertAdjacentHTML('beforebegin', messagesHtml);

    // 重排 tabbar：jobs / match / schedule / messages / me
    var tabbar = $('.tabbar');
    tabbar.innerHTML =
      '<button class="tab on" data-tab="jobs">' +
        UI.icon('briefcase') + '<span>职位大厅</span>' +
      '</button>' +
      '<button class="tab" data-tab="match">' +
        UI.icon('zap') + '<span>智能匹配</span>' +
      '</button>' +
      '<button class="tab" data-tab="schedule">' +
        UI.icon('calendar') + '<span>日程</span>' +
      '</button>' +
      '<button class="tab" data-tab="messages">' +
        UI.icon('message') + '<span>消息</span>' +
        '<span class="tab-badge" id="tabMsgBadge" hidden></span>' +
      '</button>' +
      '<button class="tab" data-tab="me">' +
        UI.icon('user') + '<span>我的</span>' +
      '</button>';

    // 在搜索框下注入搜索建议下拉
    var searchBox = $('#page-jobs .search-box');
    if (searchBox && !$('#search-suggest')) {
      searchBox.style.position = 'relative';
      var suggestBox = document.createElement('div');
      suggestBox.id = 'search-suggest';
      searchBox.appendChild(suggestBox);

      // 最近搜索 chip 条
      var recentBar = document.createElement('div');
      recentBar.id = 'recent-searches';
      recentBar.className = 'chips scroll f-row';
      recentBar.style.cssText = 'padding:0 14px;margin-top:8px;min-height:30px';
      $('#jobFilters').before(recentBar);

      // 收藏 chip
      var favChip = document.createElement('div');
      favChip.id = 'fav-chip-row';
      favChip.style.cssText = 'padding:6px 14px 0';
      favChip.innerHTML = '<button class="chip" id="favOnlyChip" style="font-size:12px">' + UI.icon('star-fill', 'icon-sm') + '只看收藏</button>';
      $('#jobFilters').before(favChip);
    }
  }

  function renderRecentSearches() {
    var box = $('#recent-searches');
    if (!box) return;
    var list = getRecentSearches();
    if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<span style="color:var(--ink-3);font-size:12px;align-self:center">' + UI.icon('clock', 'icon-sm') + '最近搜索</span>' +
      list.map(function (kw) { return '<button class="chip recent-chip" data-kw="' + kw + '">' + kw + '</button>'; }).join('') +
      '<button class="chip" id="clearRecentChip" style="font-size:11px;color:var(--ink-3)">清空</button>';
  }

  function updateMsgBadge() {
    var badge = $('#tabMsgBadge');
    if (!badge) return;
    if (state.unread > 0) {
      badge.hidden = false;
      badge.textContent = state.unread > 99 ? '99+' : state.unread;
    } else {
      badge.hidden = true;
    }
  }

  /* ---------- Tab1 职位大厅（增强版） ---------- */
  function jobCard(j) {
    var isFav = j.favorite || (state.favoriteOnly ? true : false);
    var favIcon = isFav ? 'star-fill' : 'star';
    var favColor = isFav ? '#F27B13' : '';
    var tags = (j.tags || []).slice(0, 3).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
    var response = j.responseTime || '当天';
    var postedAgo = j.publishedAt ? j.publishedAt + ' 发布' : '';
    return '<article class="card job-card" data-id="' + j.id + '">' +
      '<button class="jc-fav" data-favid="' + j.id + '" aria-label="收藏" style="position:absolute;top:14px;right:14px;z-index:2">' +
        UI.icon(favIcon, 'icon-lg') +
      '</button>' +
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
      '<div class="jc-skills">' + tags + '</div>' +
      '<div class="jc-foot"><span class="jc-applied">已报名 <b class="num">' + j.applied + '/' + j.headcount + '</b></span>' +
      '<span class="badge b-brand">匹配 ' + j.match + '</span></div>' +
      '<div style="margin-top:6px;color:var(--ink-3);font-size:11px;display:flex;gap:10px">' +
        '<span>' + postedAgo + '</span>' +
        '<span>' + UI.icon('eye', 'icon-sm') + (j.views || 0) + ' 次浏览</span>' +
        '<span>' + UI.icon('clock', 'icon-sm') + '响应 ' + response + '</span>' +
      '</div>' +
    '</article>';
  }

  function loadHall() {
    var box = $('#jobList');
    box.innerHTML = skList(3);
    var params = { kw: state.kw, cat: state.cat, day: state.day, sort: state.sort };
    if (state.favoriteOnly) params.favoriteOnly = true;

    API.listJobs(params).then(function (list) {
      // 收藏过滤后也需要带上 favorite 状态（listJobs 内部 M.favorites 已经同步到 jobs.favorite）
      return list;
    }).then(function (list) {
      var summary = '<div style="padding:8px 14px 2px;color:var(--ink-3);font-size:12px">' +
        UI.icon('search', 'icon-sm') + '已找到 <b class="num">' + list.length + '</b> 条职位' +
        (state.kw ? ' · 搜索「' + state.kw + '」' : '') +
        (state.favoriteOnly ? ' · 只看收藏' : '') +
      '</div>';
      $('#hall-summary').innerHTML = summary;
      box.innerHTML = list.length
        ? list.map(jobCard).join('')
        : emptyHtml('search', '没有找到符合条件的职位', '试试放宽筛选条件');
    });
  }

  /* ---------- 职位详情底部弹层（增强版） ---------- */
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

    var isFav = job.favorite === true;
    var favBtnIcon = isFav ? 'star-fill' : 'star';
    var badges = '';
    if (job.responseTime) {
      badges += '<span class="badge b-ok">' + UI.icon('clock', 'icon-sm') + '响应 ' + job.responseTime + '</span>';
    }

    var tags = (job.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');

    $('#sheetBody').innerHTML =
      '<div class="sh-top-bar" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">' +
        badges +
        '<button class="btn btn-ghost btn-sm" id="sheetFavBtn" style="margin-left:auto">' +
          UI.icon(favBtnIcon, 'icon-sm') + (isFav ? '已收藏' : '收藏') +
        '</button>' +
      '</div>' +
      '<div class="sh-mer"><div class="avatar">' + job.merchant.charAt(0) + '</div><div>' +
        '<div class="sh-mer-name">' + job.merchant + ' <span class="badge b-ok">实名</span>' +
        (job.merchantTel ? '<span class="badge b-brand" style="margin-left:6px">' + UI.icon('phone', 'icon-sm') + job.merchantTel + '</span>' : '') +
        '</div>' +
        '<div class="jc-rate">' + UI.stars(job.rating) + '<b class="num">' + job.rating + '</b></div>' +
      '</div></div>' +
      '<div class="kv sh-addr">' + UI.icon('map-pin') + job.addr + ' · ' + job.distance + 'km</div>' +
      '<div class="sh-pay"><b class="num">' + UI.money(job.pay) + '/' + job.unit + '</b>' +
        '<span class="tag">' + job.settle + '</span>' +
        '<span class="kv">' + UI.icon('users') + '招 ' + job.headcount + ' 人 · 已报 ' + job.applied + '</span></div>' +
      (tags ? '<div style="margin-top:10px">' + tags + '</div>' : '') +
      '<div class="sh-sec"><h4>' + UI.icon('file-text') + '职位描述</h4><p>' + job.desc + '</p></div>' +
      '<div class="sh-sec"><h4>' + UI.icon('shield-check') + '岗位要求</h4><p>' + job.req + '</p></div>' +
      '<div class="sh-sec"><h4>' + UI.icon('clock') + '选择到岗时段（可多选）</h4>' + slotHtml + '</div>' +
      (job.similar && job.similar.length ?
        '<div class="sh-sec"><h4>' + UI.icon('sparkles') + '相似职位推荐</h4>' +
        '<div class="jc-skills" style="flex-wrap:wrap;gap:6px;margin-top:8px">' +
        job.similar.map(function (s) {
          return '<button class="chip similar-chip" data-simid="' + s.id + '">' + s.title + ' · ' + UI.money(s.pay) + '</button>';
        }).join('') + '</div></div>' : '');

    $('#sheetFoot').innerHTML =
      '<div class="sh-count">已选 <b class="num" id="slotCount">0</b> 个时段</div>' +
      '<button class="btn btn-primary" id="applyBtn" style="flex:1"' + (applied ? ' disabled' : '') + '>' +
      (applied ? '已报名' : '立即报名') + '</button>';

    // 收藏按钮事件
    $('#sheetFavBtn').addEventListener('click', function () {
      toggleJobFavorite(job.id);
    });
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
      state.dirty.messages = true;
    });
  }

  function toggleJobFavorite(jobId) {
    API.toggleFavorite(jobId).then(function (res) {
      UI.toast(res.favorite ? '已收藏' : '已取消收藏', res.favorite ? 'ok' : 'warn');
      if (state.sheetJob && state.sheetJob.id === jobId) state.sheetJob.favorite = res.favorite;
      state.needHallRefresh = true;
      state.dirty.me = true;
      // 如果当前在 me tab 或 hall tab 就刷新
      if (state.tab === 'me') loadMe();
      if (state.tab === 'jobs') loadHall();
      else {
        // sheet 里也要更新
        API.getJob(jobId).then(function (j) {
          state.sheetJob = j;
          var applied = false; // 简化：只更新 fav 状态
          renderSheet(j, applied);
        });
      }
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

  /* ---------- Tab3 日程（增强版） ---------- */
  function countDownTo(s) {
    // s = 'sat' 或 'sun' + 时间
    var daysAfter = s.d === 'sat' ? 0 : 1;
    var target = new Date();
    target.setDate(target.getDate() + daysAfter);
    var t = (s.s || '09:00').split(':');
    target.setHours(+t[0], +t[1], 0, 0);
    var diff = target - new Date();
    if (diff <= 0) return '已到岗';
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    if (d > 0) return '距到岗还有 ' + d + ' 天';
    return '距到岗还有 ' + h + ' 小时';
  }

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

  function scheduleListView(shifts) {
    // 按时间倒序
    var items = [];
    shifts.forEach(function (a) {
      a.slots.forEach(function (s) {
        items.push({ a: a, s: s });
      });
    });
    items.sort(function (x, y) {
      var dx = x.s.d === 'sun' ? 1 : 0;
      var dy = y.s.d === 'sun' ? 1 : 0;
      if (dx !== dy) return dy - dx; // sun 在前
      return toMin(y.s.s) - toMin(x.s.s);
    });
    if (!items.length) return emptyHtml('calendar', '暂无排班', '完成报名后会在这里展示');
    return items.map(function (it) {
      var a = it.a, s = it.s;
      var cd = a.status === 'scheduled' ? countDownTo(s) : '';
      return '<div class="card" style="padding:14px 16px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div style="font-size:12px;color:var(--ink-3);display:flex;flex-direction:column;align-items:center;min-width:44px">' +
            '<b>' + DAY_SHORT[s.d] + '</b>' +
            '<b style="color:var(--brand)">' + s.s + '</b>' +
          '</div>' +
          '<div style="flex:1">' +
            '<div style="font-weight:600">' + a.job.title + '</div>' +
            '<div style="font-size:12px;color:var(--ink-3)">' + a.job.merchant + ' · ' + s.s + '-' + s.e + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div class="num">' + UI.money(slotHours(s) * a.job.pay) + '</div>' +
            UI.statusBadge(UI.APP_STATUS, a.status) +
          '</div>' +
        '</div>' +
        (cd ? '<div style="font-size:11px;color:var(--brand);margin-top:8px">' + UI.icon('clock', 'icon-sm') + cd + '</div>' : '') +
      '</div>';
    }).join('');
  }

  function renderScheduleBody(shifts) {
    var box = $('#scheduleBody');
    var header =
      '<div style="display:flex;align-items:center;gap:8px;margin-top:4px">' +
        '<div class="chips" id="schedule-view-toggle">' +
          '<button class="chip ' + (state.scheduleView === 'week' ? 'on' : '') + '" data-view="week">周视图</button>' +
          '<button class="chip ' + (state.scheduleView === 'list' ? 'on' : '') + '" data-view="list">列表视图</button>' +
        '</div>' +
        '<button class="btn btn-ghost btn-sm" id="addFavShiftBtn" style="margin-left:auto">' + UI.icon('plus', 'icon-sm') + '新增收藏</button>' +
        '<span id="autoConfirmDot" style="width:10px;height:10px;border-radius:50%;background:var(--ok);margin-right:4px;flex-shrink:0"></span>' +
      '</div>';

    var content;
    if (state.scheduleView === 'week') {
      content = '<div class="list">' + dayCard('sat', shifts) + dayCard('sun', shifts) + incomeCard(shifts) + '</div>';
    } else {
      content = '<div class="list">' + scheduleListView(shifts) + incomeCard(shifts) + '</div>';
    }

    box.innerHTML = header + content;
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
      renderScheduleBody(shifts);
    });
  }

  /* ---------- Tab4 消息（新增） ---------- */
  function loadMessages() {
    var box = $('#page-messages');
    box.innerHTML = '<div class="list">' + skList(3) + '</div>';
    Promise.all([API.getMessages(), API.getAnnouncements()]).then(function (rs) {
      var msgs = rs[0], anns = rs[1];
      state.messages = msgs;
      state.announcements = anns;
      state.unread = msgs.filter(function (m) { return !m.read; }).length;
      updateMsgBadge();
      renderMessages(msgs, anns);
    });
  }

  function msgBadge(m) {
    if (m.from === '兼职蜂平台') return '<span class="badge b-brand">系统公告</span>';
    if (m.title.indexOf('通过') > -1 || m.title.indexOf('已') > -1) return '<span class="badge b-ok">商家确认</span>';
    if (m.title.indexOf('拒绝') > -1 || m.title.indexOf('未') > -1) return '<span class="badge b-danger">商家拒绝</span>';
    if (m.title.indexOf('到岗') > -1 || m.title.indexOf('提醒') > -1) return '<span class="badge b-warn">到岗提醒</span>';
    return '<span class="badge b-mute">通知</span>';
  }

  function renderMessages(msgs, anns) {
    var box = $('#page-messages');
    var latestAnn = anns && anns[0];
    var annBar = latestAnn ?
      '<div style="margin:0 14px 12px;padding:12px 14px;background:linear-gradient(135deg,#FFF4E6,#FFE8CC);border-radius:12px;font-size:13px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          UI.icon('megaphone', 'icon-lg') +
          '<span style="font-weight:600;color:#F27B13">平台公告</span>' +
          '<span class="badge b-brand">' + latestAnn.tag + '</span>' +
        '</div>' +
        '<div style="margin-top:6px;color:var(--ink-1);font-weight:500">' + latestAnn.title + '</div>' +
        '<div style="margin-top:4px;color:var(--ink-3);font-size:12px">' + latestAnn.content + '</div>' +
        '<button class="btn btn-ghost btn-sm" id="viewAllAnns" style="margin-top:8px;padding:0">查看全部公告</button>' +
      '</div>' : '';

    var listHtml = msgs.map(function (m) {
      var unreadDot = !m.read ? '<span style="width:8px;height:8px;background:var(--brand);border-radius:50%;flex-shrink:0"></span>' : '<span style="width:8px"></span>';
      return '<div class="card msg-card" data-msgid="' + m.id + '" style="padding:14px 16px;cursor:pointer">' +
        '<div style="display:flex;align-items:flex-start;gap:10px">' +
          unreadDot +
          '<div style="flex:1">' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              msgBadge(m) +
              '<b style="font-size:14px">' + m.title + '</b>' +
            '</div>' +
            '<div style="margin-top:6px;font-size:12px;color:var(--ink-2);line-height:1.5">' + m.content + '</div>' +
            '<div style="margin-top:8px;font-size:11px;color:var(--ink-3)">' + m.time + ' · ' + m.from + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    box.innerHTML = annBar + '<div class="list" style="padding-top:0">' + listHtml + '</div>';
  }

  function openMsgDetail(msgId) {
    var m = state.messages.find(function (x) { return x.id === msgId; });
    if (!m) return;
    API.markMessageRead(msgId).then(function () {
      m.read = true;
      state.unread = state.messages.filter(function (x) { return !x.read; }).length;
      updateMsgBadge();
      // 重新渲染 messages 列表（带已读状态）
      renderMessages(state.messages, state.announcements);

      // 打开详情 modal
      var old = document.getElementById('ui-confirm-mask');
      if (old) old.remove();
      var mask = document.createElement('div');
      mask.id = 'ui-confirm-mask';
      mask.className = 'mask show';
      mask.innerHTML =
        '<div class="modal-card" style="max-width:360px">' +
        '<div class="modal-head"><h3>' + m.title + '</h3><button class="modal-x" aria-label="关闭">' + UI.icon('x') + '</button></div>' +
        '<div class="modal-body" style="padding:18px 20px">' +
          '<div style="font-size:13px;color:var(--ink-1);line-height:1.6">' + m.content + '</div>' +
          '<div style="margin-top:14px;font-size:11px;color:var(--ink-3)">' + m.time + ' · 来自 ' + m.from + '</div>' +
        '</div>' +
        '</div>';
      document.body.appendChild(mask);
      mask.addEventListener('click', function (e) {
        if (e.target === mask || e.target.closest('.modal-x')) mask.remove();
      });
    });
  }

  /* ---------- Tab5 我的（增强版） ---------- */
  function loadMe() {
    var box = $('#page-me');
    box.innerHTML = '<div class="list">' + skList(3) + '</div>';
    Promise.all([API.getStudent(), API.getMyApplications(), API.getFavorites()]).then(function (rs) {
      var stu = rs[0], apps = rs[1], favJobs = rs[2];
      state.student = stu;

      // 计算收入
      var lastIncome = 0;
      var totalIncome = 0;
      (stu.wallet.records || []).forEach(function (r) {
        if (r.status === 'settled') {
          totalIncome += r.amount;
          if (!lastIncome) lastIncome = r.amount;
        }
      });
      // 近 6 周 mini bar（模拟）
      var weekBars = [120, 230, 180, 210, 350, stu.wallet.balance || 260];
      var maxBar = Math.max.apply(null, weekBars);

      var profile =
        '<div class="card me-profile">' +
          '<div class="avatar lg">' + stu.avatarText + '</div>' +
          '<div class="me-id"><b>' + stu.name + '</b><p>' + stu.school + ' · ' + stu.major + ' · ' + stu.grade + '</p></div>' +
          '<div class="me-hex">' + UI.hexBadge(stu.credit, 72, '信用分') + '<small>' + stu.creditLevel + '</small></div>' +
        '</div>' +
        '<div class="card stat3">' +
          '<div><b class="num">' + stu.stats.doneJobs + '</b><span>完成单数</span></div>' +
          '<div><b class="num">' + UI.money(lastIncome) + '</b><span>最近收入</span></div>' +
          '<div><b class="num">' + UI.money(totalIncome) + '</b><span>累计收入</span></div>' +
        '</div>';

      var wallet =
        '<div class="card card-pad">' +
          '<div class="card-title">' + UI.icon('wallet') + '我的钱包' +
            '<button class="btn btn-outline btn-sm" id="withdrawBtn" style="margin-left:auto">' + UI.icon('banknote', 'icon-sm') + '提现</button>' +
          '</div>' +
          '<div class="wallet-top"><div><span class="wallet-label">余额（元）</span>' +
            '<b class="wallet-num num">' + stu.wallet.balance + '</b></div>' +
            '<div class="wallet-frozen"><span>冻结中</span><b class="num">' + UI.money(stu.wallet.frozen) + '</b></div></div>' +
          '<div style="margin-top:12px">' +
            '<div style="font-size:12px;color:var(--ink-3);margin-bottom:6px">近 6 周收入趋势</div>' +
            '<div style="display:flex;gap:4px;align-items:flex-end;height:48px">' +
              weekBars.map(function (v) {
                var pct = Math.round(v / maxBar * 100);
                return '<div style="flex:1;background:var(--brand);border-radius:3px 3px 0 0;height:' + Math.max(8, pct) + '%"></div>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<hr class="divider">' +
          (stu.wallet.records || []).map(function (r) {
            var recMap = { settled: ['已到账', 'b-ok'], settling: ['结算中', 'b-warn'] };
            var st = recMap[r.status] || ['已到账', 'b-ok'];
            return '<div class="list-row"><div class="app-main"><b>' + r.title + '</b><p class="num">' + r.date + '</p></div>' +
              '<div class="app-side"><b class="num" style="color:var(--ok)">+' + UI.money(r.amount) + '</b>' +
              '<span class="badge ' + st[1] + '">' + st[0] + '</span></div></div>';
          }).join('') +
        '</div>';

      var favCardHtml = favJobs.length ?
        '<div class="card card-pad">' +
          '<div class="card-title">' + UI.icon('star-fill') + '我的收藏</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
            favJobs.map(function (j) {
              return '<div class="card" style="padding:10px;cursor:pointer" data-id="' + j.id + '">' +
                '<div style="display:flex;gap:6px">' +
                  '<div style="flex:1">' +
                    '<div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + j.title + '</div>' +
                    '<div style="font-size:11px;color:var(--ink-3)">' + j.merchant + '</div>' +
                    '<div class="num" style="font-size:14px;margin-top:2px">' + UI.money(j.pay) + '/' + j.unit + '</div>' +
                  '</div>' +
                  '<button class="btn btn-ghost btn-sm fav-remove" data-favid="' + j.id + '" aria-label="取消收藏" style="align-self:flex-start;padding:4px">' +
                    UI.icon('x', 'icon-sm') +
                  '</button>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '';

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

      box.innerHTML = '<div class="list">' + profile + wallet + favCardHtml + skills + ft + appsCard + '</div>';
    });
  }

  /* ---------- 提现弹窗 ---------- */
  function openWithdraw() {
    if (!state.student) { UI.toast('请先登录', 'warn'); return; }
    var bal = state.student.wallet.balance;
    var old = document.getElementById('ui-confirm-mask');
    if (old) old.remove();

    var mask = document.createElement('div');
    mask.id = 'ui-confirm-mask';
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="modal-card" style="max-width:360px">' +
        '<div class="modal-head"><h3>提现到账</h3><button class="modal-x" aria-label="关闭">' + UI.icon('x') + '</button></div>' +
        '<div class="modal-body" style="padding:18px 20px">' +
          '<div style="font-size:12px;color:var(--ink-3)">可提现余额</div>' +
          '<div class="wallet-num num" style="font-size:28px">' + UI.money(bal) + '</div>' +
          '<div class="field" style="margin-top:16px">' +
            '<label>提现金额</label>' +
            '<input class="input" id="withdrawAmt" type="number" min="1" placeholder="输入金额">' +
          '</div>' +
          '<div class="field">' +
            '<label>到账方式</label>' +
            '<div class="chips" id="withdrawMethod">' +
              '<span class="chip on" data-v="微信">微信</span>' +
              '<span class="chip" data-v="支付宝">支付宝</span>' +
              '<span class="chip" data-v="银行卡">银行卡</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-outline" id="withdrawCancel">取消</button>' +
          '<button class="btn btn-primary" id="withdrawConfirm">确认提现</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('show'); });

    // 结算方式 chips 互斥
    $('#withdrawMethod').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', this).forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
    });

    $('#withdrawCancel').addEventListener('click', function () { mask.remove(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
    mask.querySelector('.modal-x').addEventListener('click', function () { mask.remove(); });

    $('#withdrawConfirm').addEventListener('click', function () {
      var amt = +$('#withdrawAmt').value;
      if (!amt || amt <= 0) { UI.toast('请输入有效金额', 'warn'); return; }
      if (amt > bal) { UI.toast('提现金额不得超过余额', 'warn'); return; }
      var method = $$('.chip.on', $('#withdrawMethod')).map(function (c) { return c.dataset.v; })[0];
      setTimeout(function () {
        state.student.wallet.balance = bal - amt;
        mask.remove();
        UI.toast('提现申请已提交', 'ok');
        if (state.tab === 'me') loadMe();
      }, 300);
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
    else if (t === 'messages') loadMessages();
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

  /* ---------- 键盘全局 / Esc ---------- */
  function bindGlobals() {
    document.addEventListener('keydown', function (e) {
      var isInput = ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) > -1;
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        $('#kw').focus();
      }
      if (e.key === 'Escape') {
        // 关闭任意 mask 或 sheet
        var sheets = document.querySelectorAll('.sheet.show');
        var masks = document.querySelectorAll('.mask.show, .sheet-mask.show');
        if (sheets.length) {
          sheets.forEach(function (s) { s.classList.remove('show'); });
          masks.forEach(function (m) { m.classList.remove('show'); });
        } else if (masks.length) {
          masks.forEach(function (m) { m.classList.remove('show'); });
        }
        // 搜索建议下拉
        var sug = document.getElementById('search-suggest');
        if (sug) sug.classList.remove('show');
      }
    });

    // 页面卸载时停止自动确认
    window.addEventListener('beforeunload', function () {
      try { API.stopAutoConfirm(); } catch (e) {}
    });
  }

  /* ---------- 自动确认监听 ---------- */
  function bindAutoConfirm() {
    // 监听 api.js 内部派发的自定义事件（如果 api.js 没派发，这里兜底）
    // api.js 的自动确认目前没 dispatch 事件，我们自己轮询 state.messages
    // 但题目要求 api.js 不能改，所以我们自己用定时器 + 对比 messages 长度来检测
    var lastMsgCount = (state.messages || []).length;
    setInterval(function () {
      if (state.tab === 'messages') return; // 消息页正在看，不用闪
      API.getMessages().then(function (msgs) {
        var newLen = msgs.length;
        if (newLen > lastMsgCount) {
          var diff = newLen - lastMsgCount;
          lastMsgCount = newLen;
          // 检查新消息是否自动确认相关
          var newMsgs = msgs.slice(msgs.length - diff);
          var hasAuto = newMsgs.some(function (m) { return m.title.indexOf('自动') > -1; });
          if (hasAuto) {
            state.showAutoConfirmDot = true;
            var dot = document.getElementById('autoConfirmDot');
            if (dot) {
              dot.style.background = '#F27B13';
              dot.style.animation = 'pulse 1s infinite';
            }
            UI.toast('系统自动帮你确认了 1 个排班', 'ok');
            // 刷新相关 tab
            if (state.tab === 'schedule') { loadSchedule(); }
            if (state.tab === 'me') { loadMe(); }
          }
          state.messages = msgs;
          state.unread = msgs.filter(function (m) { return !m.read; }).length;
          updateMsgBadge();
        } else {
          lastMsgCount = newLen;
          state.messages = msgs;
          state.unread = msgs.filter(function (m) { return !m.read; }).length;
          updateMsgBadge();
        }
      });
    }, 10000);
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    // 搜索输入：先显示下拉建议
    $('#kw').addEventListener('input', function () {
      state.kw = $('#kw').value.trim();
      clearTimeout(state.searchSuggestTimer);
      state.searchSuggestTimer = setTimeout(function () {
        API.searchSuggestions(state.kw).then(function (list) {
          renderSearchSuggestions(list);
        });
      }, 200);
      // 清空建议后再按 Enter 或失焦才真正搜索
    });
    $('#kw').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        saveRecentSearch(state.kw);
        renderRecentSearches();
        renderSearchSuggestions([]);
        loadHall();
      }
    });
    $('#kw').addEventListener('blur', function () {
      setTimeout(function () { renderSearchSuggestions([]); }, 150);
    });

    // 搜索建议点击
    var sugBox = document.getElementById('search-suggest');
    if (sugBox) {
      sugBox.addEventListener('click', function (e) {
        var item = e.target.closest('.suggest-item');
        if (!item) return;
        var kw = item.dataset.kw;
        state.kw = kw;
        $('#kw').value = kw;
        saveRecentSearch(kw);
        renderRecentSearches();
        renderSearchSuggestions([]);
        loadHall();
      });
    }

    // 最近搜索 chip
    var recentBar = $('#recent-searches');
    if (recentBar) {
      recentBar.addEventListener('click', function (e) {
        var chip = e.target.closest('.recent-chip');
        var clearBtn = e.target.closest('#clearRecentChip');
        if (chip) {
          var kw = chip.dataset.kw;
          state.kw = kw;
          $('#kw').value = kw;
          loadHall();
        }
        if (clearBtn) {
          try { localStorage.removeItem(LS_RECENT); } catch (err) {}
          renderRecentSearches();
        }
      });
    }

    // 收藏 chip
    var favChipRow = $('#fav-chip-row');
    if (favChipRow) {
      favChipRow.addEventListener('click', function (e) {
        var btn = e.target.closest('#favOnlyChip');
        if (!btn) return;
        state.favoriteOnly = !state.favoriteOnly;
        btn.classList.toggle('on', state.favoriteOnly);
        loadHall();
      });
    }

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

    // 页面区：卡片点击 + 动作按钮
    $('.pages').addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (act) {
        var a = act.getAttribute('data-act');
        if (a === 'ft-edit') openFreeTime();
        else if (a === 'skill-edit') UI.toast('演示版暂未开放', 'warn');
        return;
      }
      var card = e.target.closest('[data-id]');
      if (card) {
        var favRem = e.target.closest('.fav-remove');
        if (favRem) {
          toggleJobFavorite(favRem.dataset.favid);
          return;
        }
        openJob(card.getAttribute('data-id'));
      }
    });

    // 大厅收藏按钮
    $('#jobList').addEventListener('click', function (e) {
      var favBtn = e.target.closest('.jc-fav');
      if (favBtn) {
        e.stopPropagation();
        toggleJobFavorite(favBtn.dataset.favid);
      }
    });

    // 详情弹层：选时段 / 报名 / 收藏 / 相似职位
    $('#jobSheet').addEventListener('click', function (e) {
      var simChip = e.target.closest('.similar-chip');
      if (simChip) {
        openJob(simChip.dataset.simid);
        return;
      }
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

    // 消息列表点击
    var msgPage = $('#page-messages');
    if (msgPage) {
      msgPage.addEventListener('click', function (e) {
        var card = e.target.closest('.msg-card');
        if (card) openMsgDetail(card.dataset.msgid);
      });
      msgPage.addEventListener('click', function (e) {
        if (e.target.closest('#viewAllAnns')) {
          UI.toast('查看全部公告：演示版暂未开放', 'warn');
        }
      });
    }

    // 日程视图切换 + 新增收藏
    $('#scheduleBody').addEventListener('click', function (e) {
      var toggle = e.target.closest('#schedule-view-toggle .chip');
      if (toggle) {
        state.scheduleView = toggle.dataset.view;
        loadSchedule();
        return;
      }
      var addBtn = e.target.closest('#addFavShiftBtn');
      if (addBtn) {
        // 弹出收藏职位列表让用户选择
        openFavPicker();
      }
    });

    // 提现按钮
    var withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
      // 用事件委托：因为 me tab 是动态渲染的
    }
    $('#page-me').addEventListener('click', function (e) {
      var btn = e.target.closest('#withdrawBtn');
      if (btn) openWithdraw();
    });

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
    $('#bellBtn').addEventListener('click', function () {
      // 跳转到消息 tab
      var msgTab = document.querySelector('.tab[data-tab="messages"]');
      if (msgTab) switchTab(msgTab);
    });
  }

  function openFavPicker() {
    API.getFavorites().then(function (list) {
      if (!list.length) { UI.toast('收藏列表为空，先去大厅收藏几个吧', 'warn'); return; }
      var old = document.getElementById('ui-confirm-mask');
      if (old) old.remove();
      var mask = document.createElement('div');
      mask.id = 'ui-confirm-mask';
      mask.className = 'mask show';
      mask.innerHTML =
        '<div class="modal-card" style="max-width:360px">' +
        '<div class="modal-head"><h3>从收藏中选择职位</h3><button class="modal-x" aria-label="关闭">' + UI.icon('x') + '</button></div>' +
        '<div class="modal-body" style="padding:14px 16px">' +
          list.map(function (j) {
            return '<div class="list-row" data-favid="' + j.id + '" style="cursor:pointer">' +
              '<div class="app-main"><b>' + j.title + '</b><p style="color:var(--ink-3);font-size:12px">' + j.merchant + ' · ' + UI.money(j.pay) + '</p></div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '</div>';
      document.body.appendChild(mask);
      mask.addEventListener('click', function (e) {
        if (e.target === mask || e.target.closest('.modal-x')) { mask.remove(); return; }
        var row = e.target.closest('[data-favid]');
        if (row) {
          mask.remove();
          openJob(row.dataset.favid);
        }
      });
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    // 增强 tabbar
    enhanceTabBar();

    // 在 jobFilters 之前插入 hall-summary 容器
    var summary = document.createElement('div');
    summary.id = 'hall-summary';
    summary.style.cssText = 'padding:6px 14px 0;color:var(--ink-3);font-size:12px';
    $('#jobFilters').before(summary);

    // 分类 chips
    $('#catChips').innerHTML = '<button class="chip on" data-g="cat" data-v="全部">全部</button>' +
      MOCK.CATEGORIES.map(function (c) {
        return '<button class="chip" data-g="cat" data-v="' + c + '">' + c + '</button>';
      }).join('');

    // 时段编辑弹窗的整点选项
    $$('.ft-row .select').forEach(function (sel) {
      sel.innerHTML = HOUR_OPTS.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');
    });

    // 最近搜索渲染
    renderRecentSearches();

    // 全局事件
    bindGlobals();

    // 自动确认
    try { API.startAutoConfirm(); } catch (e) {}

    bind();

    // 初始 badge
    updateMsgBadge();
    // 先拉一次消息更新 badge
    API.getMessages().then(function (msgs) {
      state.messages = msgs;
      state.unread = msgs.filter(function (m) { return !m.read; }).length;
      updateMsgBadge();
    });

    bindAutoConfirm();

    state.loaded.jobs = true;
    loadHall();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
