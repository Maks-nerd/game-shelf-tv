// Оболочка приложения «Полка игр» для Samsung Tizen: полка живёт на сервере и открыта здесь во встроенном окне на весь экран.
// Оболочка остаётся под ней, чтобы по просьбе полки открывать внешние ссылки (IGDB, магазины) в браузере Samsung
// и спрашивать пароль (в поле пароля внутри встроенного окна клавиатура телевизора не появляется).
var SHELF = 'https://claude-vm.tail65a20f.ts.net:8443/?app=tv';
var frame = document.getElementById('shelf'), msg = document.getElementById('msg');
var login = document.getElementById('login'), pw = document.getElementById('pw');

// каналы ∧/∨ приложение забирает себе (листать ряды) — только пока оно на экране: ушли в браузер — отпускаем,
// иначе браузер их не получает и прокрутка страниц там ломается
var KEYS = ['ChannelUp', 'ChannelDown'];
function grabKeys(on) {
  KEYS.forEach(function (k) {
    try { if (on) tizen.tvinputdevice.registerKey(k); else tizen.tvinputdevice.unregisterKey(k); } catch (e) { /* не телевизор или нет такой кнопки */ }
  });
}
grabKeys(true);

// фокус отдаём полке при загрузке, при возвращении из браузера и если он оказался у оболочки (в полке пропал элемент с рамкой).
// Только если он правда не у полки: иначе отберём его у поля ввода внутри полки (поиск) — печатать и диктовать будет нельзя
function toShelf() { if (login.hidden && document.activeElement !== frame) frame.focus(); }
frame.addEventListener('load', function () { frame.classList.add('on'); toShelf(); });
document.addEventListener('keydown', toShelf);
document.addEventListener('visibilitychange', function () {
  grabKeys(!document.hidden);
  if (!document.hidden) toShelf();
});

function askPassword(error) {
  document.getElementById('lg-err').textContent = error || '';
  pw.value = '';
  login.hidden = false;
  setTimeout(function () { pw.focus(); }, 200);
}
login.addEventListener('submit', function (e) {
  e.preventDefault();
  if (!pw.value) return;
  frame.contentWindow.postMessage({ kino: 'password', value: pw.value }, '*');
  pw.blur();
  login.hidden = true;
  frame.focus();
});
pw.addEventListener('keydown', function (e) {
  if (e.keyCode === 13 || e.keyCode === 65376) { e.preventDefault(); login.requestSubmit ? login.requestSubmit() : login.dispatchEvent(new Event('submit')); }
});

window.addEventListener('message', function (e) {
  var d = e.data || {};
  if (e.source !== frame.contentWindow) return;
  if (d.kino === 'login') return askPassword(d.error);
  if (d.kino !== 'open' || !d.url) return;
  try {  // полка просит открыть ссылку — запускаем браузер Samsung
    var ctl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', d.url);
    tizen.application.launchAppControl(ctl, null, function () {}, function (err) { msg.textContent = 'Браузер не открылся: ' + (err && err.message); });
  } catch (err) { /* не телевизор */ }
});

function go() { frame.src = SHELF; }
if (navigator.onLine === false) {
  msg.textContent = 'Нет интернета — открою, как только появится';
  window.addEventListener('online', go);
} else {
  go();
}
