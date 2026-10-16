-- 香港奶龍中學 · 學生簽到 · D1 資料庫結構
-- 用法：Cloudflare 儀表板 → D1 → 選資料庫 → Console → 貼上整段執行

CREATE TABLE IF NOT EXISTS players (
  uid        TEXT    PRIMARY KEY,   -- 裝置產生的匿名 ID（非帳號）
  nickname   TEXT    NOT NULL,      -- 顯示名稱，1–12 字
  streak     INTEGER NOT NULL DEFAULT 0,   -- 目前連續簽到天數
  total      INTEGER NOT NULL DEFAULT 0,   -- 總簽到次數
  best       INTEGER NOT NULL DEFAULT 0,   -- 歷史最長連續
  last_date  TEXT,                  -- 最後簽到日（YYYY-MM-DD，香港時區）
  updated_at TEXT                   -- 最後更新時間（ISO）
);

-- 排行榜主要查詢：依連續天數排序，同分時比總次數
CREATE INDEX IF NOT EXISTS idx_players_streak
  ON players (streak DESC, total DESC);
