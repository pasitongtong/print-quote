/*!
 * 인쇄물 셀프 견적 위젯
 * 사용법:
 *   <div id="print-quote" data-sheet="구글시트_CSV_주소" data-mode="customer"></div>
 *   <script src="print-quote.js"></script>
 * data-mode: customer(고객용, 기본) | admin(관리자용: 단가 계산식·로스지 표시)
 * data-sheet 가 없거나 불러오지 못하면 아래 기본 단가로 계산합니다.
 */
(function () {
'use strict';

/* ================= 기본 단가 (구글 시트를 못 읽을 때 사용) ================= */
var DEFAULTS = {
  sheets: { general: { name: '일반 용지', w: 325, h: 460 }, sticker: { name: '스티커 용지', w: 330, h: 535 } },
  margin: 5, bleed: 2, stickerGap: 3, lossRate: 2, lossMin: 2,
  setupFee: 3000, cutFee: 2000, minOrder: 10000, vat: 10, maxQty: 1000,
  papers: [
    { id: 'mojo100', name: '모조 100g', sheet: 'general', price: 60, thick: 0.11 },
    { id: 'art150', name: '아트 150g', sheet: 'general', price: 90, thick: 0.13 },
    { id: 'snow200', name: '스노우 200g', sheet: 'general', price: 110, thick: 0.2 },
    { id: 'snow250', name: '스노우 250g', sheet: 'general', price: 130, thick: 0.26 },
    { id: 'snow300', name: '스노우 300g', sheet: 'general', price: 160, thick: 0.32 },
    { id: 'montblanc210', name: '몽블랑 210g', sheet: 'general', price: 200, thick: 0.27, imported: true },
    { id: 'rendezvous240', name: '랑데뷰 240g', sheet: 'general', price: 220, thick: 0.3, imported: true },
    { id: 'stkArt', name: '아트지 스티커', sheet: 'sticker', price: 250, thick: 0.15 },
    { id: 'stkYupo', name: '유포지 스티커', sheet: 'sticker', price: 400, thick: 0.15 },
    { id: 'stkClear', name: '투명 PET 스티커', sheet: 'sticker', price: 600, thick: 0.15 }
  ],
  printTiers: { upTo: [49, 199, 499, 999999], color: [600, 450, 350, 280], mono: [150, 120, 100, 80], sticker: [700, 550, 450, 380] },
  finishing: {
    coat1: { name: '코팅 (단면)', base: 0, sheet: 150, piece: 0 },
    coat2: { name: '코팅 (양면)', base: 0, sheet: 250, piece: 0 },
    round: { name: '귀도리', base: 3000, sheet: 0, piece: 5 },
    score: { name: '오시', base: 3000, sheet: 0, piece: 20 },
    fold: { name: '접지 (1회당)', base: 3000, sheet: 0, piece: 15 },
    perf: { name: '미싱 (절취선)', base: 5000, sheet: 0, piece: 10 },
    number: { name: '넘버링', base: 5000, sheet: 0, piece: 10 },
    stkCoat: { name: '스티커 라미네이팅', base: 0, sheet: 200, piece: 0 },
    fullCut: { name: '완칼 (모양 따기)', base: 5000, sheet: 500, piece: 0 },
    kissCut: { name: '반칼 (시트 칼선)', base: 5000, sheet: 300, piece: 0 }
  },
  binding: { saddle: { name: '중철', base: 5000, perBook: 300 }, perfect: { name: '무선', base: 10000, perBook: 1500 } },
  envelopes: [
    { id: 'env105', name: '소봉투 105×220', w: 105, h: 220, price: 80 },
    { id: 'env100', name: '소봉투 100×200', w: 100, h: 200, price: 70 }
  ],
  envPrint: { color: 150, mono: 60, plate: 5000 },
  // 상품별 최소 주문 수량 (명함은 수입지일 때 namecardImport)
  minQty: { sticker: 50, namecard: 90, namecardImport: 45, flyer: 10, brochure: 10, coupon: 50, postcard: 10, invite: 10, booklet: 2, envelope: 10, digital: 1 },
  // 원지보다 큰 디지털 출력 (장당 가격, 당일 출고 불가)
  large: [{ id: 'A2', name: 'A2 420×594', w: 420, h: 594, color: 5000, mono: 2000 }],
  // 실사출력: ㎡당 단가 · 장당 최소 면적(㎡) · 최소 수량
  wide: {
    banner: { name: '현수막', price: 8000, minArea: 1, minQty: 1 },
    petbanner: { name: '패트배너', price: 15000, minArea: 1, minQty: 1 },
    yupoSticker: { name: '유포지 스티커', price: 15000, minArea: 0.5, minQty: 1 },
    calSticker: { name: '캘지 스티커', price: 18000, minArea: 0.5, minQty: 1 },
    yupoFomex: { name: '유포+포맥스 합지', price: 35000, minArea: 0.5, minQty: 1 },
    yupoFoam: { name: '유포+폼보드 합지', price: 30000, minArea: 0.5, minQty: 1 },
    silsa: { name: '실사출력', price: 12000, minArea: 0.5, minQty: 1 }
  },
  // 실사 옵션: ㎡당 추가 · 개당 추가
  wideOpts: {
    none: { name: '없음', area: 0, piece: 0 },
    heat: { name: '열재단', area: 0, piece: 0 },
    eyelet: { name: '아일렛(타공)', area: 0, piece: 2000 },
    wood: { name: '각목+끈', area: 0, piece: 5000 },
    standIn: { name: '실내용 거치대', area: 0, piece: 15000 },
    standOut: { name: '실외용 거치대', area: 0, piece: 25000 },
    lamiGloss: { name: '유광 코팅', area: 5000, piece: 0 },
    lamiMatt: { name: '무광 코팅', area: 5000, piece: 0 },
    fomex3: { name: '포맥스 3mm', area: 0, piece: 0 },
    fomex5: { name: '포맥스 5mm', area: 5000, piece: 0 }
  },
  wideMaxQty: 100
};

var GROUPS = [['print', '인쇄물'], ['wide', '실사출력']];
var MIN_NAMES = [['sticker', '스티커'], ['namecard', '명함 (스노우·아트 등)'], ['namecardImport', '명함 (수입지)'], ['flyer', '전단'], ['brochure', '브로슈어'],
  ['coupon', '쿠폰'], ['postcard', '엽서'], ['invite', '초청장'], ['booklet', '책자 (권)'], ['envelope', '봉투'], ['digital', '디지털 출력']];

var PRODUCTS = {
  digital: { name: '디지털 출력', unit: '매', qty: 50, paper: 'mojo100', sides: 1, coat: true, fold: false, fins: [],
    sizes: [['A4 210×297', 210, 297], ['A3 297×420', 297, 420], ['B5 182×257', 182, 257], ['A5 148×210', 148, 210], ['B4 257×364', 257, 364]] },
  namecard: { name: '명함', unit: '매', qty: 200, paper: 'snow250', sides: 2, coat: true, fold: false, fins: ['round'],
    sizes: [['일반 90×50', 90, 50], ['86×52', 86, 52], ['90×55', 90, 55]] },
  sticker: { name: '스티커', kind: 'sticker', unit: '매', qty: 500, paper: 'stkArt', sides: 1, coat: false, fold: false, fins: ['stkCoat'],
    sizes: [['원형 Ø50', 50, 50], ['원형 Ø30', 30, 30], ['사각 60×40', 60, 40], ['사각 90×50', 90, 50], ['A4 통판 210×297', 210, 297]] },
  flyer: { name: '전단', unit: '매', qty: 500, paper: 'art150', sides: 1, coat: true, fold: true, fins: [],
    sizes: [['A4 210×297', 210, 297], ['A5 148×210', 148, 210], ['B5 182×257', 182, 257], ['A3 297×420', 297, 420]] },
  brochure: { name: '브로슈어', unit: '매', qty: 300, paper: 'art150', sides: 2, coat: true, fold: true, fins: ['score'], note: '규격은 펼친 크기 기준입니다.',
    sizes: [['A4 3단 접지 · 펼침 297×210', 297, 210, 2], ['A4 2단 접지 · 펼침 420×297', 420, 297, 1], ['A5 2단 접지 · 펼침 297×210', 297, 210, 1]] },
  envelope: { name: '봉투', kind: 'envelope', unit: '매', qty: 500 },
  coupon: { name: '쿠폰', unit: '매', qty: 500, paper: 'snow250', sides: 2, coat: true, fold: false, fins: ['perf', 'number', 'round'],
    sizes: [['180×60', 180, 60], ['150×60', 150, 60], ['200×70', 200, 70], ['90×50', 90, 50]] },
  postcard: { name: '엽서', unit: '매', qty: 200, paper: 'snow300', sides: 2, coat: true, fold: false, fins: ['round'],
    sizes: [['A6 105×148', 105, 148], ['100×148', 100, 148], ['150×100', 150, 100], ['120×170', 120, 170]] },
  invite: { name: '초청장', unit: '매', qty: 100, paper: 'rendezvous240', sides: 2, coat: false, fold: true, fins: ['score'], note: '접지형은 펼친 크기 기준입니다.',
    sizes: [['2단 접지 · 펼침 200×140', 200, 140, 1], ['2단 접지 · 펼침 210×148', 210, 148, 1], ['카드형 150×100', 150, 100, 0]] },
  banner: { name: '현수막', kind: 'wide', group: 'wide', unit: '장', qty: 1, note: '가로×세로 실제 크기',
    sizes: [['5000×900 (가장 많이 쓰는 크기)', 5000, 900], ['3000×900', 3000, 900], ['4000×900', 4000, 900], ['6000×900', 6000, 900], ['1800×900', 1800, 900]],
    groups: [{ id: 'finish', label: '마감', opts: ['heat', 'eyelet', 'wood'] }] },
  petbanner: { name: '패트배너', kind: 'wide', group: 'wide', unit: '장', qty: 1,
    sizes: [['600×1800 (표준)', 600, 1800], ['500×1800', 500, 1800]],
    groups: [{ id: 'stand', label: '거치대', opts: ['none', 'standIn', 'standOut'] }] },
  yupoSticker: { name: '유포지 스티커', kind: 'wide', group: 'wide', unit: '장', qty: 1, sizes: [['A2 420×594', 420, 594], ['A1 594×841', 594, 841], ['A0 841×1189', 841, 1189], ['1000×1000', 1000, 1000]],
    groups: [{ id: 'lami', label: '코팅', opts: ['none', 'lamiGloss', 'lamiMatt'] }] },
  calSticker: { name: '캘지 스티커', kind: 'wide', group: 'wide', unit: '장', qty: 1, sizes: [['A2 420×594', 420, 594], ['A1 594×841', 594, 841], ['A0 841×1189', 841, 1189], ['1000×1000', 1000, 1000]],
    groups: [{ id: 'lami', label: '코팅', opts: ['none', 'lamiGloss', 'lamiMatt'] }] },
  yupoFomex: { name: '유포+포맥스 합지', kind: 'wide', group: 'wide', unit: '장', qty: 1,
    sizes: [['A2 420×594', 420, 594], ['A1 594×841', 594, 841], ['A0 841×1189', 841, 1189], ['900×1800', 900, 1800]],
    groups: [{ id: 'thick', label: '두께', opts: ['fomex3', 'fomex5'] }, { id: 'lami', label: '코팅', opts: ['none', 'lamiGloss', 'lamiMatt'] }] },
  yupoFoam: { name: '유포+폼보드 합지', kind: 'wide', group: 'wide', unit: '장', qty: 1,
    sizes: [['A2 420×594', 420, 594], ['A1 594×841', 594, 841], ['A0 841×1189', 841, 1189], ['900×1800', 900, 1800]],
    groups: [{ id: 'lami', label: '코팅', opts: ['none', 'lamiGloss', 'lamiMatt'] }] },
  silsa: { name: '실사출력', kind: 'wide', group: 'wide', unit: '장', qty: 1, sizes: [['A2 420×594', 420, 594], ['A1 594×841', 594, 841], ['A0 841×1189', 841, 1189], ['1000×1000', 1000, 1000]],
    groups: [{ id: 'lami', label: '코팅', opts: ['none', 'lamiGloss', 'lamiMatt'] }] },
  booklet: { name: '책자', kind: 'booklet', unit: '권', qty: 50, paper: 'mojo100', coverPaper: 'snow250',
    sizes: [['A5 148×210', 148, 210], ['A4 210×297', 210, 297], ['B5 182×257', 182, 257]] }
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* ================= 구글 시트 ↔ 설정 ================= */
var BASIC = [
  ['margin', '용지 여백 (mm)', '장비가 물고 들어가 인쇄되지 않는 가장자리 폭'],
  ['bleed', '도련 (mm)', '재단 여백. 사방에 더해 판걸이를 계산'],
  ['stickerGap', '스티커 칼선 간격 (mm)', '스티커끼리 띄우는 간격'],
  ['lossRate', '로스율 (%)', '출력 장수에 더하는 여분 비율'],
  ['lossMin', '최소 로스 (장)', '로스지 최소 장수'],
  ['setupFee', '작업 기본료 (원)', '건당'],
  ['cutFee', '재단비 (원)', '건당'],
  ['minOrder', '최소 주문금액 (원)', '이보다 적으면 이 금액으로 계산'],
  ['vat', '부가세 (%)', ''],
  ['maxQty', '고객 선택 최대 수량', '수량 목록은 최소 수량의 배수로, 이 수량에 가장 가까운 배수까지 나옴'],
  ['wideMaxQty', '실사출력 최대 수량', '실사출력 코너 수량 목록의 끝']
];

// 구글 시트 단가표 행: [분류, 코드, 이름, 값1, 값2, 값3, 값4, 설명]
function sheetRows(cfg) {
  var r = [['분류', '코드', '이름', '값1', '값2', '값3', '값4', '설명']];
  BASIC.forEach(function (b) { r.push(['기본', b[0], b[1], cfg[b[0]], '', '', '', b[2]]); });
  ['general', 'sticker'].forEach(function (k) { var s = cfg.sheets[k]; r.push(['원지', k, s.name, s.w, s.h, '', '', '값1 가로(mm) · 값2 세로(mm)']); });
  cfg.papers.forEach(function (p) { r.push(['용지', p.id, p.name, p.sheet === 'sticker' ? '스티커' : '일반', p.price, p.thick, p.imported ? '수입' : '', '값1 원지(일반/스티커) · 값2 장당 단가 · 값3 두께(mm) · 값4 수입지면 "수입"']); });
  var u = cfg.printTiers.upTo.map(function (x, i, a) { return i === a.length - 1 ? '이상' : x; });
  r.push(['인쇄구간', 'upTo', '구간 끝 장수', u[0], u[1], u[2], u[3], '출력 장수 구간. 마지막 칸은 "이상"']);
  [['color', '컬러'], ['mono', '흑백'], ['sticker', '스티커 (컬러)']].forEach(function (k) {
    var t = cfg.printTiers[k[0]]; r.push(['인쇄', k[0], k[1], t[0], t[1], t[2], t[3], '원지 1장 1면당 단가 (구간별)']);
  });
  Object.keys(cfg.finishing).forEach(function (k) { var f = cfg.finishing[k]; r.push(['후가공', k, f.name, f.base, f.sheet, f.piece, '', '값1 기본료 · 값2 장당 · 값3 개당']); });
  Object.keys(cfg.binding).forEach(function (k) { var b = cfg.binding[k]; r.push(['제본', k, b.name, b.base, b.perBook, '', '', '값1 기본료 · 값2 권당']); });
  cfg.envelopes.forEach(function (e) { r.push(['봉투', e.id, e.name, e.w, e.h, e.price, '', '값1 가로 · 값2 세로 · 값3 매당 봉투값']); });
  [['color', '컬러 인쇄', '매당'], ['mono', '흑백 인쇄', '매당'], ['plate', '판비', '건당']].forEach(function (k) {
    r.push(['봉투인쇄', k[0], k[1], cfg.envPrint[k[0]], '', '', '', k[2]]);
  });
  cfg.large.forEach(function (l) { r.push(['대형출력', l.id, l.name, l.w, l.h, l.color, l.mono, '디지털 출력 큰 사이즈 · 값1 가로 · 값2 세로 · 값3 컬러 장당 · 값4 흑백 장당 (당일 출고 불가)']); });
  Object.keys(cfg.wide).forEach(function (k) { var w = cfg.wide[k]; r.push(['실사', k, w.name, w.price, w.minArea, w.minQty, '', '값1 ㎡당 단가 · 값2 장당 최소 면적(㎡, 이보다 작아도 이 면적으로 계산) · 값3 최소 수량']); });
  Object.keys(cfg.wideOpts).forEach(function (k) { var o = cfg.wideOpts[k]; r.push(['실사옵션', k, o.name, o.area, o.piece, '', '', '값1 ㎡당 추가 · 값2 장당 추가']); });
  MIN_NAMES.forEach(function (m) { r.push(['최소수량', m[0], m[1], cfg.minQty[m[0]], '', '', '', '이 수량보다 적으면 주문할 수 없음']); });
  return r;
}

function parseCSV(text) {
  var rows = [], row = [], cell = '', q = false;
  text = String(text).replace(/^﻿/, '');
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function num(v) {
  var n = Number(String(v == null ? '' : v).replace(/[,\s원]/g, ''));
  return isFinite(n) && String(v).trim() !== '' ? n : NaN;
}

// 시트 행 → 설정. 빠지거나 잘못된 값은 기본값을 그대로 둡니다.
function cfgFromRows(rows) {
  var cfg = clone(DEFAULTS), papers = [], envs = [], larges = [], warn = [];
  rows.forEach(function (r, idx) {
    var cat = (r[0] || '').trim(), code = (r[1] || '').trim(), name = (r[2] || '').trim();
    var v = [r[3], r[4], r[5], r[6]];
    if (!cat || cat === '분류' || cat.charAt(0) === '#') return;
    var line = (idx + 1) + '행';
    function need(n, label) { if (isNaN(n)) { warn.push(line + ' ' + (label || name || code) + ': 숫자가 아닙니다'); return false; } return true; }
    if (cat === '기본') { var n = num(v[0]); if (code in DEFAULTS && need(n)) cfg[code] = n; }
    else if (cat === '원지') { var s = cfg.sheets[code]; if (s) { var w = num(v[0]), h = num(v[1]); if (need(w) && need(h)) { s.w = w; s.h = h; } if (name) s.name = name; } }
    else if (cat === '용지') { var pr = num(v[1]), th = num(v[2]); if (code && need(pr)) papers.push({ id: code, name: name || code, sheet: String(v[0]).trim() === '스티커' ? 'sticker' : 'general', price: pr, thick: isNaN(th) ? 0.15 : th, imported: String(v[3] || '').trim() === '수입' }); }
    else if (cat === '인쇄구간') { var u = v.map(function (x) { var k = num(x); return isNaN(k) ? 999999 : k; }); u[3] = 999999; cfg.printTiers.upTo = u; }
    else if (cat === '인쇄') { if (cfg.printTiers[code]) { var t = v.map(num); if (t.every(function (x, i) { return need(x, name + ' ' + (i + 1) + '구간'); })) cfg.printTiers[code] = t; } }
    else if (cat === '후가공') { var f = cfg.finishing[code]; if (f) { var a = v.slice(0, 3).map(function (x) { var k = num(x); return isNaN(k) ? 0 : k; }); f.base = a[0]; f.sheet = a[1]; f.piece = a[2]; if (name) f.name = name; } }
    else if (cat === '제본') { var b = cfg.binding[code]; if (b) { var bb = num(v[0]), pb = num(v[1]); if (need(bb) && need(pb)) { b.base = bb; b.perBook = pb; } if (name) b.name = name; } }
    else if (cat === '봉투') { var ew = num(v[0]), eh = num(v[1]), ep = num(v[2]); if (need(ew) && need(eh) && need(ep)) envs.push({ id: code || 'env' + idx, name: name || code, w: ew, h: eh, price: ep }); }
    else if (cat === '봉투인쇄') { var e = num(v[0]); if (code in cfg.envPrint && need(e)) cfg.envPrint[code] = e; }
    else if (cat === '실사') { var wd = cfg.wide[code]; if (wd) { var wp = num(v[0]), wa = num(v[1]), wq = num(v[2]); if (need(wp)) wd.price = wp; if (!isNaN(wa)) wd.minArea = wa; if (!isNaN(wq)) wd.minQty = Math.max(1, wq); if (name) wd.name = name; } }
    else if (cat === '실사옵션') { var wo = cfg.wideOpts[code]; if (wo) { var oa = num(v[0]), op = num(v[1]); wo.area = isNaN(oa) ? 0 : oa; wo.piece = isNaN(op) ? 0 : op; if (name) wo.name = name; } }
    else if (cat === '최소수량') { var mq = num(v[0]); if (code in DEFAULTS.minQty && need(mq)) cfg.minQty[code] = Math.max(1, mq); }
    else if (cat === '대형출력') { var lw = num(v[0]), lh = num(v[1]), lc = num(v[2]), lm = num(v[3]); if (need(lw) && need(lh) && need(lc)) larges.push({ id: code || 'L' + idx, name: name || code, w: lw, h: lh, color: lc, mono: isNaN(lm) ? lc : lm }); }
  });
  if (papers.length) cfg.papers = papers;
  if (envs.length) cfg.envelopes = envs;
  if (larges.length) cfg.large = larges;
  return { cfg: cfg, warn: warn };
}

/* ================= 계산 ================= */
function fit(W, H, w, h) {
  var a = { n: Math.floor(W / w) * Math.floor(H / h), cols: Math.floor(W / w), rows: Math.floor(H / h), pw: w, ph: h };
  var b = { n: Math.floor(W / h) * Math.floor(H / w), cols: Math.floor(W / h), rows: Math.floor(H / w), pw: h, ph: w };
  return b.n > a.n ? b : a;
}
function fmt(n) { return Math.round(n).toLocaleString('ko-KR'); }
function colorName(c) { return c === 'mono' ? '흑백' : '컬러'; }

function makeCalc(cfg) {
  function lossOf(base) { return Math.max(cfg.lossMin, Math.ceil(base * cfg.lossRate / 100)); }
  function tierPrice(kind, sheets) {
    var t = cfg.printTiers, i = t.upTo.findIndex(function (u) { return sheets <= u; });
    if (i < 0) i = t.upTo.length - 1;
    return t[kind][i] || 0;
  }
  function papersFor(sheet) { return cfg.papers.filter(function (p) { return p.sheet === sheet; }); }
  function paperById(id, sheet) { return cfg.papers.find(function (p) { return p.id === id && p.sheet === sheet; }) || papersFor(sheet)[0]; }
  function finLine(key, qty, sheets, label) {
    var f = cfg.finishing[key]; if (!f) return null;
    var parts = [];
    if (f.base) parts.push('기본 ' + fmt(f.base));
    if (f.sheet) parts.push(fmt(sheets) + '장 × ' + fmt(f.sheet));
    if (f.piece) parts.push(fmt(qty) + '개 × ' + fmt(f.piece));
    return [label || f.name, parts.join(' + '), f.base + f.sheet * sheets + f.piece * qty];
  }
  function finish(lines, extra) {
    lines = lines.filter(Boolean);
    var sub = lines.reduce(function (s, l) { return s + l[2]; }, 0);
    if (sub < cfg.minOrder) { lines.push(['최소 주문금액 보정', '최소 ' + fmt(cfg.minOrder) + '원', cfg.minOrder - sub]); sub = cfg.minOrder; }
    sub = Math.ceil(sub / 100) * 100;
    var vat = Math.round(sub * cfg.vat / 100);
    var r = { ok: true, lines: lines, sub: sub, vat: vat, total: sub + vat };
    for (var k in extra) r[k] = extra[k];
    return r;
  }
  function fail(msg) { return { ok: false, msg: msg }; }

  // 규격 목록 (디지털 출력은 원지보다 큰 사이즈를 뒤에 붙임)
  function sizesOf(p) {
    var s = p.sizes || [];
    if (p === PRODUCTS.digital) s = s.concat(cfg.large.map(function (l) { return [l.name + ' (당일 출고 불가)', l.w, l.h, undefined, l.id]; }));
    return s;
  }
  function largeOf(S) {
    if (S.product !== 'digital') return null;
    return cfg.large.find(function (l) { return (l.w === S.w && l.h === S.h) || (l.w === S.h && l.h === S.w); }) || null;
  }
  function qtyOptions(S) {
    var mx = PRODUCTS[S.product].kind === 'wide' ? cfg.wideMaxQty : cfg.maxQty;
    var mn = minOf(S), n = Math.max(1, Math.round(mx / mn)), out = [];
    for (var i = 1; i <= n; i++) out.push(mn * i);
    return out;
  }
  function minOf(S) {
    if (PRODUCTS[S.product].kind === 'wide') return (cfg.wide[S.product] || {}).minQty || 1;
    if (S.product === 'namecard') { var pp = paperById(S.paper, 'general'); return pp && pp.imported ? cfg.minQty.namecardImport : cfg.minQty.namecard; }
    return cfg.minQty[S.product] || 1;
  }

  function calcWide(p, S) {
    var d = cfg.wide[S.product];
    if (!(S.w > 0 && S.h > 0)) return fail('가로·세로 크기를 입력하세요.');
    if (!(S.qty > 0)) return fail('수량을 1 이상으로 입력하세요.');
    var real = S.w * S.h / 1e6, area = Math.max(real, d.minArea), r2 = function (x) { return Math.round(x * 100) / 100; };
    var lines = [[d.name, r2(area) + '㎡ × ' + fmt(S.qty) + '장 × ' + fmt(d.price) + (real < d.minArea ? ' (최소 ' + d.minArea + '㎡ 적용)' : ''), area * S.qty * d.price]];
    var opts = [S.w + '×' + S.h + 'mm'];
    (p.groups || []).forEach(function (g) {
      var o = cfg.wideOpts[S.wopt[g.id]]; if (!o) return;
      if (S.wopt[g.id] !== 'none') opts.push(o.name);
      var amt = o.area * area * S.qty + o.piece * S.qty;
      if (amt) lines.push([g.label + ': ' + o.name, (o.area ? r2(area * S.qty) + '㎡ × ' + fmt(o.area) : '') + (o.area && o.piece ? ' + ' : '') + (o.piece ? fmt(S.qty) + '장 × ' + fmt(o.piece) : ''), amt]);
    });
    return finish(lines, { stats: [['장당 면적', r2(real) + '㎡'], ['계산 면적', r2(area * S.qty) + '㎡']], adminStats: [['㎡당 단가', fmt(d.price) + '원']],
      cap: '면적(㎡) 기준 계산 · 장당 최소 ' + d.minArea + '㎡', warn: '실사출력은 당일 출고가 안 됩니다. 출고일은 상담 후 안내해 드립니다.', spec: d.name + ' ' + S.w + '×' + S.h + 'mm · ' + fmt(S.qty) + p.unit,
      opts: opts, perLabel: p.unit + '당', qty: S.qty });
  }

  function calcLarge(p, S, l) {
    if (!(S.qty > 0)) return fail('수량을 1 이상으로 입력하세요.');
    var unit = S.color === 'mono' ? l.mono : l.color;
    return finish([
      [l.name + ' 출력', colorName(S.color) + ' ' + fmt(S.qty) + '장 × ' + fmt(unit), S.qty * unit],
      ['작업 기본료', '', cfg.setupFee]
    ], { stats: [['출력', fmt(S.qty) + '장']], adminStats: [], cap: l.name + ' 대형 출력 (원지 판걸이 없음)',
      warn: l.name.split(' ')[0] + ' 출력은 당일 출고가 안 됩니다. 출고일은 상담 후 안내해 드립니다.',
      spec: p.name + ' ' + l.name + ' · ' + fmt(S.qty) + '장', opts: [colorName(S.color) + ' 단면'], perLabel: '장당', qty: S.qty });
  }

  function calcStd(p, S) {
    var lg = largeOf(S); if (lg) return calcLarge(p, S, lg);
    var sk = p.kind === 'sticker' ? 'sticker' : 'general', sh = cfg.sheets[sk], m = cfg.margin;
    var W = sh.w - 2 * m, H = sh.h - 2 * m, add = p.kind === 'sticker' ? cfg.stickerGap : cfg.bleed * 2;
    if (!(S.w > 0 && S.h > 0)) return fail('가로·세로 크기를 입력하세요.');
    if (!(S.qty > 0)) return fail('수량을 1 이상으로 입력하세요.');
    var f = fit(W, H, S.w + add, S.h + add);
    if (!f.n) return fail(S.w + '×' + S.h + 'mm는 인쇄 가능한 크기(' + W + '×' + H + 'mm)보다 커서 제작할 수 없습니다. 크기를 줄여 주세요.');
    var paper = paperById(S.paper, sk); if (!paper) return fail('선택할 수 있는 용지가 없습니다.');
    var base = Math.ceil(S.qty / f.n), loss = lossOf(base), sheets = base + loss;
    var sides = p.kind === 'sticker' ? 1 : S.sides, kind = p.kind === 'sticker' ? 'sticker' : S.color, unit = tierPrice(kind, sheets);
    var lines = [
      ['용지', paper.name + ' ' + fmt(sheets) + '장 × ' + fmt(paper.price), sheets * paper.price],
      ['인쇄', (sides === 2 ? '양면' : '단면') + ' ' + colorName(kind === 'sticker' ? 'color' : S.color) + ' ' + fmt(sheets) + '장 × ' + sides + '면 × ' + fmt(unit), sheets * sides * unit]
    ];
    var opts = [paper.name, p.kind === 'sticker' ? '컬러 인쇄' : (sides === 2 ? '양면' : '단면') + ' ' + colorName(S.color)];
    if (p.coat && S.coat) { lines.push(finLine(S.coat == 2 ? 'coat2' : 'coat1', S.qty, sheets)); opts.push(S.coat == 2 ? '양면 코팅' : '단면 코팅'); }
    if (p.fold && S.folds > 0) {
      var fd = cfg.finishing.fold;
      lines.push(['접지 ' + S.folds + '회', '기본 ' + fmt(fd.base) + ' + ' + fmt(S.qty) + '개 × ' + S.folds + '회 × ' + fmt(fd.piece), fd.base + fd.piece * S.qty * S.folds]);
      opts.push('접지 ' + S.folds + '회');
    }
    if (p.kind === 'sticker') {
      if (S.cut !== 'square') { lines.push(finLine(S.cut, S.qty, sheets)); opts.push(cfg.finishing[S.cut].name); } else opts.push('사각 재단');
    }
    S.fins.forEach(function (k) { if (p.fins.indexOf(k) >= 0) { lines.push(finLine(k, S.qty, sheets)); opts.push(cfg.finishing[k].name); } });
    lines.push(['재단', '', cfg.cutFee], ['작업 기본료', '', cfg.setupFee]);
    var label = sizesOf(p)[S.sizeIdx] ? sizesOf(p)[S.sizeIdx][0] : '직접 입력';
    return finish(lines, {
      imp: { sw: sh.w, sh: sh.h, m: m, f: f, inset: add / 2, circle: p.kind === 'sticker' && label.indexOf('원형') === 0 },
      stats: [['판걸이', f.n + '개'], ['출력', fmt(sheets) + '장']],
      adminStats: [['로스지 포함', fmt(loss) + '장'], ['작업 크기', (S.w + add) + '×' + (S.h + add)]],
      cap: sh.name + ' ' + sh.w + '×' + sh.h + 'mm' + (f.pw !== S.w + add ? ' · 가로로 눕혀 배치' : ''),
      spec: p.name + ' ' + S.w + '×' + S.h + 'mm · ' + fmt(S.qty) + p.unit, opts: opts, perLabel: p.unit + '당', qty: S.qty
    });
  }

  function calcEnvelope(p, S) {
    var e = cfg.envelopes[S.env]; if (!e) return fail('선택할 수 있는 봉투가 없습니다.');
    if (!(S.qty > 0)) return fail('수량을 1 이상으로 입력하세요.');
    var ep = cfg.envPrint, unit = ep[S.color];
    return finish([
      ['봉투', e.name + ' ' + fmt(S.qty) + '매 × ' + fmt(e.price), S.qty * e.price],
      ['인쇄', colorName(S.color) + ' ' + fmt(S.qty) + '매 × ' + fmt(unit), S.qty * unit],
      ['판비', '', ep.plate]
    ], { env: e, stats: [['봉투 크기', e.w + '×' + e.h], ['수량', fmt(S.qty) + '매']], adminStats: [],
      cap: '완제품 봉투에 바로 인쇄합니다.', spec: '봉투 ' + e.name + ' · ' + fmt(S.qty) + '매', opts: [colorName(S.color) + ' 인쇄'], perLabel: '매당', qty: S.qty });
  }

  function calcBooklet(p, S) {
    var sh = cfg.sheets.general, m = cfg.margin, W = sh.w - 2 * m, H = sh.h - 2 * m, b2 = cfg.bleed * 2;
    var P = S.pages, books = S.qty, perfect = S.binding === 'perfect', sep = perfect || S.sepCover;
    if (!(S.w > 0 && S.h > 0)) return fail('가로·세로 크기를 입력하세요.');
    if (!(books > 0)) return fail('권수를 1 이상으로 입력하세요.');
    if (!(P >= 8)) return fail('쪽수는 8쪽 이상으로 입력하세요.');
    if (!perfect && P % 4) return fail('중철 제본은 쪽수가 4의 배수여야 합니다. ' + P + '쪽 대신 ' + Math.ceil(P / 4) * 4 + '쪽으로 맞춰 주세요.');
    if (perfect && P % 2) return fail('무선 제본은 쪽수가 짝수여야 합니다.');
    var inner = paperById(S.paper, 'general'), cover = sep ? paperById(S.coverPaper, 'general') : inner;
    var innerP = sep ? P - 4 : P;
    var fi = fit(W, H, 2 * S.w + b2, S.h + b2);
    if (!fi.n) return fail('펼친 크기 ' + (2 * S.w) + '×' + S.h + 'mm는 제작할 수 없는 크기입니다.');
    var perSheet = fi.n * 4;
    var iBase = Math.ceil(books * innerP / perSheet), iSheets = iBase + lossOf(iBase);
    var cSheets = 0, spine = 0;
    if (sep) {
      spine = perfect ? Math.round(innerP / 2 * inner.thick * 10) / 10 : 0;
      var fc = fit(W, H, 2 * S.w + spine + b2, S.h + b2);
      if (!fc.n) return fail('표지 펼침(책등 ' + spine + 'mm 포함)이 용지보다 큽니다.');
      var cBase = Math.ceil(books / fc.n); cSheets = cBase + lossOf(cBase);
    }
    var total = iSheets + cSheets, iu = tierPrice(S.color, total), cu = tierPrice('color', total);
    var lines = [
      ['내지 용지', inner.name + ' ' + fmt(iSheets) + '장 × ' + fmt(inner.price), iSheets * inner.price],
      ['내지 인쇄', '양면 ' + colorName(S.color) + ' ' + fmt(iSheets) + '장 × 2면 × ' + fmt(iu), iSheets * 2 * iu]
    ];
    if (sep) {
      lines.push(['표지 용지', cover.name + ' ' + fmt(cSheets) + '장 × ' + fmt(cover.price), cSheets * cover.price]);
      lines.push(['표지 인쇄', (S.coverSides === 2 ? '양면' : '단면') + ' 컬러 ' + fmt(cSheets) + '장 × ' + S.coverSides + '면 × ' + fmt(cu), cSheets * S.coverSides * cu]);
      if (S.coat) { var ck = S.coat == 2 ? 'coat2' : 'coat1'; lines.push(finLine(ck, books, cSheets, '표지 ' + cfg.finishing[ck].name)); }
    }
    var bd = cfg.binding[S.binding];
    lines.push([bd.name + ' 제본', '기본 ' + fmt(bd.base) + ' + ' + fmt(books) + '권 × ' + fmt(bd.perBook), bd.base + bd.perBook * books]);
    lines.push(['재단', '', cfg.cutFee], ['작업 기본료', '', cfg.setupFee]);
    var stats = [['1장당 쪽수', perSheet + '쪽'], ['내지 출력', fmt(iSheets) + '장']];
    if (sep) stats.push(['표지 출력', fmt(cSheets) + '장']);
    if (perfect) stats.push(['책등 두께', '약 ' + spine + 'mm']);
    var warn = perfect && P < 40 ? '무선 제본은 보통 40쪽 이상에서 권장합니다.' : (!perfect && P > 64 ? '중철 제본은 64쪽을 넘으면 접힘이 벌어질 수 있습니다.' : '');
    return finish(lines, {
      imp: { sw: sh.w, sh: sh.h, m: m, f: fi, inset: cfg.bleed, spread: true }, stats: stats, adminStats: [], warn: warn,
      cap: '내지 펼침 ' + (2 * S.w) + '×' + S.h + 'mm 배치', spec: '책자 ' + S.w + '×' + S.h + 'mm · ' + P + '쪽 · ' + fmt(books) + '권',
      opts: ['내지 ' + inner.name + ' ' + colorName(S.color), sep ? '표지 ' + cover.name : '표지 내지와 동일', bd.name + ' 제본'], perLabel: '권당', qty: books
    });
  }

  return {
    papersFor: papersFor, sizesOf: sizesOf, largeOf: largeOf, minOf: minOf, qtyOptions: qtyOptions,
    run: function (S) {
      var p = PRODUCTS[S.product], mn = minOf(S);
      if (S.qty > 0 && S.qty < mn) return fail('최소 주문 수량은 ' + fmt(mn) + p.unit + '입니다. 수량을 ' + fmt(mn) + p.unit + ' 이상으로 골라 주세요.');
      if (S.qty > 0 && S.qty % mn) return fail('수량은 ' + fmt(mn) + p.unit + ' 단위로 주문할 수 있습니다. ' + fmt(Math.floor(S.qty / mn) * mn || mn) + p.unit + ' 또는 ' + fmt(Math.ceil(S.qty / mn) * mn) + p.unit + '로 골라 주세요.');
      if (p.kind === 'wide') return calcWide(p, S);
      if (p.kind === 'envelope') return calcEnvelope(p, S);
      if (p.kind === 'booklet') return calcBooklet(p, S);
      return calcStd(p, S);
    }
  };
}

function newState(key) {
  var p = PRODUCTS[key];
  var S = { product: key, sizeIdx: 0, qty: p.qty, paper: p.paper, sides: p.sides || 1, color: 'color', coat: 0,
    folds: (p.sizes && p.sizes[0][3]) || 0, fins: [], cut: 'fullCut', env: 0,
    pages: 16, binding: 'saddle', coverPaper: p.coverPaper, sepCover: true, coverSides: 2 };
  if (p.sizes) { S.w = p.sizes[0][1]; S.h = p.sizes[0][2]; }
  if (key === 'namecard' || key === 'postcard') S.coat = 1;
  if (p.kind === 'wide') { S.wopt = {}; p.groups.forEach(function (g) { S.wopt[g.id] = g.opts[0]; }); }
  return S;
}

/* ================= Node 테스트용 내보내기 ================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULTS: DEFAULTS, PRODUCTS: PRODUCTS, sheetRows: sheetRows, parseCSV: parseCSV, cfgFromRows: cfgFromRows, makeCalc: makeCalc, newState: newState };
  return;
}

/* ================= 화면 ================= */
var CSS = [
'.pq{--pq-bg:#f3f5f1;--pq-surface:#fff;--pq-field:#f7f8f5;--pq-ink:#18212b;--pq-muted:#5b6670;--pq-line:#d7dcd4;--pq-accent:#0a6f9b;--pq-soft:#e1eef4;--pq-mag:#c0266d;--pq-warn:#8a5200;--pq-warn-soft:#fbefd9;',
' font-family:"Pretendard","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;font-size:15px;line-height:1.55;color:var(--pq-ink);background:var(--pq-bg);padding:20px;border-radius:12px;box-sizing:border-box;text-align:left}',
'.pq *,.pq *::before,.pq *::after{box-sizing:border-box}',
'.pq h2,.pq p,.pq dl,.pq dd,.pq table{margin:0}',
'.pq [hidden]{display:none!important}',
'.pq-notice{background:var(--pq-warn-soft);color:var(--pq-warn);border-radius:8px;padding:10px 14px;font-size:14px;margin-bottom:14px}',
'.pq-products{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}',
'.pq-pgroup{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
'.pq-plabel{font-size:12px;font-weight:700;color:var(--pq-muted);min-width:64px}',
'.pq-products button{font:inherit;font-size:14px;font-weight:500;border:1px solid var(--pq-line);background:var(--pq-surface);color:var(--pq-ink);padding:7px 14px;border-radius:999px;cursor:pointer;line-height:1.3;margin:0}',
'.pq-products button:hover{border-color:var(--pq-accent)}',
'.pq-products button[aria-pressed="true"]{background:var(--pq-accent);border-color:var(--pq-accent);color:#fff}',
'.pq-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;align-items:start}',
'@media (max-width:860px){.pq-grid{grid-template-columns:minmax(0,1fr)}}',
'.pq-panel{background:var(--pq-surface);border:1px solid var(--pq-line);border-radius:10px;padding:18px;min-width:0}',
'.pq-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}',
'@media (max-width:540px){.pq{padding:14px}.pq-fields{grid-template-columns:minmax(0,1fr)}}',
'.pq-full{grid-column:1/-1}',
'.pq-field{display:flex;flex-direction:column;gap:6px;min-width:0}',
'.pq-lbl{font-size:13px;font-weight:600;color:var(--pq-muted)}',
'.pq-field small{font-size:12.5px;color:var(--pq-muted)}',
'.pq input[type=number],.pq select{font:inherit;font-size:15px;color:var(--pq-ink);background:var(--pq-field);border:1px solid var(--pq-line);border-radius:6px;padding:7px 10px;width:100%;min-width:0;height:auto;margin:0;box-shadow:none}',
'.pq input[type=number]{font-variant-numeric:tabular-nums}',
'.pq input:disabled,.pq select:disabled{opacity:.5}',
'.pq input:focus-visible,.pq select:focus-visible,.pq button:focus-visible,.pq-seg input:focus-visible+span{outline:2px solid var(--pq-accent);outline-offset:2px}',
'.pq-pair{display:flex;align-items:center;gap:8px}',
'.pq-pair span{color:var(--pq-muted)}',
'.pq-seg{display:flex;flex-wrap:wrap;gap:6px}',
'.pq-seg label{position:relative;cursor:pointer;margin:0}',
'.pq-seg input{position:absolute;opacity:0;width:1px;height:1px;margin:0}',
'.pq-seg span{display:inline-block;padding:6px 14px;border:1px solid var(--pq-line);border-radius:6px;background:var(--pq-field);font-size:14px}',
'.pq-seg input:checked+span{border-color:var(--pq-accent);background:var(--pq-soft);font-weight:600}',
'.pq-checks{display:flex;flex-wrap:wrap;gap:8px 18px}',
'.pq-checks label{display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;margin:0}',
'.pq-checks input{accent-color:var(--pq-accent);width:16px;height:16px;margin:0}',
'.pq-qty{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
'.pq .pq-qty select{width:auto;min-width:140px;flex:0 0 auto}',
'.pq-qty button{font:inherit;font-size:14px;border:1px solid var(--pq-line);background:var(--pq-field);color:var(--pq-ink);border-radius:6px;padding:6px 12px;cursor:pointer;margin:0;line-height:1.3}',
'.pq-qty button[aria-pressed="true"]{border-color:var(--pq-accent);background:var(--pq-soft);font-weight:600}',
'.pq .pq-qty input[type=number]{width:110px;flex:0 0 auto}',
'.pq-spec{font-weight:600;margin-bottom:6px}',
'.pq-opts{margin:0;padding-left:18px;color:var(--pq-muted);font-size:14px}',
'.pq-note{font-size:13px;color:var(--pq-muted);padding:10px 12px;border:1px dashed var(--pq-line);border-radius:6px}',
'.pq-result{display:flex;flex-direction:column;gap:14px;position:sticky;top:16px}',
'@media (max-width:860px){.pq-result{position:static}}',
'.pq-eyebrow{font-size:12px;letter-spacing:.04em;color:var(--pq-muted);margin-bottom:4px}',
'.pq-total{font-size:36px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.02em}',
'.pq-total span{font-size:18px;margin-left:4px;font-weight:500}',
'.pq-sub{font-size:13px;color:var(--pq-muted);margin-top:6px;font-variant-numeric:tabular-nums}',
'.pq-err{background:var(--pq-warn-soft);color:var(--pq-warn);border-radius:6px;padding:12px 14px;font-size:14px;font-weight:500}',
'.pq-warn{color:var(--pq-warn);font-size:13px;margin-top:6px}',
'.pq-imp{display:grid;grid-template-columns:140px minmax(0,1fr);gap:14px;align-items:start}',
'.pq canvas{width:140px;display:block}',
'.pq-stats{display:flex;flex-direction:column;gap:8px}',
'.pq-stats div{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--pq-line);padding-bottom:6px}',
'.pq-stats dt{color:var(--pq-muted);font-size:13px}',
'.pq-stats dd{font-weight:600;font-variant-numeric:tabular-nums}',
'.pq-cap{font-size:12px;color:var(--pq-muted);margin-top:6px}',
'.pq-lines{border-collapse:collapse;width:100%}',
'.pq-lines td{padding:7px 0;border:0;border-bottom:1px solid var(--pq-line);vertical-align:top;font-size:14px;background:none}',
'.pq-lines td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:10px}',
'.pq-lines .pq-d{display:block;font-size:12px;color:var(--pq-muted)}',
'.pq-lines tr.pq-sum td{border-bottom:0;font-weight:600}',
'.pq-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}',
'.pq-btn{font:inherit;font-size:14px;font-weight:600;border:1px solid var(--pq-ink);background:var(--pq-ink);color:#fff;border-radius:6px;padding:8px 14px;cursor:pointer;margin:0;line-height:1.3}',
'.pq-btn.pq-ghost{background:transparent;color:var(--pq-ink);border-color:var(--pq-line)}',
'.pq-status{font-size:13px;color:var(--pq-muted)}',
'.pq textarea{width:100%;font:inherit;font-size:13px;margin-top:8px;border:1px solid var(--pq-line);border-radius:6px;padding:8px}',
'.pq-foot{margin-top:16px;font-size:13px;color:var(--pq-muted)}'
].join('\n');

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function mount(root) {
  var ADMIN = root.getAttribute('data-mode') === 'admin';
  var url = (root.getAttribute('data-sheet') || '').trim();
  var cfg = clone(DEFAULTS), C = makeCalc(cfg), S = newState('namecard'), last = null;

  root.innerHTML = '<div class="pq">' +
    '<div class="pq-notice" hidden></div>' +
    '<div class="pq-products" role="group" aria-label="상품 선택"></div>' +
    '<div class="pq-grid"><form class="pq-panel" autocomplete="off"></form><div class="pq-result" aria-live="polite"></div></div>' +
    '<p class="pq-foot">표시 금액은 예상 견적입니다. 실제 금액은 인쇄 파일 확인 후 달라질 수 있으니 주문 전 꼭 문의해 주세요.</p></div>';
  var $ = function (s) { return root.querySelector(s); };
  var form = $('form'), result = $('.pq-result'), products = $('.pq-products'), notice = $('.pq-notice');

  function renderProducts() {
    products.innerHTML = GROUPS.map(function (g) {
      return '<div class="pq-pgroup"><span class="pq-plabel">' + g[1] + '</span>' + Object.keys(PRODUCTS).filter(function (k) { return (PRODUCTS[k].group || 'print') === g[0]; }).map(function (k) {
        return '<button type="button" data-p="' + k + '" aria-pressed="' + (k === S.product) + '">' + PRODUCTS[k].name + '</button>';
      }).join('') + '</div>';
    }).join('');
  }
  function seg(name, label, opts, val) {
    return '<div class="pq-field"><span class="pq-lbl">' + label + '</span><div class="pq-seg" role="radiogroup" aria-label="' + label + '">' +
      opts.map(function (o) { return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div></div>';
  }
  function select(name, label, opts, val, cls, extra) {
    return '<div class="pq-field ' + (cls || '') + '"><label class="pq-lbl" for="pq-f-' + name + '">' + label + '</label><select id="pq-f-' + name + '" name="' + name + '"' + (extra || '') + '>' +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
  }
  function number(name, label, val, hint, step) {
    return '<div class="pq-field"><label class="pq-lbl" for="pq-f-' + name + '">' + label + '</label><input type="number" id="pq-f-' + name + '" name="' + name + '" min="1" step="' + (step || 1) + '" value="' + val + '" inputmode="numeric">' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }
  function sizeFields(p) {
    var opts = C.sizesOf(p).map(function (s, i) { return [i, s[0]]; }).concat([['custom', '직접 입력']]);
    return select('size', '규격', opts, S.sizeIdx, 'pq-full') +
      '<div class="pq-field pq-full"><span class="pq-lbl">크기 (mm)' + (p.note ? ' · ' + p.note : '') + '</span><div class="pq-pair">' +
      '<input type="number" id="pq-f-w" name="w" min="1" value="' + S.w + '" aria-label="가로 mm"><span>×</span>' +
      '<input type="number" id="pq-f-h" name="h" min="1" value="' + S.h + '" aria-label="세로 mm"></div></div>';
  }
  function qtyField(label) {
    var p = PRODUCTS[S.product], mn = C.minOf(S), opts = C.qtyOptions(S), mx = opts[opts.length - 1];
    if (!(S.qty >= mn) || S.qty % mn) S.qty = Math.max(mn, Math.round((S.qty || mn) / mn) * mn);
    if (!ADMIN && S.qty > mx) S.qty = mx;
    var sel = '<select id="pq-f-qty" name="' + (ADMIN ? 'qtysel' : 'qty') + '">' +
      (opts.indexOf(S.qty) < 0 ? '<option value="" selected>직접 입력 ' + fmt(S.qty) + p.unit + '</option>' : '') +
      opts.map(function (q) { return '<option value="' + q + '"' + (q === S.qty ? ' selected' : '') + '>' + fmt(q) + p.unit + '</option>'; }).join('') + '</select>';
    return '<div class="pq-field pq-full"><label class="pq-lbl" for="pq-f-qty">' + label + '</label><div class="pq-qty">' + sel +
      (ADMIN ? '<input type="number" id="pq-f-qtyin" name="qty" min="' + mn + '" step="' + mn + '" value="' + S.qty + '" inputmode="numeric" aria-label="수량 직접 입력">' : '') +
      '</div><small>' + fmt(mn) + p.unit + ' 단위 · 최대 ' + fmt(mx) + p.unit + (ADMIN ? ' (관리자는 더 큰 수량도 직접 입력 가능)' : ' · 더 많은 수량은 상담해 주세요') + '</small></div>';
  }
  function paperOpts(sheet) { return C.papersFor(sheet).map(function (x) { return [x.id, x.name]; }); }

  function renderForm() {
    var p = PRODUCTS[S.product], h = '<div class="pq-fields">';
    if (p.kind === 'wide') {
      h += sizeFields(p);
      h += qtyField('수량');
      p.groups.forEach(function (g) { h += select('wo_' + g.id, g.label, g.opts.map(function (k) { return [k, cfg.wideOpts[k].name]; }), S.wopt[g.id]); });
      h += '<p class="pq-note pq-full"><b>실사출력은 당일 출고가 안 됩니다.</b> 출고일은 상담 후 안내해 드립니다.<br>면적(㎡) 기준으로 계산합니다. 장당 ' + cfg.wide[S.product].minArea + '㎡보다 작으면 ' + cfg.wide[S.product].minArea + '㎡로 계산해요.</p>';
      form.innerHTML = h + '</div>'; return;
    }
    if (p.kind === 'envelope') {
      if (S.env >= cfg.envelopes.length) S.env = 0;
      h += select('env', '봉투 종류', cfg.envelopes.map(function (e, i) { return [i, e.name + ' (' + e.w + '×' + e.h + ')']; }), S.env, 'pq-full');
      h += qtyField('수량');
      h += seg('color', '인쇄 색상', [['color', '컬러'], ['mono', '흑백']], S.color);
      h += '<p class="pq-note pq-full">완제품 봉투에 1매씩 인쇄합니다.</p>';
    } else if (p.kind === 'booklet') {
      var perfect = S.binding === 'perfect', dis = !(perfect || S.sepCover) ? ' disabled' : '';
      h += sizeFields(p);
      h += qtyField('권수');
      h += number('pages', '쪽수 (표지 포함)', S.pages, perfect ? '짝수 쪽' : '4의 배수 (8, 12, 16 …)', perfect ? 2 : 4);
      h += seg('binding', '제본', [['saddle', '중철'], ['perfect', '무선']], S.binding);
      h += seg('color', '내지 색상', [['color', '컬러'], ['mono', '흑백']], S.color);
      h += select('paper', '내지 용지', paperOpts('general'), S.paper);
      h += '<div class="pq-field"><span class="pq-lbl">표지</span><div class="pq-checks"><label><input type="checkbox" name="sepCover"' + ((perfect || S.sepCover) ? ' checked' : '') + (perfect ? ' disabled' : '') + '> 표지를 다른 용지로</label></div>' + (perfect ? '<small>무선 제본은 표지가 따로 들어갑니다.</small>' : '') + '</div>';
      h += select('coverPaper', '표지 용지', paperOpts('general'), S.coverPaper, '', dis);
      h += select('coverSides', '표지 인쇄', [[2, '양면 (안쪽까지)'], [1, '단면 (바깥만)']], S.coverSides, '', dis);
      h += select('coat', '표지 코팅', [[0, '없음'], [1, '단면 코팅'], [2, '양면 코팅']], S.coat, '', dis);
    } else {
      var sk = p.kind === 'sticker' ? 'sticker' : 'general';
      var lg = C.largeOf(S);
      h += sizeFields(p);
      h += qtyField('수량');
      if (lg) {
        h += seg('color', '색상', [['color', '컬러'], ['mono', '흑백']], S.color);
        h += '<p class="pq-note pq-full">' + esc(lg.name) + ' 출력은 <b>당일 출고가 안 됩니다.</b> 출고일은 상담 후 안내해 드립니다.</p>';
        form.innerHTML = h + '</div>'; return;
      }
      h += select('paper', '용지', paperOpts(sk), S.paper);
      if (p.kind !== 'sticker') h += seg('sides', '인쇄 면', [[1, '단면'], [2, '양면']], S.sides);
      if (p.kind !== 'sticker') h += seg('color', '색상', [['color', '컬러'], ['mono', '흑백']], S.color);
      if (p.coat) h += select('coat', '코팅', [[0, '없음'], [1, '단면 코팅'], [2, '양면 코팅']], S.coat);
      if (p.fold) h += select('folds', '접지', [[0, '없음'], [1, '1회 (2단)'], [2, '2회 (3단)'], [3, '3회 (4단)']], S.folds);
      if (p.kind === 'sticker') h += seg('cut', '칼선', [['fullCut', '완칼'], ['kissCut', '반칼'], ['square', '사각 재단']], S.cut);
      if (p.fins.length) h += '<div class="pq-field pq-full"><span class="pq-lbl">후가공</span><div class="pq-checks">' +
        p.fins.map(function (k) { return '<label><input type="checkbox" name="fin" value="' + k + '"' + (S.fins.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(cfg.finishing[k].name) + '</label>'; }).join('') + '</div></div>';
    }
    form.innerHTML = h + '</div>';
  }

  function readForm() {
    var fd = new FormData(form), n = function (k) { return Number(fd.get(k)); }, p = PRODUCTS[S.product];
    if (fd.has('size')) S.sizeIdx = fd.get('size') === 'custom' ? 'custom' : n('size');
    if (fd.has('w')) { S.w = n('w'); S.h = n('h'); }
    ['qty', 'sides', 'coat', 'folds', 'env', 'pages', 'coverSides'].forEach(function (k) { if (fd.has(k)) S[k] = n(k); });
    ['paper', 'color', 'cut', 'binding', 'coverPaper'].forEach(function (k) { if (fd.has(k)) S[k] = fd.get(k); });
    if (p.kind === 'booklet' && S.binding !== 'perfect') { var cb = form.querySelector('[name=sepCover]'); S.sepCover = !!(cb && cb.checked); }
    if (p.fins) S.fins = fd.getAll('fin');
    if (p.groups) p.groups.forEach(function (g) { if (fd.has('wo_' + g.id)) S.wopt[g.id] = fd.get('wo_' + g.id); });
  }

  function onForm(e) {
    var t = e.target, p = PRODUCTS[S.product], sizes = C.sizesOf(p), wasLarge = !!C.largeOf(S);
    if (t.name === 'qtysel' && t.value) { var qi = form.querySelector('#pq-f-qtyin'); if (qi) qi.value = t.value; }
    if (t.name === 'qty' && ADMIN) { var qs = form.querySelector('#pq-f-qty'); if (qs) qs.value = String(+t.value); }
    if (t.name === 'size' && t.value !== 'custom') {
      var s = sizes[+t.value]; $('#pq-f-w').value = s[1]; $('#pq-f-h').value = s[2];
      if (s[3] !== undefined && $('#pq-f-folds')) $('#pq-f-folds').value = s[3];
    }
    if ((t.name === 'w' || t.name === 'h') && $('#pq-f-size')) {
      var w = +$('#pq-f-w').value, h = +$('#pq-f-h').value;
      var i = sizes.findIndex(function (s) { return s[1] === w && s[2] === h; });
      $('#pq-f-size').value = i < 0 ? 'custom' : i;
    }
    readForm();
    if (e.type === 'change' && (t.name === 'binding' || t.name === 'sepCover' || (t.name === 'paper' && S.product === 'namecard'))) renderForm();
    else if (wasLarge !== !!C.largeOf(S)) renderForm();
    renderResult();
  }

  function renderResult() {
    var r = C.run(S); last = r;
    if (!r.ok) { result.innerHTML = '<div class="pq-panel"><p class="pq-eyebrow">예상 견적</p><div class="pq-err">' + esc(r.msg) + '</div></div>'; return; }
    var per = r.total / r.qty, stats = r.stats.concat(ADMIN ? r.adminStats : []);
    if (!ADMIN) {
      result.innerHTML =
        '<div class="pq-panel"><p class="pq-eyebrow">예상 견적 · 부가세 포함</p><div class="pq-total">' + fmt(r.total) + '<span>원</span></div>' +
        '<div class="pq-sub">공급가 ' + fmt(r.sub) + '원 · 부가세 ' + fmt(r.vat) + '원 · ' + r.perLabel + ' ' + (per < 100 ? per.toFixed(1) : fmt(per)) + '원</div>' +
        (r.warn ? '<p class="pq-warn">' + esc(r.warn) + '</p>' : '') + '</div>' +
        '<div class="pq-panel"><p class="pq-eyebrow">주문 내용</p><p class="pq-spec">' + esc(r.spec) + '</p><ul class="pq-opts">' +
        r.opts.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>' +
        '<div class="pq-btns"><button type="button" class="pq-btn" data-act="copy">견적 내용 복사</button><span class="pq-status"></span></div>' +
        '<textarea rows="8" hidden aria-label="견적 내용"></textarea></div>';
      return;
    }
    result.innerHTML =
      '<div class="pq-panel"><p class="pq-eyebrow">예상 견적 · 부가세 포함</p><div class="pq-total">' + fmt(r.total) + '<span>원</span></div>' +
      '<div class="pq-sub">공급가 ' + fmt(r.sub) + '원 · 부가세 ' + fmt(r.vat) + '원 · ' + r.perLabel + ' ' + (per < 100 ? per.toFixed(1) : fmt(per)) + '원</div></div>' +
      '<div class="pq-panel"><div class="pq-imp"><div>' + (r.imp || r.env ? '<canvas aria-label="판걸이 배치도"></canvas>' : '') + '</div><dl class="pq-stats">' +
      stats.map(function (s) { return '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>'; }).join('') + '</dl></div>' +
      '<p class="pq-cap">' + esc(r.cap) + '</p>' + (r.warn ? '<p class="pq-warn">' + esc(r.warn) + '</p>' : '') + '</div>' +
      '<div class="pq-panel"><table class="pq-lines"><tbody>' +
      r.lines.map(function (l) { return '<tr><td>' + esc(l[0]) + (ADMIN && l[1] ? '<span class="pq-d">' + esc(l[1]) + '</span>' : '') + '</td><td>' + fmt(l[2]) + '</td></tr>'; }).join('') +
      '<tr class="pq-sum"><td>공급가</td><td>' + fmt(r.sub) + '</td></tr></tbody></table>' +
      '<div class="pq-btns"><button type="button" class="pq-btn" data-act="copy">견적 내용 복사</button>' +
      (ADMIN ? '<button type="button" class="pq-btn pq-ghost" data-act="reload">단가 다시 불러오기</button>' : '') +
      '<span class="pq-status"></span></div><textarea rows="8" hidden aria-label="견적 내용"></textarea></div>';
    draw(r);
  }

  function quoteText(r) {
    if (!ADMIN) return ['[업드림 견적] ' + r.spec, '옵션: ' + r.opts.join(' / '), '공급가 ' + fmt(r.sub) + '원 / 부가세 ' + fmt(r.vat) + '원', '합계 ' + fmt(r.total) + '원'].join('\n');
    return ['[견적] ' + r.spec, '옵션: ' + r.opts.join(' / ')]
      .concat(r.lines.map(function (l) { return '- ' + l[0] + ': ' + fmt(l[2]) + '원'; }))
      .concat(['공급가 ' + fmt(r.sub) + '원 / 부가세 ' + fmt(r.vat) + '원', '합계 ' + fmt(r.total) + '원']).join('\n');
  }
  function copyQuote() {
    var txt = quoteText(last), st = result.querySelector('.pq-status'), fb = result.querySelector('textarea');
    function fallback() { fb.hidden = false; fb.value = txt; fb.select(); st.textContent = '아래 내용을 선택해 복사하세요.'; }
    try { navigator.clipboard.writeText(txt).then(function () { st.textContent = '복사했습니다. 문의할 때 붙여넣어 주세요.'; }, fallback); } catch (e) { fallback(); }
  }

  function draw(r) {
    var c = result.querySelector('canvas'); if (!c || !(r.imp || r.env)) return;
    var cssW = 140, dpr = window.devicePixelRatio || 1, ctx = c.getContext('2d');
    var ink = '#18212b', acc = '#0a6f9b', soft = '#e1eef4', mag = '#c0266d', surf = '#ffffff', muted = '#5b6670';
    if (r.env) {
      var e = r.env, k0 = (cssW - 20) / Math.max(e.w, e.h) * 0.95, ew = e.h * k0, eh = e.w * k0, ch = eh + 40;
      c.style.height = ch + 'px'; c.width = cssW * dpr; c.height = ch * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var x0 = (cssW - ew) / 2, y0 = 20;
      ctx.fillStyle = surf; ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.fillRect(x0, y0, ew, eh); ctx.strokeRect(x0, y0, ew, eh);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ew / 2, y0 + eh * 0.55); ctx.lineTo(x0 + ew, y0); ctx.strokeStyle = muted; ctx.stroke();
      ctx.fillStyle = soft; ctx.fillRect(x0 + 8, y0 + eh - 22, ew * 0.45, 12);
      return;
    }
    var im = r.imp, k = (cssW - 14) / im.sw, cssH = im.sh * k + 14, o = 7, f = im.f;
    c.style.height = cssH + 'px'; c.width = cssW * dpr; c.height = cssH * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = surf; ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.fillRect(o, o, im.sw * k, im.sh * k); ctx.strokeRect(o + .5, o + .5, im.sw * k - 1, im.sh * k - 1);
    var W = im.sw - 2 * im.m, H = im.sh - 2 * im.m;
    ctx.setLineDash([3, 3]); ctx.strokeStyle = mag; ctx.strokeRect(o + im.m * k, o + im.m * k, W * k, H * k); ctx.setLineDash([]);
    var ox = o + (im.m + (W - f.cols * f.pw) / 2) * k, oy = o + (im.m + (H - f.rows * f.ph) / 2) * k;
    for (var i = 0; i < f.cols; i++) for (var j = 0; j < f.rows; j++) {
      var x = ox + i * f.pw * k, y = oy + j * f.ph * k, w = f.pw * k, h = f.ph * k, s = im.inset * k;
      ctx.fillStyle = soft; ctx.fillRect(x + .5, y + .5, w - 1, h - 1);
      ctx.strokeStyle = acc; ctx.lineWidth = 1;
      if (im.circle) { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, (w - 2 * s) / 2, (h - 2 * s) / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      else ctx.strokeRect(x + s, y + s, w - 2 * s, h - 2 * s);
      if (im.spread) {
        ctx.beginPath(); ctx.setLineDash([2, 2]);
        if (f.pw > f.ph) { ctx.moveTo(x + w / 2, y + s); ctx.lineTo(x + w / 2, y + h - s); } else { ctx.moveTo(x + s, y + h / 2); ctx.lineTo(x + w - s, y + h / 2); }
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  function applyCfg(next) {
    cfg = next; C = makeCalc(cfg);
    var p = PRODUCTS[S.product];
    if (p.kind !== 'envelope' && p.kind !== 'wide') {
      var sk = p.kind === 'sticker' ? 'sticker' : 'general';
      if (!cfg.papers.some(function (x) { return x.id === S.paper && x.sheet === sk; })) S.paper = (C.papersFor(sk)[0] || {}).id;
    }
    renderForm(); readForm(); renderResult();
  }

  function load() {
    if (!url) { if (ADMIN) { notice.hidden = false; notice.textContent = '구글 시트 주소(data-sheet)가 없어 기본 단가로 계산합니다.'; } return; }
    var sep = url.indexOf('?') < 0 ? '?' : '&';
    fetch(url + sep + '_=' + Date.now(), { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(function (text) {
        if (/^\s*</.test(text)) throw new Error('CSV가 아닙니다');
        var out = cfgFromRows(parseCSV(text));
        notice.hidden = !(ADMIN && out.warn.length);
        if (ADMIN && out.warn.length) notice.innerHTML = '단가표에서 읽지 못한 칸이 있어 그 항목은 기본값을 썼습니다.<br>' + out.warn.slice(0, 8).map(esc).join('<br>');
        applyCfg(out.cfg);
        var st = result.querySelector('.pq-status'); if (ADMIN && st) st.textContent = '단가표를 불러왔습니다.';
      })
      .catch(function () {
        notice.hidden = false;
        notice.textContent = ADMIN ? '구글 시트 단가표를 불러오지 못해 기본 단가로 계산 중입니다. 시트의 ‘웹에 게시(CSV)’ 주소가 맞는지 확인하세요.'
          : '최신 단가를 불러오지 못했습니다. 표시 금액이 실제와 다를 수 있으니 문의해 주세요.';
      });
  }

  products.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    S = newState(b.getAttribute('data-p'));
    var p = PRODUCTS[S.product];
    if (p.kind !== 'envelope' && p.kind !== 'wide') {
      var sk = p.kind === 'sticker' ? 'sticker' : 'general';
      if (!cfg.papers.some(function (x) { return x.id === S.paper && x.sheet === sk; })) S.paper = (C.papersFor(sk)[0] || {}).id;
      if (p.kind === 'booklet' && !cfg.papers.some(function (x) { return x.id === S.coverPaper; })) S.coverPaper = S.paper;
    }
    renderProducts(); renderForm(); renderResult();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', onForm);
  form.addEventListener('change', onForm);
  result.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.getAttribute('data-act') === 'copy') copyQuote();
    if (b.getAttribute('data-act') === 'reload') load();
  });

  renderProducts(); renderForm(); renderResult(); load();
}

function boot() {
  if (!document.getElementById('pq-style')) {
    var st = document.createElement('style'); st.id = 'pq-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  var nodes = document.querySelectorAll('#print-quote,[data-print-quote]');
  for (var i = 0; i < nodes.length; i++) if (!nodes[i].getAttribute('data-pq-ready')) { nodes[i].setAttribute('data-pq-ready', '1'); mount(nodes[i]); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
