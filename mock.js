/* ============================================================
   兼职蜂 · 模拟数据
   时间基线：2026-11-01（周六）起的本周末
   ============================================================ */
window.MOCK = (function () {

  var CATEGORIES = ['餐饮服务', '零售导购', '活动协助', '传单派发', '家教辅导', '仓储物流', '展会礼仪'];
  var SKILL_POOL = ['餐饮服务', '收银', '沟通表达', '零售导购', '商品整理', '家教辅导', '英语四级', '耐心细致', '活动执行', '团队协作', '形象气质', '体力较好', '仓储分拣', '细心负责', '外向开朗', '礼仪站姿', '美术基础', '卫生习惯'];

  /* ---------- 学生档案 ---------- */
  var student = {
    name: '林小满',
    school: '临江大学',
    major: '市场营销',
    grade: '大二',
    avatarText: '满',
    credit: 92,
    creditLevel: '金牌蜂员',
    stats: { doneJobs: 12, punctual: '98%', goodRate: '100%' },
    skills: ['餐饮服务', '沟通表达', '活动执行', '美术基础'],
    wallet: {
      balance: 386,
      frozen: 120,
      records: [
        { id: 'r1', title: '咖啡馆吧台学徒 · 日结', date: '10.26', amount: 102, status: 'settled' },
        { id: 'r2', title: '西西弗书店周末理货', date: '10.19', amount: 136, status: 'settled' },
        { id: 'r3', title: '校庆巡展引导员', date: '10.12', amount: 120, status: 'settling' }
      ]
    },
    freeTime: {
      sat: { on: true, start: '09:00', end: '18:00' },
      sun: { on: true, start: '10:00', end: '16:00' }
    }
  };

  /* ---------- 职位库（学生端大厅 / 匹配） ---------- */
  var jobs = [
    {
      id: 'j1', title: '周末奶茶店店员', merchant: '汲果奶茶·大学城店', category: '餐饮服务',
      pay: 18, unit: '时', settle: '日结', verified: true, rating: 4.8,
      distance: 0.8, addr: '临江大学北门·青春商业街 12 号',
      slots: [
        { d: 'sat', s: '09:00', e: '14:00' }, { d: 'sat', s: '14:00', e: '21:00' },
        { d: 'sun', s: '09:00', e: '14:00' }, { d: 'sun', s: '14:00', e: '21:00' }
      ],
      headcount: 6, applied: 4, skills: ['餐饮服务', '收银', '沟通表达'],
      match: 94,
      desc: '周末客流高峰，需要协助点单收银、饮品出杯与堂食区域整理。店内年轻伙伴氛围好，提供免费员工餐与饮品。',
      req: '身体健康、有服务意识；无需经验，上岗前带教 1 小时。',
      status: 'recruiting'
    },
    {
      id: 'j2', title: '周末前厅帮工', merchant: '周记糖水铺', category: '餐饮服务',
      pay: 16, unit: '时', settle: '日结', verified: true, rating: 4.9,
      distance: 1.2, addr: '临江大学南门·糖水街 3 号',
      slots: [{ d: 'sat', s: '11:00', e: '20:00' }],
      headcount: 2, applied: 1, skills: ['餐饮服务', '沟通表达', '卫生习惯'],
      match: 88,
      desc: '周六午市晚市帮工，负责引位、传菜与餐后收台，糖水铺节奏轻松，老板娘人很好。',
      req: '手脚勤快、有耐心；可连续做满一天者优先。',
      status: 'recruiting'
    },
    {
      id: 'j3', title: '优衣库周末导购', merchant: '优衣库·城西万达店', category: '零售导购',
      pay: 20, unit: '时', settle: '周结', verified: true, rating: 4.6,
      distance: 3.5, addr: '城西万达广场 1F',
      slots: [{ d: 'sun', s: '10:00', e: '18:00' }],
      headcount: 3, applied: 2, skills: ['零售导购', '商品整理', '沟通表达'],
      match: 76,
      desc: '周末卖场高峰导购，负责理仓、补货与顾客引导，统一着装，提供餐补。',
      req: '形象整洁、能站立工作；有零售经验优先。',
      status: 'recruiting'
    },
    {
      id: 'j4', title: '少儿英语自然拼读助教', merchant: '蓝橡树少儿成长中心', category: '家教辅导',
      pay: 60, unit: '时', settle: '日结', verified: true, rating: 4.9,
      distance: 0.6, addr: '临江大学东门·教育街区 8 号',
      slots: [{ d: 'sat', s: '09:00', e: '11:30' }],
      headcount: 1, applied: 1, skills: ['家教辅导', '英语四级', '耐心细致'],
      match: 91,
      desc: '协助主教老师管理 8 人小班课堂，批改课堂练习，与家长做课后简单反馈。',
      req: '英语四级及以上、喜欢小朋友；师范或外语专业优先。',
      status: 'full'
    },
    {
      id: 'j5', title: '城市马拉松补给站站员（带薪）', merchant: '临江马拉松组委会', category: '活动协助',
      pay: 15, unit: '时', settle: '周结', verified: true, rating: 4.7,
      distance: 5.2, addr: '滨江大道 21K 补给站',
      slots: [{ d: 'sun', s: '06:30', e: '13:00' }],
      headcount: 8, applied: 5, skills: ['活动执行', '体力较好', '团队协作'],
      match: 70,
      desc: '周日清晨赛道补给站工作：倒水递水、能量胶分发、物资整理，全程有带队组长。',
      req: '能早起、体力好；统一提供早餐、马甲与志愿证书。',
      status: 'recruiting'
    },
    {
      id: 'j6', title: '房产开盘暖场礼仪', merchant: '云麓置业·营销中心', category: '展会礼仪',
      pay: 25, unit: '时', settle: '日结', verified: true, rating: 4.8,
      distance: 2.4, addr: '云麓营销中心（地铁 3 号线直达）',
      slots: [{ d: 'sat', s: '08:30', e: '17:00' }],
      headcount: 4, applied: 2, skills: ['形象气质', '礼仪站姿', '沟通表达'],
      match: 82,
      desc: '开盘活动迎宾签到、动线引导与资料派发，含 1.5 小时午休与工作餐。',
      req: '女生 163cm+ / 男生 173cm+，仪态大方；有礼仪经验优先。',
      status: 'recruiting'
    },
    {
      id: 'j7', title: '电商仓库周末分拣员', merchant: '临江菜鸟驿站中心仓', category: '仓储物流',
      pay: 22, unit: '时', settle: '周结', verified: true, rating: 4.4,
      distance: 6.8, addr: '临江临港物流园 A7 仓',
      slots: [
        { d: 'sat', s: '08:00', e: '14:00' }, { d: 'sat', s: '14:00', e: '20:00' },
        { d: 'sun', s: '08:00', e: '14:00' }, { d: 'sun', s: '14:00', e: '20:00' }
      ],
      headcount: 10, applied: 6, skills: ['仓储分拣', '体力较好', '细心负责'],
      match: 65,
      desc: '双 11 预售包裹分拣扫码，流水线作业，多劳多得，可按半天起报。',
      req: '能接受站立作业；需自备平底鞋，其余防护由仓库提供。',
      status: 'recruiting'
    },
    {
      id: 'j8', title: '新品地推·传单派发', merchant: '轻卡气泡水·品牌方', category: '传单派发',
      pay: 18, unit: '时', settle: '日结', verified: true, rating: 4.3,
      distance: 1.8, addr: '大学城地铁口 C 出口',
      slots: [{ d: 'sun', s: '10:00', e: '16:00' }],
      headcount: 5, applied: 2, skills: ['外向开朗', '沟通表达', '体力较好'],
      match: 79,
      desc: '商圈派发新品试饮券并引导扫码，每额外扫码 1 人奖励 2 元，日结现金/转账均可。',
      req: '性格外向、不怕被拒绝；着装干净即可，工服由品牌方提供。',
      status: 'recruiting'
    },
    {
      id: 'j9', title: '剧本杀店周末 DM 助理', merchant: '谜鹿剧本杀·大学城店', category: '活动协助',
      pay: 30, unit: '时', settle: '日结', verified: true, rating: 4.9,
      distance: 2.0, addr: '青春商业街 27 号 2F',
      slots: [{ d: 'sun', s: '13:00', e: '22:00' }],
      headcount: 2, applied: 1, skills: ['沟通表达', '活动执行', '外向开朗'],
      match: 84,
      desc: '协助 DM 带本：开场引导、线索发放、气氛组互动，包晚饭，玩本免费。',
      req: '表达能力强、爱玩剧本杀；至少玩过 10 本者优先。',
      status: 'recruiting'
    },
    {
      id: 'j10', title: '咖啡馆周末吧台学徒', merchant: '甜野咖啡·大学城店', category: '餐饮服务',
      pay: 17, unit: '时', settle: '日结', verified: true, rating: 4.8,
      distance: 0.5, addr: '临江大学生活区 5 号楼底商',
      slots: [{ d: 'sat', s: '08:00', e: '14:00' }],
      headcount: 1, applied: 1, skills: ['餐饮服务', '卫生习惯', '沟通表达'],
      match: 90,
      desc: '跟着咖啡师学出品：磨豆、拉花观摩、餐具清洁与吧台整理，可学手冲。',
      req: '早起不迟到、爱干净；对咖啡有兴趣者加分。',
      status: 'recruiting'
    },
    {
      id: 'j11', title: '美术馆周末巡展引导', merchant: '临江美术馆', category: '展会礼仪',
      pay: 19, unit: '时', settle: '周结', verified: true, rating: 4.7,
      distance: 4.1, addr: '临江文化艺术中心 2F',
      slots: [
        { d: 'sat', s: '09:00', e: '17:00' }, { d: 'sun', s: '09:00', e: '17:00' }
      ],
      headcount: 3, applied: 1, skills: ['礼仪站姿', '沟通表达', '耐心细致'],
      match: 73,
      desc: '「光影百年」巡回展周末场引导：动线引导、展品看护提醒、观众问询。',
      req: '普通话标准、有耐心；艺术专业或喜欢看展者优先。',
      status: 'recruiting'
    },
    {
      id: 'j12', title: '少儿美术课堂助教', merchant: '彩虹岛美术教室', category: '家教辅导',
      pay: 40, unit: '时', settle: '日结', verified: true, rating: 4.8,
      distance: 1.5, addr: '教育街区 15 号 3F',
      slots: [{ d: 'sun', s: '09:00', e: '12:00' }],
      headcount: 2, applied: 1, skills: ['美术基础', '耐心细致', '家教辅导'],
      match: 86,
      desc: '协助 4-8 岁小朋友美术课堂：发画材、帮调色、课后整理画室。',
      req: '有绘画基础、喜欢小朋友；美术教育专业优先。',
      status: 'recruiting'
    },
    {
      id: 'j13', title: '万圣节商圈巡游 NPC', merchant: '城西万达市场部', category: '活动协助',
      pay: 28, unit: '时', settle: '日结', verified: true, rating: 4.6,
      distance: 3.5, addr: '城西万达广场中庭',
      slots: [{ d: 'sat', s: '17:00', e: '22:00' }],
      headcount: 6, applied: 6, skills: ['外向开朗', '形象气质', '活动执行'],
      match: 68,
      desc: '万圣节主题巡游扮演互动，服装道具统一提供，合影互动为主。',
      req: '放得开、体能好；活动已结束，感谢报名的伙伴。',
      status: 'ended'
    }
  ];

  /* ---------- 学生端：我的报名（含状态流转） ---------- */
  var applications = [
    { id: 'a1', jobId: 'j10', slots: [{ d: 'sat', s: '08:00', e: '14:00' }], status: 'scheduled', appliedAt: '10.30' },
    { id: 'a2', jobId: 'j8', slots: [{ d: 'sun', s: '10:00', e: '16:00' }], status: 'pending', appliedAt: '10.31' },
    { id: 'a3', jobId: 'j4', slots: [{ d: 'sat', s: '09:00', e: '11:30' }], status: 'rejected', appliedAt: '10.28' },
    { id: 'a4', jobId: 'j11', slots: [{ d: 'sun', s: '09:00', e: '17:00' }], status: 'done', appliedAt: '10.20' }
  ];

  /* ---------- 商家端：本店职位 ---------- */
  var merchantProfile = {
    name: '周记糖水铺',
    avatarText: '周',
    intro: '大学城老字号糖水铺 · 营业 6 年',
    verified: true
  };

  var merchantJobs = [
    {
      id: 'm1', title: '周末前厅帮工', category: '餐饮服务',
      pay: 16, unit: '时', settle: '日结',
      days: ['sat'], time: '11:00 - 20:00',
      headcount: 2, applied: 3, status: 'recruiting',
      addr: '临江大学南门·糖水街 3 号',
      desc: '周六午市晚市帮工，负责引位、传菜与餐后收台。',
      skills: ['餐饮服务', '沟通表达', '卫生习惯'],
      gap: '周六还缺 1 人'
    },
    {
      id: 'm2', title: '珍珠奶茶制茶学徒', category: '餐饮服务',
      pay: 17, unit: '时', settle: '日结',
      days: ['sun'], time: '10:00 - 19:00',
      headcount: 1, applied: 2, status: 'recruiting',
      addr: '临江大学南门·糖水街 3 号',
      desc: '周日出品高峰学徒岗，学煮茶、配比与封口出品。',
      skills: ['餐饮服务', '细心负责', '卫生习惯'],
      gap: '周日还缺 1 人'
    },
    {
      id: 'm3', title: '周末外送打包员', category: '餐饮服务',
      pay: 15, unit: '时', settle: '日结',
      days: ['sat', 'sun'], time: '09:00 - 15:00',
      headcount: 3, applied: 4, status: 'full',
      addr: '临江大学南门·糖水街 3 号',
      desc: '外卖高峰打包贴签，与骑手交接核对。',
      skills: ['细心负责', '体力较好'],
      gap: ''
    },
    {
      id: 'm4', title: '国庆主题店布置', category: '活动协助',
      pay: 20, unit: '时', settle: '日结',
      days: ['sun'], time: '08:00 - 12:00',
      headcount: 2, applied: 5, status: 'ended',
      addr: '临江大学南门·糖水街 3 号',
      desc: '国庆氛围布置与撤场，已顺利结束。',
      skills: ['活动执行'],
      gap: ''
    }
  ];

  /* ---------- 商家端：候选人（按职位分组） ---------- */
  var candidates = {
    m1: [
      {
        id: 'c1', name: '陈屿', avatarText: '屿', credit: 95,
        match: 94, skillMatch: 4, skillTotal: 4, timeOverlap: '100%',
        applySlots: [{ d: 'sat', s: '11:00', e: '20:00' }],
        note: '上周在同街甜品店做过前厅，熟悉收台动线。',
        doneJobs: 9, status: 'pending'
      },
      {
        id: 'c2', name: '黄依依', avatarText: '黄', credit: 90,
        match: 88, skillMatch: 3, skillTotal: 4, timeOverlap: '100%',
        applySlots: [{ d: 'sat', s: '11:00', e: '17:00' }],
        note: '大二学生，周六全天可到岗，能做满午市+晚市前半段。',
        doneJobs: 6, status: 'pending'
      },
      {
        id: 'c3', name: '罗浩', avatarText: '罗', credit: 85,
        match: 76, skillMatch: 2, skillTotal: 4, timeOverlap: '44%',
        applySlots: [{ d: 'sat', s: '16:00', e: '20:00' }],
        note: '只能覆盖晚市时段，与另一位候选人时段互补。',
        doneJobs: 3, status: 'pending'
      }
    ],
    m2: [
      {
        id: 'c4', name: '许诺', avatarText: '诺', credit: 93,
        match: 91, skillMatch: 3, skillTotal: 3, timeOverlap: '100%',
        applySlots: [{ d: 'sun', s: '10:00', e: '19:00' }],
        note: '在家常奶茶店帮过工，会基础煮茶流程。',
        doneJobs: 8, status: 'pending'
      },
      {
        id: 'c5', name: '苏晚晴', avatarText: '苏', credit: 88,
        match: 83, skillMatch: 2, skillTotal: 3, timeOverlap: '78%',
        applySlots: [{ d: 'sun', s: '10:00', e: '17:00' }],
        note: '周日需 17:00 前离岗，早班全程可到。',
        doneJobs: 5, status: 'pending'
      }
    ]
  };

  /* ---------- 商家端：待办与评价 ---------- */
  var todos = [
    { id: 't1', icon: 'user-check', text: '2 名候选人待你确认排班（前厅帮工）', badge: ['紧急', 'b-danger'] },
    { id: 't2', icon: 'alert-triangle', text: '周六前厅班次仍有 1 人缺口', badge: ['缺口', 'b-warn'] },
    { id: 't3', icon: 'message', text: '收到 1 条新评价待回复', badge: ['新', 'b-brand'] }
  ];

  var reviews = [
    { id: 'rv1', who: '学生 · 陈屿', stars: 5, text: '老板娘很照顾学生，结算准时，午饭还加了个卤蛋。' },
    { id: 'rv2', who: '学生 · 黄依依', stars: 5, text: '店面干净节奏舒服，第一次做餐饮也很安心。' }
  ];

  return {
    CATEGORIES: CATEGORIES,
    SKILL_POOL: SKILL_POOL,
    student: student,
    jobs: jobs,
    applications: applications,
    merchantProfile: merchantProfile,
    merchantJobs: merchantJobs,
    candidates: candidates,
    todos: todos,
    reviews: reviews,
    TODAY: { d: 'sat', date: '11.1', weekday: '周六' }
  };
})();
