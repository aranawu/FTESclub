export const CLUBS = [
  {
    id: 'flute',
    name: '直笛音樂社',
    content: '以直笛演奏為主、樂器教學、節奏音感練習',
    day: '三',
    time: '每週三 12:40–15:40',
    period: '115/9/9～116/1/6',
    grades: ['2年級', '3年級', '4年級', '5年級', '6年級'],
    capacity: null,
  },
  {
    id: 'diabolo',
    name: '扯鈴社',
    content: '扯鈴教學、表演與競賽',
    day: '三',
    time: '每週三 12:40–15:40',
    period: '115/9/9～116/1/6',
    grades: ['3年級', '4年級', '5年級', '6年級'],
    capacity: 20,
  },
  {
    id: 'young-english',
    name: "Young English Speaker's Club",
    content: '外師口說英語活動、英語歌謠唱跳、勞作',
    day: '三',
    time: '每週三 12:40–15:40',
    period: '115/9/9～116/1/6',
    grades: ['1年級', '2年級'],
    capacity: 20,
  },
  {
    id: 'yushan-english',
    name: '玉山英語社',
    content: '英語自然發音、繪本閱讀、單字練習',
    day: '五',
    time: '每週五 12:40–15:40',
    period: '115/9/11～116/1/8',
    grades: ['1年級', '2年級'],
    capacity: 20,
  },
  {
    id: 'table-tennis',
    name: '桌球社',
    content: '基礎動作訓練、體能訓練、比賽練習、參與競賽',
    day: '五',
    time: '每週五 12:40–14:10',
    period: '115/9/11～116/1/8',
    grades: ['2年級', '3年級', '4年級'],
    capacity: 20,
  },
];

export const CLUB_MAP = new Map(CLUBS.map((club) => [club.id, club]));

export function publicClubs() {
  return CLUBS.map(({ id, name, content, day, time, period, grades, capacity }) => ({
    id, name, content, day, time, period, grades, capacity,
  }));
}

export function validateClubSelection(grade, clubIds) {
  const uniqueIds = [...new Set(clubIds)];
  if (uniqueIds.length < 1 || uniqueIds.length > 2) {
    return { ok: false, message: '請選擇一個社團，或週三與週五各選一個。' };
  }
  const selected = uniqueIds.map((id) => CLUB_MAP.get(id));
  if (selected.some((club) => !club)) return { ok: false, message: '選擇的社團不存在。' };
  if (selected.some((club) => !club.grades.includes(grade))) return { ok: false, message: '選擇的社團與學生年級不符。' };
  if (new Set(selected.map((club) => club.day)).size !== selected.length) {
    return { ok: false, message: '同一天只能選擇一個社團。' };
  }
  return { ok: true, selected };
}
