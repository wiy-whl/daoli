/* ============================================================
   兼职蜂 · 数据接口层（本地 stub）
   所有方法模拟 300-500ms 网络延迟，返回 Promise。
   正式版仅需把每个方法替换为真实 fetch 调用。
   ============================================================ */
window.API = (function () {
  var M = window.MOCK;

  function delay(data) {
    var ms = 300 + Math.random() * 200;
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(JSON.parse(JSON.stringify(data))); }, ms);
    });
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function findJob(id) {
    for (var i = 0; i < M.jobs.length; i++) if (M.jobs[i].id === id) return M.jobs[i];
    return null;
  }

  function findMerchantJob(id) {
    for (var i = 0; i < M.merchantJobs.length; i++) if (M.merchantJobs[i].id === id) return M.merchantJobs[i];
    return null;
  }

  /* ---------- 自动确认定时器 ----------
     每 30s 扫描 M.candidates：若某职位有 pending 候选人，随机 1 名变 passed。
     同步：candidates → applications（同 jobId 的 pending → scheduled）
     同步：merchantJobs.applied + 1，若 >= headcount 则 status = 'full'
     生成：新的学生端 message（模拟自动确认）
  */
  var AUTO_TICK_MS = 30000;
  var autoTimer = null;

  function autoConfirmTick() {
    var jobIds = Object.keys(M.candidates);
    if (!jobIds.length) return;

    // 找出仍有 pending 候选人的职位
    var pool = [];
    jobIds.forEach(function (jid) {
      var list = M.candidates[jid] || [];
      var pendings = list.filter(function (c) { return c.status === 'pending'; });
      if (pendings.length > 0) pool.push({ jid: jid, cand: pendings[Math.floor(Math.random() * pendings.length)] });
    });
    if (!pool.length) return;

    // 随机挑一个做自动通过
    var pick = pool[Math.floor(Math.random() * pool.length)];
    var jid = pick.jid;
    var cand = pick.cand;

    // 1) candidates 状态
    cand.status = 'passed';

    // 2) 同步 applications：jobId 对应的 pending → scheduled
    //    注意：candidates 的 m1/m2/m5 对应 merchantJobs 职位 id（m 开头），
    //    而 applications 里 jobId 是 j 开头。自动确认只影响与该职位"同名"或关联的报名。
    //    简化策略：找 applications 中 status=pending 且 jobId 匹配 merchantJobs 里对应真实职位的报名。
    var mJob = findMerchantJob(jid);
    if (mJob) {
      // merchantJobs.applied++
      mJob.applied = Math.min((mJob.applied || 0) + 1, mJob.headcount);
      if (mJob.applied >= mJob.headcount && mJob.status !== 'full') {
        mJob.status = 'full';
      }

      // 同步：merchantJobs 职位是"商家自营职位"，学生端是 M.jobs（j 开头）。
      // 假设：当商家 m1 通过前厅帮工时，学生端对应 j2（周记糖水铺·周末前厅帮工）。
      // 用 title 模糊匹配找出 M.jobs 中对应 j 职位，更新 applied / status。
      M.jobs.forEach(function (j) {
        if (j.merchant === M.merchantProfile.name || j.title.indexOf(mJob.title.replace(/周末|帮工|助教/g, '')) > -1) {
          // 仅对完全同商家名的职位推进 applied
          if (j.merchant === M.merchantProfile.name) {
            j.applied = Math.min(j.applied + 1, j.headcount);
            if (j.applied >= j.headcount) j.status = 'full';
          }
        }
      });
    }

    // 3) 同步 applications：把其中 pending 的某条（与 cand 相关联）改成 scheduled
    //    简化：找任意一条 pending 且 jobId 对应 M.jobs 中与 mJob 关联的报名
    M.applications.forEach(function (a) {
      if (a.status === 'pending') {
        var j = findJob(a.jobId);
        if (j && j.merchant === M.merchantProfile.name) {
          a.status = 'scheduled';
        }
      }
    });

    // 4) 生成新消息
    M.messages.push({
      id: 'msg-auto-' + Date.now(),
      title: '报名已通过 · 自动确认',
      content: '系统自动确认你报名的职位已通过排班，请准时到岗。',
      time: (new Date()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      from: '兼职蜂平台',
      type: 'system',
      actions: []
    });

    M.merchantMessages.push({
      id: 'mm-auto-' + Date.now(),
      title: '候选人已自动通过',
      content: cand.name + '（' + cand.id + '）已被系统自动确认排班。',
      time: (new Date()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      from: '兼职蜂平台'
    });

    // 通知界面刷新：自动确认完成
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' &&
        typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new window.CustomEvent('autoConfirmed', {
        detail: { jobId: jid, candName: cand.name }
      }));
    }
  }

  function startAutoTimer() {
    if (autoTimer) return;
    autoTimer = setInterval(autoConfirmTick, AUTO_TICK_MS);
  }

  /* ---------- 工具 ---------- */

  function buildSimilar(job) {
    if (!job) return [];
    return M.jobs.filter(function (j) {
      return j.id !== job.id &&
        j.category === job.category &&
        Math.abs(j.distance - job.distance) < 2.5 &&
        j.status === 'recruiting';
    }).slice(0, 5).map(function (j) {
      return { id: j.id, title: j.title, pay: j.pay, distance: j.distance, merchant: j.merchant };
    });
  }

  function findApp(id) {
    for (var i = 0; i < M.applications.length; i++) if (M.applications[i].id === id) return M.applications[i];
    return null;
  }

  function toMin(t) {
    var p = String(t || '0:0').split(':');
    return (+p[0]) * 60 + (+p[1] || 0);
  }

  function fmtMin(m) {
    if (m >= 1440) return '24:00';
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' + h : h) + ':' + (mm < 10 ? '0' + mm : mm);
  }

  function hoursOfSlot(s) {
    var diff = toMin(s.e) - toMin(s.s);
    if (diff <= 0) diff += 1440;
    return diff / 60;
  }

  function dayLabel(d) {
    return d === 'sat' ? '周六 11.1' : '周日 11.2';
  }

  function nowStamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // 商家名称 → 评价库 targetId（与 mock.ratings 保持一致）
  var MERCHANT_TARGET = {
    '周记糖水铺': 'mc-zj',
    '甜野咖啡·大学城店': 'mc-ty',
    '汲果奶茶·大学城店': 'mc-jg',
    '彩虹岛美术教室': 'mc-ch',
    '临江美术馆': 'mc-msg',
    '西西弗书店·城西万达店': 'mc-ssf'
  };
  function merchantTargetId(job) {
    if (!job) return 'unknown';
    return MERCHANT_TARGET[job.merchant] || ('mc-' + job.id);
  }

  var CAND_STATUS_CN = { pending: '待确认', passed: '已通过', rejected: '已婉拒' };

  return {
    /* ================= 学生端 ================= */

    /** 职位大厅：关键词 + 类目 + 时段 + 排序过滤 + 收藏过滤 */
    listJobs: function (f) {
      f = f || {};
      var kw = (f.kw || '').trim().toLowerCase();
      var list = M.jobs.slice();

      if (f.favoriteOnly) {
        var fav = M.favorites || [];
        list = list.filter(function (j) { return fav.indexOf(j.id) > -1; });
      } else {
        list = list.filter(function (j) { return j.status === 'recruiting'; });
      }

      if (f.cat && f.cat !== '全部') list = list.filter(function (j) { return j.category === f.cat; });
      if (f.day === 'sat' || f.day === 'sun') {
        list = list.filter(function (j) {
          return j.slots.some(function (s) { return s.d === f.day; });
        });
      }
      if (kw) {
        list = list.filter(function (j) {
          return (j.title + j.merchant + j.category + j.desc).toLowerCase().indexOf(kw) > -1;
        });
      }
      var sorters = {
        smart: function (a, b) { return b.match - a.match; },
        pay: function (a, b) { return b.pay - a.pay; },
        dist: function (a, b) { return a.distance - b.distance; },
        published: function (a, b) { return (b.publishedAt || '').localeCompare(a.publishedAt || ''); }
      };
      list = list.slice().sort(sorters[f.sort] || sorters.smart);
      return delay(list);
    },

    /** 职位详情（含同类目+同距离相似职位） */
    getJob: function (id) {
      var j = findJob(id);
      return delay(j ? Object.assign({}, j, { similar: buildSimilar(j) }) : null);
    },

    /** 学生档案 */
    getStudent: function () {
      // 额外补充 favorites / doneJobs（原 student 对象本身已有 stats/skills/wallet/freeTime）
      var out = clone(M.student);
      out.favorites = clone(M.favorites || []);
      out.doneJobs = (M.applications || []).filter(function (a) { return a.status === 'done'; }).length;
      return delay(out);
    },

    /** 我的报名（带职位信息联表） */
    getMyApplications: function () {
      var out = M.applications.map(function (a) {
        var j = findJob(a.jobId);
        return Object.assign({}, a, {
          job: j ? { id: j.id, title: j.title, merchant: j.merchant, pay: j.pay, unit: j.unit, addr: j.addr, category: j.category } : null
        });
      }).filter(function (a) { return a.job; });
      return delay(out);
    },

    /** 报名职位（级联更新） */
    applyJob: function (jobId, slots) {
      var job = findJob(jobId);
      var app = {
        id: 'a' + (M.applications.length + 1),
        jobId: jobId,
        slots: clone(slots || []),
        status: 'pending',
        appliedAt: '11.1'
      };
      M.applications.unshift(app);

      // 级联：jobs.applied++；若 applied>=headcount 则 status='full'
      if (job) {
        job.applied = Math.min(job.applied + 1, job.headcount);
        if (job.applied >= job.headcount) job.status = 'full';
      }
      return delay({ ok: true, applicationId: app.id });
    },

    /** 保存周末空闲时段 */
    saveFreeTime: function (freeTime) {
      M.student.freeTime = clone(freeTime);
      return delay({ ok: true });
    },

    /** 收藏/取消收藏 */
    toggleFavorite: function (jobId) {
      var fav = M.favorites || (M.favorites = []);
      var idx = fav.indexOf(jobId);
      if (idx > -1) fav.splice(idx, 1);
      else fav.push(jobId);
      // 同步 jobs.favorite 字段
      var j = findJob(jobId);
      if (j) j.favorite = idx === -1;
      return delay({ ok: true, favorite: idx === -1 });
    },

    /** 获取收藏列表（带职位） */
    getFavorites: function () {
      var fav = M.favorites || [];
      var list = fav.map(function (id) { return findJob(id); }).filter(Boolean);
      return delay(list);
    },

    /** 学生端消息 */
    getMessages: function () {
      return delay(clone(M.messages || []));
    },

    /** 标记消息已读 */
    markMessageRead: function (msgId) {
      (M.messages || []).forEach(function (m) { if (m.id === msgId) m.read = true; });
      return delay({ ok: true });
    },

    /** 搜索建议 */
    searchSuggestions: function (kw) {
      kw = (kw || '').trim().toLowerCase();
      if (!kw) return delay(clone(M.searchSuggestions || []).slice(0, 6));
      var list = (M.searchSuggestions || []).filter(function (s) { return s.toLowerCase().indexOf(kw) > -1; });
      // 补充从 jobs 里命中的 title / merchant
      M.jobs.forEach(function (j) {
        if ((j.title || '').toLowerCase().indexOf(kw) > -1 && list.indexOf(j.title) === -1) list.push(j.title);
        if ((j.merchant || '').toLowerCase().indexOf(kw) > -1 && list.indexOf(j.merchant) === -1) list.push(j.merchant);
      });
      return delay(list.slice(0, 8));
    },

    /** 平台公告 */
    getAnnouncements: function () {
      return delay(clone(M.announcements || []));
    },

    /* ================= 商家端 ================= */

    /** 商家职位列表 */
    getMerchantJobs: function () { return delay(M.merchantJobs); },

    /** 商家档案 + 待办 + 评价 + 概览数据 */
    getMerchantOverview: function () {
      var appliedArr = (M.merchantJobs || []).map(function (j) { return j.applied || 0; });
      var totalApplied = appliedArr.reduce(function (a, b) { return a + b; }, 0);
      return delay({
        profile: M.merchantProfile,
        todos: M.todos,
        reviews: M.reviews,
        // 新增概览数据
        weeklyTrend: {
          thisWeek: [3, 5, 4, 6, 8, 12, 10],
          lastWeek: [2, 3, 3, 5, 6, 9, 8],
          labels: ['一', '二', '三', '四', '五', '六', '日'],
          appliedDelta: '+22%',
          costDelta: '+8%',
          // 兼容旧版前端读取（等同于 thisWeek）
          applied: [3, 5, 4, 6, 8, 12, 10]
        },
        hourDistribution: { '餐饮': 48, '家教': 72, '活动': 30, '零售': 40, '仓储': 36 },
        stats: {
          totalJobs: (M.merchantJobs || []).length,
          totalApplied: totalApplied,
          activeJobs: (M.merchantJobs || []).filter(function (j) { return j.status === 'recruiting'; }).length
        }
      });
    },

    /** 某职位的候选人列表（按匹配度排序） */
    getCandidates: function (jobId) {
      var list = (M.candidates[jobId] || []).slice().sort(function (a, b) { return b.match - a.match; });
      return delay(list);
    },

    /** 发布职位：写入商家列表顶部 */
    createJob: function (data) {
      var job = {
        id: 'm' + (M.merchantJobs.length + 1),
        title: data.title, category: data.category,
        pay: +data.pay, unit: '时', settle: data.settle || '日结',
        days: data.days, time: data.start + ' - ' + data.end,
        headcount: +data.headcount, applied: 0, status: 'recruiting',
        addr: data.addr, desc: data.desc, skills: data.skills || [],
        gap: ''
      };
      M.merchantJobs.unshift(job);
      return delay({ ok: true, jobId: job.id });
    },

    /** 切换职位状态（暂停/恢复/结束） */
    setJobStatus: function (jobId, status) {
      M.merchantJobs.forEach(function (j) { if (j.id === jobId) j.status = status; });
      return delay({ ok: true });
    },

    /** 处置候选人：通过排班 / 婉拒（级联更新） */
    decideCandidate: function (jobId, candId, pass) {
      var list = M.candidates[jobId] || [];
      list.forEach(function (c) {
        if (c.id === candId) c.status = pass ? 'passed' : 'rejected';
      });

      if (pass) {
        // 级联：merchantJobs.applied+1；若 applied>=headcount 则 status='full'
        var mJob = findMerchantJob(jobId);
        if (mJob) {
          mJob.applied = Math.min((mJob.applied || 0) + 1, mJob.headcount);
          if (mJob.applied >= mJob.headcount) mJob.status = 'full';
        }

        // 级联：applications 表中 jobId 关联职位，把对应 pending → scheduled
        // 简化处理：找出 M.jobs 中 merchant === M.merchantProfile.name 的职位 id（j 开头）
        var jIds = M.jobs.filter(function (j) { return j.merchant === M.merchantProfile.name; }).map(function (j) { return j.id; });
        M.applications.forEach(function (a) {
          if (a.status === 'pending' && jIds.indexOf(a.jobId) > -1) {
            a.status = 'scheduled';
          }
        });
      }

      return delay({ ok: true });
    },

    /** 商家端消息 */
    getMerchantMessages: function () {
      return delay(clone(M.merchantMessages || []));
    },

    /** 标记商家消息已读 */
    markMerchantMessageRead: function (msgId) {
      (M.merchantMessages || []).forEach(function (m) { if (m.id === msgId) m.read = true; });
      return delay({ ok: true });
    },

    /* ================= 新增数据端点（全部 Promise 300-500ms） ================= */

    /** 排班冲突检测：对比已排班/进行中的报名时段 */
    checkConflict: function (jobId, slots) {
      var items = [];
      var mine = slots || [];
      M.applications.forEach(function (a) {
        if (a.status !== 'scheduled' && a.status !== 'working') return;
        if (a.jobId === jobId) return;
        var j = findJob(a.jobId) || findMerchantJob(a.jobId);
        if (!j) return;
        mine.forEach(function (s) {
          (a.slots || []).forEach(function (t) {
            if (t.d !== s.d) return;
            var overlap = Math.min(toMin(t.e), toMin(s.e)) - Math.max(toMin(t.s), toMin(s.s));
            if (overlap > 0) {
              items.push({
                date: dayLabel(s.d),
                time: s.s + '-' + s.e,
                conflictWith: j.merchant + ' · ' + j.title
              });
            }
          });
        });
      });
      return delay({ conflict: items.length > 0, items: items });
    },

    /** 撤回报名：仅 pending 可撤回，并回退职位已招人数 */
    withdrawApplication: function (appId) {
      var app = findApp(appId);
      if (!app) return delay({ ok: false, reason: '报名不存在' });
      if (app.status !== 'pending') return delay({ ok: false, reason: '仅待确认的报名可撤回' });

      var idx = M.applications.indexOf(app);
      M.applications.splice(idx, 1);

      var j = findJob(app.jobId);
      if (j) {
        j.applied = Math.max(0, (j.applied || 0) - 1);
        if (j.status === 'full' && j.applied < j.headcount) j.status = 'recruiting';
        (app.slots || []).forEach(function (s) {
          (j.slotCapacity || []).forEach(function (c) {
            if (c.d === s.d && c.s === s.s && c.e === s.e && c.got > 0) c.got -= 1;
          });
        });
      }
      return delay({ ok: true, jobId: app.jobId });
    },

    /** 到岗签到：scheduled → working */
    checkIn: function (appId) {
      var app = findApp(appId);
      if (!app) return delay({ ok: false, reason: '报名不存在' });
      if (app.status !== 'scheduled') return delay({ ok: false, reason: '仅已排班状态可签到' });

      app.status = 'working';
      app.checkInAt = nowStamp();
      return delay({ ok: true, applicationId: appId, status: 'working', checkInAt: app.checkInAt });
    },

    /** 完成工作：working → done，写入历史与钱包 */
    completeJob: function (appId, realHours) {
      var app = findApp(appId);
      if (!app) return delay({ ok: false, reason: '报名不存在' });
      if (app.status !== 'working') return delay({ ok: false, reason: '仅进行中的工作可完成' });

      var job = findJob(app.jobId) || findMerchantJob(app.jobId);
      if (!job) return delay({ ok: false, reason: '职位不存在' });

      var hours = +realHours;
      if (!hours) hours = (app.slots || []).reduce(function (sum, s) { return sum + hoursOfSlot(s); }, 0);
      if (!hours && job.time) {
        var p = String(job.time).split('-');
        hours = (toMin(p[1]) - toMin(p[0])) / 60;
      }
      hours = Math.round(hours * 10) / 10;

      var wage = job.wage || { meal: 0, transport: 0, bonus: '' };
      var amount = Math.round((job.pay || 0) * hours + (wage.meal || 0) + (wage.transport || 0));

      app.status = 'done';
      app.realHours = hours;
      app.amount = amount;
      app.completedAt = nowStamp();
      app.rated = false;

      if (!M.student.doneHistory) M.student.doneHistory = [];
      M.student.doneHistory.unshift({
        date: '2026-11-02',
        merchant: job.merchant || M.merchantProfile.name,
        title: job.title,
        hours: hours,
        amount: amount,
        rating: null,
        review: '',
        tags: []
      });

      var wallet = M.student.wallet;
      wallet.records.unshift({
        id: 'r' + (wallet.records.length + 1),
        title: job.title + ' · ' + (job.settle || '结算'),
        date: '11.2',
        amount: amount,
        status: 'settled'
      });
      wallet.balance = (wallet.balance || 0) + amount;
      if (M.student.stats) M.student.stats.doneJobs = (M.student.stats.doneJobs || 0) + 1;

      return delay({ ok: true, applicationId: appId, hours: hours, amount: amount });
    },

    /** 评价对方：写入双向评价库，报名标记已评价 */
    rateCounterpart: function (appId, rating) {
      var app = findApp(appId);
      if (!app) return delay({ ok: false, reason: '报名不存在' });
      if (app.rated) return delay({ ok: false, reason: '该报名已评价' });

      rating = rating || {};
      var job = findJob(app.jobId) || findMerchantJob(app.jobId);
      var rec = {
        id: 'rt' + ((M.ratings || []).length + 1) + '-' + Date.now(),
        from: 'student',
        targetId: merchantTargetId(job),
        name: job ? job.merchant : '未知商家',
        stars: +rating.stars || 5,
        tags: clone(rating.tags || []),
        text: rating.text || '',
        date: '2026-11-02'
      };
      if (!M.ratings) M.ratings = [];
      M.ratings.push(rec);
      app.rated = true;
      app.rating = { stars: rec.stars, tags: clone(rec.tags), text: rec.text };

      return delay({ ok: true, ratingId: rec.id, targetId: rec.targetId });
    },

    /** 查询某对象收到的评价 */
    getRatings: function (targetId) {
      var list = (M.ratings || []).filter(function (r) {
        return r.targetId === targetId || r.name === targetId;
      });
      return delay(list);
    },

    /** 候选人并排对比 */
    compareCandidates: function (jobId, ids) {
      var list = (M.candidates[jobId] || []).slice();
      if (ids && ids.length) {
        list = list.filter(function (c) { return ids.indexOf(c.id) > -1; });
      }
      var job = findMerchantJob(jobId) || findJob(jobId);
      var jobSkills = (job && job.skills) ? job.skills : [];

      var rows = list.map(function (c) {
        return {
          id: c.id,
          name: c.name,
          credit: c.credit,
          match: c.match,
          doneJobs: c.doneJobs,
          punctual: c.signRate,
          skills: jobSkills.slice(0, c.skillMatch || 0),
          overlap: c.timeOverlap,
          historyCount: (c.historyReviews || []).length,
          status: c.status
        };
      }).sort(function (a, b) { return b.match - a.match; });

      return delay(rows);
    },

    /** 某职位的排班周表 */
    getScheduleGrid: function (jobId) {
      var mJob = findMerchantJob(jobId);
      var jJob = findJob(jobId);
      if (!mJob && !jJob) return delay({ days: [], rows: [] });

      var days = (mJob && mJob.days) ? mJob.days.slice() : [];
      if (!days.length && jJob && jJob.slots) {
        jJob.slots.forEach(function (s) { if (days.indexOf(s.d) === -1) days.push(s.d); });
      }
      days.sort(function (a, b) { return (a === 'sat' ? 0 : 1) - (b === 'sat' ? 0 : 1); });

      var rows = [];
      if (mJob && mJob.time) {
        var parts = mJob.time.split('-');
        var st = toMin(parts[0]), en = toMin(parts[1]);
        if (en <= st) en += 1440;
        while (st < en) {
          var next = Math.min(st + 180, en);
          rows.push({ time: fmtMin(st) + '-' + fmtMin(next), start: st, end: next });
          st = next;
        }
      } else if (jJob && jJob.slots) {
        var seen = {};
        jJob.slots.forEach(function (s) {
          var key = s.s + '-' + s.e;
          if (seen[key]) return;
          seen[key] = 1;
          var sMin = toMin(s.s), eMin = toMin(s.e);
          if (eMin <= sMin) eMin += 1440;
          rows.push({ time: s.s + '-' + s.e, start: sMin, end: eMin });
        });
      }

      rows.forEach(function (row) {
        row.cells = {};
        days.forEach(function (d) { row.cells[d] = []; });
      });

      (M.candidates[jobId] || []).forEach(function (c) {
        (c.applySlots || []).forEach(function (s) {
          if (days.indexOf(s.d) === -1) return;
          var sMin = toMin(s.s), eMin = toMin(s.e);
          if (eMin <= sMin) eMin += 1440;
          rows.forEach(function (row) {
            if (!row.cells[s.d]) return;
            if (Math.min(eMin, row.end) - Math.max(sMin, row.start) > 0) {
              row.cells[s.d].push({ name: c.name, status: c.status });
            }
          });
        });
      });

      return delay({
        days: days,
        rows: rows.map(function (row) { return { time: row.time, cells: row.cells }; })
      });
    },

    /** 导出候选人 CSV（带 BOM） */
    exportCandidatesCsv: function (jobId) {
      function esc(v) {
        v = String(v == null ? '' : v);
        return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }
      var list = (M.candidates[jobId] || []).slice().sort(function (a, b) { return b.match - a.match; });
      var lines = ['姓名,信用分,匹配度,完成单,时段重叠,状态,自荐语'];
      list.forEach(function (c) {
        lines.push([
          c.name, c.credit, c.match, c.doneJobs, c.timeOverlap,
          CAND_STATUS_CN[c.status] || c.status, c.note
        ].map(esc).join(','));
      });
      return delay('\uFEFF' + lines.join('\r\n'));
    },

    /** 编辑职位字段 */
    updateJob: function (jobId, patch) {
      patch = patch || {};
      var target = findMerchantJob(jobId) || findJob(jobId);
      if (!target) return delay({ ok: false, reason: '职位不存在' });

      var keys = ['title', 'category', 'pay', 'unit', 'settle', 'days', 'time',
        'headcount', 'addr', 'desc', 'skills', 'gap', 'status', 'slots', 'tags',
        'dressCode', 'contactPerson', 'deadline'];
      keys.forEach(function (k) {
        if (patch[k] !== undefined) target[k] = clone(patch[k]);
      });
      if (patch.wage) target.wage = Object.assign({}, target.wage || {}, clone(patch.wage));

      return delay({ ok: true, job: target });
    },

    /** 工资结算预估：base*hours + meal + transport */
    getWageSummary: function (jobId, slots) {
      var job = findJob(jobId) || findMerchantJob(jobId);
      if (!job) return delay({ base: 0, hours: 0, meal: 0, transport: 0, bonus: '', total: 0 });

      var hours = 0;
      var use = (slots && slots.length) ? slots : (job.slots || []);
      if (use.length) {
        hours = use.reduce(function (sum, s) { return sum + hoursOfSlot(s); }, 0);
      } else if (job.time) {
        var p = String(job.time).split('-');
        hours = (toMin(p[1]) - toMin(p[0])) / 60;
      }
      hours = Math.round(hours * 10) / 10;

      var wage = job.wage || { meal: 0, transport: 0, bonus: '' };
      var base = job.pay || 0;
      var meal = wage.meal || 0;
      var transport = wage.transport || 0;
      var total = Math.round(base * hours + meal + transport);

      return delay({
        base: base, hours: hours, meal: meal, transport: transport,
        bonus: wage.bonus || '', total: total
      });
    },

    /* ================= 启动自动确认定时器 ================= */
    startAutoConfirm: function () { startAutoTimer(); },
    stopAutoConfirm: function () {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
  };
})();
