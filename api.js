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
      from: '兼职蜂平台'
    });

    M.merchantMessages.push({
      id: 'mm-auto-' + Date.now(),
      title: '候选人已自动通过',
      content: cand.name + '（' + cand.id + '）已被系统自动确认排班。',
      time: (new Date()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      from: '兼职蜂平台'
    });
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
          labels: ['一', '二', '三', '四', '五', '六', '日'],
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

    /* ================= 启动自动确认定时器 ================= */
    startAutoConfirm: function () { startAutoTimer(); },
    stopAutoConfirm: function () {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
  };
})();
