import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const argumentsMap = new Map(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.split('=');
  return [key, value.join('=')];
}));
const projectRoot = path.resolve(import.meta.dirname, '..');
const siteRoot = path.resolve(projectRoot, argumentsMap.get('--root') || 'dist');
const port = Number(argumentsMap.get('--port') || 4174);
const basePath = `/${(argumentsMap.get('--base-path') || '/').replace(/^\/+|\/+$/g, '')}${argumentsMap.get('--base-path') === '/' ? '' : '/'}`;
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

function sendFile(response, filePath, statusCode = 200) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes.get(path.extname(filePath)) || 'application/octet-stream'
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (!pathname.startsWith(basePath)) {
    sendFile(response, path.join(siteRoot, '404.html'), 404);
    return;
  }

  const relativePath = pathname.slice(basePath.length) || 'index.html';
  const requestedPath = path.resolve(siteRoot, relativePath);
  if (!requestedPath.startsWith(`${siteRoot}${path.sep}`)) {
    sendFile(response, path.join(siteRoot, '404.html'), 404);
    return;
  }

  try {
    const details = await stat(requestedPath);
    if (!details.isFile()) throw Object.assign(new Error('Not a file'), { code: 'ENOENT' });
    sendFile(response, requestedPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      response.writeHead(500).end('Internal Server Error');
      return;
    }
    sendFile(response, path.join(siteRoot, '404.html'), 404);
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Serving ${siteRoot} at http://127.0.0.1:${port}${basePath}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
