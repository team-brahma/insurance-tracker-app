// import esbuild from 'esbuild';
// import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'fs';
// import { join } from 'path';

// // Output directory at the workspace root
// const DEPLOY_DIR = join(process.cwd(), '../../dist-api');

// async function build() {
//   try {
//     console.log('🧹 Cleaning old deployment files in dist-api...');
//     rmSync(DEPLOY_DIR, { recursive: true, force: true });

//     console.log('⚡ Reading package.json...');
//     const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

//     // Filter out internal workspace packages from the external list
//     // Local workspace packages (starting with @repo/) will be bundled in by esbuild
//     const externalDependencies = Object.keys(pkg.dependencies || {}).filter(
//       (dep) => !dep.startsWith('@repo/')
//     );

//     // Native modules and database drivers that shouldn't be bundled due to binary/platform dependencies
//     const external = [
//       ...externalDependencies,
//       'prisma',
//       '@prisma/client',
//       '@prisma/client/runtime/library',
//       'mariadb',
//       'bcryptjs'
//     ];

//     console.log('⚡ Bundling API with esbuild...');
//     await esbuild.build({
//       entryPoints: ['src/server.ts'],
//       bundle: true,
//       platform: 'node',
//       target: 'node22', // Fastify 5 + Node 22+ support
//       outfile: 'dist/server.js',
//       format: 'esm',
//       external,
//       sourcemap: true,
//     });
//     console.log('✨ Bundle generated in dist/server.js');

//     // Create target deployment directories
//     mkdirSync(join(DEPLOY_DIR, 'dist'), { recursive: true });
//     mkdirSync(join(DEPLOY_DIR, 'prisma'), { recursive: true });

//     // Copy bundled files
//     console.log('📦 Copying build files to dist-api...');
//     cpSync('dist/server.js', join(DEPLOY_DIR, 'dist/server.js'));
//     cpSync('dist/server.js.map', join(DEPLOY_DIR, 'dist/server.js.map'));

//     // Copy Prisma schema
//     console.log('📦 Copying Prisma schema...');
//     cpSync('prisma/schema.prisma', join(DEPLOY_DIR, 'prisma/schema.prisma'));

//     // Copy migrations if they exist
//     if (existsSync('prisma/migrations')) {
//       console.log('📦 Copying Prisma migrations...');
//       cpSync('prisma/migrations', join(DEPLOY_DIR, 'prisma/migrations'), { recursive: true });
//     }

//     // Copy seed files if they exist
//     if (existsSync('prisma/seed.ts')) {
//       console.log('📦 Copying prisma/seed.ts...');
//       cpSync('prisma/seed.ts', join(DEPLOY_DIR, 'prisma/seed.ts'));
//     }
//     if (existsSync('prisma/seed-comprehensive.ts')) {
//       console.log('📦 Copying prisma/seed-comprehensive.ts...');
//       cpSync('prisma/seed-comprehensive.ts', join(DEPLOY_DIR, 'prisma/seed-comprehensive.ts'));
//     }

//     // Copy production .env if it exists
//     if (existsSync('.env.production')) {
//       console.log('📦 Copying .env.production to dist-api/.env...');
//       cpSync('.env.production', join(DEPLOY_DIR, '.env'));
//     }

//     // Generate prisma.config.js for production (required by Prisma 7 CLI)
//     console.log('📄 Generating production prisma.config.js...');
//     const prismaConfigContent = `import 'dotenv/config';

// const DATABASE_URL = process.env.DATABASE_URL;

// if (!DATABASE_URL) {
//   throw new Error('DATABASE_URL environment variable is required');
// }

// export default {
//   schema: 'prisma/schema.prisma',
//   migrations: {
//     path: 'prisma/migrations',
//     seed: 'tsx prisma/seed.ts',
//   },
//   datasource: {
//     url: DATABASE_URL,
//   },
// };
// `;
//     writeFileSync(join(DEPLOY_DIR, 'prisma.config.js'), prismaConfigContent, 'utf8');

//     // Generate production package.json dynamically with exact version pins from package.json
//     console.log('📄 Generating production package.json...');

//     // Core dependencies to copy
//     const targetDeps = [
//       'fastify',
//       '@fastify/cors',
//       '@fastify/helmet',
//       '@fastify/sensible',
//       '@prisma/client',
//       '@prisma/adapter-mariadb',
//       '@prisma/config',
//       'dotenv',
//       'mariadb',
//       'bcryptjs',
//       'jsonwebtoken',
//       'node-cron',
//       'firebase-admin'
//     ];

//     const prodDeps = {};
//     for (const dep of targetDeps) {
//       if (pkg.dependencies[dep]) {
//         prodDeps[dep] = pkg.dependencies[dep];
//       }
//     }

//     // Include prisma as a dependency on the server so client generation and migration commands run successfully
//     prodDeps['prisma'] = pkg.devDependencies['prisma'] || '7.8.0';

//     const prodPackage = {
//       name: "insurance-tracker-api",
//       version: pkg.version || "0.0.1",
//       type: "module",
//       main: "dist/server.js",
//       engines: {
//         "node": ">=22.0.0"
//       },
//       scripts: {
//         "start": "node dist/server.js",
//         "postinstall": "prisma generate"
//       },
//       dependencies: prodDeps
//     };

