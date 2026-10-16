/**
 * POST /api/checkin
 * body: { uid, nickname, streak, total, best, last }
 *
 * 把簽到紀錄寫進 D1（同一 uid 覆寫）。
 *
 * 關於作弊：這裡沒有帳號系統，所以原則上誰都能送任意數字。
 * 我們只能做「格式與合理範圍」的防護（見 sanitize），
 * 擋不住有心人，但足以擋住亂送跟手誤。
 * 真要防住必須有登入，那是另一個量級的事。
 *
 * 綁定：Pages 專案的 D1 資料庫綁定名稱必須是 DB
 */

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** 香港時區的 YYYY-MM-DD */
function hkToday() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 只允許合理輸入 */
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // uid：只留英數與 - _
  var uid = String(raw.uid || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  if (uid.length < 6) return null;

  // 暱稱：去掉控制字元與角括號，長度 1–12
  var nickname = String(raw.nickname || '')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12);
  if (!nickname) return null;

  function int(v, max) {
    var n = parseInt(v, 10);
    if (!isFinite(n) || n < 0) return 0;
    return n > max ? max : n;
  }

  var streak = int(raw.streak, 3650);   // 最長連續上限 10 年
  var total = int(raw.total, 100000);
  var best = int(raw.best, 3650);
  if (best < streak) best = streak;

  // last：必須是合法日期，且不能是未來
  var last = String(raw.last || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(last) || last > hkToday()) last = hkToday();

  return { uid: uid, nickname: nickname, streak: streak, total: total, best: best, last: last };
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.DB) {
    // 沒綁 D1 時仍回 200，讓前端知道「已收到但沒存」
    return json({ ok: false, stored: false, reason: 'no_binding' });
  }

  var data = null;
  try {
    data = sanitize(await request.json());
  } catch (e) {
    return json({ ok: false, reason: 'bad_json' }, 400);
  }
  if (!data) {
    return json({ ok: false, reason: 'invalid' }, 400);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO players (uid, nickname, streak, total, best, last_date, updated_at) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ' +
      'ON CONFLICT(uid) DO UPDATE SET ' +
      '  nickname = ?2, streak = ?3, total = ?4, best = ?5, ' +
      '  last_date = ?6, updated_at = ?7'
    ).bind(
      data.uid, data.nickname, data.streak, data.total, data.best,
      data.last, new Date().toISOString()
    ).run();

    return json({ ok: true, stored: true });
  } catch (e) {
    return json({ ok: false, stored: false, reason: 'write_failed' });
  }
}

export async function onRequest() {
  return json({ error: 'method_not_allowed' }, 405);
}
