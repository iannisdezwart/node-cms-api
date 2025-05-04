import { PageType } from "../../db/types/page-type";

export const workOutDependencies = (
  dependencies: Record<string, string[]> | undefined,
  pageTypes: PageType[]
) => {
  if (dependencies === undefined) {
    return pageTypes;
  }

  const pageTypesToWorkOut = new Set<PageType>(pageTypes);
  const workedOutPageTypes = new Set<string>();
  const resolvedOrdering: PageType[] = [];

  while (
    pageTypesToWorkOut.size > 0 &&
    workOutDependenciesPass(
      dependencies,
      pageTypesToWorkOut,
      workedOutPageTypes,
      resolvedOrdering
    ) > 0
  );

  if (pageTypesToWorkOut.size > 0) {
    console.warn(
      "⚠️📄🔁 There are page types with unresolved dependencies: ",
      Array.from(pageTypesToWorkOut).map((pageType) => pageType.name)
    );
    throw new Error("Unresolved dependencies");
  }

  return resolvedOrdering;
};

const workOutDependenciesPass = (
  dependencies: Record<string, string[]>,
  pageTypesToWorkOut: Set<PageType>,
  workedOutPageTypes: Set<string>,
  resolvedOrdering: PageType[]
) => {
  let numWorkedOut = 0;
  for (const pageType of pageTypesToWorkOut) {
    const deps = dependencies[pageType.name] ?? [];
    let allDepsResolved = true;
    for (const dep of deps) {
      if (!workedOutPageTypes.has(dep)) {
        allDepsResolved = false;
        break;
      }
    }
    if (allDepsResolved) {
      numWorkedOut++;
      workedOutPageTypes.add(pageType.name);
      resolvedOrdering.push(pageType);
      pageTypesToWorkOut.delete(pageType);
    }
  }
  return numWorkedOut;
};
