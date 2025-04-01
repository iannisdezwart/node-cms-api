import { resolve as resolvePath } from "path";
import { Settings } from "../../../settings";

export const filePathIsSafe = (settings: Settings, path: string): boolean =>
  resolvePath(path).startsWith(
    resolvePath(`${settings.webroot}/content`) + "/"
  );
