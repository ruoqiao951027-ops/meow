// 年糕（狗）的紀錄頁假資料：疫苗、常見疾病都以狗狗為準，備註用飼主口吻

const HOSPITAL = '汪汪町動物醫院'
const HOSPITAL_2 = '好鄰居動物醫院'

export const DOG = {
  // 行事曆（以本月為準）
  calendar: (k) => ({
    [k(1)]: { events: [{ time: '20:00', icon: '💊', title: '心絲蟲預防藥' }] },
    [k(4)]: { diary: '散步遇到隔壁的柴犬，尾巴搖到停不下來。' },
    [k(8)]: { diary: '下雨不能出門，在家咬玩具咬了一整個下午。' },
    [k(10)]: { events: [{ time: '16:00', icon: '🛁', title: '洗澡＋剪毛' }], diary: '剪完毛變好小一隻😂 一直跑去鏡子前面看。' },
    [k(12)]: { events: [{ time: '10:30', icon: '🩺', title: '耳朵回診' }] },
    [k(16)]: { diary: '偷咬了一隻拖鞋，被抓包還裝無辜😑' },
    [k(19)]: { diary: '第一次去狗狗公園，交到一個柯基朋友！' },
    [k(24)]: { events: [{ time: '09:00', icon: '✂️', title: '剪指甲＋擠肛門腺' }] },
  }),

  checkups: [
    {
      date: '2025.09.20',
      hospital: HOSPITAL,
      ai: [
        '心絲蟲抗原檢測為陰性，請持續每月投藥預防。',
        '體重 8.3 kg，體態評分 6/9 略偏胖，建議減少零食並增加散步時間。',
        '左後腳膝蓋骨有第 1 級鬆脫，避免跳上跳下，可考慮補充關節保健品。',
      ],
    },
    {
      date: '2024.09.21',
      hospital: HOSPITAL,
      ai: [
        '血液與心絲蟲檢查結果正常。',
        '牙齒有中度牙結石，建議安排洗牙。',
        '耳道較潮濕，洗澡後記得擦乾，降低外耳炎機會。',
      ],
    },
    {
      date: '2023.09.16',
      hospital: HOSPITAL_2,
      ai: [
        '整體健康狀況良好，結紮傷口癒合正常。',
        '結紮後容易發胖，飼料份量可依體重調整。',
      ],
    },
  ],

  vaccines: [
    { date: '2026.09.13', name: '狂犬病', place: HOSPITAL, note: '打完很正常，回家還討了零食吃' },
    { date: '2025.09.20', name: '十合一', place: HOSPITAL, note: '跟健檢同一天，醫生說牠今年多打鉤端螺旋體比較保險' },
    { date: '2025.09.06', name: '狂犬病', place: HOSPITAL },
    { date: '2024.09.21', name: '八合一', place: HOSPITAL },
    { date: '2024.09.07', name: '狂犬病', place: HOSPITAL },
    { date: '2024.04.13', name: '犬舍咳', place: HOSPITAL, note: '要去住寵物旅館前補打的，鼻子噴的那種，打完一直打噴嚏' },
    { date: '2023.01.07', name: '八合一', place: HOSPITAL_2, note: '幼犬最後一劑！終於可以出門散步了🎉' },
    { date: '2022.12.03', name: '八合一', place: HOSPITAL_2, note: '幼犬第二劑，打完有點沒精神' },
    { date: '2022.11.05', name: '八合一', place: HOSPITAL_2, note: '幼犬第一劑，抖得好可憐' },
  ],

  visits: [
    {
      date: '2026.11.12',
      hospital: HOSPITAL,
      reason: '右耳外耳炎回診',
      followUp: 2,
      reminders: [
        { icon: '💧', text: '耳朵藥水每天 2 次，再點 5 天' },
        { icon: '🚿', text: '這週先不要洗澡，耳朵不要進水' },
      ],
      ai: ['發炎狀況有改善，請把療程點完，不要提早停藥。', '若又開始甩頭或抓耳朵，請提前回診。'],
    },
    {
      date: '2026.11.05',
      hospital: HOSPITAL,
      reason: '一直甩頭、抓右耳',
      followUp: 1,
      reminders: [
        { icon: '💧', text: '耳朵藥水每天 2 次，共 7 天' },
        { icon: '🧽', text: '點藥前先用洗耳液清耳朵' },
        { icon: '🚫', text: '戴頭套避免抓破皮' },
      ],
      ai: ['外耳炎常跟耳道潮濕有關，洗澡、游泳後記得擦乾耳朵。', '7 天後回診確認耳道狀況。'],
    },
    {
      date: '2026.03.22',
      hospital: HOSPITAL,
      reason: '偷吃垃圾桶後拉肚子',
      reminders: [
        { icon: '💊', text: '止瀉藥每天 2 次，共 3 天' },
        { icon: '🍚', text: '先吃處方腸胃罐，少量多餐' },
      ],
      ai: ['觀察大便狀況，若出現血便或持續嘔吐請立即回診。', '垃圾桶建議換成有蓋子的款式。'],
    },
    {
      date: '2025.05.10',
      hospital: HOSPITAL,
      reason: '散步後左後腳一跛一跛',
      reminders: [
        { icon: '🚫', text: '兩週內不要爬樓梯、跳沙發' },
        { icon: '🦴', text: '每天吃關節保健品' },
      ],
      ai: ['膝蓋骨鬆脫在小型犬很常見，控制體重能減輕關節負擔。', '家裡地板可以鋪止滑墊。'],
    },
  ],

  diseases: [
    {
      name: '皮膚過敏',
      date: '',
      place: '',
      desc: '每到換季肚子和腳掌就會紅紅的，一直舔一直抓。醫生說可能是環境過敏，開了止癢藥，也換了低敏飼料。',
      impact: '換季要多注意，看到牠一直舔腳就要檢查一下。散步回來要擦腳。',
    },
    {
      name: '外耳炎',
      date: '2026.11.05',
      place: HOSPITAL,
      desc: '一直甩頭、抓右耳，靠近聞有怪味道😣 醫生清了耳朵，開了耳朵藥水回家點，點完一週有回診。',
      impact: '洗完澡一定要把耳朵擦乾，每兩週用洗耳液清一次。',
    },
    {
      name: '急性腸胃炎',
      date: '2026.03.22',
      place: HOSPITAL,
      desc: '趁我不在家把垃圾桶翻倒，隔天就開始拉肚子。吃了三天止瀉藥跟處方罐頭才好。',
      impact: '垃圾桶已經換成有蓋子的！吃的東西不要放在牠搆得到的地方。',
    },
  ],

  meds: [
    { id: 'd1', kind: 'fixed', name: '心絲蟲預防藥', every: '每月', times: 1, days: '', time: '20:00', note: '每個月 1 號吃，牛肉口味的牠很愛', remind: false },
    { id: 'd2', kind: 'fixed', name: '體外驅蟲口服錠', every: '每月', times: 1, days: '', time: '20:00', note: '跟心絲蟲藥同一天吃比較不會忘', remind: false },
    { id: 'd3', kind: 'fixed', name: '關節保健品', every: '每天', times: 1, days: '', time: '08:00', note: '拌在早餐裡', remind: false },
    { id: 'd4', kind: 'short', name: '耳朵藥水', every: '每天', times: 2, days: 7, time: '09:00', note: '點完要按摩耳朵根部，牠會一直想甩頭', remind: false },
    { id: 'd5', kind: 'short', name: '止瀉藥', every: '每天', times: 2, days: 3, time: '09:00', note: '磨成粉拌罐頭', remind: false, ended: true },
  ],

  injuries: [
    {
      type: '傷病',
      congenital: true,
      title: '膝蓋天生比較鬆（膝蓋骨鬆脫）',
      desc: '小時候跑一跑偶爾會突然抬起左後腳，跳幾步又好了。醫生說是小型犬很常見的膝蓋骨鬆脫，目前是第 1 級。',
      impact: '不要讓牠一直跳沙發、爬樓梯，體重也要控制好，不然膝蓋負擔會更大。',
      advice: [
        '家中地板鋪止滑墊，沙發旁可放寵物階梯。',
        '維持理想體重，每次體檢請醫師追蹤膝蓋狀況。',
        '若跛腳次數變多或持續不放下腳，請盡快就醫。',
      ],
    },
    {
      type: '傷病',
      title: '腳掌被玻璃割傷',
      date: '2024.07.14',
      hospital: HOSPITAL,
      desc: '在公園散步時踩到碎玻璃，右前腳肉球割了一道口子，流好多血嚇死我😭 縫了兩針，包紮了一個禮拜。',
      impact: '已經完全好了～之後散步盡量走乾淨的路線。',
      advice: ['散步後檢查腳掌是否有異物或傷口。', '夏天柏油路很燙，盡量避開中午散步。'],
    },
    {
      type: '手術',
      title: '結紮手術',
      date: '2023.03.18',
      hospital: HOSPITAL_2,
      desc: '六個月大的時候結紮的，回家當天麻藥還沒退一直站不穩，隔天就活蹦亂跳了。戴了 10 天頭套。',
      impact: '結紮後比較容易胖，飼料份量要控制。',
      advice: ['定期量體重，必要時改用結紮犬專用飼料。'],
    },
    {
      type: '手術',
      title: '洗牙＋拔牙',
      date: '2024.10.26',
      hospital: HOSPITAL,
      desc: '全身麻醉洗牙，順便拔掉一顆搖搖的小臼齒。回家只能吃軟的，牠一臉委屈。',
      impact: '口氣好很多！醫生說要開始練習刷牙。',
      advice: ['每週刷牙 2–3 次，可搭配潔牙骨。', '每年體檢時檢查牙結石狀況。'],
    },
  ],

  others: [
    { label: '晶片', text: '領養那天就有晶片了，寵物登記也辦好了～搬家要記得改地址！' },
    { label: '個性', text: '超愛撿地上的東西吃，散步要一直盯著😩 看到機車會想追，一定要繫好牽繩。' },
  ],

  births: [],
  spay: {
    date: '2023.03.18',
    hospital: HOSPITAL_2,
    note: '六個月大的時候結紮的，戴了 10 天頭套還是一直想舔傷口😂 傷口恢復得很好，已經拆線了。',
  },
}
