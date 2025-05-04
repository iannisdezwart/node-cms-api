import { Database } from "better-sqlite3";

type Err = "OrderingIdxNotFound" | "DatabaseUpdateError";
type RetVal = {} | { error: Err };

export const swapPagesQuery = (
  db: Database,
  swaps: [number, number][]
): RetVal => {
  return db.transaction((): RetVal => {
    for (const [orderingIdxA, orderingIdxB] of swaps) {
      if (!checkOrderingIdxExists(db, orderingIdxA)) {
        return { error: "OrderingIdxNotFound" };
      }

      if (!checkOrderingIdxExists(db, orderingIdxB)) {
        return { error: "OrderingIdxNotFound" };
      }

      let updateRes = db
        .prepare(
          /* sql */
          `
          UPDATE pages
          SET ordering = -1
          WHERE ordering = ?
          `
        )
        .run(orderingIdxA);
      if (updateRes.changes !== 1) {
        throw new Error("DatabaseUpdateError");
      }

      updateRes = db
        .prepare(
          /* sql */
          `
          UPDATE pages
          SET ordering = ?
          WHERE ordering = ?
          `
        )
        .run(orderingIdxA, orderingIdxB);
      if (updateRes.changes !== 1) {
        throw new Error("DatabaseUpdateError");
      }

      updateRes = db
        .prepare(
          /* sql */
          `
          UPDATE pages
          SET ordering = ?
          WHERE ordering = -1
          `
        )
        .run(orderingIdxB);
      if (updateRes.changes !== 1) {
        throw new Error("DatabaseUpdateError");
      }
    }

    return {};
  })();
};

const checkOrderingIdxExists = (db: Database, orderingIdx: number): boolean => {
  const ordering = db
    .prepare(
      /* sql */
      `
      SELECT COUNT(ordering) AS count FROM pages WHERE ordering = ?
      `
    )
    .get(orderingIdx) as { count: number } | undefined;
  if (ordering === undefined || ordering.count !== 1) {
    console.warn(`⚠️🔢❌ Ordering index ${orderingIdx} not found.`);
    return false;
  }

  return true;
};
