/**
 * 头像映射工具 —— 根据姓名返回对应的头像图片
 * 同名 → 同头像；按名字自动判断男女分配头像池
 */

const a1 = new URL('../assets/avatars/1.png', import.meta.url).href   // 男 青年西装
const a2 = new URL('../assets/avatars/2.png', import.meta.url).href   // 女 马尾青年
const a3 = new URL('../assets/avatars/3.png', import.meta.url).href   // 女 短发青年
const a4 = new URL('../assets/avatars/4.png', import.meta.url).href   // 男 青年西装
const a5 = new URL('../assets/avatars/5.png', import.meta.url).href   // 女 短发戴眼镜
const a6 = new URL('../assets/avatars/6.png', import.meta.url).href   // 男 老年西装
const a7 = new URL('../assets/avatars/7.png', import.meta.url).href   // 女 中年
const a8 = new URL('../assets/avatars/8.png', import.meta.url).href   // 男 青年戴眼镜
const a9 = new URL('../assets/avatars/9.png', import.meta.url).href   // 女 马尾青年
const a10 = new URL('../assets/avatars/10.png', import.meta.url).href // 女

/** 男头像池：1,4,6,8（4 张） */
const MALE_POOL = [a1, a4, a6, a8]
/** 女头像池：2,3,5,7,9,10（6 张） */
const FEMALE_POOL = [a2, a3, a5, a7, a9, a10]
const NAME_AVATAR_OVERRIDES: Record<string, string> = {
  高卫明: a4,
}

/** 名字中带这些字通常是男性 */
const MALE_CHARS = new Set([
  '伟', '强', '磊', '勇', '军', '杰', '涛', '超', '明', '立', '凯', '宁',
  '国', '华', '鹏', '飞', '斌', '辉', '龙', '健', '成', '峰', '浩', '博',
  '文', '武', '睿', '轩', '辰', '阳', '晨', '旭', '昌', '坤', '庆', '松',
  '林', '河', '海', '山', '川', '原', '野', '波', '江', '翔',
  '安', '平', '盛', '兴', '全', '福', '寿', '仁', '义', '礼', '智', '信',
  '忠', '孝', '廉', '谦', '谨', '慎', '勤', '俭',
  '刚', '毅', '坚', '韧', '胜', '利', '东', '南', '西', '北', '中', '大',
  '卫', '铭', '轩', '硕', '翔', '铭', '达', '翔',
])

/** 名字中带这些字通常是女性 */
const FEMALE_CHARS = new Set([
  '芳', '娜', '敏', '静', '丽', '艳', '霞', '婷', '雪', '慧', '珊', '梅',
  '莉', '萍', '娥', '珍', '秀', '兰', '芝', '英', '莲', '桂', '凤',
  '燕', '翎', '茜', '倩', '洁', '冰', '清', '纯', '甜', '柔', '婉',
  '怡', '悦', '欣', '妍', '嫣', '妤', '琳', '瑶', '瑾', '琪', '瑛',
  '珂', '璐', '珠', '翠', '黛', '曼', '妙', '姣', '好', '如', '若',
  '伊', '兮', '薇', '蔷', '芙', '蓉', '茉', '莉', '薰', '卉', '苗',
  '蕾', '蓓', '菁', '菲', '萌', '萱', '芷', '蕙', '荃',
  '思', '诗', '韵', '音', '画', '书', '雅', '淑', '贤', '娴', '妙',
  '俏', '婵', '媛', '嫦', '婀', '娜', '婕', '玥', '虹',
  '琴', '笛', '梦', '幻', '月', '云', '星', '辰', '雨', '虹', '曦',
])

export function detectGender(name: string): 'male' | 'female' | null {
  if (!name) return null
  const given = name.length > 2 ? name.slice(1) : name
  let maleScore = 0
  let femaleScore = 0
  for (const ch of given) {
    if (MALE_CHARS.has(ch)) maleScore++
    if (FEMALE_CHARS.has(ch)) femaleScore++
  }
  if (femaleScore > maleScore) return 'female'
  if (maleScore > femaleScore) return 'male'
  if (name.length >= 2) {
    const ch1 = name[1]
    if (FEMALE_CHARS.has(ch1) && !MALE_CHARS.has(ch1)) return 'female'
    if (MALE_CHARS.has(ch1) && !FEMALE_CHARS.has(ch1)) return 'male'
  }
  return null
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

export function getAvatar(name: string): string {
  if (!name) return MALE_POOL[0]
  if (NAME_AVATAR_OVERRIDES[name]) return NAME_AVATAR_OVERRIDES[name]
  const gender = detectGender(name)
  const pool = gender === 'female' ? FEMALE_POOL : MALE_POOL
  const idx = hashString(name) % pool.length
  return pool[idx]
}

/**
 * 指定头像编号强制返回（1-10）
 * 用于首次建立稳定的 名字→头像 映射表
 */
export function getAvatarByNumber(n: number): string {
  const pools = [MALE_POOL, FEMALE_POOL]
  // 1,4,6,8 男；2,3,5,7,9,10 女
  const maleSet = new Set([1, 4, 6, 8])
  const femaleSet = new Set([2, 3, 5, 7, 9, 10])
  if (maleSet.has(n)) {
    const idx = [1, 4, 6, 8].indexOf(n)
    return MALE_POOL[idx]
  }
  if (femaleSet.has(n)) {
    const idx = [2, 3, 5, 7, 9, 10].indexOf(n)
    return FEMALE_POOL[idx]
  }
  return MALE_POOL[0]
}

export const AVATAR_POOL = { male: MALE_POOL, female: FEMALE_POOL }
