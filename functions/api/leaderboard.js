/**
 * GET /api/leaderboard
 * 回傳連續簽到天數前 20 名。
 *
 * 綁定：Pages 專案的 D1 資料庫綁定名稱必須是 DB
 * 若 DB 未綁定或查詢失敗，回傳空陣列（HTTP 200），
 * 前端會顯示「排行榜暫時連不上」，不會整頁壞掉。
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

export async function onRequestGet({ env }) {
  if (!env || !env.DB) {
    return json({ rows: [], reason: 'no_binding' });
  }
  try {
    const { results } = await env.DB.prepare(
      'SELECT uid, nickname, streak, total FROM players ' +
      'WHERE streak > 0 ' +
      'ORDER BY streak DESC, total DESC, updated_at ASC ' +
      'LIMIT 20'
    ).all();

    return json({
      rows: (results || []).map(function (r) {
        return {
          uid: String(r.uid || ''),
          nickname: String(r.nickname || ''),
          streak: Number(r.streak) || 0,
          total: Number(r.total) || 0,
        };
      }),
    });
  } catch (e) {
    return json({ rows: [], reason: 'query_failed' });
  }
}

export async function onRequest() {
  return json({ error: 'method_not_allowed' }, 405);
}
