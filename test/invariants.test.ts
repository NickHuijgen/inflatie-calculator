import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';

// The pairings AGENTS.md lists under Invariants: things that have to say the
// same thing in two files or the site silently breaks, and that neither
// `astro check` nor the build can see. Checked here as text, because that is
// how they are written -- an id in an .astro file against the string a script
// looks it up with.

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

/** Every id the script looks up with element('...'). */
function lookedUpIds(script: string): string[] {
  return [...script.matchAll(/element(?:<[^>]*>)?\('([^']+)'\)/g)].map(match => match[1]);
}

describe('every element a script writes into exists in its component', () => {
  for (const [script, component] of [
    ['src/scripts/calculator.ts', 'src/components/Calculator.astro'],
    ['src/scripts/salary.ts', 'src/components/SalaryCalculator.astro'],
  ]) {
    it(`${script} -> ${component}`, () => {
      const markup = read(component);

      for (const id of lookedUpIds(read(script))) {
        // A missing id is `null` at runtime, the script throws on load, and
        // the calculator is dead on a page that still looks fine.
        assert.ok(markup.includes(`id="${id}"`), `${component} has no id="${id}"`);
      }
    });
  }
});

describe('the data-embedding components', () => {
  it('render every element their script fills in unconditionally', () => {
    // An element behind {cond && ...} is not in the HTML, so the script finds
    // null. The components use `hidden` instead; this catches a regression.
    for (const component of ['src/components/Calculator.astro', 'src/components/SalaryCalculator.astro']) {
      const markup = read(component);

      for (const match of markup.matchAll(/\{[^{}]*&&\s*\(?\s*<[a-z]/g)) {
        const snippet = markup.slice(match.index, match.index + 200);

        assert.ok(!/id="/.test(snippet.split('\n')[0]), `${component}: conditional element with an id: ${snippet.split('\n')[0]}`);
      }
    }
  });

  it('are never two on one page', () => {
    // Both embed <script id="cbs-data">, and both scripts assume their ids
    // are unique on the page.
    for (const page of readdirSync(new URL('src/pages/', root), { recursive: true, encoding: 'utf8' })) {
      if (!page.endsWith('.astro')) {
        continue;
      }

      const source = read(`src/pages/${page}`);
      const calculators = (source.match(/<(Calculator|SalaryCalculator)\b/g) ?? []).length;

      assert.ok(calculators <= 1, `src/pages/${page} renders ${calculators} calculators`);
    }
  });
});

describe('the JSON-LD graph', () => {
  // Both halves of a pairing have to be on the same page, or the @id in the
  // one that is there points at a node that is not.
  for (const page of ['src/pages/index.astro', 'src/pages/salaris.astro', 'src/pages/[currency]/[year].astro']) {
    it(page, () => {
      const source = read(page);

      assert.ok(source.includes('websiteSchema('), 'every indexable page emits the WebSite node');

      if (source.includes('webApplicationSchema(')) {
        assert.ok(source.includes('homePageSchema('), 'webApplicationSchema() needs the WebPage it points at');
      }

      if (source.includes('webPageSchema(')) {
        const optsOut = /breadcrumb:\s*false/.test(source);

        assert.equal(source.includes('breadcrumbSchema('), !optsOut, optsOut
          ? 'breadcrumb: false, so there must be no BreadcrumbList'
          : 'webPageSchema() references a breadcrumb, so the page must emit one');
      }
    });
  }
});

describe('the header', () => {
  it('links to paths that end in a slash, as trailingSlash: always builds them', () => {
    // aria-current is decided by comparing Astro.url.pathname with the href,
    // so a missing slash silently stops the current page being marked.
    for (const [, href] of read('src/components/Header.astro').matchAll(/href:\s*'([^']+)'/g)) {
      assert.ok(href.endsWith('/'), `${href} should end in a slash`);
    }
  });
});

describe('the shareable URL parameters', () => {
  it('keep the names people have already shared, and mean the same on both pages', () => {
    const shared = { amount: 'bedrag', startYear: 'van', endYear: 'naar', month: 'maand' };

    for (const script of ['src/scripts/calculator.ts', 'src/scripts/salary.ts']) {
      const params = Object.fromEntries([...read(script).matchAll(/(\w+): '([a-z]+)'/g)].map(match => [match[1], match[2]]));

      for (const [key, name] of Object.entries(shared)) {
        assert.equal(params[key], name, `${script}: ${key} is shared, renaming it breaks every shared link`);
      }
    }
  });
});

describe('the year page URLs', () => {
  it('are restated by hand in _redirects, so the prefixes have to match', () => {
    const redirects = read('public/_redirects');

    for (const currency of ['gulden', 'euro']) {
      assert.ok(read('src/lib/year-pages.ts').includes(`'${currency}'`), `year-pages.ts no longer builds /${currency}/`);
      assert.ok(redirects.includes(`/${currency}/:year /${currency}/:year/ 301`), `_redirects has no rule for /${currency}/`);
    }
  });
});
