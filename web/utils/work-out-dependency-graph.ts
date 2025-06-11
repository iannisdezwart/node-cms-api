import { Settings } from "../../settings";
import { PageTypeHandler } from "../page-type-handler";

export const workOutDependencies = (settings: Settings) => {
  if (settings.dependencies === undefined) {
    return settings.pageTypeHandlers;
  }

  const pageTypesToWorkOut = new Set<string>(
    Object.keys(settings.pageTypeHandlers)
  );
  const workedOutPageTypes = new Set<string>();
  const resolvedOrdering: string[] = [];

  while (
    pageTypesToWorkOut.size > 0 &&
    workOutDependenciesPass(
      settings.dependencies,
      pageTypesToWorkOut,
      workedOutPageTypes,
      resolvedOrdering
    ) > 0
  );

  if (pageTypesToWorkOut.size > 0) {
    console.warn(
      "⚠️📄🔁 There are page types with unresolved dependencies: ",
      Array.from(pageTypesToWorkOut)
    );
    throw new Error("Unresolved dependencies");
  }

  const ret: Record<string, PageTypeHandler<any>> = {};
  for (const name of resolvedOrdering) {
    ret[name] = settings.pageTypeHandlers[name];
  }
  return ret;
};

const workOutDependenciesPass = (
  dependencies: Record<string, string[]>,
  pageTypesToWorkOut: Set<string>,
  workedOutPageTypes: Set<string>,
  resolvedOrdering: string[]
) => {
  let numWorkedOut = 0;
  for (const pageType of pageTypesToWorkOut) {
    const deps = dependencies[pageType] ?? [];
    let allDepsResolved = true;
    for (const dep of deps) {
      if (!workedOutPageTypes.has(dep)) {
        allDepsResolved = false;
        break;
      }
    }
    if (allDepsResolved) {
      numWorkedOut++;
      workedOutPageTypes.add(pageType);
      resolvedOrdering.push(pageType);
      pageTypesToWorkOut.delete(pageType);
    }
  }
  return numWorkedOut;
};
