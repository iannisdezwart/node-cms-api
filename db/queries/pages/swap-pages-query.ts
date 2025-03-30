import { Database } from "better-sqlite3";

type Err = "OrderingIdxNotFound" | "DatabaseUpdateError";
type RetVal = {} | { error: Err };

export const swapPagesQuery = (
  db: Database,
  swaps: [number, number][]
): RetVal => {
  try {
    return db.transaction((): RetVal => {
      for (const [orderingIdxA, orderingIdxB] of swaps) {
        if (!checkOrderingIdxExists(db, orderingIdxA)) {
          throw new Error("OrderingIdxNotFound");
        }
        if (!checkOrderingIdxExists(db, orderingIdxB)) {
          throw new Error("OrderingIdxNotFound");
        }

        const updatePageRes = db
          .prepare(
            /* sql */
            `
            UPDATE pages
            SET ordering = CASE
              WHEN ordering = ? THEN ?
              WHEN ordering = ? THEN ?
            END
            WHERE ordering IN (?, ?)
            `
          )
          .run(
            orderingIdxA,
            orderingIdxB,
            orderingIdxB,
            orderingIdxA,
            orderingIdxA,
            orderingIdxB
          );
        if (updatePageRes.changes !== 2) {
          throw new Error("DatabaseUpdateError");
        }
      }

      return {};
    })();
  } catch (error) {
    return { error: error.message as Err };
  }
};

const checkOrderingIdxExists = (db: Database, orderingIdx: number): boolean => {
  const ordering = db
    .prepare(
      /* sql */
      `
      SELECT COUNT(ordering) FROM pages WHERE ordering = ?
      `
    )
    .get(orderingIdx) as { count: number } | undefined;
  if (ordering === undefined) {
    return false;
  }

  return ordering.count === 1;
};
