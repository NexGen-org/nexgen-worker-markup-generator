import { PageContext, Env } from './@types';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
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

		// 🔁 外部WorkerへHTTP fetch（データ取得）
		const contextRes = await fetch(contextUrl);

		if (!contextRes.ok) {
			return new Response('Failed to fetch context', { status: 502 });
		}

		const context: PageContext = await contextRes.json();

		const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

		const styleDirectives = ['高コントラスト配色', 'フォントサイズを大きく', '読みやすい余白', 'シンプルなレイアウト'];

		const prompt = `以下のページデータとスタイル方針に基づいて、HTMLとCSSの構造を生成してください。

ページタイトル: ${context.page.title}
コンテンツ: ${context.page.content}
スタイル方針:
${styleDirectives.map((d) => `- ${d}`).join('\n')}

制約:
- HTMLとCSSのみを含め、説明文や注釈は含めないこと
- CSSは外部ファイルにせず、<style>タグ内に含めること
`;
		const openaiRes = await fetch(OPENAI_API_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				messages: [
					{ role: 'system', content: 'あなたはHTML/CSSデザイナーです。' },
					{ role: 'user', content: prompt },
				],
				temperature: 0.7,
			}),
		});

		if (!openaiRes.ok) {
			const errorText = await openaiRes.text(); // レスポンス内容を確認
			console.error('OpenAI API error:', openaiRes.status, errorText);
			return new Response(`OpenAI API error: ${openaiRes.statusText}`, { status: 500 });
		}

		const result = (await openaiRes.json()) as {
			choices: Array<{
				message: {
					content: string;
				};
			}>;
		};
		let htmlContent = result.choices?.[0]?.message?.content || '';
		htmlContent = htmlContent.replace(/```[a-z]*\n?/g, '').replace(/```/g, '');

		return new Response(htmlContent, {
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
	},
};
