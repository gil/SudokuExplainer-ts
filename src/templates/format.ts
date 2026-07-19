// Port of HtmlLoader.format (diuf/sudoku/tools/HtmlLoader.java): for each arg i,
// replace every literal occurrence of "{i}" with args[i].toString(). Java
// String.replace replaces all occurrences of the literal pattern.
export function format(template: string, ...args: Array<string | number>): string {
  let result = template;
  for (let i = 0; i < args.length; i++) {
    result = result.split(`{${i}}`).join(String(args[i]));
  }
  return result;
}
