import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve relative to this module, never the process working directory.
// Deployment-injected variables take precedence over local .env values.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), override: false });
