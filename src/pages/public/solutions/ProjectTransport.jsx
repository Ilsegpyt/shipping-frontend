import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import contentService from '../../../services/contentService';
import { ArrowLeft, ArrowUpRight, Boxes } from 'lucide-react';


function decodeHtml(html = '') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
}

function parseProjectTransportContent(content) {
    const decodedBody = decodeHtml(content?.body || '');
    const doc = new DOMParser().parseFromString(decodedBody, 'text/html');

    let blocks = Array.from(
        doc.body?.querySelectorAll('h1, h2, h3, h4, p, li') || []
    )
        .map((element) => ({
            type: element.tagName.toLowerCase(),
            text: element.textContent?.replace(/\s+/g, ' ').trim() || '',
        }))
        .filter((item) => item.text);

    // CMS content may also be stored as plain text instead of HTML.
    // In that case, preserve every non-empty line instead of losing the body.
    if (blocks.length === 0 && decodedBody.trim()) {
        const lines = decodedBody
            .split(/\\r?\\n/)
            .map((line) => line.replace(/^\*\*(.*?)\*\*$/, '$1').trim())
            .filter(Boolean);

        blocks = lines.map((line) => ({
            type:
                /^[A-Z0-9][A-Z0-9\s.,'’()&–—-]{8,}$/.test(line)
                    ? 'h2'
                    : 'p',
            text: line,
        }));
    }

    const titleParts = (content?.title || '').split(/\s+-\s+/, 2);
    const title = titleParts[0]?.trim() || 'Project Transport';
    const subtitle =
        titleParts[1]?.trim() ||
        blocks.find((item) => item.type === 'p')?.text ||
        'When you need to move heavy, oversized or complex cargo, we can help';

    const headings = blocks.filter((item) =>
        ['h1', 'h2', 'h3', 'h4'].includes(item.type)
    );
    const paragraphs = blocks.filter((item) => item.type === 'p');
    const listItems = blocks.filter((item) => item.type === 'li');

    return {
        title,
        subtitle,
        headings,
        paragraphs,
        listItems,
        allBlocks: blocks,
    };
}

async function loadAllContent() {
    const result = [];
    const visited = new Set();

    async function visit(parentId = null) {
        const response = parentId
            ? await contentService.getChildren(parentId)
            : await contentService.getRootContent();

        const items = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.items)
                ? response.data.items
                : [];

        for (const item of items) {
            if (!item?.id || visited.has(item.id)) continue;

            visited.add(item.id);
            result.push(item);
            await visit(item.id);
        }
    }

    await visit();
    return result;
}

function ProjectTransport() {
    const [projectTransportContent, setProjectTransportContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);

        let cancelled = false;

        const loadContent = async () => {
            try {
                setIsLoading(true);

                const allContent = await loadAllContent();
                const content = allContent.find((item) => {
                    const title = item?.title?.trim().toLowerCase() || '';
                    return (
                        title === 'project transport' ||
                        title.startsWith('project transport -') ||
                        title.includes('projects transport')
                    );
                });

                if (!cancelled) {
                    setProjectTransportContent(content || null);
                }
            } catch (error) {
                console.error('Failed to load Project Transport content:', error);

                if (!cancelled) {
                    setProjectTransportContent(null);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadContent();

        return () => {
            cancelled = true;
        };
    }, []);

    const parsedContent = parseProjectTransportContent(projectTransportContent);
    const heroTitle = parsedContent.title;
    const heroSubtitle = parsedContent.subtitle;
    const bodyHeadings = parsedContent.headings;
    const bodyParagraphs = parsedContent.paragraphs;
    const bodyListItems = parsedContent.listItems;

    const projectHeading =
        bodyHeadings.find((item) =>
            item.text.toLowerCase().includes('project logistics')
        )?.text ||
        bodyHeadings[0]?.text ||
        'PROJECT LOGISTICS FOR MAJOR MOVES ANYWHERE IN THE WORLD';

    const projectParagraphs = bodyParagraphs;

    return (
        <main className="min-h-screen bg-white text-slate-900">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32">
                    <Link
                        to="/solutions"
                        className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Solutions
                    </Link>

                    <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />

                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                    ILS Solutions
                                </span>
                            </div>

                            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                {heroTitle}
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                {heroSubtitle}
                            </p>
                        </div>

                        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.14),transparent_32%)]" />

                            <div className="absolute inset-0 opacity-[0.08]">
                                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                                <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                                <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                            </div>

                            <div className="relative flex min-h-[430px] items-center justify-center">
                                <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-sky-400/20 bg-sky-400/10 text-sky-400 shadow-2xl">
                                    <Boxes size={52} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                                <p className="text-sm font-semibold text-white">
                                    {heroTitle}
                                </p>

                                <p className="mt-1 text-sm text-white/50">
                                    {heroSubtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Project Logistics */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        {heroTitle}
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        {projectHeading}
                    </h2>

                    <div className="mt-8 space-y-6 text-lg leading-8 text-slate-600">
                        {projectParagraphs.map((paragraph, index) => (
                            <p key={`project-paragraph-${index}`}>
                                {paragraph.text}
                            </p>
                        ))}

                        {bodyListItems.length > 0 && (
                            <ul className="space-y-3">
                                {bodyListItems.map((item, index) => (
                                    <li key={`project-list-${index}`} className="flex gap-3">
                                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {isLoading && (
                            <p className="text-base text-slate-400">
                                Loading content...
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            {heroTitle}
                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            {`Need support with ${heroTitle.toLowerCase()}?`}
                        </h2>
                    </div>

                    <a
                        href="/#contact"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        Discuss your requirements
                        <ArrowUpRight size={17} />
                    </a>
                </div>
            </section>
        </main>
    );
}

export default ProjectTransport;
