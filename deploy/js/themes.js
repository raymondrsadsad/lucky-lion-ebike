/* themes.js — shared seasonal themes (site background + festive logo accent + poster bg). */
const THEMES = {
  default:      { label: 'Default',                 emoji: '',   ribbon: '',                                        page: '',                                              poster: 'linear-gradient(135deg,#1f1f1f,#141414 55%,#060606)' },
  newyear:      { label: "New Year's Sale",         emoji: '🎆', ribbon: 'linear-gradient(90deg,#1a2980,#26d0ce)',  page: 'linear-gradient(180deg,#f4f7ff,#eef2fb)',       poster: 'linear-gradient(135deg,#0f2027,#203a43 55%,#2c5364)' },
  valentines:   { label: "Valentine's Sale",        emoji: '❤️', ribbon: 'linear-gradient(90deg,#e0245e,#ff6b9d)',  page: 'linear-gradient(180deg,#fff5f8,#ffeef4)',       poster: 'linear-gradient(135deg,#8e0e2e,#c31432 55%,#ff5f8f)' },
  easter:       { label: 'Easter Sale',             emoji: '🐣', ribbon: 'linear-gradient(90deg,#83a4d4,#b6a3e0)',  page: 'linear-gradient(180deg,#f6fbff,#f5f0ff)',       poster: 'linear-gradient(135deg,#a1c4fd,#c2e9fb 55%,#e0c3fc)' },
  summer:       { label: 'Summer Sale',             emoji: '☀️', ribbon: 'linear-gradient(90deg,#f7971e,#ffd200)',  page: 'linear-gradient(180deg,#fffdf3,#fff7e6)',       poster: 'linear-gradient(135deg,#ff8008,#ffc837 55%,#00b4db)' },
  mothers:      { label: "Mother's Day Sale",       emoji: '🌷', ribbon: 'linear-gradient(90deg,#ff6a88,#ff99ac)',  page: 'linear-gradient(180deg,#fff5f7,#ffeef2)',       poster: 'linear-gradient(135deg,#cc2b5e,#ee4b7b 55%,#ff9a9e)' },
  fathers:      { label: "Father's Day Sale",       emoji: '👔', ribbon: 'linear-gradient(90deg,#283e51,#4b79a1)',  page: 'linear-gradient(180deg,#f4f7fa,#eef3f7)',       poster: 'linear-gradient(135deg,#1c2b3a,#283e51 55%,#4b79a1)' },
  backtoschool: { label: 'Back-to-School Sale',     emoji: '🎒', ribbon: 'linear-gradient(90deg,#f12711,#f5af19)',  page: 'linear-gradient(180deg,#fff8f2,#fff2e6)',       poster: 'linear-gradient(135deg,#c0392b,#e67e22 55%,#f5af19)' },
  independence: { label: 'Independence Day Sale',   emoji: '🇵🇭', ribbon: 'linear-gradient(90deg,#0038a8,#ce1126)',  page: 'linear-gradient(180deg,#f4f7ff,#fff3f4)',       poster: 'linear-gradient(135deg,#0038a8,#1e3c72 55%,#ce1126)' },
  halloween:    { label: 'Halloween Sale',          emoji: '🎃', ribbon: 'linear-gradient(90deg,#ff7518,#3b0a58)',  page: 'linear-gradient(180deg,#fff6ef,#f6eefb)',       poster: 'linear-gradient(135deg,#3b0a58,#7a1f9e 55%,#ff7518)' },
  christmas:    { label: 'Christmas Sale',           emoji: '🎅', ribbon: 'linear-gradient(90deg,#c0392b,#146b3a)',  page: 'linear-gradient(180deg,#f5faf6,#fdf4f4)',       poster: 'linear-gradient(135deg,#0b3d21,#146b3a 55%,#a01818)' },
  yearend:      { label: 'Year-End Clearance Sale', emoji: '🏷️', ribbon: 'linear-gradient(90deg,#232526,#414345)',  page: 'linear-gradient(180deg,#f6f7f9,#eef0f2)',       poster: 'linear-gradient(135deg,#232526,#414345 60%,#c0392b)' }
};
const THEME_ORDER = ['default', 'newyear', 'valentines', 'easter', 'summer', 'mothers', 'fathers', 'backtoschool', 'independence', 'halloween', 'christmas', 'yearend'];

// [main color, accent color] for the logo frame ring + bow topper
const THEME_FRAME = {
  default: ['#e11b22', '#ffffff'], newyear: ['#1a2980', '#26d0ce'], valentines: ['#e0245e', '#ff9dc0'],
  easter: ['#7fb2f0', '#c9a7e8'], summer: ['#ff8008', '#ffd200'], mothers: ['#cc2b5e', '#ff9a9e'],
  fathers: ['#283e51', '#4b79a1'], backtoschool: ['#c0392b', '#f5af19'], independence: ['#0038a8', '#ce1126'],
  halloween: ['#ff7518', '#1a1a1a'], christmas: ['#c0392b', '#146b3a'], yearend: ['#5a5f63', '#bdc3c7']
};

// emoji that "falls" gently in the hero (snow, petals, sparkles…)
const THEME_FALL = {
  default: '', newyear: '✨', valentines: '💖', easter: '🌸', summer: '🌴',
  mothers: '🌸', fathers: '⭐', backtoschool: '📚', independence: '⭐',
  halloween: '🦇', christmas: '❄️', yearend: '🎊'
};

// subtle decorative motifs tiled faintly across the page background
const THEME_MOTIFS = {
  default: [],
  newyear: ['🎆', '🎇', '✨', '🥂'],
  valentines: ['❤️', '💕', '🌹', '💖'],
  easter: ['🐣', '🥚', '🐰', '🌷'],
  summer: ['☀️', '🏖️', '🌴', '🍹'],
  mothers: ['🌷', '💐', '💗', '🌸'],
  fathers: ['👔', '🧢', '⚙️', '🍺'],
  backtoschool: ['🎒', '📚', '✏️', '🍎'],
  independence: ['🇵🇭', '⭐', '🎉', '🎏'],
  halloween: ['🎃', '👻', '🦇', '🕸️'],
  christmas: ['🎄', '❄️', '🦌', '🎁', '⛄'],
  yearend: ['🏷️', '🎊', '💰', '📦']
};
