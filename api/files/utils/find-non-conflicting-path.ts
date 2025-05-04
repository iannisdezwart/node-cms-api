import { join, parse } from "path";
import { filePathIsSafe } from "./filepath-is-safe";
import { existsSync } from "fs";
import { Settings } from "../../../settings";

type FindNonConflictingPathOutput =
  | {
      ok: false;
      reason: string;
    }
  | {
      ok: true;
      path: string;
    };

export const findNonConflictingPath = (
  settings: Settings,
  sourceFileName: string,
  destinationDirPath: string,
  checkSourceFile = true
): FindNonConflictingPathOutput => {
  const { name, ext } = parse(sourceFileName);

  for (let i = 0; ; i++) {
    const filenameCandidate = `${name}${i > 0 ? `-${i}` : ""}${ext}`;
    const path = join(destinationDirPath, filenameCandidate);
    if (
      !filePathIsSafe(settings, path) ||
      (checkSourceFile && !filePathIsSafe(settings, sourceFileName))
    ) {
      return {
        ok: false,
        reason: "Invalid file path",
      };
    }
    if (existsSync(path)) {
      continue;
    }

    return {
      ok: true,
      path: join(destinationDirPath, filenameCandidate),
    };
  }
};
