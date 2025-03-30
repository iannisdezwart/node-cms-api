import bcrypt from "bcrypt";
import { Database } from "better-sqlite3";
import { Settings } from "../settings";

export const init = (db: Database, settings: Settings) => {
  db.transaction(() => {
    let res = db
      .prepare(
        /* sql */
        `
        CREATE TABLE IF NOT EXISTS
        users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          level TEXT NOT NULL,
        )
        `
      )
      .run();
    if (res.changes > 0) {
      console.log("🗄️👤🌱 Users table created");
    }

    res = db
      .prepare(
        /* sql */
        `
        INSERT OR IGNORE INTO users (username, password, level)
        VALUES ('root', ?, 'root')
        `
      )
      .run(bcrypt.hashSync("", settings.bcrypt.rounds));
    if (res.changes > 0) {
      console.log("🤵👤🌱 Root user created");
    }

    res = db
      .prepare(
        /* sql */
        `
        CREATE TABLE IF NOT EXISTS
        page_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          template TEXT NOT NULL,
          can_add INTEGER NOT NULL CHECK (can_add IN (0, 1)),
          compile INTEGER NOT NULL CHECK (compile IN (0, 1))
        )
        `
      )
      .run();
    if (res.changes > 0) {
      console.log("🗄️📜🌱 Page types table created");
    }

    res = db
      .prepare(
        /* sql */
        `
        CREATE TABLE IF NOT EXISTS
        pages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ordering INTEGER NOT NULL UNIQUE,
          page_type_id INTEGER NOT NULL REFERENCES page_types(id),
          content TEXT NOT NULL
        )
        `
      )
      .run();
    if (res.changes > 0) {
      console.log("🗄️📑🌱 Pages table created");
    }

    res = db
      .prepare(
        /* sql */
        `
        CREATE TABLE IF NOT EXISTS
        compiled_pages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          page_id INTEGER NOT NULL REFERENCES pages(id),
          path TEXT NOT NULL UNIQUE,
          hash TEXT NOT NULL UNIQUE
        )
        `
      )
      .run();
    if (res.changes > 0) {
      console.log("🗄️📄🌱 Compiled pages table created");
    }
  })();
};
