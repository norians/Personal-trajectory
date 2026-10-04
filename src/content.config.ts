import { defineCollection } from 'astro:content';
import { docsLoader as starlightDocsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const docsLoader = starlightDocsLoader();

const docsLoaderWithInferredTitles = {
	...docsLoader,
	load: (context) =>
		docsLoader.load({
			...context,
			parseData: ({ id, data, filePath }) =>
				context.parseData({
					id,
					filePath,
					data: {
						...data,
						title: data.title || inferTitle(filePath),
					},
				}),
		}),
};

function inferTitle(filePath) {
	const fileName = filePath.split(/[\\/]/).pop() ?? '';
	const title = fileName
		.replace(/\.(?:md|mdx)$/i, '')
		.replace(/[-_]+/g, ' ')
		.trim();
	return title ? title[0].toLocaleUpperCase('es') + title.slice(1) : 'Nota sin título';
}

export const collections = {
	docs: defineCollection({ loader: docsLoaderWithInferredTitles, schema: docsSchema() }),
};
