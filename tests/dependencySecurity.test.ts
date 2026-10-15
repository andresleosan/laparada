import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

interface BraceNode {
  type: string;
  value?: string;
  nodes?: BraceNode[];
  parent?: BraceNode;
}

interface Braces {
  (input: string): string[];
  parse(input: string): BraceNode;
  compile(input: string | BraceNode): string;
  expand(input: string | BraceNode): string[];
  stringify(input: string | BraceNode): string;
}

// Resolve the actual transitive dependency used by Tailwind, without adding a
// production dependency or coupling this check to pnpm's virtual-store paths.
const require = createRequire(import.meta.url);
const tailwindRequire = createRequire(require.resolve('tailwindcss/package.json'));
const micromatchRequire = createRequire(tailwindRequire.resolve('micromatch/package.json'));
const braces = micromatchRequire('braces') as Braces;

const MAX_DEPTH = 100;
const depthError = `Pattern nesting depth exceeds maximum (${MAX_DEPTH})`;
const walkers = ['compile', 'expand', 'stringify'] as const;

function nestedAst(depth: number): BraceNode {
  const root: BraceNode = { type: 'root', nodes: [] };
  let parent = root;
  for (let level = 0; level < depth; level++) {
    const child: BraceNode = { type: 'paren', nodes: [], parent };
    parent.nodes = [child];
    parent = child;
  }
  parent.nodes = [{ type: 'text', value: 'a', parent }];
  return root;
}

describe('braces recursion security (CVE-2026-93687)', () => {
  for (const [open, close] of [['{', '}'], ['(', ')']]) {
    const pattern = open.repeat(4500) + 'a' + close.repeat(4500);

    it(`rejects deeply nested ${open}${close} before recursive processing`, () => {
      // This payload stays below the package's existing 10,000-character cap.
      expect(pattern.length).toBeLessThan(10_000);
      for (const method of ['parse', ...walkers] as const) {
        expect(() => braces[method](pattern)).toThrowError(new SyntaxError(depthError));
      }
      expect(() => braces(pattern)).toThrowError(new SyntaxError(depthError));
    });

    it(`preserves supported ${open}${close} nesting at the limit`, () => {
      const supported = open.repeat(MAX_DEPTH) + 'a' + close.repeat(MAX_DEPTH);
      expect(braces.stringify(supported)).toBe(supported);
      expect(braces.compile(supported)).toBe(supported);
      expect(braces.expand(supported)).toEqual([supported]);
    });
  }

  for (const method of walkers) {
    it(`guards ${method} when callers supply an AST directly`, () => {
      expect(() => braces[method](nestedAst(4500))).toThrowError(new SyntaxError(depthError));
    });

    it(`preserves ${method} for supported caller-built ASTs`, () => {
      expect(braces[method](nestedAst(MAX_DEPTH)).toString()).toBe('a');
    });

    it(`bounds ${method} for cyclic child links`, () => {
      const cyclic: BraceNode = { type: 'root', nodes: [] };
      cyclic.nodes = [cyclic];
      expect(() => braces[method](cyclic)).toThrowError(new SyntaxError(depthError));
    });
  }

  it('counts mixed brace and parenthesis nesting together', () => {
    const mixed = '{'.repeat(50) + '('.repeat(51) + 'a' + ')'.repeat(51) + '}'.repeat(50);
    expect(() => braces.parse(mixed)).toThrowError(new SyntaxError(depthError));
  });

  it('preserves ordinary alternatives, numeric ranges, and escaped literals', () => {
    expect(braces.compile('src/{one,two}/{1..3}.ts')).toBe('src/(one|two)/([1-3]).ts');
    expect(braces.expand('src/{one,two}/{1..3}.ts')).toEqual([
      'src/one/1.ts', 'src/one/2.ts', 'src/one/3.ts',
      'src/two/1.ts', 'src/two/2.ts', 'src/two/3.ts',
    ]);
    const literal = '{'.repeat(150) + 'a' + '}'.repeat(150);
    expect(braces.stringify('"' + literal + '"')).toBe(literal);
    expect(braces.stringify('[' + literal + ']')).toBe('[' + literal + ']');
    expect(braces.stringify('\\{'.repeat(150))).toBe('{'.repeat(150));
  });
});
