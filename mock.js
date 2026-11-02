/* ============================================================
   兼职蜂 · 模拟数据
   时间基线：2026-11-01（周六）起的本周末
   城市统一：临江
   地标：青春商业街 / 糖水街 / 教育街区 / 城西万达广场 / 滨江大道 / 临港物流园
   ============================================================ */
window.MOCK = (function () {

  var CATEGORIES = ['餐饮服务', '零售导购', '活动协助', '传单派发', '家教辅导', '仓储物流', '展会礼仪'];

  // 保留原有 + 新增 7 个真实技能标签
  var SKILL_POOL = [
    '餐饮服务', '收银', '沟通表达', '零售导购', '商品整理', '家教辅导',
    '英语四级', '耐心细致', '活动执行', '团队协作', '形象气质', '体力较好',
    '仓储分拣', '细心负责', '外向开朗', '礼仪站姿', '美术基础', '卫生习惯',
    // 新增
    '英语口语', '数学辅导', '模特走秀', '短视频拍摄', '客户接待', '搬运卸货', 'APP推广', '发传单'
  ];

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
    },
    // 新增 optional
    schoolList: [
      { name: '临江大学', distance: 0.6 },
      { name: '临江师范学院', distance: 1.8 },
      { name: '临江理工学院', distance: 2.4 }
    ]
  };

  /* ---------- 职位库（学生端大厅 / 匹配） ----------
     时薪分布：餐饮 16-22 / 零售 18-25 / 家教 40-80 / 活动协助 15-30 / 礼仪 20-28 / 仓储 20-25 / 地推 18+提成
     距离 0.3-8km，3km 内约 60%
  */
  var jobs = [
    /* ===== 原 j1 - j13 保留原字段 + 新增 optional ===== */
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
      status: 'recruiting',
      publishedAt: '10.29', views: 246, favorites: 22, responseTime: '3小时内', merchantTel: '138****2210',
      favorite: false, tags: ['日结', '包餐', '新手友好'],
      source: '58同城真实商家语料 · 奶茶店兼职'
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
      status: 'recruiting',
      publishedAt: '10.30', views: 178, favorites: 18, responseTime: '2小时内', merchantTel: '139****6672',
      favorite: false, tags: ['日结', '轻松', '包午餐'],
      source: '兼职猫 · 糖水铺兼职真实发布'
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
      status: 'recruiting',
      publishedAt: '10.28', views: 212, favorites: 15, responseTime: '当天', merchantTel: '137****1145',
      favorite: false, tags: ['周结', '餐补', '大企业'],
      source: 'BOSS直聘 · 快时尚品牌真实招聘'
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
      status: 'full',
      publishedAt: '10.26', views: 156, favorites: 28, responseTime: '30分钟内', merchantTel: '186****3301',
      favorite: false, tags: ['高时薪', '英语', '日结'],
      source: '58同城 · 教育机构真实兼职'
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
      status: 'recruiting',
      publishedAt: '10.30', views: 280, favorites: 11, responseTime: '4小时内', merchantTel: '135****8820',
      favorite: false, tags: ['志愿证书', '早班', '周结'],
      source: '兼职猫 · 大型活动志愿者真实招募'
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
      status: 'recruiting',
      publishedAt: '10.27', views: 198, favorites: 20, responseTime: '当天', merchantTel: '182****5514',
      favorite: false, tags: ['日结', '工作餐', '形象岗'],
      source: 'BOSS直聘 · 地产礼仪真实兼职'
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
      status: 'recruiting',
      publishedAt: '10.25', views: 234, favorites: 9, responseTime: '半天内', merchantTel: '131****9980',
      favorite: false, tags: ['周结', '多班可选', '体力活'],
      source: '58同城 · 物流仓真实兼职'
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
      status: 'recruiting',
      publishedAt: '10.31', views: 142, favorites: 7, responseTime: '1小时内', merchantTel: '183****2256',
      favorite: false, tags: ['日结', '有提成', '活泼外向'],
      source: '兼职猫 · 地推派单真实招聘'
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
      status: 'recruiting',
      publishedAt: '10.29', views: 256, favorites: 25, responseTime: '2小时内', merchantTel: '177****4402',
      favorite: false, tags: ['日结', '包晚饭', '好玩'],
      source: 'BOSS直聘 · 剧本杀店真实兼职'
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
      status: 'recruiting',
      publishedAt: '10.31', views: 167, favorites: 23, responseTime: '1小时内', merchantTel: '155****7721',
      favorite: false, tags: ['日结', '学技能', '近'],
      source: '58同城 · 咖啡馆真实兼职'
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
      status: 'recruiting',
      publishedAt: '10.28', views: 134, favorites: 14, responseTime: '当天', merchantTel: '138****9903',
      favorite: false, tags: ['周结', '环境好', '艺术氛围'],
      source: '兼职猫 · 美术馆志愿者真实招募'
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
      status: 'recruiting',
      publishedAt: '10.29', views: 128, favorites: 17, responseTime: '3小时内', merchantTel: '189****6630',
      favorite: false, tags: ['日结', '美术', '近'],
      source: '58同城 · 少儿培训真实兼职'
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
      status: 'ended',
      publishedAt: '10.20', views: 278, favorites: 13, responseTime: '当天', merchantTel: '137****8850',
      favorite: false, tags: ['日结', '有趣', '已结束'],
      source: 'BOSS直聘 · 商圈活动真实兼职'
    },

    /* ===== 新增 j14 - j30 ===== */
    {
      id: 'j14', title: '星巴克周末咖啡师助理', merchant: '星巴克·青春商业街店', category: '餐饮服务',
      pay: 22, unit: '时', settle: '周结', verified: true, rating: 4.7,
      distance: 0.9, addr: '青春商业街 8 号',
      slots: [{ d: 'sat', s: '09:00', e: '15:00' }, { d: 'sun', s: '10:00', e: '16:00' }],
      headcount: 2, applied: 1, skills: ['餐饮服务', '收银', '沟通表达'],
      match: 85,
      desc: '协助咖啡师点单、收银、饮品辅助制作，提供员工折扣咖啡。',
      req: '形象整洁，有服务意识；连锁咖啡兼职经验优先。',
      status: 'recruiting',
      publishedAt: '10.30', views: 189, favorites: 19, responseTime: '半天内', merchantTel: '136****0078',
      favorite: false, tags: ['周结', '连锁品牌', '学技能'],
      source: '58同城 · 连锁咖啡真实兼职'
    },
    {
      id: 'j15', title: '喜茶周末茶饮店员', merchant: '喜茶·城西万达店', category: '餐饮服务',
      pay: 21, unit: '时', settle: '周结', verified: true, rating: 4.6,
      distance: 3.6, addr: '城西万达广场 2F',
      slots: [{ d: 'sat', s: '10:00', e: '18:00' }, { d: 'sun', s: '10:00', e: '18:00' }],
      headcount: 4, applied: 2, skills: ['餐饮服务', '收银'],
      match: 74,
      desc: '高峰时段协助点单、制饮品、打包，节奏快但同事氛围好。',
      req: '手脚麻利，能接受站立 8 小时。',
      status: 'recruiting',
      publishedAt: '10.29', views: 201, favorites: 12, responseTime: '当天', merchantTel: '138****5523',
      favorite: false, tags: ['周结', '连锁', '多班'],
      source: 'BOSS直聘 · 喜茶真实招聘'
    },
    {
      id: 'j16', title: '屈臣氏周末导购', merchant: '屈臣氏·教育街区店', category: '零售导购',
      pay: 19, unit: '时', settle: '周结', verified: true, rating: 4.5,
      distance: 1.9, addr: '教育街区 22 号',
      slots: [{ d: 'sat', s: '10:00', e: '18:00' }],
      headcount: 2, applied: 0, skills: ['零售导购', '沟通表达', '商品整理'],
      match: 80,
      desc: '护肤品导购，负责理货、顾客推荐、试用装派发，月销达标有额外奖金。',
      req: '对护肤品成分有基础了解者优先，形象整洁。',
      status: 'recruiting',
      publishedAt: '10.31', views: 98, favorites: 6, responseTime: '2小时内', merchantTel: '185****2209',
      favorite: false, tags: ['周结', '提成', '美妆'],
      source: '兼职猫 · 屈臣氏真实兼职'
    },
    {
      id: 'j17', title: '海底捞周末传菜员', merchant: '海底捞·城西万达店', category: '餐饮服务',
      pay: 20, unit: '时', settle: '周结', verified: true, rating: 4.8,
      distance: 3.7, addr: '城西万达广场 4F',
      slots: [{ d: 'sat', s: '16:00', e: '22:00' }, { d: 'sun', s: '11:00', e: '17:00' }],
      headcount: 5, applied: 3, skills: ['餐饮服务', '体力较好', '团队协作'],
      match: 68,
      desc: '高峰时段传菜、撤台，提供免费员工餐与宿舍洗澡。',
      req: '能吃苦耐劳，服从排班。',
      status: 'recruiting',
      publishedAt: '10.27', views: 245, favorites: 10, responseTime: '半天内', merchantTel: '133****7782',
      favorite: false, tags: ['周结', '包餐', '大企业'],
      source: '58同城 · 海底捞真实兼职'
    },
    {
      id: 'j18', title: '小学数学辅导老师', merchant: '学而思·临江分校', category: '家教辅导',
      pay: 75, unit: '时', settle: '周结', verified: true, rating: 4.9,
      distance: 2.1, addr: '教育街区 30 号',
      slots: [{ d: 'sat', s: '14:00', e: '18:00' }, { d: 'sun', s: '09:00', e: '12:00' }],
      headcount: 2, applied: 1, skills: ['家教辅导', '数学辅导', '耐心细致'],
      match: 83,
      desc: '4-6 年级数学小组课（6 人），辅导课堂练习与课后答疑。',
      req: '数学成绩好，有耐心；师范/数学系/考过教资优先。',
      status: 'recruiting',
      publishedAt: '10.30', views: 163, favorites: 26, responseTime: '半天内', merchantTel: '187****1190',
      favorite: false, tags: ['高时薪', '数学', '周结'],
      source: 'BOSS直聘 · 学而思真实兼职'
    },
    {
      id: 'j19', title: '家教·初三英语一对一', merchant: '家长自营', category: '家教辅导',
      pay: 80, unit: '时', settle: '日结', verified: false, rating: 4.6,
      distance: 1.3, addr: '青春商业街附近小区（具体私聊）',
      slots: [{ d: 'sat', s: '19:00', e: '21:00' }, { d: 'sun', s: '15:00', e: '17:00' }],
      headcount: 1, applied: 2, skills: ['家教辅导', '英语口语', '耐心细致'],
      match: 88,
      desc: '初三女生补英语语法与阅读，每周 2 次，可长期合作。',
      req: '英语四级 550+ / 六级 / 雅思 6.5+，有家教经验优先。',
      status: 'recruiting',
      publishedAt: '10.31', views: 87, favorites: 16, responseTime: '2小时内', merchantTel: '130****4412',
      favorite: false, tags: ['高时薪', '一对一', '日结'],
      source: '58同城 · 家教真实发布'
    },
    {
      id: 'j20', title: '车展临时礼仪引导', merchant: '临江国际会展中心', category: '展会礼仪',
      pay: 28, unit: '时', settle: '日结', verified: true, rating: 4.7,
      distance: 5.8, addr: '滨江大道 99 号',
      slots: [{ d: 'sat', s: '09:00', e: '17:00' }, { d: 'sun', s: '09:00', e: '17:00' }],
      headcount: 12, applied: 4, skills: ['形象气质', '礼仪站姿', '沟通表达'],
      match: 72,
      desc: '周末车展嘉宾引导、签到、媒体区协助，提供工作餐与交通补贴。',
      req: '女生身高 165cm+，形象大方，有礼仪经验优先。',
      status: 'recruiting',
      publishedAt: '10.28', views: 223, favorites: 21, responseTime: '当天', merchantTel: '181****6644',
      favorite: false, tags: ['日结', '包餐', '身高要求'],
      source: '兼职猫 · 车展真实礼仪招募'
    },
    {
      id: 'j21', title: '会展中心活动协助', merchant: '临江会展组委会', category: '活动协助',
      pay: 16, unit: '时', settle: '日结', verified: true, rating: 4.5,
      distance: 5.9, addr: '滨江大道 99 号',
      slots: [{ d: 'sat', s: '07:00', e: '18:00' }],
      headcount: 20, applied: 8, skills: ['活动执行', '团队协作', '体力较好'],
      match: 60,
      desc: '展会布展协助、观众引导、物资搬运与收尾，提供早餐午餐。',
      req: '能吃苦，可做全天 10 小时。',
      status: 'recruiting',
      publishedAt: '10.30', views: 115, favorites: 8, responseTime: '4小时内', merchantTel: '156****3389',
      favorite: false, tags: ['日结', '包餐', '体力活'],
      source: '58同城 · 会展真实兼职'
    },
    {
      id: 'j22', title: '地铁站 APP 推广地推', merchant: '某金融 APP 推广项目', category: '传单派发',
      pay: 20, unit: '时', settle: '日结', verified: true, rating: 4.2,
      distance: 2.2, addr: '大学城地铁站 A 出口',
      slots: [{ d: 'sat', s: '11:00', e: '19:00' }, { d: 'sun', s: '11:00', e: '19:00' }],
      headcount: 8, applied: 3, skills: ['APP推广', '沟通表达', '外向开朗'],
      match: 62,
      desc: '引导扫码下载注册 APP，每注册成功额外奖金 3 元，上不封顶。',
      req: '性格外向，有销售/地推经验优先，日均下载 15+ 有额外奖励。',
      status: 'recruiting',
      publishedAt: '10.31', views: 104, favorites: 5, responseTime: '1小时内', merchantTel: '137****0067',
      favorite: false, tags: ['日结', '高提成', '活泼'],
      source: 'BOSS直聘 · APP地推真实招聘'
    },
    {
      id: 'j23', title: '永辉超市周末理货员', merchant: '永辉超市·城西万达店', category: '零售导购',
      pay: 18, unit: '时', settle: '周结', verified: true, rating: 4.4,
      distance: 3.4, addr: '城西万达广场 B1',
      slots: [{ d: 'sat', s: '08:00', e: '16:00' }, { d: 'sun', s: '09:00', e: '17:00' }],
      headcount: 4, applied: 2, skills: ['商品整理', '细心负责', '体力较好'],
      match: 70,
      desc: '生鲜区理货、补货、价签核对，需穿超市统一工服（提供）。',
      req: '能接受站立 8 小时，踏实肯干。',
      status: 'recruiting',
      publishedAt: '10.29', views: 139, favorites: 6, responseTime: '当天', merchantTel: '158****2241',
      favorite: false, tags: ['周结', '大企业', '多班'],
      source: '58同城 · 永辉真实兼职'
    },
    {
      id: 'j24', title: '京东物流周末分拣员', merchant: '京东物流·临港分拣中心', category: '仓储物流',
      pay: 25, unit: '时', settle: '周结', verified: true, rating: 4.5,
      distance: 7.2, addr: '临港物流园 B2 仓',
      slots: [
        { d: 'sat', s: '08:00', e: '16:00' }, { d: 'sat', s: '16:00', e: '24:00' },
        { d: 'sun', s: '08:00', e: '16:00' }, { d: 'sun', s: '16:00', e: '24:00' }
      ],
      headcount: 15, applied: 9, skills: ['仓储分拣', '体力较好', '搬运卸货'],
      match: 58,
      desc: '双 11 高峰包裹分拣，晚班额外补贴 30 元/天，提供食堂与通勤车。',
      req: '能接受夜班/站立 8 小时，自备平底鞋。',
      status: 'recruiting',
      publishedAt: '10.25', views: 267, favorites: 14, responseTime: '半天内', merchantTel: '135****9963',
      favorite: false, tags: ['周结', '夜班补贴', '大厂'],
      source: 'BOSS直聘 · 京东物流真实兼职'
    },
    {
      id: 'j25', title: '大润发周末收银员', merchant: '大润发·青春商业街店', category: '零售导购',
      pay: 19, unit: '时', settle: '周结', verified: true, rating: 4.5,
      distance: 1.1, addr: '青春商业街 36 号',
      slots: [{ d: 'sat', s: '10:00', e: '18:00' }, { d: 'sun', s: '10:00', e: '18:00' }],
      headcount: 3, applied: 1, skills: ['收银', '细心负责', '沟通表达'],
      match: 78,
      desc: '周末高峰收银，提供餐补，超市购物享员工价。',
      req: '细心、数学好，有收银经验优先。',
      status: 'recruiting',
      publishedAt: '10.30', views: 176, favorites: 11, responseTime: '3小时内', merchantTel: '138****7752',
      favorite: false, tags: ['周结', '餐补', '近'],
      source: '58同城 · 大润发真实兼职'
    },
    {
      id: 'j26', title: '儿童摄影周末模特助理', merchant: '维尼宝贝儿童摄影', category: '活动协助',
      pay: 22, unit: '时', settle: '日结', verified: true, rating: 4.8,
      distance: 1.7, addr: '教育街区 11 号',
      slots: [{ d: 'sat', s: '09:00', e: '17:00' }],
      headcount: 2, applied: 1, skills: ['沟通表达', '耐心细致', '形象气质'],
      match: 82,
      desc: '协助摄影师引导小朋友情绪、搭配服装、整理道具，包午餐。',
      req: '喜欢小朋友，有耐心，形象干净。',
      status: 'recruiting',
      publishedAt: '10.31', views: 94, favorites: 16, responseTime: '1小时内', merchantTel: '186****4408',
      favorite: false, tags: ['日结', '轻松', '近'],
      source: '兼职猫 · 摄影助理真实兼职'
    },
    {
      id: 'j27', title: '舞蹈室周末模特走秀', merchant: '临江舞蹈培训中心', category: '展会礼仪',
      pay: 26, unit: '时', settle: '日结', verified: true, rating: 4.7,
      distance: 1.4, addr: '教育街区 28 号 4F',
      slots: [{ d: 'sun', s: '14:00', e: '18:00' }],
      headcount: 6, applied: 2, skills: ['形象气质', '模特走秀', '礼仪站姿'],
      match: 75,
      desc: '少儿舞蹈汇演家长场，需担任开场/中场走秀模特，穿提供的礼服。',
      req: '女生身高 163cm+，身材比例好，有走秀经验优先。',
      status: 'recruiting',
      publishedAt: '10.29', views: 123, favorites: 21, responseTime: '半天内', merchantTel: '152****8830',
      favorite: false, tags: ['日结', '走秀', '礼服提供'],
      source: 'BOSS直聘 · 舞蹈机构真实招募'
    },
    {
      id: 'j28', title: '星巴克·滨江大道店周末帮工', merchant: '星巴克·滨江大道店', category: '餐饮服务',
      pay: 20, unit: '时', settle: '周结', verified: true, rating: 4.6,
      distance: 4.8, addr: '滨江大道 55 号',
      slots: [{ d: 'sat', s: '12:00', e: '20:00' }, { d: 'sun', s: '12:00', e: '20:00' }],
      headcount: 2, applied: 0, skills: ['餐饮服务', '沟通表达'],
      match: 72,
      desc: '江景店周末高峰协助点单出品，环境好，咖啡员工价。',
      req: '形象整洁，有服务意识。',
      status: 'recruiting',
      publishedAt: '10.31', views: 86, favorites: 17, responseTime: '2小时内', merchantTel: '131****6650',
      favorite: false, tags: ['周结', '江景', '咖啡折扣'],
      source: '58同城 · 星巴克真实兼职'
    },
    {
      id: 'j29', title: '新东方·周末助教', merchant: '新东方·临江中心', category: '家教辅导',
      pay: 50, unit: '时', settle: '周结', verified: true, rating: 4.8,
      distance: 2.0, addr: '教育街区 36 号',
      slots: [{ d: 'sat', s: '08:30', e: '17:30' }, { d: 'sun', s: '08:30', e: '17:30' }],
      headcount: 4, applied: 2, skills: ['家教辅导', '英语四级', '耐心细致'],
      match: 79,
      desc: '大班课助教：点名、发放讲义、课后批改作业与辅导答疑。',
      req: '英语/数学成绩好，有耐心；师范专业优先。',
      status: 'recruiting',
      publishedAt: '10.28', views: 197, favorites: 24, responseTime: '半天内', merchantTel: '180****2291',
      favorite: false, tags: ['周结', '教育大厂', '多班'],
      source: 'BOSS直聘 · 新东方真实兼职'
    },
    {
      id: 'j30', title: '西西弗书店周末理货', merchant: '西西弗书店·城西万达店', category: '零售导购',
      pay: 18, unit: '时', settle: '周结', verified: true, rating: 4.7,
      distance: 3.5, addr: '城西万达广场 3F',
      slots: [{ d: 'sat', s: '10:00', e: '18:00' }, { d: 'sun', s: '10:00', e: '18:00' }],
      headcount: 2, applied: 0, skills: ['商品整理', '细心负责', '沟通表达'],
      match: 73,
      desc: '周末图书整理、收银协助、咖啡区上餐，书店环境安静舒服。',
      req: '喜欢读书，细心有耐心，形象整洁。',
      status: 'recruiting',
      publishedAt: '10.30', views: 145, favorites: 18, responseTime: '半天内', merchantTel: '176****5512',
      favorite: false, tags: ['周结', '环境好', '书店'],
      source: '58同城 · 西西弗真实兼职'
    }
  ];

  /* ---------- 学生端：我的报名 ---------- */
  var applications = [
    { id: 'a1', jobId: 'j10', slots: [{ d: 'sat', s: '08:00', e: '14:00' }], status: 'scheduled', appliedAt: '10.30' },
    { id: 'a2', jobId: 'j8', slots: [{ d: 'sun', s: '10:00', e: '16:00' }], status: 'pending', appliedAt: '10.31' },
    { id: 'a3', jobId: 'j4', slots: [{ d: 'sat', s: '09:00', e: '11:30' }], status: 'rejected', appliedAt: '10.28' },
    { id: 'a4', jobId: 'j11', slots: [{ d: 'sun', s: '09:00', e: '17:00' }], status: 'done', appliedAt: '10.20' },
    // 新增 3 条覆盖更多状态
    { id: 'a5', jobId: 'j12', slots: [{ d: 'sun', s: '09:00', e: '12:00' }], status: 'pending', appliedAt: '11.01' },
    { id: 'a6', jobId: 'j1',  slots: [{ d: 'sat', s: '14:00', e: '21:00' }], status: 'scheduled', appliedAt: '10.29' },
    { id: 'a7', jobId: 'j2',  slots: [{ d: 'sat', s: '11:00', e: '20:00' }], status: 'pending', appliedAt: '11.01' }
  ];

  /* ---------- 商家端：本店职位 ---------- */
  var merchantProfile = {
    name: '周记糖水铺',
    avatarText: '周',
    intro: '大学城老字号糖水铺 · 营业 6 年',
    verified: true,
    // 新增 optional
    address: '临江大学南门·糖水街 3 号',
    businessHours: '11:00 - 22:00',
    verifiedAt: '2025.03.15',
    settledTotal: 12
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
    },
    // 新增 m5 + m6
    {
      id: 'm5', title: '糖水铺周末洗碗帮工', category: '餐饮服务',
      pay: 15, unit: '时', settle: '日结',
      days: ['sat', 'sun'], time: '11:00 - 15:00',
      headcount: 2, applied: 1, status: 'recruiting',
      addr: '临江大学南门·糖水街 3 号',
      desc: '午市高峰餐后收碗、清洗整理、协助后厨备料。',
      skills: ['卫生习惯', '体力较好', '细心负责'],
      gap: '周末各还缺 1 人'
    },
    {
      id: 'm6', title: '元宵手工汤圆体验活动', category: '活动协助',
      pay: 18, unit: '时', settle: '日结',
      days: ['sun'], time: '09:00 - 18:00',
      headcount: 3, applied: 0, status: 'paused',
      addr: '临江大学南门·糖水街 3 号',
      desc: '元宵节亲子手作汤圆活动协助（暂停，节后重新开启）。',
      skills: ['活动执行', '耐心细致', '沟通表达'],
      gap: '活动暂停'
    }
  ];

  /* ---------- 商家端：候选人 ---------- */
  var candidates = {
    m1: [
      {
        id: 'c1', name: '陈屿', avatarText: '屿', credit: 95,
        match: 94, skillMatch: 4, skillTotal: 4, timeOverlap: '100%',
        applySlots: [{ d: 'sat', s: '11:00', e: '20:00' }],
        note: '上周在同街甜品店做过前厅，熟悉收台动线。',
        doneJobs: 9, status: 'pending',
        signRate: '98%', historyReviews: [{ who: '老板A', stars: 5, text: '手脚勤快很靠谱' }]
      },
      {
        id: 'c2', name: '黄依依', avatarText: '黄', credit: 90,
        match: 88, skillMatch: 3, skillTotal: 4, timeOverlap: '100%',
        applySlots: [{ d: 'sat', s: '11:00', e: '17:00' }],
        note: '大二学生，周六全天可到岗，能做满午市+晚市前半段。',
        doneJobs: 6, status: 'pending',
        signRate: '96%', historyReviews: [{ who: '店B店长', stars: 4, text: '学习快' }]
      },
      {
        id: 'c3', name: '罗浩', avatarText: '罗', credit: 85,
        match: 76, skillMatch: 2, skillTotal: 4, timeOverlap: '44%',
        applySlots: [{ d: 'sat', s: '16:00', e: '20:00' }],
        note: '只能覆盖晚市时段，与另一位候选人时段互补。',
        doneJobs: 3, status: 'pending',
        signRate: '94%', historyReviews: []
      }
    ],
    m2: [
      {
        id: 'c4', name: '许诺', avatarText: '诺', credit: 93,
        match: 91, skillMatch: 3, skillTotal: 3, timeOverlap: '100%',
        applySlots: [{ d: 'sun', s: '10:00', e: '19:00' }],
        note: '在家常奶茶店帮过工，会基础煮茶流程。',
        doneJobs: 8, status: 'pending',
        signRate: '99%', historyReviews: [{ who: '奶茶店老板', stars: 5, text: '认真好学' }]
      },
      {
        id: 'c5', name: '苏晚晴', avatarText: '苏', credit: 88,
        match: 83, skillMatch: 2, skillTotal: 3, timeOverlap: '78%',
        applySlots: [{ d: 'sun', s: '10:00', e: '17:00' }],
        note: '周日需 17:00 前离岗，早班全程可到。',
        doneJobs: 5, status: 'pending',
        signRate: '95%', historyReviews: [{ who: '咖啡店店长', stars: 4, text: '服务态度好' }]
      },
      {
        id: 'c6', name: '李明翰', avatarText: '李', credit: 81,
        match: 68, skillMatch: 1, skillTotal: 3, timeOverlap: '100%',
        applySlots: [{ d: 'sun', s: '10:00', e: '19:00' }],
        note: '第一次做奶茶学徒，但愿意学，时间充裕。',
        doneJobs: 1, status: 'pending',
        signRate: '100%', historyReviews: []
      }
    ],
    m5: [
      {
        id: 'c7', name: '张雯', avatarText: '雯', credit: 92,
        match: 85, skillMatch: 3, skillTotal: 3, timeOverlap: '100%',
        applySlots: [{ d: 'sat', s: '11:00', e: '15:00' }, { d: 'sun', s: '11:00', e: '15:00' }],
        note: '家在附近，周末空闲稳定，踏实肯干。',
        doneJobs: 4, status: 'pending',
        signRate: '97%', historyReviews: [{ who: '餐馆老板', stars: 5, text: '做事干净利索' }]
      },
      {
        id: 'c8', name: '王佳怡', avatarText: '王', credit: 87,
        match: 77, skillMatch: 2, skillTotal: 3, timeOverlap: '100%',
        applySlots: [{ d: 'sat', s: '11:00', e: '15:00' }],
        note: '大二，仅周六有时间。',
        doneJobs: 2, status: 'pending',
        signRate: '94%', historyReviews: []
      }
    ]
  };

  /* ---------- 商家端：待办 ---------- */
  var todos = [
    { id: 't1', icon: 'user-check', text: '2 名候选人待你确认排班（前厅帮工）', badge: ['紧急', 'b-danger'] },
    { id: 't2', icon: 'alert-triangle', text: '周六前厅班次仍有 1 人缺口', badge: ['缺口', 'b-warn'] },
    { id: 't3', icon: 'message', text: '收到 1 条新评价待回复', badge: ['新', 'b-brand'] },
    { id: 't4', icon: 'bell', text: '「珍珠奶茶制茶学徒」有 1 份新报名', badge: ['新', 'b-brand'] },
    { id: 't5', icon: 'calendar', text: '本周日订单已排满，记得备料', badge: ['提醒', 'b-warn'] },
    { id: 't6', icon: 'trending-up', text: '本月已结算 4 笔，商家信用 +2', badge: ['好消息', 'b-ok'] }
  ];

  /* ---------- 商家端：评价 ---------- */
  var reviews = [
    { id: 'rv1', who: '学生 · 陈屿', stars: 5, text: '老板娘很照顾学生，结算准时，午饭还加了个卤蛋。', date: '10.27', amount: 180, merchantReply: '谢谢你的辛苦，欢迎常来~' },
    { id: 'rv2', who: '学生 · 黄依依', stars: 5, text: '店面干净节奏舒服，第一次做餐饮也很安心。', date: '10.25', amount: 160, merchantReply: '' },
    { id: 'rv3', who: '学生 · 许诺', stars: 5, text: '老板教做珍珠很耐心，第一次做奶茶就上手了！', date: '10.28', amount: 170, merchantReply: '聪明又肯学，下次还约！' },
    { id: 'rv4', who: '学生 · 苏晚晴', stars: 4, text: '环境不错，就是周日下午人特别多有点忙不过来。', date: '10.20', amount: 165, merchantReply: '下周开始加派人手，感谢反馈。' },
    { id: 'rv5', who: '学生 · 罗浩', stars: 4, text: '晚班时段有点赶，建议可以分批次。', date: '10.19', amount: 150, merchantReply: '' },
    { id: 'rv6', who: '学生 · 张雯', stars: 5, text: '阿姨们都很照顾我，洗碗很快学会了。', date: '10.15', amount: 120, merchantReply: '文文踏实肯干！' },
    { id: 'rv7', who: '学生 · 李明翰', stars: 4, text: '第一次做餐饮有点紧张，老板人很好。', date: '10.13', amount: 135, merchantReply: '下次就熟了~' },
    { id: 'rv8', who: '学生 · 王佳怡', stars: 5, text: '环境干净，没有想象中累。', date: '10.11', amount: 120, merchantReply: '' },
    { id: 'rv9', who: '学生 · 匿名', stars: 3, text: '午市人多的时候确实有点忙不过来，节奏比较快。', date: '10.08', amount: 155, merchantReply: '我们已调整排班。' },
    { id: 'rv10', who: '学生 · 陈屿', stars: 5, text: '国庆布置活动超好玩，老板还给大家发了奶茶。', date: '10.06', amount: 80, merchantReply: '下次活动还找你！' },
    { id: 'rv11', who: '学生 · 匿名', stars: 4, text: '结算很准时，推荐来。', date: '10.03', amount: 175, merchantReply: '' },
    { id: 'rv12', who: '学生 · 匿名', stars: 5, text: '糖水真的很好喝哈哈，打工还能蹭糖水。', date: '09.30', amount: 160, merchantReply: '哈~下次多送一碗！' }
  ];

  /* ---------- 新增：学生全体（25 人） ---------- */
  var studentsAll = [
    { id: 's1', name: '林小满', school: '临江大学', major: '市场营销', grade: '大二', avatarText: '满', credit: 92, doneJobs: 12, distance: 0.6 },
    { id: 's2', name: '陈屿', school: '临江师范学院', major: '汉语言文学', grade: '大三', avatarText: '屿', credit: 95, doneJobs: 9, distance: 1.8 },
    { id: 's3', name: '黄依依', school: '临江大学', major: '新闻传播', grade: '大二', avatarText: '黄', credit: 90, doneJobs: 6, distance: 0.8 },
    { id: 's4', name: '罗浩', school: '临江理工学院', major: '机械工程', grade: '大一', avatarText: '罗', credit: 85, doneJobs: 3, distance: 2.4 },
    { id: 's5', name: '许诺', school: '临江大学', major: '英语', grade: '大三', avatarText: '诺', credit: 93, doneJobs: 8, distance: 0.5 },
    { id: 's6', name: '苏晚晴', school: '临江师范学院', major: '学前教育', grade: '大二', avatarText: '苏', credit: 88, doneJobs: 5, distance: 1.9 },
    { id: 's7', name: '李明翰', school: '临江大学', major: '计算机', grade: '大一', avatarText: '李', credit: 81, doneJobs: 1, distance: 0.7 },
    { id: 's8', name: '张雯', school: '临江师范学院', major: '小学教育', grade: '大三', avatarText: '雯', credit: 92, doneJobs: 4, distance: 1.7 },
    { id: 's9', name: '王佳怡', school: '临江大学', major: '设计学', grade: '大二', avatarText: '王', credit: 87, doneJobs: 2, distance: 1.0 },
    { id: 's10', name: '赵天宇', school: '临江理工学院', major: '软件工程', grade: '大三', avatarText: '赵', credit: 90, doneJobs: 7, distance: 2.8 },
    { id: 's11', name: '刘欣悦', school: '临江大学', major: '日语', grade: '大二', avatarText: '刘', credit: 89, doneJobs: 5, distance: 0.9 },
    { id: 's12', name: '周亦凡', school: '临江师范学院', major: '音乐教育', grade: '大三', avatarText: '周', credit: 91, doneJobs: 6, distance: 2.0 },
    { id: 's13', name: '吴思远', school: '临江大学', major: '法学', grade: '大一', avatarText: '吴', credit: 83, doneJobs: 2, distance: 0.4 },
    { id: 's14', name: '郑雪', school: '临江理工学院', major: '材料科学', grade: '大二', avatarText: '郑', credit: 86, doneJobs: 4, distance: 3.1 },
    { id: 's15', name: '孙浩然', school: '临江大学', major: '行政管理', grade: '大三', avatarText: '孙', credit: 94, doneJobs: 10, distance: 0.6 },
    { id: 's16', name: '钱雅菲', school: '临江师范学院', major: '美术教育', grade: '大二', avatarText: '钱', credit: 90, doneJobs: 3, distance: 2.1 },
    { id: 's17', name: '冯宇航', school: '临江大学', major: '体育教育', grade: '大三', avatarText: '冯', credit: 88, doneJobs: 8, distance: 1.1 },
    { id: 's18', name: '陈小宇', school: '临江理工学院', major: '会计学', grade: '大一', avatarText: '陈', credit: 80, doneJobs: 1, distance: 2.5 },
    { id: 's19', name: '褚雨桐', school: '临江大学', major: '国际经济', grade: '大二', avatarText: '褚', credit: 91, doneJobs: 5, distance: 0.8 },
    { id: 's20', name: '卫文博', school: '临江师范学院', major: '历史学', grade: '大三', avatarText: '卫', credit: 93, doneJobs: 7, distance: 1.8 },
    { id: 's21', name: '蒋梦瑶', school: '临江大学', major: '汉语言文学', grade: '大一', avatarText: '蒋', credit: 84, doneJobs: 2, distance: 0.5 },
    { id: 's22', name: '沈子墨', school: '临江理工学院', major: '电子工程', grade: '大二', avatarText: '沈', credit: 87, doneJobs: 4, distance: 3.0 },
    { id: 's23', name: '韩梓萱', school: '临江大学', major: '心理学', grade: '大三', avatarText: '韩', credit: 92, doneJobs: 6, distance: 0.7 },
    { id: 's24', name: '杨帆', school: '临江师范学院', major: '舞蹈教育', grade: '大二', avatarText: '杨', credit: 89, doneJobs: 3, distance: 1.6 },
    { id: 's25', name: '朱俊熙', school: '临江大学', major: '药学', grade: '大一', avatarText: '朱', credit: 82, doneJobs: 1, distance: 1.2 }
  ];

  /* ---------- 新增：学生端消息（6 条） ---------- */
  var messages = [
    { id: 'msg1', title: '报名已通过 · 咖啡馆周末吧台学徒', content: '甜野咖啡 已通过你的报名，排班：周六 08:00 - 14:00，请准时到岗。', time: '10.31 20:18', read: false, from: '甜野咖啡' },
    { id: 'msg2', title: '商家回复 · 少儿美术课堂助教', content: '彩虹岛美术教室：你的报名已收到，预计今晚 22:00 前给答复。', time: '11.01 15:02', read: false, from: '彩虹岛美术' },
    { id: 'msg3', title: '报名已通过 · 汲果奶茶店', content: '汲果奶茶 同意你周六 14:00-21:00 的班次，请提前 10 分钟到店。', time: '10.30 11:30', read: true, from: '汲果奶茶' },
    { id: 'msg4', title: '评价提醒', content: '「美术馆巡展引导」已完成，去给个评价吧？', time: '10.21 09:00', read: true, from: '兼职蜂平台' },
    { id: 'msg5', title: '钱包到账 ¥120', content: '校庆巡展引导员结算已到账，余额 ¥386。', time: '10.13 17:45', read: true, from: '兼职蜂平台' },
    { id: 'msg6', title: '报名已通过 · 周记糖水铺', content: '（自动）周记糖水铺 已通过你的报名，排班：周六 11:00 - 20:00。', time: '11.01 16:30', read: false, from: '周记糖水铺' }
  ];

  /* ---------- 新增：商家端消息（4 条） ---------- */
  var merchantMessages = [
    { id: 'mm1', title: '新报名 · 前厅帮工', content: '陈屿 申请周六 11:00-20:00 班次，请尽快确认。', time: '11.01 14:20', read: false, from: '兼职蜂平台' },
    { id: 'mm2', title: '新报名 · 奶茶制茶学徒', content: '李明翰 申请周日 10:00-19:00 班次。', time: '11.01 12:05', read: false, from: '兼职蜂平台' },
    { id: 'mm3', title: '新评价', content: '学生 张雯 给了你 5 星好评，快来回复。', time: '10.15 19:21', read: true, from: '兼职蜂平台' },
    { id: 'mm4', title: '本月结算通知', content: '本月共结算 4 笔，商家信用 +2，继续加油！', time: '11.01 08:00', read: true, from: '兼职蜂平台' }
  ];

  /* ---------- 新增：搜索建议 ---------- */
  var searchSuggestions = [
    '奶茶店', '咖啡馆', '家教', '收银', '地推', '仓储', '活动协助', '礼仪', '优衣库', '海底捞'
  ];

  /* ---------- 新增：收藏职位 ---------- */
  var favorites = ['j1', 'j10'];

  /* ---------- 新增：平台公告（3 条） ---------- */
  var announcements = [
    { id: 'an1', title: '双 11 兼职季启动，时薪补贴最高 +5 元', content: '11.01 - 11.11 期间报名双 11 仓库/地推类职位，完成后额外奖励 ¥50。', time: '10.30', tag: '活动' },
    { id: 'an2', title: '平台安全提醒：拒绝任何私下转账', content: '所有结算一律走兼职蜂平台钱包，请勿向任何商家/中介提前付费。', time: '10.28', tag: '安全' },
    { id: 'an3', title: '大学生信用体系升级，好蜂员享优先推送', content: '信用分 90+ 金牌蜂员将自动匹配 3km 内高优岗位。', time: '10.25', tag: '公告' }
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
    // 新增顶层
    studentsAll: studentsAll,
    messages: messages,
    merchantMessages: merchantMessages,
    searchSuggestions: searchSuggestions,
    favorites: favorites,
    announcements: announcements,
    TODAY: { d: 'sat', date: '11.1', weekday: '周六' }
  };
})();