//     writeFileSync(
//       join(DEPLOY_DIR, 'package.json'),
//       JSON.stringify(prodPackage, null, 2),
//       'utf8'
//     );

//     console.log('============================================================');
//     console.log('🎉 SUCCESS! Deployable package created in:');
//     console.log(`📂 ${DEPLOY_DIR}`);
//     console.log('============================================================');
//   } catch (error) {
//     console.error('❌ Build failed:', error);
//     process.exit(1);
//   }
// }

// build();
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Output directory at the workspace root
const DEPLOY_DIR = join(process.cwd(), '../../dist-api');

async function build() {
  try {
    console.log('🧹 Cleaning old deployment files in dist-api...');
    rmSync(DEPLOY_DIR, { recursive: true, force: true });

    console.log('⚡ Reading package.json...');
    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

    // Bundle everything except workspace packages and native modules
    const externalDependencies = Object.keys(pkg.dependencies || {}).filter(
      (dep) => !dep.startsWith('@repo/'),
    );

    const external = [
      ...externalDependencies,
      'prisma',
      '@prisma/client',
      '@prisma/client/runtime/library',
      'mariadb',
      'bcryptjs',
    ];

    console.log('⚡ Bundling API with esbuild...');

    await esbuild.build({
      entryPoints: ['src/server.ts'],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      outfile: 'dist/server.js',
      sourcemap: true,
      external,
    });

    console.log('✨ Bundle generated in dist/server.js');

    // ------------------------------------------------------------------
    // Create deployment directories
    // ------------------------------------------------------------------

    mkdirSync(join(DEPLOY_DIR, 'dist'), { recursive: true });
    mkdirSync(join(DEPLOY_DIR, 'prisma'), { recursive: true });

    // ------------------------------------------------------------------
    // Copy build output
    // ------------------------------------------------------------------

    console.log('📦 Copying build files...');
    cpSync('dist/server.js', join(DEPLOY_DIR, 'dist/server.js'));
    cpSync('dist/server.js.map', join(DEPLOY_DIR, 'dist/server.js.map'));

    // ------------------------------------------------------------------
    // Copy Prisma
    // ------------------------------------------------------------------

    console.log('📦 Copying Prisma schema...');
    cpSync('prisma/schema.prisma', join(DEPLOY_DIR, 'prisma/schema.prisma'));

    if (existsSync('prisma/migrations')) {
      console.log('📦 Copying Prisma migrations...');
      cpSync('prisma/migrations', join(DEPLOY_DIR, 'prisma/migrations'), { recursive: true });
    }

    if (existsSync('prisma/seed.ts')) {
      console.log('📦 Copying prisma/seed.ts...');
      cpSync('prisma/seed.ts', join(DEPLOY_DIR, 'prisma/seed.ts'));
    }

    if (existsSync('prisma/seed-comprehensive.ts')) {
      console.log('📦 Copying prisma/seed-comprehensive.ts...');
      cpSync('prisma/seed-comprehensive.ts', join(DEPLOY_DIR, 'prisma/seed-comprehensive.ts'));
    }

    // ------------------------------------------------------------------
    // Copy production environment
    // ------------------------------------------------------------------

    if (existsSync('.env.production')) {
      console.log('📦 Copying .env.production...');
      cpSync('.env.production', join(DEPLOY_DIR, '.env'));
    }

    // ------------------------------------------------------------------
    // Generate prisma.config.js
    // ------------------------------------------------------------------

    console.log('📄 Generating prisma.config.js...');

    const prismaConfigContent = `import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: DATABASE_URL,
  },
};
`;

    writeFileSync(join(DEPLOY_DIR, 'prisma.config.js'), prismaConfigContent, 'utf8');

    // ------------------------------------------------------------------
    // Generate production package.json
    // ------------------------------------------------------------------

    console.log('📄 Generating production package.json...');

    // Copy ALL runtime dependencies except workspace packages
    const prodDependencies = {};

    for (const [name, version] of Object.entries(pkg.dependencies || {})) {
      if (!name.startsWith('@repo/')) {
        prodDependencies[name] = version;
      }
    }

    // Prisma CLI is needed on production for:
    // - prisma generate
    // - prisma migrate deploy
    if (pkg.devDependencies?.prisma) {
      prodDependencies.prisma = pkg.devDependencies.prisma;
    }

    const prodPackage = {
      name: pkg.name || 'insurance-tracker-api',
      version: pkg.version || '0.0.1',
      private: true,
      type: 'module',
      main: 'dist/server.js',
      engines: {
        node: '>=22.0.0',
      },
      scripts: {
        start: 'node dist/server.js',
        postinstall: 'prisma generate',
      },
      dependencies: prodDependencies,
    };

    writeFileSync(join(DEPLOY_DIR, 'package.json'), JSON.stringify(prodPackage, null, 2), 'utf8');

    console.log('============================================================');
    console.log('🎉 SUCCESS! Deployable package created successfully');
    console.log(`📂 ${DEPLOY_DIR}`);
    console.log(`📦 ${Object.keys(prodDependencies).length} production dependencies included`);
    console.log('============================================================');
  } catch (error) {
    console.error('❌ Build failed');
    console.error(error);
    process.exit(1);
  }
}

build();
