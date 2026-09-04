import ts from 'typescript';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const dir = 'packages/quiet-sounds';
mkdirSync(`${dir}/src`, { recursive: true });
mkdirSync(`${dir}/dist`, { recursive: true });
for (const name of ['engine', 'catalog', 'color', 'sequences']) {
  const source = readFileSync(`lib/audio/${name}.ts`, 'utf8').replace(
    /from '\.\/(engine|catalog)'/g,
    "from './$1.js'",
  );
  writeFileSync(`${dir}/src/${name}.ts`, source);
  const js = ts.transpile(source, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  });
  writeFileSync(`${dir}/dist/${name}.js`, js);
  if (name === 'engine') writeFileSync('public/quiet-engine.js', js);
}
const program = ts.createProgram(
  ['engine', 'catalog', 'color', 'sequences'].map(
    (name) => `${dir}/src/${name}.ts`,
  ),
  {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    skipLibCheck: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: `${dir}/dist`,
  },
);
const result = program.emit();
if (result.emitSkipped) throw new Error('Declaration emit failed');
writeFileSync(
  `${dir}/dist/index.js`,
  "export * from './engine.js';\nexport * from './catalog.js';\nexport * from './color.js';\nexport * from './sequences.js';\n",
);
writeFileSync(
  `${dir}/dist/index.d.ts`,
  "export * from './engine.js';\nexport * from './catalog.js';\nexport * from './color.js';\nexport * from './sequences.js';\n",
);
copyFileSync('public/licenses/QUIET-MIT.txt', `${dir}/LICENSE`);
writeFileSync(
  `${dir}/package.json`,
  JSON.stringify(
    {
      name: 'quiet-fx',
      version: '0.4.0',
      description: 'Gentle procedural sounds for interfaces and motion',
      type: 'module',
      main: './dist/index.js',
      types: './dist/index.d.ts',
      exports: {
        '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      },
      files: ['dist', 'src', 'LICENSE', 'README.md'],
      sideEffects: false,
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'git+https://github.com/filipeafns/quiet-fx.git',
        directory: 'packages/quiet-sounds',
      },
      homepage: 'https://quiet-fx.vercel.app',
      bugs: { url: 'https://github.com/filipeafns/quiet-fx/issues' },
    },
    null,
    2,
  ) + '\n',
);
