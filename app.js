/* ============================================================
 * 赛博中医院 · Bug 问诊科
 * 纯前端：关键词问诊 / 处方库 / 神签库 / 诊断书导出
 * ============================================================ */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  const pickWeighted = (arr) => {
    const total = arr.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of arr) { r -= x.w; if (r < 0) return x; }
    return arr[0];
  };
  const randInt = (a, b) => a + rand(b - a + 1);
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

  /* ============================================================
   * 一、问诊规则库：关键词 → 脉象 + 专属处方
   * ============================================================ */
  const RULES = [
    {
      id: 'npe',
      re: [/null/, /undefined/, /空指针/, /\bnpe\b/, /cannot read propert/, /not defined/],
      pulse: '关脉涩而空，如手伸进口袋却摸了个空——你的变量正用空指针表达孤独，它只是想被初始化（被在乎）。',
      yin: '陈年橡皮鸭一只，供于案头；将调用链自头至尾向它陈诉三遍，温水送服',
      herbs: [['守空丹', '三钱'], ['玉屏风散', '二钱'], ['照影灯芯', '一束']],
      advice: '于报错处下断点，看清究竟是谁递来的 null；调用他人接口，当默认其无所不为，先判空而后信。忌盲目采信外来之物。'
    },
    {
      id: 'crash',
      re: [/timeout|timed out|超时/, /502|500|503|504/, /崩|挂|事故|宕机|炸了/, /oom|内存泄漏|memory/, /告警|报警/],
      pulse: '脉来急促、数至一止，像是请求出门后再没回来——此乃「超时未归」之症，服务器和你的外卖小哥，至少有一个迷了路。',
      yin: '凉咖啡一盏（须放凉，陪它同等到超时），兑温黄酒冲服',
      herbs: [['溯日志饮', '五钱'], ['退避熔断散', '各二钱'], ['回生保命丹', '一枚（保命用）']],
      advice: '先观监控与日志，辨其是崩是缓；凡重试，必带上限与退避，否则一灾化作两灾。忌慌乱扩容、怒中重启。'
    },
    {
      id: 'env',
      re: [/环境|配置|依赖|装不上|版本冲突|环境变量/, /node_modules|npm i|pnpm|yarn/, /conda|venv|requirements/, /env\b/],
      pulse: '望之面色发黄，闻之依赖成山——本地一切安好，一换机器就水土不服，此乃「环境风水失调」。',
      yin: 'node_modules 坟场黄土一抔，以删除键送之（只取依赖目录，切忌误伤旁人）',
      herbs: [['版本锁金丹', '三钱'], ['净境重元汤', '二钱'], ['环境明鉴录', '一卷']],
      advice: '删尽依赖与锁版之档，干净重装，核对运行时大版本；将搭建之法录于 README。今日留方，乃救下周之己。'
    },
    {
      id: 'git',
      re: [/merge conflict|冲突|合并冲突/, /\bgit\b|commit|提交|回滚|分支|push|pull/],
      pulse: '脉如双股绳索打成死结——两处修改在同一行狭路相逢，谁也不让谁。',
      yin: '冲突标记一纸，佐深呼吸三口送下；切忌怒中点击「接受当前更改」',
      herbs: [['定神香', '一钱'], ['频存固本丹', '三钱'], ['先宗后合汤', '二钱']],
      advice: '冲突之间，先读懂两边各自为何而改，再定取舍；合罢跑过测试方可 push。忌合而不验，隐 Bug 由此而生。'
    },
    {
      id: 'overwork',
      re: [/加班|996|裁员|离职|下班|周报|绩效|内卷/, /累|烦|焦虑|emo|崩溃|压力|撑不住|不想干|摸鱼/],
      pulse: '脉细如丝，按之无力——此非代码之病，是工位的风水太硬，日吸精气三升。',
      yin: '准点下班的夕阳一缕，佐工位外人间烟火气，徐徐服之',
      herbs: [['事不过三散', '三钱'], ['积微周报膏', '二钱'], ['宁神闭窍香', '一两']],
      advice: '先静坐片刻，把心头诸事倒于纸上，圈出「眼下唯一可行的一小步」。人非服务器，不求七乘廿四高可用；子时前安寝。'
    },
    {
      id: 'review',
      re: [/code review|\bcr\b|评审|review/, /被怼|被喷|挂我|打回|驳回/],
      pulse: '脉弦而紧，是一股被「这里为什么不用设计模式」顶回来的闷气，郁于胸中，久而成结。',
      yin: '评审意见截图一张，折好收起，三日后再取出细看',
      herbs: [['定心丸', '一枚'], ['逐条回音汤', '三钱'], ['当面解结散', '二钱']],
      advice: '被审的是代码 diff，非君本人。将意见分作「当改、当议、当驳而陈之」三类，逐条回复，气结自散。忌郁结于怀。'
    },
    {
      id: 'cache',
      re: [/缓存|cache|redis|脏数据|不生效|没更新|旧数据/],
      pulse: '脉乍寒乍热——代码明明对了，跑出来还是旧结果，邪气藏在缓存深处，名曰「改了个寂寞」。',
      yin: 'Ctrl+F5 硬刷符一张（移动端则入设置，亲手涤除缓存）',
      herbs: [['破障刷新散', '二钱'], ['过期明鉴丹', '三钱'], ['涤尘验真汤', '一钱']],
      advice: '改而不生效，先疑缓存：浏览器、CDN、服务端、数据库，四层循经而查。先疑缓存，莫疑人生。'
    },
    {
      id: 'race',
      re: [/并发|多线程|死锁|竞态|race|线程安全|偶现|随机.*bug|时好时坏/],
      pulse: '脉来飘忽，时有时无——此病千人千面，高并发一来便现形，你独自问诊时它从不露面。',
      yin: '可稳定复现的日志三两，温火慢煎；比玄学祷告管用十倍',
      herbs: [['定锁分界丹', '三钱'], ['定风丹', '二枚'], ['循时报线索', '四钱']],
      advice: '竞态之恙，先求「复现」二字：压测之脚本、并发之请求、带时辰之日志。能稳定现形，病已去半。忌凭空祷告。'
    },
    {
      id: 'css',
      re: [/\bcss\b|样式|对齐|居中|像素|兼容|布局|错位|偏了/],
      pulse: '望之五官端正，却总歪着一像素——此乃「居中失调」科常见小病，不致命，但极损颜面。',
      yin: '设计标注图一张、直尺一把、放大镜一只，三者煎汤（雾）熏眼',
      herbs: [['纵横定位散', '三钱'], ['兼容护本膏', '二钱'], ['壮士断腕散', '一两']],
      advice: '开开发者工具观其盒模型，看是 margin、padding 还是默认对齐在暗中作祟。忌凭心意改，宜凭数值改。'
    },
    {
      id: 'test',
      re: [/测试|复现|单测|覆盖率|qa|test|定位不到|找不到原因/],
      pulse: '脉象看似正常却自称重症——神医须知：能稳定复现的，都不算绝症。',
      yin: '最小复现案例一份，文火慢炖，切勿整锅端来',
      herbs: [['验症测试丹', '三枚'], ['边域探病散', '二钱'], ['二分溯源针', '一枚']],
      advice: '将问题削至最小复现，再以二分法追溯引入它的那次提交；附步骤而提单，远胜一句「它又坏了」。'
    },
    {
      id: 'regex',
      re: [/正则|regex|regexp/],
      pulse: '脉中隐有天书符文浮动——若以此符文治病，你现在就有两个问题了。',
      yin: '正则可视化图一张、橡皮鸭一只、耐心半盏，三味同泡',
      herbs: [['循序画符散', '三钱'], ['样例照妖镜', '二钱'], ['明意朱批', '二钱']],
      advice: '勿一气画完整符，先合最小片段，再添条件；案头常备三样例：当合者、不当合者、临界者。'
    },
    {
      id: 'interview',
      re: [/面试|八股|算法|leetcode|找工作|简历|offer|笔试|手撕/],
      pulse: '脉象时强时弱，闻「手撕红黑树」则骤停——此乃考前心悸，考生通病，无性命之忧。',
      yin: '旧简历一份，圈出亲手做过的部分，其余一概删去',
      herbs: [['温故知新丹', '三钱'], ['日题保感散', '二钱'], ['模拟问诊汤', '一剂']],
      advice: '八股背之不尽，项目才是主战场：把一桩项目讲出难点、取舍与数据，胜背十题。忌临考心悸，宜调息定神。'
    },
    {
      id: 'ai',
      re: [/\bai\b|copilot|chatgpt|gpt|大模型|prompt|aigc|人工智能|ai 写|ai写/],
      pulse: '脉中有一股外来真气，运行顺畅却不知其所以然——此乃「AI 代写内力反噬」初期之象。',
      yin: 'AI 生成代码一贴，须先通读三遍而后服，切忌闭眼合并',
      herbs: [['逐行明辨散', '三钱'], ['验真试金帖', '二钱'], ['留证注解丹', '一钱']],
      advice: 'AI 所出，乃初稿而非答案：读不懂者不并，测不过者不发——出了事故，背锅的是人不是器。'
    },
    {
      id: 'security',
      re: [/漏洞|注入|xss|sql\s*注入|安全|越权|裸奔|攻击/],
      pulse: '脉有外邪入侵之象，门户大开，而守卫正在打盹。',
      yin: '凡用户所输，皆作「敌军投毒」处置，切勿轻信入口',
      herbs: [['御刺参数丹', '三钱'], ['验毒辟邪散', '三钱'], ['收权固门汤', '二钱']],
      advice: '参数化查询、输出转义、权限最小，三板斧可挡大半血光。忌门户大开、轻敌裸奔。'
    }
  ];

  /* 通用问诊结论池（匹配不到关键词时随机） */
  const GENERIC = [
    {
      pulse: '四诊完毕，症状奇特，医典中竟无记载——但莫慌，Bug 的尽头，向来是一个拼写错误。',
      yin: '报错原文一句，一字不差，念与搜索引擎听之',
      herbs: [['缚影复现散', '三钱'], ['二分溯源针', '二钱'], ['陈鸭镇纸', '一只']],
      advice: '使 Bug 先稳定现形，再以二分法缩小围场；除后记档，它下次会换个马甲回来。'
    },
    {
      pulse: '脉象玄之又玄，众妙之门——你这个 Bug，可能在等一个重启。',
      yin: '重启按键一枚，按下之前，切记先存档',
      herbs: [['重启还魂帖', '一帖'], ['涤尘清缓存', '二钱'], ['读尾追凶汤', '三钱']],
      advice: '报错自最末一个 Caused by 往上读，真凶常在最底处，且已写得明明白白。'
    },
    {
      pulse: '观君印堂发亮、代码发黑，此病多发于深夜——子时之后，调试准确率随困意递减。',
      yin: '温牛奶半杯，宁心安神；切忌佐以能量饮料',
      herbs: [['存档安心丹', '一钱'], ['高卧养神散', '三钱'], ['留字备忘符', '一枚']],
      advice: '先 commit 眼下进度，写清所困何处，而后去睡。八成深夜之 Bug，次日一早一眼看穿。'
    },
    {
      pulse: '脉无定数，随机发作——随机问题最怕的不是难，是你以为它修好了。',
      yin: '日志埋点四钱，沿路撒在代码必经之处',
      herbs: [['并发疑云散', '二钱'], ['错时乱阳丹', '二钱'], ['缓存积尘散', '二钱']],
      advice: '于关键路径密布日志：时辰、入参、线程号。玄学之恙背后，总站着一个具体的机理。'
    },
    {
      pulse: '此病看似无药，实则有一味万能药引——把报错原文，一字不差地，念给搜索引擎。',
      yin: '完整报错截图一张，配以框架版本号，同煎',
      herbs: [['原文照录丹', '三钱'], ['版本索骥散', '二钱'], ['官方典籍', '一函']],
      advice: '取报错关键句去搜，带上框架名与版本号；遇英文莫慌，代码与报错乃天下通用之语。'
    }
  ];

  /* ============================================================
   * 二、隐藏彩蛋（优先于普通规则）
   * ============================================================ */
  const EGGS = [
    {
      id: 'rmrf',
      re: [/rm\s*-rf/i, /删\s*(库|表|数据|仓库|磁盘)/, /drop\s+(database|table)/i, /sudo\s+rm/i, /删.{0,6}跑路/],
      pulse: '脉象大乱！指下如千军万马奔腾而过——此乃「删库大泄」急症，命悬一线，唯备份可救！',
      yin: '后背冷汗一盏（已凉透，趁热是来不及了），伏地连叩三下',
      herbs: [['定神息气散', '三钱'], ['reflog 还魂丹', '一枚'], ['断网伏龙土', '二两']],
      advice: '即刻断网护现场，以 git reflog、回收站、云快照抢救。rm 无回收站，跑路无回头路；往后入生产重地敲令之前，先默念三遍「备份了乎」。',
      fortune: {
        level: '大凶', sub: 'CATASTROPHIC · 但触底会反弹',
        bug: '删库一时之爽，牢饭半生之长', pr: '0%',
        fish: 1, yi: '断网护现场、翻 reflog 追魂', ji: '再入生产重地、sudo 后闭目回车',
        quote: '大凶之卦，触底即反弹——幸而施主先来挂了号。'
      }
    },
    {
      id: '404',
      re: [/404/],
      pulse: '望之不见其形，闻之不闻其声——你的对象（Object）和人生方向一样：404 Not Found。',
      yin: '地图一张、指南针一枚（指针所向，亦可能是 null）',
      herbs: [['正名核对散', '二钱'], ['经络路由丹', '三钱'], ['后端和解茶', '一盏']],
      advice: '404 之意，乃「此地真的空无一物」，非服务器厌你。先核 URL、路由、正反斜杠，再决定哭与不哭。',
      fortune: {
        level: '平', sub: 'NOT FOUND · 但路在脚下',
        bug: '所寻之 Bug，正在另一分支中', pr: '40.4%',
        fish: 3, yi: '打印路径，亲眼验明', ji: '凭空臆造 URL',
        quote: '迷途之时，先看自己正处何层目录。'
      }
    },
    {
      id: 'pm',
      re: [/产品经理|产品狗|需求又变|改需求|需求变更|加需求|换个需求|新需求/],
      pulse: '此病非源于代码，乃「需求异动风寒」：症状为上午拍桌、下午改稿、午夜梦回又换一版。',
      yin: '产品经理口头需求一句，录音留证，煎水代茶',
      herbs: [['签字立据丹', '一张'], ['缓兵缓冲膏', '三两'], ['壮胆说不散', '二钱']],
      advice: '口头之需不算需，令变更落于文档、重排工期。善良须带几分边界，代码亦然。忌群中秒应。',
      fortune: {
        level: '小吉', sub: 'REQUIREMENTS MAY VARY',
        bug: '本 Bug 已由产品自动认领', pr: '70%',
        fish: 4, yi: '需求异动，先议工期', ji: '需求群中秒应「可做」',
        quote: '变更挡它不住，排期却守得住——此亦是一种专业。'
      }
    },
    {
      id: '1024',
      re: [/1024/],
      pulse: '脉象清奇，体内有程序节祥瑞之气，按之温润如玉——今日不宜看病，宜过节、宜领键盘。',
      yin: '橙子一枚（1024 者，二之十方也；橙者，成也），与众 Builder 分食',
      herbs: [['逍遥散', '三两'], ['作品呈览帖', '一帖'], ['锦鲤如愿丸', '一丸']],
      advice: '十月廿四日照旧写码者，皆是真爱。然今日医嘱唯有四字：早点放工。',
      fortune: {
        level: '大吉', sub: 'HAPPY 1024 DAY',
        bug: '今日百无禁忌，诸 Bug 全员休假', pr: '100%',
        fish: 5, yi: '领键盘、食橙子、晒作品', ji: '加班、上线、议需求',
        quote: '1024 安康：愿君编译必过、合并必成、准时放工。'
      }
    }
  ];

  /* ============================================================
   * 三、神签库
   * ============================================================ */
  const LEVELS = [
    { level: '大吉', w: 8,  bug: '百邪辟易，诸 Bug 绕道而行',   pr: [92, 99], sub: 'EXCELLENT LUCK' },
    { level: '吉',   w: 20, bug: '微恙偶作，皆于下班前现形',     pr: [80, 91], sub: 'GOOD LUCK' },
    { level: '小吉', w: 27, bug: '虚惊一场，Bug 尽伏测试境中',   pr: [66, 79], sub: 'NICE LUCK' },
    { level: '平',   w: 25, bug: '吉凶相半，Bug 与君五五周旋',   pr: [48, 65], sub: 'NEUTRAL LUCK' },
    { level: '凶',   w: 15, bug: 'Bug 生足，跨环境循迹而至',     pr: [20, 47], sub: 'WARNING' },
    { level: '大凶', w: 5,  bug: '改一行而崩三处，大忌发版动土', pr: [1, 19],  sub: 'CRITICAL' }
  ];

  /* 黄历体宜忌：短句为主，签文与配音两用 */
  const YI_POOL = [
    '为自家玄学代码加注', '提交前跑一遍全量测试', '小步频提交，常留后悔药',
    '给变量取个看得懂的名字', '酉时放工，子时不调 Bug', '备份三省：本地、云端、异地',
    '勤修文档，渡人渡己', '参会携电脑，静音潜修', '把「我本地是好的」咽回去',
    '删库之前，默念后果三遍', '先读报错，再叹人生', '需求异动，先议工期',
    '起身接水，远眺明目', '周五只合文档，不动线上', '代码既成，自点三遍'
  ];

  const JI_POOL = [
    '周五申后发版上线', '轻信「我本地是好的」', '裸奔上线，不设监控',
    '怒发 git push -f', '抄录自己看不懂的代码', '需求群里秒回「能做」',
    '以 123456 为密码', '认真筹划删库跑路', '子时深夜决断架构',
    '改一空格便自信免测', '把密码提交进 Git 仓库', '书 TODO 自欺来日',
    '临上线前大重构', '与产品经理当庭对线', '赶工期而跳过测试'
  ];

  /* 签偈：七字句为本，间杂白话禅语 */
  const QUOTES = [
    '能复现者非绝症，代码缘深一线牵。',
    '报错声声非绝路，无声无响始堪忧。',
    '千般烦恼无寻处，一按重启胜补汤。',
    '拼写错处耗长夜，大神也曾误一字。',
    'Bug 修不尽，系统尚能行——带病延年，亦是本事。',
    '不会未为患，不知不会方为患；君既自知，已愈半矣。',
    '今日未除之恙，皆作来日复盘之鉴。',
    '明知上线仍有恙，备好回滚方是勇。',
    '空指所向非 null，需求未明君莫问。',
    '一行注释一行书，留与三月后的自己。',
    '编译尚须等候，成长何惧迟回。',
    '人间十种飘零客，半是被磨半装强。',
    'Bug 非删不掉，复现之路尚未寻。',
    '君所造者，正在某处运行，替千万人解忧。',
    '累了便歇——此非宕机，乃例行维护窗口。'
  ];

  /* ============================================================
   * 三·补、望闻问切话术库（因「事」而异：每种病各有四诊说辞）
   * ============================================================ */
  const SCAN_BY_ID = {
    npe: [
      '望气：观察报错气色……一片惨白，满屏 null，空得很干净',
      '闻味：嗅探堆栈……异味源头是一个从未被赋值的变量',
      '问症：盘问复现路径……患者称「点着点着它就没了」',
      '切脉：脉位空虚、按之无物，典型「空脉」——脉里什么都没有'
    ],
    crash: [
      '望气：告警红光映在脸上，望之有焦糊之气',
      '闻味：堆栈里满是 timeout 味，请求们集体离家出走',
      '问症：问影响面……患者声音发抖：「全，全站」',
      '切脉：脉来急促、数至一止，止而复乱，此乃急症'
    ],
    env: [
      '望气：面色蜡黄，印堂有 node_modules 黑雾缭绕',
      '闻味：版本冲突之气冲鼻，Python2 与 Python3 在体内打架',
      '问症：「在我本地是好的」——患者第 108 次重复这句话',
      '切脉：脉象随机器而变，换台电脑换个病，风水失调之象'
    ],
    git: [
      '望气：屏幕上一片 <<<<<<< HEAD，红光满面',
      '闻味：两股代码在同一行互不相让，硝烟味浓',
      '问症：患者称自己只是「pull 了一下」，手还在抖',
      '切脉：脉如死结，双股绳拧作一团，需缓推慢理'
    ],
    overwork: [
      '望气：眼下青黑比终端主题还深，望之令人心疼',
      '闻味：咖啡味里混着一丝周报的焦糊',
      '问症：问这周加了几天班，患者沉默地伸出一只手……又伸出另一只',
      '切脉：脉细如丝、节律尚整——是累，不是病，但再熬就要成真病'
    ],
    review: [
      '望气：面色潮红，明显是被一句评论顶到了血压',
      '闻味：diff 里飘来「这里为什么不用设计模式」的熟悉味道',
      '问症：患者复述评审意见时，声音不自觉提高了八度',
      '切脉：脉弦而紧，一股闷气郁于胸中，三日后可自行消散'
    ],
    cache: [
      '望气：代码是对的、页面是旧的，气色与事实不符',
      '闻味：四层缓存层层掩护，邪气藏得极深',
      '问症：患者连发三问：「为什么？凭什么？我改哪了？」',
      '切脉：乍寒乍热，硬刷一下脉象立变，缓存作祟无疑'
    ],
    race: [
      '望气：Bug 千呼万唤不出来，患者一走开它就上线',
      '闻味：线程之间有串味，你中有我，我中有你',
      '问症：「它是偶现的」——偶现二字出口，神医眉头一皱',
      '切脉：脉来飘忽、十诊九空，需以日志为罗网候之'
    ],
    css: [
      '望气：五官端正，整体偏左一像素，强迫症望之吐血',
      '闻味：盒模型里 margin 和 padding 正在互相推搡',
      '问症：患者已与这一像素对峙了两个时辰',
      '切脉：脉象平稳，唯尺部偏斜一分——小病，磨人'
    ],
    test: [
      '望气：患者空手而来，只说「它坏了」，无截图无步骤',
      '闻味：闻不出具体病灶——症状尚不能复现',
      '问症：三连问：怎么坏的？点了什么？报错呢？患者三缄其口',
      '切脉：脉无定形，不可妄下结论，先拿下最小复现'
    ],
    regex: [
      '望气：屏幕上趴着一串天书符文，望之目眩',
      '闻味：一股「写完没人敢改」的陈年气味',
      '问症：患者问这正则何意——三天前写它的人已离职',
      '切脉：脉纹诡谲、一环套一环，宜拆解，不宜硬吞'
    ],
    interview: [
      '望气：头顶八股文乌云，手中算法题刷得冒烟',
      '闻味：考前特有的速溶咖啡与焦虑混合味',
      '问症：患者自述昨夜梦到手撕红黑树，惊醒三次',
      '切脉：时强时弱，闻「算法」二字则骤停，考后自愈'
    ],
    ai: [
      '望气：代码跑得飞快，作者眼神空洞，不知其所以然',
      '闻味：一股外来真气在经脉里乱窜，来路不明',
      '问症：患者称「AI 写的，我也不知道为什么能跑」',
      '切脉：脉象全凭外力维持，撤去 AI 则寸步难行，需固本培元'
    ],
    security: [
      '望气：系统大门洞开，望之门户形同虚设',
      '闻味：输入框里飘来「敌军投毒」的气息',
      '问症：患者自信「内网系统没人会攻」，神医摇头不语',
      '切脉：外邪尚在表、未入里，及时加固，犹未晚也'
    ],
    rmrf: [
      '望气：大惊！黑气冲天，屏幕上似有千军万马奔腾而过',
      '闻味：闻到了数据灰飞烟灭的味道，后背一凉',
      '问症：患者带着哭腔：「我就试了一下……我以为有回收站」',
      '切脉：脉象大乱！命悬一线！唯备份与冷静可救！'
    ],
    '404': [
      '望气：望之空无一物，地址栏尽头白茫茫一片',
      '闻味：什么味道都没有——这里是真的什么都没有',
      '问症：患者坚称「昨天它还在的」',
      '切脉：脉象虚无，此乃「迷路」之症，不是失踪，是走错了路'
    ],
    pm: [
      '望气：需求文档页边空白处写满「再议」，望之长叹',
      '闻味：一股朝令夕改之气，文档还热着就被推翻',
      '问症：患者哭诉「上午拍板下午改稿」，语气熟练，似是惯犯受害者',
      '切脉：脉无定数、随需求而变，边界感缺失之症'
    ],
    '1024': [
      '望气：祥瑞！患者周身有二进制度数的金光',
      '闻味：橙子与键盘奖品的清芬，闻之通体舒泰',
      '问症：今日不问诊——问就是百无禁忌，宜摸鱼、宜过节',
      '切脉：脉象温润如玉，是全年最安康的一天'
    ]
  };

  /* 通用诊断的五套四诊说辞（与 GENERIC 数组顺序一一对应） */
  const GENERIC_SCAN = [
    [
      '望气：症状奇特，医典翻到散页也未见记载',
      '闻味：堆栈味道复杂，似曾相识，又想不起来',
      '问症：患者描述了五分钟，神医只听懂了「它不工作」',
      '切脉：四诊之下难定其名——莫慌，Bug 的尽头多是拼写错误'
    ],
    [
      '望气：屏幕气息奄奄，重启按钮在角落里熠熠生辉',
      '闻味：缓存与玄学混合之气，民间称「重启可破八成」',
      '问症：问试过重启没……试过了？那再试一次',
      '切脉：脉象凝滞，如系统三载未关机，气滞之象'
    ],
    [
      '望气：子时已深，患者面色与屏幕同色',
      '闻味：困意弥漫，调试准确率正随夜色递减',
      '问症：问困不困，患者倔强摇头，头却点得像 Bug 复现',
      '切脉：夜间脉象紊乱、明晨自明，宜 commit 存档后就寝'
    ],
    [
      '望气：Bug 时隐时现，望之无踪，患者几近玄学',
      '闻味：并发、时区、缓存三邪若隐若现',
      '问症：「它不是每次都坏」——此话一出，难度翻倍',
      '切脉：随机之脉最难捉摸，须以日志为网，静待其现形'
    ],
    [
      '望气：报错红字密密麻麻，患者却一个字还没读',
      '闻味：真相写在最后一行 Caused by 里，气味明显',
      '问症：问报错原文，患者截图发来了整个桌面',
      '切脉：病灶其实早已自首，只等人把它念给搜索引擎'
    ]
  ];

  /* 因「人」而异：老中医旁白，按输入特征与问诊时段命中，随机取味 */
  const MOOD_RULES = [
    {
      hit: (t) => /(救命|在线等|紧急|急急|啊啊|崩溃|完了|惨了)/.test(t) || (t.match(/[!！]/g) || []).length >= 2,
      lines: [
        '患者情绪激动、连呼救命，神医先奉上清茶一盏，稳住军心',
        '检测到感叹号成灾，情绪值拉满——深呼吸，Bug 怕的是冷静的人',
        '病情未明，气势先崩，此乃大忌；先喝口水，咱们慢慢说'
      ]
    },
    {
      hit: (t) => (t.match(/[?？]/g) || []).length >= 2,
      lines: [
        '患者连发问号，思路尚在、迷茫未乱，可救',
        '问号密度偏高，神医决定把诊断讲得再通俗一些',
        '问号多说明还在思考——比「重启试试」四个字有救多了'
      ]
    },
    {
      hit: (t) => t.length > 100 || /(exception|traceback|stack|\bat\s+[\w.$]+\(|line\s+\d+|error\s*:)/i.test(t),
      lines: [
        '患者捧来三尺长的报错日志，神医逐行翻看，重点在最底下那句',
        '堆栈长约一米八，先找 Caused by，再谈人生',
        '日志虽长，真凶往往只有一行——通常还是最后一行'
      ]
    },
    {
      hit: (t) => t.replace(/\s/g, '').length <= 6,
      lines: [
        '主诉惜字如金，神医只好望文生义、自行脑补',
        '字越少事越大？神医已做好最坏的打算',
        '六个字以内挂号，属于特等疑难杂症，加钱（并不）'
      ]
    },
    {
      hit: () => { const h = new Date().getHours(); return h >= 23 || h < 5; },
      lines: [
        '子时问诊，特批加急；顺便劝一句：两点后写的代码，明天都会后悔',
        '夜诊患者 +1，老中医递上温牛奶：commit 存档，明早再战',
        '这个时辰还在调 Bug，你的电脑都困了——它不困？你困'
      ]
    },
    {
      hit: (t) => /[a-zA-Z]/.test(t) && !/[一-鿿]/.test(t),
      lines: [
        '报错通篇洋文，不慌——代码和报错是世界通用语',
        '英文报错一位，翻译符已备好：报错关键句，复制去搜'
      ]
    },
    {
      hit: (t) => /(哈哈|笑死|无语|麻了|服了|绝了|毁灭吧)/.test(t),
      lines: [
        '患者竟苦中作乐，心态尚佳，这副药可以少放一味镇定剂',
        '都给孩子气笑了，此病预后良好——人还活着就有救'
      ]
    }
  ];

  const MOOD_IDLE = [
    '老中医扶了扶眼镜：这病……上周好像也有人挂过号',
    '窗外代码如雨，室内 Bug 如山，神医见怪不怪',
    '诊室外排队的人里，十个有八个忘了先读报错',
    '抽屉里的橡皮鸭叫了一声，表示它已经准备好了',
    '神医掐指一算：这个 Bug，克周五，不克周三',
    '旁边诊室传来一句「在我电脑上是好的」，老中医耳朵动了动',
    '望闻问切之余友情提示：今日茶水免费，崩溃自费'
  ];

  function moodLine(rawText) {
    const t = rawText.trim();
    const pool = [];
    MOOD_RULES.forEach((r) => { if (r.hit(t)) pool.push(...r.lines); });
    if (!pool.length) pool.push(...MOOD_IDLE);
    return pick(pool);
  }

  function buildScanLines(result, rawText) {
    const scan = SCAN_BY_ID[result.id] || result._scan || GENERIC_SCAN[0];
    const lines = scan.map((text) => ({ prefix: '$ ', text, cls: 'out' }));
    lines.push({ prefix: '> ', text: '老中医旁白：' + moodLine(rawText), cls: 'mood', mood: true });
    return lines;
  }

  /* ============================================================
   * 四、问诊诊断
   * ============================================================ */
  function diagnose(rawText) {
    const text = rawText.trim();
    const low = text.toLowerCase();

    for (const egg of EGGS) {
      if (egg.re.some((r) => r.test(low) || r.test(text))) {
        return { ...egg, egg: true };
      }
    }
    for (const rule of RULES) {
      if (rule.re.some((r) => r.test(low) || r.test(text))) {
        return { ...rule, egg: false };
      }
    }
    const gi = rand(GENERIC.length);
    return { ...GENERIC[gi], _scan: GENERIC_SCAN[gi], egg: false };
  }

  /* 摸鱼指数随签等收放：大凶之日不可能摸到五星，免得上上签的吉言与凶签自相矛盾 */
  const FISH_BY_LEVEL = {
    '大吉': [4, 5], '吉': [3, 5], '小吉': [3, 4],
    '平': [2, 4], '凶': [2, 3], '大凶': [2, 2]
  };

  function rollFortune(eggFortune, prev) {
    if (eggFortune) {
      /* 首签奉送专属名签（删库必大凶的梗不丢）；重摇保留签等与绝句，
         但宜/忌/摸鱼指数换新——同一急症连摇也不该回回一字不差 */
      if (!prev) return { ...eggFortune, yi: eggFortune.yi, ji: eggFortune.ji, quote: eggFortune.quote };
      const range = FISH_BY_LEVEL[eggFortune.level] || [2, 5];
      let f = eggFortune;
      for (let t = 0; t < 8; t++) {
        f = { ...eggFortune, fish: randInt(range[0], range[1]), yi: pick(YI_POOL), ji: pick(JI_POOL) };
        if (f.yi !== prev.yi || f.ji !== prev.ji) break;
      }
      return f;
    }
    const lv = pickWeighted(LEVELS);
    const range = FISH_BY_LEVEL[lv.level] || [2, 5];
    let f;
    /* 重摇时避开与上一签四要素全同的组合——「不灵再抽」不该抽出一模一样的一支 */
    for (let t = 0; t < 8; t++) {
      f = {
        level: lv.level,
        sub: lv.sub,
        bug: lv.bug,
        pr: randInt(lv.pr[0], lv.pr[1]) + '%',
        fish: randInt(range[0], range[1]),
        yi: pick(YI_POOL),
        ji: pick(JI_POOL),
        quote: pick(QUOTES)
      };
      if (!prev || !(f.level === prev.level && f.yi === prev.yi && f.ji === prev.ji && f.quote === prev.quote)) break;
    }
    return f;
  }

  /* ============================================================
   * 四·五、老中医配音（Web Speech API，零依赖、零音频文件）
   * ============================================================ */
  const V = {
    supported: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    on: true, voice: null, token: 0, setSpeaking: null,
    queue: [],      /* 待播文本（FIFO）：同一条叙事链排队说完，互不打断 */
    playing: false
  };

  /* 唯一的「打断」出口：清空队列（等待中的 Promise 立即结束）并取消当前朗读 */
  function stopSpeak() {
    V.token++;
    const pending = V.queue.splice(0);
    V.playing = false;
    if (V.setSpeaking) V.setSpeaking(false);
    if (V.supported) { try { speechSynthesis.cancel(); } catch (e) {} }
    pending.forEach((item) => { try { item.resolve(); } catch (e) {} });
  }

  /* 按中文标点把长文切成短句队列，规避部分浏览器长句读到一半中断的问题；
     单字碎片（如「望、」「闻、」）并入前句，减少合成间隙 */
  function splitSpeech(text) {
    const segs = String(text).match(/[^，。！？；、…—\n]+[，。！？；、…—]*/g) || [];
    const out = [];
    segs.forEach((seg) => {
      let s = seg.trim();
      if (!s) return;
      while (s.length > 70) { out.push(s.slice(0, 70)); s = s.slice(70); }
      if (!s) return;
      const body = s.replace(/[，。！？；、…—]/g, '');
      const last = out[out.length - 1];
      if (last && body.length <= 2 && last.length < 60) {
        out[out.length - 1] = last + s;
      } else {
        out.push(s);
      }
    });
    return out;
  }

  /* 朗读入队并返回 Promise（该段全部说完才 resolve）。
     入队不再打断正在说的话——开场白、念咒、签文同链自然衔接；
     要打断只能显式调 stopSpeak()（跳过 / 换诊 / 再抽 / 关配音） */
  function speak(text) {
    return new Promise((resolve) => {
      if (!V.supported || !V.on || !text || !String(text).trim()) return resolve();
      const chunks = splitSpeech(text);
      if (!chunks.length) return resolve();
      V.queue.push({ chunks, resolve });
      pumpSpeech();
    });
  }

  /* 串行消费队列：同一时刻只向引擎喂一句，onend/onerror 后再喂下一句 */
  function pumpSpeech() {
    if (V.playing) return;
    const item = V.queue[0];
    if (!item) return;
    V.playing = true;
    setTimeout(() => {
      /* 70ms 宽限窗口内若被 stopSpeak 清走，本定时器直接放弃，状态由清走方接管 */
      if (V.queue[0] !== item) return;
      if (!V.on) { V.queue.shift(); V.playing = false; item.resolve(); pumpSpeech(); return; }
      if (V.setSpeaking) V.setSpeaking(true);
      let i = 0;
      const finish = () => {
        V.queue.shift();
        V.playing = false;
        if (!V.queue.length && V.setSpeaking) V.setSpeaking(false);
        item.resolve();
        pumpSpeech();
      };
      const step = () => {
        if (V.queue[0] !== item) return;  /* 已被 stopSpeak 清走，勿动新队列 */
        if (!V.on) return finish();
        if (i >= item.chunks.length) return finish();
        const u = new SpeechSynthesisUtterance(item.chunks[i++]);
        u.lang = 'zh-CN';
        if (V.voice) u.voice = V.voice;
        u.pitch = 0.78;   /* 压低嗓音，求一个老中医 */
        u.rate = 0.96;
        u.volume = 1;
        u.onend = step;
        u.onerror = step;
        try { speechSynthesis.speak(u); }
        catch (e) { finish(); }
      };
      step();
    }, 70);
  }

  if (V.supported) {
    try { V.on = localStorage.getItem('tcm-voice') !== '0'; } catch (e) {}

    /* 中文音色清单 */
    function zhVoices() {
      return speechSynthesis.getVoices().filter((v) =>
        /^(zh|cmn)/i.test(v.lang) || /chinese|mandarin|普通话|中文/i.test(v.name));
    }

    /* 挑最沉稳的中文男声音色（Edge 在线音色优先） */
    function pickBest(zh) {
      const male = ['yunxi', 'yunyang', 'yunjian', 'yunfeng', 'yunye', 'yunhao', 'yunze',
        'kangkang', 'simon', 'xiaobei', 'kang'];
      const score = (v) => {
        const n = v.name.toLowerCase();
        let s = 0;
        if (male.some((h) => n.includes(h))) s += 100;
        if (/online|natural|neural/.test(n)) s += 20;
        if (/^zh-cn/i.test(v.lang)) s += 5;
        return s;
      };
      return zh.slice().sort((a, b) => score(b) - score(a))[0] || null;
    }

    /* 音色下拉：有不止一种中文音色时才出现，选择记在 localStorage */
    const voiceSel = $('voice-select');
    function syncVoiceOptions() {
      const zh = zhVoices();
      let saved = '';
      try { saved = localStorage.getItem('tcm-voice-name') || ''; } catch (e) {}
      const chosen = (saved && zh.find((v) => v.name === saved)) || pickBest(zh);
      V.voice = chosen;
      if (!voiceSel) return;
      if (zh.length < 2) { voiceSel.hidden = true; return; }
      voiceSel.innerHTML = '';
      zh.forEach((v) => {
        const o = document.createElement('option');
        o.value = v.name;
        o.textContent = v.name.replace(/^Microsoft\s+/i, '').replace(/\s*-\s*(Chinese|中文).*$/i, '').trim() || v.name;
        if (chosen && v.name === chosen.name) o.selected = true;
        voiceSel.appendChild(o);
      });
      voiceSel.hidden = false;
    }
    syncVoiceOptions();
    speechSynthesis.onvoiceschanged = syncVoiceOptions;
    if (voiceSel) {
      voiceSel.addEventListener('change', () => {
        V.voice = zhVoices().find((v) => v.name === voiceSel.value) || V.voice;
        try { localStorage.setItem('tcm-voice-name', voiceSel.value); } catch (e) {}
      });
    }
    /* Chrome 长文本朗读约 15 秒后自动暂停的官方毛病，定时 resume 兜底 */
    setInterval(() => {
      if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.resume();
    }, 8000);

    const btn = $('voice-toggle');
    const syncBtn = () => {
      btn.classList.toggle('muted', !V.on);
      btn.setAttribute('aria-pressed', String(V.on));
    };
    V.setSpeaking = (on) => btn.classList.toggle('speaking', on && V.on);

    /* 语音列表异步就绪：始终拿不到中文语音就不显示开关 */
    if (!V.voice) {
      setTimeout(() => {
        if (!zhVoices().length) {
          btn.style.display = 'none';
          if (voiceSel) voiceSel.hidden = true;
        }
      }, 2500);
    }
    btn.addEventListener('click', () => {
      V.on = !V.on;
      try { localStorage.setItem('tcm-voice', V.on ? '1' : '0'); } catch (e) {}
      syncBtn();
      if (V.on) speak('配音已开，老夫这就为你解说');
      else stopSpeak();
    });
    syncBtn();
  } else {
    $('voice-toggle').style.display = 'none';
  }

  /* ---- 贴合页面内容的配音脚本 ---- */
  function scriptPrescription(r) {
    const herbs = r.herbs.map(([name, dose]) => name + '，' + dose).join('；');
    return '处方已开好。药引：' + r.yin + '。再为你配下三味药材：' + herbs +
      '。医嘱：' + r.advice + '。药方收好——若想知道今日气运，就亲手摇一支程序员神签。';
  }
  function scriptFortune(f) {
    return f.level + '！' + f.bug + '。今日，PR 一次过率，' + f.pr +
      '。摸鱼指数，' + f.fish + '颗星。宜，' + f.yi + '。忌，' + f.ji + '。' + f.quote;
  }

  /* ============================================================
   * 五、终端问诊动画（话术随病种与患者而变）
   * ============================================================ */
  let skipRequested = false;
  let typingToken = 0;

  /* 同一行内渲染「提示符 + 逐字打出的正文」 */
  async function typeTermLine(container, prefix, text, cls, token) {
    const line = document.createElement('div');
    line.className = 'ln';
    const p = document.createElement('span');
    p.className = cls === 'mood' ? 'mood-prompt' : 'prompt';
    p.textContent = prefix;
    const t = document.createElement('span');
    t.className = cls || 'out';
    line.append(p, t);
    container.appendChild(line);

    if (skipRequested) { t.textContent = text; return; }
    for (let i = 0; i <= text.length; i++) {
      if (skipRequested || token !== typingToken) { t.textContent = text; return; }
      t.textContent = text.slice(0, i);
      await sleep(14);
    }
  }

  async function runDiagnosis(result) {
    skipRequested = false;
    const token = ++typingToken;
    const body = $('term-body');
    body.innerHTML = '';

    const lines = buildScanLines(result, lastInput);
    for (const l of lines) {
      await typeTermLine(body, l.prefix, l.text, l.cls, token);
      if (token !== typingToken) return;
      /* 望闻问切只打字；老中医旁白打完后由老中医亲口念出 */
      if (l.mood && !skipRequested) {
        await speak(l.text.replace(/^老中医旁白：/, ''));
        if (token !== typingToken) return;
      }
      await sleep(skipRequested ? 0 : 230);
    }
    await typeTermLine(body, '$ ', '四诊合参，结论如下：', 'out', token);
    if (token !== typingToken) return;
    await sleep(skipRequested ? 0 : 240);

    const line = document.createElement('div');
    line.className = 'ln conclusion';
    body.appendChild(line);
    startPulse(pulseKind(result));   /* 脉象仪随病种呈现不同波形 */
    if (skipRequested) { line.textContent = result.pulse; }
    else {
      for (let i = 0; i <= result.pulse.length; i++) {
        if (skipRequested || token !== typingToken) { line.textContent = result.pulse; break; }
        line.textContent = result.pulse.slice(0, i);
        await sleep(20);
      }
    }
    if (token !== typingToken) return;
    if (!skipRequested) {
      await sleep(500);
      await speak(result.pulse);   /* 脉象结论：老中医亲口宣判 */
      if (token !== typingToken) return;
    }
    await sleep(skipRequested ? 900 : 300);   /* 跳过时也让脉象波形喘口气，别瞬间切屏 */
    showResult(result);
  }

  /* ============================================================
   * 六、渲染诊断结果
   * ============================================================ */
  let currentResult = null;
  let lastFortune = null;
  let visitorNo = 0;

  /* 本院累计就诊序号：跨会话累加，写进诊断书 */
  function bumpVisitor() {
    let n = 0;
    try {
      n = parseInt(localStorage.getItem('tcm-visitor') || '0', 10);
      /* 存储被篡改（负数/非数/异常值）时从 1 重新起号，别让诊断书出现 000-99 */
      if (!Number.isFinite(n) || n < 1) n = 0;
      visitorNo = n + 1;
      localStorage.setItem('tcm-visitor', String(visitorNo));
    } catch (e) { visitorNo = (visitorNo >= 1 ? visitorNo : 0) + 1; }
    return visitorNo;
  }

  /* 药材前的线描小药叶（SVG，零图片依赖） */
  function herbIcon() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('class', 'h-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path d="M10 17 C4 13 4 6 10 3 C16 6 16 13 10 17 Z" fill="none" stroke="#6d8075" stroke-width="1.4"/>'
      + '<path d="M10 17 L10 7" stroke="#6d8075" stroke-width="1.2"/>';
    return svg;
  }

  function renderCase(text) {
    const no = bumpVisitor();
    $('case-no').textContent = String(no).padStart(6, '0');
    $('visitor-no').textContent = '本院第 ' + no + ' 位就诊病友';
    const d = new Date();
    $('rx-date').textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    $('patient-text').textContent = text.length > 42 ? text.slice(0, 42) + '…' : text;
    $('pulse-text').textContent = currentResult.pulse;
    $('rx-yin').textContent = currentResult.yin;
    $('rx-advice').textContent = currentResult.advice;

    const list = $('herb-list');
    list.innerHTML = '';
    currentResult.herbs.forEach(([name, dose]) => {
      const li = document.createElement('li');
      const n = document.createElement('span'); n.className = 'h-name'; n.textContent = name;
      const dot = document.createElement('span'); dot.className = 'h-dots';
      const ds = document.createElement('span'); ds.className = 'h-dose'; ds.textContent = dose;
      li.append(herbIcon(), n, dot, ds);
      list.appendChild(li);
    });
  }

  function renderFortune(f) {
    lastFortune = f;
    $('f-level').textContent = f.level;
    $('f-level-sub').textContent = f.sub;
    $('f-bug').textContent = f.bug;
    $('f-pr').textContent = f.pr;
    const stars = '★'.repeat(f.fish) + '<span class="dim">' + '★'.repeat(5 - f.fish) + '</span>';
    $('f-fish').innerHTML = stars;
    $('f-yi').textContent = f.yi;
    $('f-ji').textContent = f.ji;
    $('f-quote').textContent = '「' + f.quote + '」';
  }

  let drawing = false;
  let drawToken = 0;
  let armed = false;          /* 是否处于「亲手摇签」阶段 */
  let sincerity = 0;
  let armToken = 0;
  let dragging = false;
  let lastX = 0;
  let motionBase = null;

  const reduceMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setSincerity(v) {
    sincerity = Math.max(0, Math.min(100, v));
    $('sinc-fill').style.width = sincerity + '%';
    $('sinc-label').textContent = '诚心 ' + Math.round(sincerity) + '%';
  }

  function disarmUI() {
    armed = false;
    dragging = false;
    const shaker = $('shaker');
    shaker.classList.remove('armed', 'hinting');
    shaker.style.transform = '';
    $('sincerity').hidden = true;
    $('btn-direct-draw').hidden = true;
  }

  /* 点击「诚心摇签 / 再抽一签」：先进入亲手摇动阶段；开了减弱动态则直出 */
  function armShake() {
    if (drawing) return;
    drawing = true;
    armToken = ++drawToken;
    stopSpeak();

    $('fortune').hidden = true;
    $('btn-redraw').hidden = true;
    const shaker = $('shaker');
    shaker.style.display = 'block';
    shaker.classList.remove('idle', 'shaking');
    $('btn-draw').hidden = true;
    $('btn-save').disabled = true;

    if (reduceMotion()) { performDraw(armToken); return; }

    /* 进入摇动模式 */
    armed = true;
    sincerity = 0;
    setSincerity(0);
    shaker.classList.add('armed', 'hinting');   /* 签筒自晃两下做手势引导 */
    $('sincerity').hidden = false;
    $('btn-direct-draw').hidden = false;
    $('shake-hint').textContent = '按住签筒左右拖动；手机可直接摇晃机身——诚心摇满，签自落';
    requestMotionPermission();
  }

  /* iOS 13+ 需在点击手势内申请重力感应权限；失败也不影响拖动/保底 */
  function requestMotionPermission() {
    const DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      DME.requestPermission().catch(() => {});
    }
  }

  /* 诚心满槽：签落定 */
  function commitShake() {
    if (!armed) return;
    disarmUI();
    performDraw(armToken);
  }

  /* 真正的摇签动画与出签（首次与再抽共用） */
  async function performDraw(tk) {
    const shaker = $('shaker');
    const fortune = $('fortune');
    shaker.classList.add('idle');
    shaker.classList.remove('shaking');
    $('shake-hint').textContent = '摇签中……诚心默念「重启治百病」';
    await sleep(90);
    if (tk !== drawToken) { drawing = false; $('btn-save').disabled = false; return; }
    shaker.classList.add('shaking');
    speak('天灵灵——地灵灵——');   /* 入队排队：念完再接签文，不再被腰斩 */

    await sleep(1400);
    if (tk !== drawToken) { drawing = false; $('btn-save').disabled = false; return; } /* 中途换诊 */
    shaker.classList.remove('shaking');
    $('shake-hint').textContent = '签已落地，请施主过目';
    await sleep(320);
    if (tk !== drawToken) { drawing = false; $('btn-save').disabled = false; return; }

    const f = rollFortune(currentResult.fortune, lastFortune);
    renderFortune(f);
    shaker.style.display = 'none';
    fortune.hidden = false;
    fortune.style.animation = 'none';
    void fortune.offsetWidth; /* 重置浮现动画 */
    fortune.style.animation = '';

    $('btn-redraw').hidden = false;
    $('btn-save').disabled = false;
    drawing = false;
    coinBurst(f.level);       /* 吉：金铜钱；凶：灰 bug；平：小钱 */
    speak(scriptFortune(f));   /* 排在念词之后：签等、指标、宜忌、金句逐项朗读 */
  }

  /* 签文揭晓撒钱：吉撒金铜钱，凶撒灰 bug 碎符，平撒小钱（WAAPI，零依赖） */
  function coinBurst(level) {
    const origin = $('f-level').getBoundingClientRect();
    const cx = origin.left + origin.width / 2;
    const cy = origin.top + origin.height / 2;
    const isJi = /吉/.test(level);
    const isXiong = /凶/.test(level);
    const tag = document.createElement('span');
    tag.className = isXiong ? 'mote' : 'coin';
    const quiet = reduceMotion();   /* 减弱动态：只原地轻闪，不飞撒 */
    const n = quiet ? 14 : (isJi ? 56 : isXiong ? 34 : 26);
    for (let i = 0; i < n; i++) {
      const p = tag.cloneNode();
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      document.body.appendChild(p);
      let frames, dur;
      if (quiet) {
        frames = [
          { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1)', opacity: .95, offset: .4 },
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }
        ];
        dur = 500;
      } else {
        const ang = (Math.PI * 2 * i) / n + randInt(-12, 12) / 60;
        const dist = randInt(70, isJi ? 260 : 180);
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist + randInt(40, 150);   /* 重力往下偏 */
        dur = randInt(750, 1300);
        const spin = randInt(-360, 360);
        frames = [
          { transform: 'translate(-50%,-50%) scale(.4) rotate(0)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx * .55}px), calc(-50% + ${dy * .55 - 60}px)) scale(1) rotate(${spin * .5}deg)`, opacity: 1, offset: .5 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9) rotate(${spin}deg)`, opacity: 0 }
        ];
      }
      const anim = (typeof p.animate === 'function')
        ? p.animate(frames, { duration: dur, easing: 'cubic-bezier(.15,.6,.35,1)', fill: 'forwards' })
        : null;
      if (anim) anim.onfinish = () => p.remove();
      setTimeout(() => p.remove(), dur + 300);  /* 兜底：WAAPI 被后台挂起时也能清理 */
    }
  }

  /* ---- 桌面：按住签筒拖动充能 ---- */
  const shakerEl = $('shaker');
  shakerEl.addEventListener('pointerdown', (e) => {
    if (!armed) return;
    dragging = true;
    shakerEl.classList.remove('hinting');   /* 用户上手，引导动画让位 */
    lastX = e.clientX;
    try { shakerEl.setPointerCapture && shakerEl.setPointerCapture(e.pointerId); } catch (err) {}
  });
  shakerEl.addEventListener('pointermove', (e) => {
    if (!armed || !dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    if (Math.abs(dx) > 1) {
      setSincerity(sincerity + Math.abs(dx) / 620 * 100);
      const rot = Math.max(-16, Math.min(16, dx * 1.4));
      shakerEl.style.transform = `rotate(${rot}deg)`;
      if (sincerity >= 100) commitShake();
    }
  });
  const endDrag = () => {
    if (!armed) return;
    dragging = false;
    shakerEl.style.transform = '';
  };
  shakerEl.addEventListener('pointerup', endDrag);
  shakerEl.addEventListener('pointercancel', endDrag);

  /* ---- 移动端：摇晃机身充能 ---- */
  window.addEventListener('devicemotion', (e) => {
    if (!armed) return;
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const v = [a.x || 0, a.y || 0, a.z || 0];
    if (!motionBase) { motionBase = v.slice(); return; }
    let d = 0;
    for (let i = 0; i < 3; i++) d += Math.abs(v[i] - motionBase[i]);
    motionBase = v.map((x, i) => motionBase[i] * .8 + x * .2);
    if (d > 14) {
      shakerEl.classList.remove('hinting');   /* 机身一晃，引导即止 */
      setSincerity(sincerity + (d - 14) * 2.2);
      if (sincerity >= 100) commitShake();
    }
  });

  function showResult(result) {
    currentResult = result;
    lastFortune = null;
    disarmUI();
    renderCase(lastInput);
    stopPulse();
    fillBarrage();

    /* 盖章仪式：重放砸章 + 墨晕 + 纸震 */
    const paper = $('rx-paper');
    paper.classList.remove('stamped');
    void paper.offsetWidth;
    paper.classList.add('stamped');

    /* 处方先呈现；签筒静候，由患者自己摇 */
    const shaker = $('shaker');
    shaker.style.display = 'block';
    shaker.classList.add('idle');
    shaker.classList.remove('shaking');
    $('btn-draw').hidden = false;
    $('sincerity').hidden = true;
    $('btn-direct-draw').hidden = true;
    setSincerity(0);
    $('shake-hint').textContent = '处方已开好——再摇一支程序员神签，看看今日气运？';
    $('fortune').hidden = true;
    $('btn-redraw').hidden = true;
    $('btn-save').disabled = false;   /* 新一轮诊断：复位保存按钮（防上一轮摇签中换诊遗留置灰） */

    switchScreen('screen-result');
    /* 等处方盖章动画落定后，把视线引到签筒，并由老中医宣读处方 */
    const rxToken = typingToken;
    setTimeout(() => {
      $('btn-draw').scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (rxToken === typingToken) speak(scriptPrescription(result));
    }, 1250);
  }

  /* ============================================================
   * 七、屏幕切换 & 事件
   * ============================================================ */
  function switchScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(id).classList.add('active');
    window.scrollTo({ top: 0 });
  }

  let lastInput = '';

  function startConsult(text) {
    const input = $('bug-input');
    const wrap = input.closest('.input-wrap');
    if (!text || !text.trim()) {
      input.placeholder = '不可无字问诊——说不出 Bug，就说说哪里疼也行';
      wrap.classList.remove('shake');
      void wrap.offsetWidth;
      wrap.classList.add('shake');
      input.focus();
      return;
    }
    lastInput = text.trim();
    currentResult = diagnose(lastInput);
    switchScreen('screen-diagnosis');
    speak('莫急，待老夫望、闻、问、切。');  /* 点击手势内开场，顺便解锁浏览器音频 */
    runDiagnosis(currentResult);
  }

  $('btn-diagnose').addEventListener('click', () => startConsult($('bug-input').value));
  $('bug-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startConsult($('bug-input').value);
    }
  });
  document.querySelectorAll('.tag').forEach((tag) => {
    tag.addEventListener('click', () => {
      $('bug-input').value = tag.dataset.text;
      startConsult(tag.dataset.text);
    });
  });

  $('btn-skip').addEventListener('click', () => { skipRequested = true; stopSpeak(); });

  $('btn-draw').addEventListener('click', armShake);
  $('btn-redraw').addEventListener('click', armShake);
  $('btn-direct-draw').addEventListener('click', commitShake);
  $('btn-copy').addEventListener('click', copyShareText);

  $('btn-restart').addEventListener('click', () => {
    typingToken++; /* 中断终端动画 */
    drawToken++;   /* 中断摇签动画 */
    drawing = false;
    disarmUI();
    stopPulse();
    $('fortune').hidden = true;
    $('btn-redraw').hidden = true;
    lastFortune = null;
    $('btn-save').disabled = false;
    stopSpeak();
    $('bug-input').value = '';
    switchScreen('screen-intake');
    $('bug-input').focus();
  });

  /* ============================================================
   * 七·补、趣味增强：老郎中 / 脉象仪 / 弹幕 / 分享文案
   * ============================================================ */

  /* ---- 坐堂老郎中：眼随鼠标、说话气泡、输入时把脉 ---- */
  (function setupDoctor() {
    const doc = $('doctor');
    if (!doc) return;
    const pupils = doc.querySelectorAll('.doc-pupil');
    document.addEventListener('mousemove', (e) => {
      const r = doc.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 220));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 220));
      pupils.forEach((g) => g.setAttribute('transform', 'translate(' + (dx * 2.4).toFixed(2) + ',' + (dy * 1.7).toFixed(2) + ')'));
    });
    const input = $('bug-input');
    input.addEventListener('focus', () => doc.classList.add('pulse-taking'));
    input.addEventListener('blur', () => doc.classList.remove('pulse-taking'));

    const bubble = $('doc-bubble');
    const lines = ['施主，请坐。', '哪儿不舒服？慢慢说。', 'Bug 之症，老夫见得多了。',
      '把手伸过来——唔，脉象有货。', '别急，重启能治一半的病。', '咖啡续杯可以，续命不行。'];
    let bi = 0;
    setInterval(() => {
      const intake = $('screen-intake');
      /* DOM 缺失（页面被外部脚本清理）或切到后台/其他屏时不叨扰 */
      if (!intake || !bubble || document.hidden) return;
      if (!intake.classList.contains('active')) return;
      bi = (bi + 1) % lines.length;
      bubble.textContent = lines[bi];
      bubble.style.animation = 'none';
      void bubble.offsetWidth;
      bubble.style.animation = '';
    }, 3400);
  })();

  /* ---- 终端脉象仪：不同病种，不同脉象 ---- */
  const PULSE_CFG = {
    calm:    { cap: '平脉 · 胃神根俱全，可治', amp: 24, period: 150 },
    fast:    { cap: '数脉 · 一息六至，线上急火攻心', amp: 28, period: 92 },
    thin:    { cap: '细脉 · 如丝在指，气血两亏', amp: 12, period: 150, alpha: .75 },
    wiry:    { cap: '弦脉 · 如按琴弦，肝气郁结', amp: 33, period: 128 },
    erratic: { cap: '结代脉 · 三五不调，并发之兆', amp: 0, period: 0 },
    xu:      { cap: '虚脉 · 举之无力按之空，null 是也', amp: 11, period: 165, alpha: .7 },
    flatline:{ cap: '脉……脉没了？！（删库大泄，阳气暴脱）', amp: 0, period: 0 }
  };
  function pulseKind(r) {
    if (r.id === 'rmrf') return 'flatline';
    const m = { race: 'erratic', crash: 'fast', overwork: 'thin', npe: 'xu',
      review: 'wiry', css: 'wiry', pm: 'wiry', '404': 'xu' };
    return m[r.id] || 'calm';
  }

  let pulseRAF = 0;
  function startPulse(kind) {
    stopPulse();
    const scope = $('pulse-scope');
    const canvas = $('pulse-canvas');
    const cfg = PULSE_CFG[kind] || PULSE_CFG.calm;
    $('pulse-cap').textContent = '● REC ' + cfg.cap;
    const W = canvas.clientWidth || canvas.parentElement.clientWidth - 24;
    const H = 84;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    scope.hidden = false;

    const base = H / 2 + 6;
    const t0 = performance.now();

    /* 单组心搏波形：ph∈[0,1)，返回垂直偏移（负=向上） */
    function beat(ph, amp) {
      let y = 0;
      const bump = (c, w, h) => Math.exp(-Math.pow((ph - c) / w, 2)) * h;
      if (ph > .70 && ph < .745) y += bump(.722, .011, amp * .35);     /* Q 小陷 */
      if (ph > .745 && ph < .80) y -= bump(.772, .015, amp * 1.32);    /* R 主峰 */
      if (ph > .80 && ph < .855) y += bump(.827, .013, amp * .5);      /* S 回沉 */
      if (ph > .86) y -= bump(.955, .05, amp * .22);                   /* T 余波 */
      return y;
    }
    /* 伪随机（可复现，不随帧抖动） */
    const pr = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    function draw(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(62,224,138,' + (cfg.alpha || .92) + ')';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(62,224,138,.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      const speed = .09;   /* px / ms */
      for (let x = 0; x <= W; x += 2) {
        const tX = t - (W - x) / speed;             /* 该像素对应的时刻 */
        let y = base;
        if (kind === 'flatline') {
          const cyc = ((tX % 5200) + 5200) % 5200;
          if (cyc < 1800) {
            /* 暴脱前的一阵乱跳 */
            const ph = ((tX * .55) % 110) / 110;
            y += Math.sin(tX / 28) * 16 + beat(ph, 30) + (pr(Math.floor(tX / 40)) - .5) * 10;
          } else {
            y += Math.sin(tX / 200) * .8;            /* 一条直线 */
          }
        } else if (kind === 'erratic') {
          const bi = Math.floor(tX / 260);
          const period = 80 + pr(bi) * 110;
          const amp = 12 + pr(bi + 9) * 24;
          y += beat(((tX % period) / period), amp);
        } else {
          const ph = (((tX * speed) % cfg.period) / cfg.period);
          y += beat(ph, cfg.amp);
        }
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      pulseRAF = requestAnimationFrame(draw);
    }
    pulseRAF = requestAnimationFrame(draw);
  }
  function stopPulse() {
    if (pulseRAF) cancelAnimationFrame(pulseRAF);
    pulseRAF = 0;
    const scope = $('pulse-scope');
    if (scope) scope.hidden = true;
  }

  /* ---- 病友弹幕：预置病友 + 当前主诉混播 ---- */
  const BARRAGE_POOL = [
    ['前端小工', '这个 Bug 我昨天刚修好，今天它换件马甲又回来了'],
    ['删库预备役', '我就删了一行注释，整个项目怎么就起不来了'],
    ['后端老药罐', '服务还没挂，是我人先挂了'],
    ['产品经理', '需求很简单，就改一个按钮的颜色（第十八遍）'],
    ['测试大夫', '我什么都没动它自己就好了——这才是最吓人的'],
    ['实习生', '在我电脑上明明是好的！真的！'],
    ['运维道长', '凌晨三点的告警，比鸡鸣还准时'],
    ['摸鱼居士', '宜摸鱼，忌看群，群里一@准没好事'],
    ['算法先生', '准确率九成九，一上线就撞上那百分之一'],
    ['八股考生', '背了仨月 HashMap，面试问我会不会重启服务'],
    ['项目经理', '排期是不可能变的，这辈子都不可能'],
    ['咖啡成精', '这杯不是咖啡，是静脉输液']
  ];
  function fillBarrage() {
    const track = $('barrage-track');
    track.innerHTML = '';
    const items = shuffle(BARRAGE_POOL.slice()).slice(0, 8);
    const selfText = (lastInput || '').length > 20 ? lastInput.slice(0, 20) + '…' : (lastInput || '');
    items.push(['刚挂急诊的病友', selfText || '手在抖，先挂号再说']);
    if (reduceMotion()) items.unshift(items.pop());  /* 弹幕静态时，自身主诉排到第一眼可见处 */
    const group = document.createElement('span');
    group.className = 'barrage-group';
    items.forEach(([name, text], idx) => {
      const it = document.createElement('span');
      it.className = 'barrage-item' + (idx === items.length - 1 ? ' is-self' : '');
      const n = document.createElement('span'); n.className = 'b-name'; n.textContent = name + '：';
      it.appendChild(n);
      it.appendChild(document.createTextNode(text));
      group.appendChild(it);
    });
    track.appendChild(group);
    track.appendChild(group.cloneNode(true));   /* 复制一份，实现无缝滚动 */
  }

  /* ---- 一键复制发疯文案 ---- */
  function buildShareText() {
    const L = [];
    L.push('【赛博中医院 · 急诊记录】');
    L.push('主诉：' + $('patient-text').textContent);
    L.push('脉象：' + $('pulse-text').textContent);
    L.push('辨证：' + $('rx-yin').textContent);
    const herbs = [].map.call(document.querySelectorAll('#herb-list li'),
      (li) => li.querySelector('.h-name').textContent + li.querySelector('.h-dose').textContent).join('、');
    if (herbs) L.push('处方：' + herbs);
    L.push('医嘱：' + $('rx-advice').textContent);
    if (lastFortune) {
      const f = lastFortune;
      L.push('——今日神签：' + f.level + '（' + f.sub + '）');
      L.push('Bug 归属：' + f.bug + '；PR 一次过率：' + f.pr);
      L.push('宜：' + f.yi + '；忌：' + f.ji);
      L.push('签偈：「' + f.quote + '」');
    }
    L.push('——赛博中医院 · Bug 问诊科（1024 程序员节特诊）');
    return L.join('\n');
  }
  function flashTip(msg) {
    const tip = $('save-tip');
    tip.textContent = msg;
    tip.hidden = false;
    clearTimeout(tip._t);
    tip._t = setTimeout(() => { tip.hidden = true; }, 2600);
  }
  function copyShareText() {
    const text = buildShareText();
    const done = () => flashTip('发疯文案已复制，去病友群里发吧');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text, done));
    } else {
      legacyCopy(text, done);
    }
  }
  function legacyCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { flashTip('复制失败，请截图保存'); }
    ta.remove();
  }


  /* ============================================================
   * 八、诊断书导出 PNG（零依赖：Canvas 2D 原生绘制长图）
   * ============================================================ */
  function renderDiagnosisPNG(fmt) {
    const data = {
      caseNo: $('case-no').textContent,
      visitor: $('visitor-no').textContent,
      date: $('rx-date').textContent,
      patient: $('patient-text').textContent,
      pulse: $('pulse-text').textContent,
      yin: $('rx-yin').textContent,
      herbs: currentResult.herbs,
      advice: $('rx-advice').textContent,
      f: lastFortune
    };

    const S = 2;                       /* 高清 2 倍 */
    const W = 750, M = 34;             /* 逻辑宽、页边距 */
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const kai  = (s) => s + 'px KaiTi,STKaiti,楷体,serif';
    const song = (s) => s + 'px SimSun,STSong,宋体,serif';
    const songB = (s) => '700 ' + s + 'px SimSun,STSong,宋体,serif';
    const mono = (s) => s + 'px Consolas,Courier New,monospace';
    const INK = '#2b241a', CINN = '#c4382e', CINN_D = '#9c2b23',
          GOLD = '#d8a444', GREEN = '#2e7d4f', MUTE = '#8a7a60';

    function wrap(font, text, maxW) {
      ctx.font = font;
      const out = [];
      let line = '';
      for (const ch of String(text)) {
        if (ch === '\n') { out.push(line); line = ''; continue; }
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
        else line += ch;
      }
      if (line) out.push(line);
      return out;
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    /* 两遍渲染：pass 0 只算高度，pass 1 真正落笔 */
    function run(pass) {
      const CW = W - M * 2;
      let y = 46;

      function center(text, font, color, gap) {
        const fs = parseInt(font, 10), lh = fs * 1.45;
        const ls = wrap(font, text, CW);
        if (pass) {
          ctx.font = font; ctx.fillStyle = color;
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ls.forEach((ln, i) => ctx.fillText(ln, W / 2, y + fs * 1.05 + i * lh));
        }
        y += ls.length * lh + gap;
      }

      /* ---- 抬头 ---- */
      center('赛博中医院 · Bug 问诊科诊断书', kai(30), GOLD, 6);
      center(data.visitor, kai(15), '#8fa093', 6);
      center('CYBER TCM CLINIC · NO.' + data.caseNo, mono(12), '#6d8075', 20);

      /* ---- 主诉条 ---- */
      (function () {
        const fs = 14, lh = 24, pad = 15, labelW = 58;
        const ls = wrap(mono(fs), data.patient, CW - pad * 2 - labelW);
        const h = Math.max(ls.length * lh, fs + 10) + pad * 2;
        if (pass) {
          roundRect(M, y, CW, h, 8);
          ctx.fillStyle = 'rgba(196,56,46,.10)'; ctx.fill();
          ctx.fillStyle = CINN;
          ctx.fillRect(M + 2, y + 9, 4, h - 18);
          ctx.font = kai(19); ctx.fillStyle = CINN; ctx.textAlign = 'left';
          ctx.fillText('主诉', M + pad + 4, y + pad + fs + 1);
          ctx.font = mono(fs); ctx.fillStyle = '#dfe8e1';
          ls.forEach((ln, i) => ctx.fillText(ln, M + pad + labelW + 4, y + pad + fs + i * lh));
        }
        y += h + 14;
      })();

      /* ---- 望闻问切 ---- */
      (function () {
        const pad = 16, fs = 18, lh = fs * 1.85;
        const ls = wrap(kai(fs), data.pulse, CW - pad * 2);
        const h = pad + 17 + 7 + ls.length * lh + pad;
        if (pass) {
          roundRect(M, y, CW, h, 8);
          ctx.strokeStyle = 'rgba(62,224,138,.4)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = 'rgba(62,224,138,.06)'; ctx.fill();
          ctx.font = mono(12); ctx.fillStyle = '#3ee08a'; ctx.textAlign = 'left';
          ctx.fillText('望闻问切 · 四诊合参', M + pad, y + pad + 12);
          ctx.font = kai(fs); ctx.fillStyle = '#d7efdf';
          ls.forEach((ln, i) => ctx.fillText(ln, M + pad, y + pad + 17 + 7 + fs + i * lh));
        }
        y += h + 20;
      })();

      /* ---- 处方笺 ---- */
      let paperH = 0;
      (function () {
        const x = M, w = CW, pad = 26;
        const ix = x + pad, iw = w - pad * 2;
        const chipW = 56, chipH = 30, tx = ix + chipW + 16, tw = iw - chipW - 16;

        /* 计算各段高度 */
        let inner = 8;
        inner += 48 + 12;                                  /* 标题 */
        inner += 22 + 12;                                  /* meta + 间距 */
        const yinLs = wrap(kai(18), data.yin, tw);
        inner += Math.max(chipH, yinLs.length * 32) + 16;
        inner += data.herbs.length * 38 + 4;
        const advLs = wrap(kai(18), data.advice, tw - 96); /* 给印章让位 */
        inner += Math.max(chipH, advLs.length * 33) + 16;
        paperH = inner + pad + 56;

        if (pass) {
          roundRect(x, y, w, paperH, 5);
          const g = ctx.createLinearGradient(0, y, 0, y + paperH);
          g.addColorStop(0, '#f7efd9'); g.addColorStop(1, '#f1e4c3');
          ctx.fillStyle = g; ctx.fill();
          ctx.save();
          roundRect(x, y, w, paperH, 5); ctx.clip();
          ctx.strokeStyle = 'rgba(160,60,48,.10)'; ctx.lineWidth = 1;
          for (let lx = x + 46; lx < x + w - 14; lx += 46) {
            ctx.beginPath(); ctx.moveTo(lx, y + 6); ctx.lineTo(lx, y + paperH - 6); ctx.stroke();
          }
          /* 水印 */
          ctx.save();
          ctx.translate(x + w - 150, y + paperH - 120);
          ctx.rotate(-0.42);
          ctx.font = kai(60); ctx.fillStyle = 'rgba(160,60,48,.08)';
          ctx.textAlign = 'center';
          ctx.fillText('賽博中醫院', 0, 0);
          ctx.restore();
          ctx.restore();

          let cy = y + pad;
          /* 标题 */
          ctx.font = kai(40); ctx.fillStyle = CINN_D; ctx.textAlign = 'center';
          ctx.fillText('處 方 箋', x + w / 2, cy + 34);
          cy += 48 + 12;
          /* meta */
          ctx.font = song(13.5); ctx.fillStyle = '#6e6150'; ctx.textAlign = 'left';
          ctx.fillText('科别：Bug 问诊科', ix, cy + 14);
          ctx.textAlign = 'right';
          ctx.fillText(data.date, x + w - pad, cy + 14);
          cy += 22 + 10;
          ctx.strokeStyle = 'rgba(160,60,48,.4)';
          ctx.beginPath(); ctx.moveTo(ix, cy); ctx.lineTo(x + w - pad, cy); ctx.stroke();
          cy += 14;

          function chip(label) {
            ctx.strokeStyle = CINN_D; ctx.lineWidth = 1.5;
            ctx.strokeRect(ix, cy - 22, chipW, chipH);
            ctx.font = kai(18); ctx.fillStyle = CINN_D; ctx.textAlign = 'center';
            ctx.fillText(label, ix + chipW / 2, cy);
            ctx.textAlign = 'left';
          }
          /* 药引 */
          chip('药引');
          ctx.font = kai(18); ctx.fillStyle = INK;
          yinLs.forEach((ln, i) => ctx.fillText(ln, tx, cy + i * 32));
          cy += Math.max(chipH, yinLs.length * 32) + 16;
          /* 处方 */
          chip('处方');
          data.herbs.forEach(([name, dose], i) => {
            const ry = cy + i * 38;
            ctx.font = kai(18);
            ctx.fillStyle = INK; ctx.textAlign = 'left';
            ctx.fillText(name, tx, ry);
            const nameW = ctx.measureText(name).width;
            ctx.font = kai(18); ctx.fillStyle = '#7a4a20'; ctx.textAlign = 'right';
            ctx.fillText(dose, ix + iw, ry);
            const doseW = ctx.measureText(dose).width;
            ctx.fillStyle = '#9a8a72';
            for (let dx = tx + nameW + 12; dx < ix + iw - doseW - 12; dx += 9) {
              ctx.fillRect(dx, ry - 6, 3, 2);
            }
          });
          cy += data.herbs.length * 38 + 4;
          /* 医嘱 */
          chip('医嘱');
          ctx.font = kai(18); ctx.fillStyle = INK; ctx.textAlign = 'left';
          advLs.forEach((ln, i) => ctx.fillText(ln, tx, cy + i * 33));
          cy += Math.max(chipH, advLs.length * 33);

          /* 印章 */
          ctx.save();
          ctx.translate(x + w - 66, y + paperH - 60);
          ctx.rotate(-0.16);
          ctx.strokeStyle = CINN; ctx.lineWidth = 3;
          ctx.strokeRect(-29, -29, 58, 58);
          ctx.fillStyle = 'rgba(196,56,46,.06)';
          ctx.fillRect(-29, -29, 58, 58);
          ctx.font = kai(19); ctx.fillStyle = CINN; ctx.textAlign = 'center';
          ctx.fillText('賽博', 0, -6);
          ctx.fillText('神醫', 0, 18);
          ctx.restore();
        }
        y += paperH + 24;
      })();

      /* ---- 神签 ---- */
      (function () {
        const f = data.f;
        const x = M, w = CW, pad = 26;
        const ix = x + pad, iw = w - pad * 2;
        let inner = 10;
        inner += 34 + 10;                         /* 神签标题 */
        inner += 84;                             /* 签等 */
        inner += 16 + 10;                        /* 英文 */
        inner += 1;                              /* 虚线 */
        inner += 12;
        inner += 3 * 30 + 8;                     /* 三行指标（每行单行） */
        /* 宜忌 */
        const yiLs = wrap(song(15), f.yi, iw / 2 - 12 - 28);
        const jiLs = wrap(song(15), f.ji, iw / 2 - 12 - 28);
        const yjH = Math.max(yiLs.length, jiLs.length) * 25 + 24;
        inner += yjH + 12;
        const qLs = wrap(kai(19), '「' + f.quote + '」', iw - 20);
        inner += qLs.length * 30 + 12;
        inner += 16;
        const cardH = inner + pad;

        if (pass) {
          roundRect(x, y, w, cardH, 8);
          const g = ctx.createLinearGradient(0, y, 0, y + cardH);
          g.addColorStop(0, '#f9f1dc'); g.addColorStop(1, '#f2e5c2');
          ctx.fillStyle = g; ctx.fill();
          ctx.strokeStyle = CINN; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.strokeStyle = 'rgba(196,56,46,.4)'; ctx.lineWidth = 1;
          ctx.strokeRect(x + 7, y + 7, w - 14, cardH - 14);

          let cy = y + pad + 4;
          /* 标题 + 两侧线 */
          ctx.font = kai(23); ctx.fillStyle = CINN_D; ctx.textAlign = 'center';
          ctx.fillText('程 序 员 神 签', x + w / 2, cy + 24);
          ctx.strokeStyle = CINN;
          ctx.beginPath();
          ctx.moveTo(x + w / 2 - 150, cy + 17); ctx.lineTo(x + w / 2 - 95, cy + 17);
          ctx.moveTo(x + w / 2 + 95, cy + 17); ctx.lineTo(x + w / 2 + 150, cy + 17);
          ctx.stroke();
          cy += 34 + 10;
          /* 签等 */
          ctx.font = kai(72); ctx.fillStyle = CINN;
          ctx.fillText(f.level, x + w / 2, cy + 62);
          cy += 84;
          ctx.font = mono(11); ctx.fillStyle = MUTE;
          ctx.fillText(f.sub, x + w / 2, cy + 10);
          cy += 16 + 10;
          ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(156,43,35,.4)';
          ctx.beginPath(); ctx.moveTo(ix, cy); ctx.lineTo(x + w - pad, cy); ctx.stroke();
          ctx.setLineDash([]);
          cy += 12;
          /* 指标行 */
          function row(label, value, isStars) {
            ctx.font = song(15); ctx.fillStyle = '#6e5c42'; ctx.textAlign = 'left';
            ctx.fillText(label, ix, cy + 20);
            if (isStars) {
              ctx.font = kai(20);
              ctx.textAlign = 'right';
              ctx.fillStyle = CINN;
              ctx.fillText('★'.repeat(f.fish), ix + iw - (5 - f.fish) * 22, cy + 20);
              ctx.fillStyle = '#d8c8a6';
              ctx.fillText('★'.repeat(5 - f.fish), ix + iw, cy + 20);
            } else {
              ctx.font = songB(16); ctx.fillStyle = INK; ctx.textAlign = 'right';
              ctx.fillText(value, ix + iw, cy + 20);
            }
            cy += 30;
          }
          row('今日 Bug 等级', f.bug);
          ctx.font = mono(17); /* PR 用等宽 */
          (function () {
            ctx.fillStyle = '#6e5c42'; ctx.textAlign = 'left'; ctx.font = song(15);
            ctx.fillText('PR 一次过率', ix, cy + 20);
            ctx.font = mono(17); ctx.fillStyle = CINN_D; ctx.textAlign = 'right';
            ctx.fillText(f.pr, ix + iw, cy + 20);
            cy += 30;
          })();
          row('摸鱼指数', '', true);
          cy += 8;
          /* 宜忌 */
          const colW = (iw - 14) / 2, bx1 = ix, bx2 = ix + colW + 14;
          [[bx1, '宜', GREEN, f.yi, yiLs], [bx2, '忌', CINN_D, f.ji, jiLs]].forEach(function ([bx, word, col, , ls]) {
            roundRect(bx, cy, colW, yjH, 6);
            ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();
            ctx.font = kai(20); ctx.fillStyle = col; ctx.textAlign = 'left';
            ctx.fillText(word, bx + 12, cy + 29);
            ctx.font = song(15); ctx.fillStyle = INK;
            ls.forEach((ln, i) => ctx.fillText(ln, bx + 40, cy + 29 + i * 25));
          });
          cy += yjH + 12;
          /* 金句 */
          ctx.font = kai(19); ctx.fillStyle = '#5c4a30'; ctx.textAlign = 'center';
          qLs.forEach((ln, i) => ctx.fillText(ln, x + w / 2, cy + 20 + i * 30));
          cy += qLs.length * 30 + 12;
          ctx.font = mono(10); ctx.fillStyle = '#9b8a6c';
          ctx.fillText('赛博中医院 · 1024 签 · 心诚则灵，不灵再抽', x + w / 2, cy + 12);
        }
        y += cardH;
      })();

      y += 26;
      center('本诊断纯属娱乐，但医嘱是认真的 · 1024 程序员节快乐', mono(11), '#6d8075', 0);
      y += 24;
      return y;
    }

    const H = run(0);
    canvas.width = W * S; canvas.height = H * S;
    ctx.scale(S, S);
    /* 底色 + 顶部红光 */
    ctx.fillStyle = '#0c110e';
    ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, -40, 40, W / 2, 260, 520);
    rg.addColorStop(0, 'rgba(196,56,46,.18)');
    rg.addColorStop(1, 'rgba(196,56,46,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, 460);
    run(1);
    /* 外框 */
    ctx.strokeStyle = 'rgba(216,164,68,.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(M / 2, M / 2, W - M, H - M);

    /* fmt='jpg' 出轻量 JPEG（社媒晒单体积小），默认无损 PNG；画布已铺实底，无透明通道问题 */
    return fmt === 'jpg'
      ? canvas.toDataURL('image/jpeg', .92)
      : canvas.toDataURL('image/png');
  }

  const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent);

  /* iOS 上 download 属性不可靠，改为展示图片引导长按存照 */
  function showSavePreview(dataUrl, tip) {
    const mask = document.createElement('div');
    mask.className = 'save-preview';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-label', '诊断书预览');
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = '赛博中医院诊断书';
    mask.appendChild(img);
    mask.addEventListener('click', () => mask.remove());
    document.body.appendChild(mask);
    tip.textContent = '长按图片选择「存储到照片」，点空白处关闭';
    clearTimeout(tip._t);
    tip._t = setTimeout(() => { tip.hidden = true; }, 4000);
  }

  async function exportPNG(fmt) {
    const isJpg = fmt === 'jpg';
    const tip = $('save-tip');
    tip.hidden = false;
    tip.textContent = '正在绘制诊断书……';
    clearTimeout(tip._t);
    /* 让「正在绘制」先绘出一帧，否则同步绘制会把它压掉，用户只看到卡住。
       用 setTimeout 而非双 rAF：后台标签页/不出帧环境 rAF 可能长期不触发 */
    await new Promise((r) => setTimeout(r, 60));
    try {
      const dataUrl = renderDiagnosisPNG(fmt);
      if (IS_IOS) { showSavePreview(dataUrl, tip); return; }
      const a = document.createElement('a');
      a.download = '赛博中医院诊断书_' + $('case-no').textContent + (isJpg ? '.jpg' : '.png');
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      a.remove();
      tip.textContent = isJpg ? '轻量版已保存，群里晒图更快' : '高清诊断书已保存，快去晒单吧';
      setTimeout(() => { tip.hidden = true; }, 2600);
    } catch (err) {
      tip.textContent = '自动保存失败：请直接对本页截屏，效果一样好';
      setTimeout(() => { tip.hidden = true; }, 3200);
    }
  }

  /* 保存前置校验：摇签中拦截、未摇签先引导；通过后按格式导出 */
  function trySave(fmt) {
    const tip = $('save-tip');
    if (drawing) {
      /* 签正在摇：按钮已置灰，此分支兜底（键盘/旧引用触发），只提示不引导 */
      tip.hidden = false;
      tip.textContent = '签筒正在摇动，稍候片刻即可保存';
      clearTimeout(tip._t);
      tip._t = setTimeout(() => { tip.hidden = true; }, 2200);
      return;
    }
    if (!lastFortune) {
      /* 处方已出、神签未摇：先引导摇签 */
      tip.hidden = false;
      tip.textContent = '先摇一支神签，诊断书才算完整';
      $('shaker').scrollIntoView({ behavior: 'smooth', block: 'center' });
      const btn = $('btn-draw');
      btn.classList.remove('draw-flash');
      void btn.offsetWidth;
      btn.classList.add('draw-flash');
      clearTimeout(tip._t);
      tip._t = setTimeout(() => { tip.hidden = true; }, 2800);
      return;
    }
    exportPNG(fmt);
  }
  $('btn-save').addEventListener('click', () => trySave('png'));
  $('btn-save-jpg').addEventListener('click', () => trySave('jpg'));

  /* ============================================================
   * 九、背景代码雨
   * ============================================================ */
  (function matrixRain() {
    const canvas = $('matrix-bg');
    const ctx = canvas.getContext('2d');
    const GLYPHS = '01{}<>[]();=bugNULL404502gitnew01'.split('');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const STEP = 70;   /* 每 70ms 落一格，保留原来的雨势节奏 */
    let cols = 0, drops = [], fontSize = 16;
    let running = false, lastTick = 0, resizeTimer = null;

    function resize() {
      /* 按 DPR 放大画布，高分屏不再糊成一片 */
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';    /* 画布像素放大，显示尺寸仍锁 CSS 尺寸 */
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   /* 之后一律按 CSS 像素作画 */
      cols = Math.floor(w / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.random() * -40);
      drawFrame();
    }

    function drawFrame() {
      const w = window.innerWidth, h = window.innerHeight;
      ctx.fillStyle = 'rgba(11,15,13,.12)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < cols; i++) {
        const ch = GLYPHS[rand(GLYPHS.length)];
        ctx.fillStyle = Math.random() > 0.975 ? '#c4382e' : '#3ee08a';
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > .975) drops[i] = 0;
        drops[i] += 1;
      }
    }

    function loop(t) {
      if (!running) return;
      if (t - lastTick >= STEP) { lastTick = t; drawFrame(); }
      requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      lastTick = 0;
      requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
    }

    resize();
    start();

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);   /* 防抖：拖动窗口时不反复重建画布 */
    });

    /* 切到后台/锁屏就停帧，别在看不见的地方空烧电 */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
  })();

})();
