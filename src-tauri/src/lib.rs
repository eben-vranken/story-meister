#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/* ---------- shared DB handle ---------- */
struct Db(Mutex<Connection>);

/* ---------- payload coming from frontend ---------- */
#[derive(Deserialize)]
struct StoryPayload {
  story: String,
  subject: String,
  verb: String,
  object: String,
  setting: String,
  consequences: String,
}

/* ---------- row sent back to the frontend ---------- */
#[derive(Serialize)]
struct StoryRow {
  id:           i64,
  story:        String,
  subject:      String,
  verb:         String,
  object_:      String,
  setting:      String,
  consequences: String,
  created_at:   String,
}

/* ---------- save_story: inserts or ignores duplicates ---------- */
#[tauri::command]
fn save_story(
  _app: AppHandle,      // not used, but we keep it for symmetry with list_stories
  db: State<Db>,
  payload: StoryPayload,
) -> Result<(), String> {
  let conn = db.0.lock().expect("Poisoned mutex");

  conn.execute(
    "INSERT OR IGNORE INTO stories
       (story, subject, verb, object, setting, consequences, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
    params![
      payload.story,
      payload.subject,
      payload.verb,
      payload.object,
      payload.setting,
      payload.consequences
    ],
  )
  .map_err(|e| e.to_string())?;

  println!("✅ Story saved (or duplicate ignored)");
  Ok(())
}

/* ---------- list_stories: returns newest first ---------- */
#[tauri::command]
fn list_stories(db: State<Db>) -> Result<Vec<StoryRow>, String> {
  let conn = db.0.lock().expect("Poisoned mutex");

  let mut stmt = conn
    .prepare(
      "SELECT id, story, subject, verb, object, setting, consequences, created_at
         FROM stories
        ORDER BY created_at DESC",
    )
    .map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map([], |r| {
      Ok(StoryRow {
        id:           r.get(0)?,
        story:        r.get(1)?,
        subject:      r.get(2)?,
        verb:         r.get(3)?,
        object_:      r.get(4)?,
        setting:      r.get(5)?,
        consequences: r.get(6)?,
        created_at:   r.get(7)?,
      })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

  println!("📤 Returned {} stories", rows.len());
  Ok(rows)
}

/* ---------- delete_story: removes one row by id ---------- */
#[tauri::command]
fn delete_story(db: State<Db>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().expect("Poisoned mutex");

    conn.execute("DELETE FROM stories WHERE id = ?", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    println!("🗑️  Deleted story {id}");
    Ok(())
}

/* ---------- Tauri entry-point ---------- */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .setup(|app| {
      /* 1️⃣  Resolve & create data dir */
      let db_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))?;
      std::fs::create_dir_all(&db_dir)?;

      /* 2️⃣  Open DB and bootstrap schema */
      let db_path = db_dir.join("stories.db");
      let conn = Connection::open(&db_path)?;

      conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS stories (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          story         TEXT    NOT NULL,
          subject       TEXT    NOT NULL,
          verb          TEXT    NOT NULL,
          object        TEXT    NOT NULL,
          setting       TEXT    NOT NULL,
          consequences  TEXT    NOT NULL,
          created_at    TEXT    NOT NULL
        );

        /* 1️⃣  remove older duplicates, keep the earliest rowid */
        DELETE FROM stories
        WHERE rowid NOT IN (
          SELECT MIN(rowid)
          FROM stories
          GROUP BY
            story, subject, verb, object, setting, consequences
        );

        /* 2️⃣  now the UNIQUE index can be created safely */
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_prompt_story
          ON stories (story, subject, verb, object, setting, consequences);
        ",
      )?;


      /* 3️⃣  Share the connection */
      app.manage(Db(Mutex::new(conn)));

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![save_story, list_stories, delete_story])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
