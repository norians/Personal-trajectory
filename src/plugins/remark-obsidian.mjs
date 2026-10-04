import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

const docsRoot = resolve('src/content/docs');
const notesRoot = resolve(docsRoot, 'apuntes');
const attachmentRoot = '/adjuntos/';

function normalizeSlug(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('es')
		.replace(/\\/g, '/')
		.replace(/\.(?:md|mdx)$/i, '')
		.replace(/[^a-z0-9/_-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^\/+|\/+$/g, '')
		.replace(/(^|\/)index$/g, '');
}

function getNoteIndex() {
	const index = new Map();
	const visit = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				visit(path);
				continue;
			}
			if (!['.md', '.mdx'].includes(extname(entry.name).toLowerCase())) continue;

			const relativePath = relative(notesRoot, path).split(sep).join('/');
			const route = normalizeSlug(`apuntes/${relativePath}`);
			const markdown = readFileSync(path, 'utf8');
			const title = markdown.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
			const aliases = [
				relativePath,
				basename(entry.name, extname(entry.name)),
				title?.[1] ?? title?.[2] ?? title?.[3],
			].filter(Boolean);
			for (const alias of aliases) {
				const key = normalizeSlug(alias);
				if (key && !index.has(key)) index.set(key, route);
			}
		}
	};

	visit(notesRoot);
	return index;
}

function makeWikiLink(target, label, index, currentFile) {
	const [page, heading] = target.split('#', 2);
	const cleanedPage = page.trim().replace(/^\/?apuntes\//, '');
	const relativePath = normalizeSlug(cleanedPage);
	const currentRoute = normalizeSlug(relative(notesRoot, currentFile));
	const currentDirectory = currentRoute.split('/').slice(0, -1).join('/');
	const localRoute = normalizeSlug(`${currentDirectory}/${cleanedPage}`);
	const resolvedRoute = index.get(relativePath) ?? index.get(localRoute) ?? `apuntes/${relativePath}`;
	const href = `/${resolvedRoute}/${heading ? `#${normalizeSlug(heading)}` : ''}`;
	const visibleLabel = label?.trim() || page.trim().split('/').pop().replace(/\.(?:md|mdx)$/i, '');
	return { type: 'link', url: href, children: [{ type: 'text', value: visibleLabel }] };
}

function transformTextNode(node, index, currentFile) {
	const pattern = /(!?)\[\[([^\]]+)\]\]/g;
	const nodes = [];
	let lastIndex = 0;
	let match;
	while ((match = pattern.exec(node.value))) {
		if (match.index > lastIndex) nodes.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
		const [target, label] = match[2].split('|', 2);
		if (match[1]) {
			const imagePath = target.trim().replace(/^\/?adjuntos\//, '');
			nodes.push({ type: 'image', url: `${attachmentRoot}${imagePath}`, alt: label?.trim() || basename(imagePath) });
		} else {
			nodes.push(makeWikiLink(target, label, index, currentFile));
		}
		lastIndex = pattern.lastIndex;
	}
	if (lastIndex < node.value.length) nodes.push({ type: 'text', value: node.value.slice(lastIndex) });
	return nodes.length ? nodes : [node];
}

function transformCallout(node) {
	if (node.type !== 'blockquote') return;
	const firstParagraph = node.children?.[0];
	const firstText = firstParagraph?.children?.[0];
	if (firstParagraph?.type !== 'paragraph' || firstText?.type !== 'text') return;
	const match = firstText.value.match(/^\[!(note|tip|important|warning|caution|danger|success|failure|question|quote|info|abstract)\][+-]?[ \t]*(.*)/i);
	if (!match) return;

	const type = match[1].toLowerCase();
	const title = match[2] || type[0].toUpperCase() + type.slice(1);
	firstText.value = firstText.value.replace(/^\[![^\]]+\][+-]?[ \t]*[^\n]*(?:\n|$)/, '');
	if (!firstText.value && firstParagraph.children.length === 1) node.children.shift();
	node.type = 'paragraph';
	node.data = {
		hName: 'aside',
		hProperties: { className: ['obsidian-callout', `obsidian-callout--${type}`], role: 'note' },
	};
	node.children = [
		{ type: 'paragraph', data: { hProperties: { className: ['obsidian-callout__title'] } }, children: [{ type: 'text', value: title }] },
		...node.children,
	];
}

export default function remarkObsidian() {
	return (tree, file) => {
		const index = getNoteIndex();
		const currentFile = file.history[0] ?? '';
		const visit = (parent) => {
			if (!Array.isArray(parent.children)) return;
			const children = [];
			for (const node of parent.children) {
				if (node.type === 'image' && /^\[([^\]]+)\]$/.test(node.url)) {
					const imageName = node.url.slice(1, -1);
					node.url = `${attachmentRoot}${imageName.replace(/^\/?adjuntos\//, '')}`;
					node.alt ||= basename(imageName);
				}
				if (node.type === 'text') children.push(...transformTextNode(node, index, currentFile));
				else {
					transformCallout(node);
					visit(node);
					children.push(node);
				}
			}
			parent.children = children;
		};
		visit(tree);
	};
}