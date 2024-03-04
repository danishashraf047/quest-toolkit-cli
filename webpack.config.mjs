import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
    entry: './index.min.js',
    output: {
        filename: 'bundle.cjs',
        path: resolve(__dirname, 'dist'),
    },
    target: 'node',
};

export default config;