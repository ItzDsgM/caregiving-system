import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  collectCoverageFrom: [
    'src/**/*.ts',
    // Excluded: no executable business logic (bootstrap/wiring/declarative metadata)
    '!src/main.ts', // process bootstrap (covered by e2e)
    '!src/**/*.module.ts', // DI wiring only
    '!src/**/*.entity.ts', // TypeORM decorators only
    '!src/**/*.enum.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 20000,
};

export default config;
