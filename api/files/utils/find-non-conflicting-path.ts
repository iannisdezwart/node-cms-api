import { existsSync } from "fs";
import { join, parse } from "path";
import { Settings } from "../../../settings";
import { filePathInContentDir } from "./filepath-is-safe";

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
      !filePathInContentDir(settings, path) ||
      (checkSourceFile && !filePathInContentDir(settings, sourceFileName))
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
