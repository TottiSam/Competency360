// Starts the production server inside the container.
// Hosts pass settings as environment variables, so this file only fills in what is missing.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// Session signing secret. Set JWT_SECRET as a secret on the host (recommended) so sign-ins
// survive restarts. If it is not set, a random one is created for this run, which only means
// everyone has to sign in again after a restart.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
}

const port = process.env.PORT || '7860';
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', port, '-H', '0.0.0.0'],
  { stdio: 'inherit', env: process.env }
);

server.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
