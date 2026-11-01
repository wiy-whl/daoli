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

  return {
    /* ================= 学生端 ================= */

    /** 职位大厅：关键词 + 类目 + 时段 + 排序过滤 */
    // TODO: 接入真实后端 GET /api/jobs?kw=&cat=&day=&sort=
    listJobs: function (f) {
      f = f || {};
      var kw = (f.kw || '').trim().toLowerCase();
      var list = M.jobs.filter(function (j) { return j.status === 'recruiting'; });

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
        dist: function (a, b) { return a.distance - b.distance; }
      };
      list = list.slice().sort(sorters[f.sort] || sorters.smart);
      return delay(list);
    },

    /** 职位详情 */
    // TODO: 接入真实后端 GET /api/jobs/:id
    getJob: function (id) { return delay(findJob(id)); },

    /** 学生档案 */
    // TODO: 接入真实后端 GET /api/student/profile
    getStudent: function () { return delay(M.student); },

    /** 我的报名（带职位信息联表） */
    // TODO: 接入真实后端 GET /api/student/applications
    getMyApplications: function () {
      var out = M.applications.map(function (a) {
        var j = findJob(a.jobId);
        return Object.assign({}, a, {
          job: j ? { id: j.id, title: j.title, merchant: j.merchant, pay: j.pay, unit: j.unit, addr: j.addr, category: j.category } : null
        });
      }).filter(function (a) { return a.job; });
      return delay(out);
    },

    /** 报名职位 */
    // TODO: 接入真实后端 POST /api/jobs/:id/apply { slots }
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
      if (job) job.applied = Math.min(job.applied + 1, job.headcount);
      return delay({ ok: true, applicationId: app.id });
    },

    /** 保存周末空闲时段 */
    // TODO: 接入真实后端 PUT /api/student/free-time
    saveFreeTime: function (freeTime) {
      M.student.freeTime = clone(freeTime);
      return delay({ ok: true });
    },

    /* ================= 商家端 ================= */

    /** 商家职位列表 */
    // TODO: 接入真实后端 GET /api/merchant/jobs
    getMerchantJobs: function () { return delay(M.merchantJobs); },

    /** 商家档案 + 待办 + 评价 */
    // TODO: 接入真实后端 GET /api/merchant/overview
    getMerchantOverview: function () {
      return delay({ profile: M.merchantProfile, todos: M.todos, reviews: M.reviews });
    },

    /** 某职位的候选人列表（按匹配度排序） */
    // TODO: 接入真实后端 GET /api/merchant/jobs/:id/candidates
    getCandidates: function (jobId) {
      var list = (M.candidates[jobId] || []).slice().sort(function (a, b) { return b.match - a.match; });
      return delay(list);
    },

    /** 发布职位：写入商家列表顶部 */
    // TODO: 接入真实后端 POST /api/merchant/jobs
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
    // TODO: 接入真实后端 PATCH /api/merchant/jobs/:id/status
    setJobStatus: function (jobId, status) {
      M.merchantJobs.forEach(function (j) { if (j.id === jobId) j.status = status; });
      return delay({ ok: true });
    },

    /** 处置候选人：通过排班 / 婉拒 */
    // TODO: 接入真实后端 POST /api/merchant/candidates/:id/decide { pass }
    decideCandidate: function (jobId, candId, pass) {
      var list = M.candidates[jobId] || [];
      list.forEach(function (c) {
        if (c.id === candId) c.status = pass ? 'passed' : 'rejected';
      });
      return delay({ ok: true });
    }
  };
})();
