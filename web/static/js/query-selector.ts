const $ = <T extends HTMLElement = HTMLElement>(query: string) =>
  document.querySelector<T>(query)!;

const $a = <T extends HTMLElement = HTMLElement>(query: string) =>
  Array.from(document.querySelectorAll<T>(query));

interface Element {
  $: <T extends HTMLElement = HTMLElement>(query: string) => T;
  $a: <T extends HTMLElement = HTMLElement>(query: string) => T[];
}

Element.prototype.$ = function <T extends HTMLElement = HTMLElement>(
  query: string
) {
  return (this as Element).querySelector<T>(query)!;
};

Element.prototype.$a = function <T extends HTMLElement = HTMLElement>(
  query: string
) {
  return Array.from((this as Element).querySelectorAll<T>(query));
};
