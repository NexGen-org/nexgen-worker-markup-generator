export interface Env {
	SITE_KV: KVNamespace;
}

export interface PageContext {
	domain: string;
	page: {
		id: string;
		title: string;
		content: string;
		parent_id?: string | null;
		children: Array<{
			id: string;
			title: string;
		}>;
		created_at: string;
	};
	metadata: {
		source: 'kv';
		retrieved_at: string; // ISO 8601 (例: 2025-03-30T22:35:00Z)
		version?: string;
	};
}
