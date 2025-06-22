'use client';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

/* --------------------------------------------------------------------------
   TYPES
   --------------------------------------------------------------------------*/

type PromptStoryRow = {
    id: number;
    story: string;
    subject: string;
    verb: string;
    object_: string;
    setting: string;
    consequences: string;
    created_at: string;
    kind: 'prompt';
};

type SelfWrittenStoryRow = {
    id: number;
    story: string;
    name: string;
    created_at: string;
    kind: 'self';
};

type AnyStoryRow = PromptStoryRow | SelfWrittenStoryRow;

/* --------------------------------------------------------------------------
   COMPONENT
   --------------------------------------------------------------------------*/

const Stories = () => {
    /* ─────────────────────────────────────────────── state ── */
    const [stories, setStories] = useState<AnyStoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [openIds, setOpenIds] = useState<Set<number>>(new Set());

    /* ─────────────────────────────────── helpers ── */
    const fetchStories = async () => {
        setLoading(true);
        try {
            const [promptRows, selfRows] = await Promise.all([
                invoke<Omit<PromptStoryRow, 'kind'>[]>('list_stories'),
                invoke<Omit<SelfWrittenStoryRow, 'kind'>[]>('list_self_written_stories'),
            ]);

            /*  Tag the rows with their origin & merge  */
            const unified: AnyStoryRow[] = [
                ...promptRows.map(r => ({ ...r, kind: 'prompt' as const })),
                ...selfRows.map(r => ({ ...r, kind: 'self' as const })),
            ].sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setStories(unified);
        } catch (err) {
            console.error('[UI] ❌ fetch stories failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const handleDelete = async (row: AnyStoryRow) => {
        try {
            if (row.kind === 'prompt') {
                await invoke('delete_story', { id: row.id });
            } else {
                await invoke('delete_self_written_story', { id: row.id });
            }

            /*  Remove locally & close row (if open)  */
            setStories(prev => prev.filter(s => s.id !== row.id));
            setOpenIds(prev => {
                const next = new Set(prev);
                next.delete(row.id);
                return next;
            });
        } catch (err) {
            console.error('[UI] ❌ delete_story failed:', err);
        }
    };

    const toggle = (id: number) =>
        setOpenIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    /* ─────────────────────────────── UI ── */
    if (loading) {
        return (
            <main className="h-full w-full flex items-center justify-center">
                <span className="animate-pulse text-lg">Loading…</span>
            </main>
        );
    }

    return (
        <main className="h-full w-full flex flex-col gap-y-4 mb-10 mt-2">
            <h1 className="text-xl font-bold">All Stories</h1>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="border-b">
                        <tr>
                            <th className="p-2 w-10" />
                            <th className="p-2">Type</th>
                            <th className="p-2">Prompt / Name</th>
                            <th className="p-2 whitespace-nowrap">Created</th>
                        </tr>
                    </thead>

                    <tbody>
                        {stories.map(s => (
                            <tr key={`${s.kind}-${s.id}`} className="border-b align-top">
                                {/* 🗑 delete */}
                                <td className="p-2 align-top">
                                    <button
                                        onClick={() => handleDelete(s)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </td>

                                {/* 📛 type */}
                                <td className="p-2 align-top">
                                    {s.kind === 'prompt' ? 'Prompt' : 'Self‑written'}
                                </td>

                                {/* ▸ / ▾ toggle & story preview */}
                                <td className="p-2">
                                    <button
                                        onClick={() => toggle(s.id)}
                                        className="w-full text-left"
                                    >
                                        <span className="mr-1">
                                            {openIds.has(s.id) ? '▾' : '▸'}
                                        </span>

                                        {s.kind === 'prompt' ? (
                                            <>
                                                <span className="text-pink-300">A {s.subject}</span>&nbsp;
                                                <span className="text-sky-300">{s.verb}</span>&nbsp;
                                                <span className="text-emerald-300">{s.object_}</span>&nbsp;
                                                <span className="text-violet-300">{s.setting}</span>&nbsp;
                                                <span className="text-amber-300">{s.consequences}</span>
                                            </>
                                        ) : (
                                            <span className="text-yellow-300">{s.name}</span>
                                        )}
                                    </button>

                                    {openIds.has(s.id) && (
                                        <pre className="mt-2 whitespace-pre-wrap">{s.story}</pre>
                                    )}
                                </td>

                                {/* 🕒 timestamp */}
                                <td className="p-2 text-sm opacity-70 whitespace-nowrap">
                                    {s.created_at}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
};

export default Stories;
