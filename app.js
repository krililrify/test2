(function () {
  'use strict';
  // ===== 配置：增加货币只需在此处加一行 [代码, 名称, 符号, 国旗国家码, 小数位] =====
  var CURRENCIES = [
    ['CNY','人民币','¥','CN',2],['TWD','新台币','NT$','TW',2],['HKD','港元','HK$','HK',2],
    ['RUB','俄罗斯卢布','₽','RU',2],['USD','美元','$','US',2],['INR','印度卢比','₹','IN',2],
    ['VND','越南盾','₫','VN',0],['JPY','日元','¥','JP',0],['EUR','欧元','€','EU',2],
    ['SGD','新加坡元','S$','SG',2],['GBP','英镑','£','GB',2],['ARS','阿根廷比索','$','AR',2],
    ['PHP','菲律宾比索','₱','PH',2],['KRW','韩元','₩','KR',0],['TRY','土耳其里拉','₺','TR',2],
    ['AUD','澳大利亚元','A$','AU',2],['CHF','瑞士法郎','CHF','CH',2],['THB','泰铢','฿','TH',2],
    ['IDR','印尼盾','Rp','ID',0],['CAD','加拿大元','C$','CA',2],['PKR','巴基斯坦卢比','₨','PK',2],
    ['MXN','墨西哥比索','Mex$','MX',2],['SAR','沙特里亚尔','﷼','SA',2],['MYR','马来西亚林吉特','RM','MY',2],
    ['BDT','孟加拉塔卡','৳','BD',2]
  ];
  var API = 'https://api.frankfurter.dev/v2/rates';
  var KEY = 'fx_cache_v1', TIMEOUT = 10000;

  var $ = function (id) { return document.getElementById(id); };
  var info = {}; CURRENCIES.forEach(function (c) { info[c[0]] = c; });
  var rates = null;      // { CODE: 每 1 USD 兑换的数量 }，仅含 API 实际返回的货币
  var meta = null;       // { date, fetchedAt, fromCache }
  var state = { code: 'CNY', amount: '1', editing: null };
  var rowEls = {};

  function flag(cc) {
    if (cc === 'EU') cc = 'EU';
    return String.fromCodePoint.apply(null, cc.split('').map(function (ch) { return 127397 + ch.charCodeAt(0); }));
  }
  // 解析用户输入（兼容逗号、空格）；无效/空/仅小数点返回 null
  function parse(s) {
    s = String(s).replace(/[,\s]/g, '');
    if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return null;
    return parseFloat(s);
  }
  function fmt(v, code) {
    if (!isFinite(v)) return '';
    var d = info[code][4];
    if (v !== 0 && Math.abs(v) < Math.pow(10, -d)) d = Math.min(8, d + 4);   // 极小值多显示几位
    var s = (Math.round((v + Number.EPSILON) * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
    return d ? s.replace(/\.?0+$/, '') || '0' : s;
  }
  // 方向：rates[X] = 1 USD 能换多少 X。amount X → USD = amount / rates[X]；USD → Y = usd * rates[Y]
  function convert(amount, from, to) { return amount / rates[from] * rates[to]; }
  function ok(code) { return rates && typeof rates[code] === 'number' && rates[code] > 0; }

  function buildUI() {
    var list = $('list');
    CURRENCIES.forEach(function (c) {
      var li = document.createElement('li'); li.className = 'row'; li.dataset.code = c[0];
      li.innerHTML = '<div class="id"><span class="flag">' + flag(c[3]) + '</span><div><div class="code">' + c[0] +
        ' <span class="name">' + c[2] + '</span></div><div class="name">' + c[1] + '</div></div></div>' +
        '<input type="text" inputmode="decimal" autocomplete="off" aria-label="' + c[1] + '金额">';
      var inp = li.querySelector('input');
      inp.addEventListener('focus', function () { state.editing = c[0]; });
      inp.addEventListener('blur', function () { state.editing = null; render(); });
      inp.addEventListener('input', function () {
        state.code = c[0]; state.amount = inp.value;
        render();
      });
      list.appendChild(li); rowEls[c[0]] = { li: li, inp: inp };
    });
  }

  function render() {
    var amt = parse(state.amount), usable = ok(state.code) && amt !== null;
    CURRENCIES.forEach(function (c) {
      var r = rowEls[c[0]], code = c[0];
      r.li.classList.toggle('cur', code === state.code);
      if (!ok(code)) { r.inp.disabled = true; r.inp.value = ''; r.inp.placeholder = '暂无数据'; return; }
      r.inp.disabled = false; r.inp.placeholder = '';
      if (state.editing === code) return;               // 正在输入的框不改写，避免光标/小数点异常
      r.inp.value = usable ? fmt(convert(amt, state.code, code), code) : '';
    });
    applySearch();
  }

  function applySearch() {
    var kw = $('search').value.trim().toLowerCase(), n = 0;
    CURRENCIES.forEach(function (c) {
      var hit = !kw || c[0].toLowerCase().indexOf(kw) > -1 || c[1].indexOf(kw) > -1;
      rowEls[c[0]].li.hidden = !hit; if (hit) n++;
    });
    $('empty').hidden = n > 0;
  }

  function say(items) {
    $('status').innerHTML = items.map(function (i) { return '<div class="' + i[0] + '"></div>'; }).join('');
    Array.prototype.forEach.call($('status').children, function (el, k) { el.textContent = items[k][1]; });
  }
  function fmtTime(ts) { return new Date(ts).toLocaleString('zh-CN', { hour12: false }); }

  function status(extra) {
    var items = [];
    if (!meta) { items.push(['err', '暂无汇率数据，请检查网络后点击“刷新汇率”。']); }
    else {
      items.push(['info', '汇率数据日期（API 返回）：' + meta.date + ' ｜ 最后成功更新：' + fmtTime(meta.fetchedAt)]);
      if (meta.fromCache) items.push(['warn', '当前显示的是浏览器缓存中上次成功获取的汇率，并非最新数据。']);
      var miss = CURRENCIES.filter(function (c) { return !ok(c[0]); }).map(function (c) { return c[0]; });
      if (miss.length) items.push(['warn', 'API 未返回以下货币，已禁用：' + miss.join('、')]);
    }
    if (extra) items.unshift(['err', extra]);
    say(items);
  }

  // 兼容两种返回格式：v2 数组 [{date,base,quote,rate}] 与 v1 对象 {date,rates:{}}
  function parseApi(data) {
    var out = { USD: 1 }, date = null;
    if (Array.isArray(data)) {
      data.forEach(function (x) {
        if (x && x.quote && typeof x.rate === 'number' && x.rate > 0) {
          out[x.quote] = x.rate; if (!date || x.date > date) date = x.date;
        }
      });
    } else if (data && data.rates) {
      Object.keys(data.rates).forEach(function (k) { if (data.rates[k] > 0) out[k] = data.rates[k]; });
      date = data.date;
    }
    if (!date || Object.keys(out).length < 2) throw new Error('API 返回格式无法识别或没有数据');
    return { rates: out, date: date };
  }

  function load(manual) {
    var btn = $('refresh'); btn.disabled = true; btn.textContent = '刷新中…';
    var quotes = CURRENCIES.map(function (c) { return c[0]; }).filter(function (c) { return c !== 'USD'; }).join(',');
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, TIMEOUT);
    return fetch(API + '?base=USD&quotes=' + quotes, { signal: ctl.signal, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 429) throw new Error('请求过于频繁（429），请稍后再试');
        if (!r.ok) throw new Error('API 返回错误状态 ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var p = parseApi(data);
        rates = p.rates; meta = { date: p.date, fetchedAt: Date.now(), fromCache: false };
        try { localStorage.setItem(KEY, JSON.stringify({ rates: rates, date: meta.date, fetchedAt: meta.fetchedAt })); } catch (e) {}
        status();
      })
      .catch(function (e) {
        var msg = e.name === 'AbortError' ? '请求超时（' + TIMEOUT / 1000 + ' 秒）' : (e.message || '网络错误');
        if (meta) { meta.fromCache = true; status('刷新失败：' + msg + '。已保留之前的数据。'); }
        else status('获取汇率失败：' + msg + '。');
      })
      .then(function () { clearTimeout(timer); btn.disabled = false; btn.textContent = '刷新汇率'; render(); });
  }

  function loadCache() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && c.rates && c.date && c.fetchedAt) { rates = c.rates; meta = { date: c.date, fetchedAt: c.fetchedAt, fromCache: true }; }
    } catch (e) {}
  }

  buildUI(); loadCache();
  $('search').addEventListener('input', applySearch);
  $('refresh').addEventListener('click', function () { load(true); });
  status(); render();
  load(false);   // 页面加载时请求；失败则保留缓存并提示
})();
