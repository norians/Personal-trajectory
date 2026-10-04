// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkObsidian from './src/plugins/remark-obsidian.mjs';

const homeLink = './src/components/HomeLink.astro';

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL ?? 'https://example.com',
	markdown: {
		processor: unified({
			remarkPlugins: [remarkObsidian, remarkMath],
			rehypePlugins: [rehypeKatex],
		}),
	},
	integrations: [
		sitemap(),
		starlight({
			title: 'No vas tarde en STEM',
			description: 'Mi trayectoria personal y mis apuntes de STEM.',
			locales: { root: { label: 'Español', lang: 'es' } },
			customCss: ['./src/styles/site.css'],
			components: {
				SocialIcons: homeLink,
				ThemeSelect: './src/components/ThemeToggle.astro',
			},
			plugins: [
				starlightSidebarTopics([
					{
						label: 'Personal',
						id: 'personal',
						link: '/',
						items: [
							{ label: 'Trayectoria', slug: 'trayectoria' },
						],
					},
					{
						label: 'Mis apuntes',
						id: 'apuntes',
						link: '/apuntes/',
						items: [
							{ label: 'Física I', items: [{ autogenerate: { directory: 'apuntes/fisica-1', collapsed: true } }] },
							{ label: 'Teoría de circuitos', items: [{ autogenerate: { directory: 'apuntes/teoria-de-circuitos', collapsed: true } }] },
							{ label: 'Fundamentos de computadores', items: [{ autogenerate: { directory: 'apuntes/fundamentos-de-computadores', collapsed: true } }] },
							{
								label: 'Matemáticas',
								items: [
									'apuntes/matematicas',
									{ label: 'Álgebra', items: [{ autogenerate: { directory: 'apuntes/matematicas/algebra', collapsed: true } }] },
									{ label: 'Análisis', items: [{ autogenerate: { directory: 'apuntes/matematicas/analisis', collapsed: true } }] },
									{ label: 'EDO', items: [{ autogenerate: { directory: 'apuntes/matematicas/edos', collapsed: true } }] },
									{ label: 'Estadística', items: [{ autogenerate: { directory: 'apuntes/matematicas/estadistica', collapsed: true } }] },
									{ label: 'Métodos numéricos', items: [{ autogenerate: { directory: 'apuntes/matematicas/metodos-numericos', collapsed: true } }] },
								],
							},
							'esenciales',
						],
					},
				], {
					topics: {
						personal: [
							'/trayectoria/**/*',
							'/dam',
							'/matematicas',
							'/ing-teleco',
							'/quien-soy',
							'/guides/**/*',
							'/reference/**/*',
						],
					},
					exclude: ['/404'],
				}),
			],
		}),
	],
});
