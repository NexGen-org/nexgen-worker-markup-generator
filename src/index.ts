import { PageContext } from './@types';

export default {
	async fetch(request: Request): Promise<Response> {
		const rawHost = request.headers.get('host');
		const domain = rawHost?.split(':')[0]; // ← ポート番号を取り除く！
		const url = new URL(request.url);
		const pathParts = url.pathname.slice(1).split('/');

		if (!domain || pathParts[0] !== 'page' || !pathParts[1]) {
			return new Response('Invalid request', { status: 400 });
		}
		if (url.pathname === '/favicon.ico') {
			return new Response(null, { status: 204 });
		}

		const pageId = pathParts[1];

		const contextUrl = `https://nexgen-worker-data-transform.nexgen-data-transform.workers.dev/context/${domain}/${pageId}`;
		console.log(contextUrl);

		// 🔁 外部WorkerへHTTP fetch（データ取得）
		const contextRes = await fetch(contextUrl);

		if (!contextRes.ok) {
			return new Response('Failed to fetch context', { status: 502 });
		}

		const context: PageContext = await contextRes.json();

		const html = `
		<!DOCTYPE html>
		<html lang="ja">
		<head>
			<meta charset="UTF-8">
			<title>${context.page.title}</title>
			<style>
				body {
					font-family: sans-serif;
					padding: 2rem;
					background: #f9f9f9;
				}
				h1 {
					color: #333;
				}
				.content {
					margin-top: 1rem;
					font-size: 1.1rem;
				}
			</style>
		</head>
		<body>
			<h1>${context.page.title}</h1>
			<div class="content">
				${context.page.content}
			</div>
		</body>
		</html>
		`;

		return new Response(html, {
			headers: { 'Content-Type': 'text/html' },
		});
	},
};
