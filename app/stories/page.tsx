'use client';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { StoryRow } from '@/hooks/useStories';   // just for the TS type

const Stories = () => {
    /* ─────────────────────────────────────────────── state ── */
    const [stories, setStories] = useState<StoryRow[]>([]);
    const [loading, setLoading] = useState(true);              // ✅ loading flag
    const [openIds, setOpenIds] = useState<Set<number>>(new Set()); // ✅ toggles

    /* ─────────────────────────────────── helpers ── */
    const fetchStories = async () => {
        setLoading(true);
        try {
            const res = await invoke<StoryRow[]>('list_stories');
            setStories(res);
        } catch (err) {
            console.error('[UI] ❌ list_stories failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            await invoke('delete_story', { id });
            /*  remove the story locally … */
            setStories(prev => prev.filter(s => s.id !== id));
            /* …and make sure its row is no longer “open” */
            setOpenIds(prev => {
                const next = new Set(prev);
                next.delete(id);
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
        <main className="h-full w-full flex flex-col gap-y-4 mb-10">
            <h1 className="text-xl font-bold">All Stories</h1>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="border-b">
                        <tr>
                            <th className="p-2 w-10" />
                            <th className="p-2">Prompt</th>
                            <th className="p-2 whitespace-nowrap">Created</th>
                        </tr>
                    </thead>

                    <tbody>
                        {stories.map(s => (
                            <tr key={s.id} className="border-b align-top">
                                {/* 🗑 delete */}
                                <td className="p-2 align-top">
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </td>

                                {/* ▸ / ▾ toggle & story */}
                                <td className="p-2">
                                    <button
                                        onClick={() => toggle(s.id)}
                                        className="w-full text-left"
                                    >
                                        <span className="mr-1">
                                            {openIds.has(s.id) ? '▾' : '▸'}
                                        </span>
                                        <span className="text-pink-300">A {s.subject}</span>&nbsp;
                                        <span className="text-sky-300">{s.verb}</span>&nbsp;
                                        <span className="text-emerald-300">{s.object_}</span>&nbsp;
                                        <span className="text-violet-300">{s.setting}</span>&nbsp;
                                        <span className="text-amber-300">{s.consequences}</span>
                                    </button>

                                    {openIds.has(s.id) && (
                                        <pre className="mt-2 whitespace-pre-wrap">{s.story}</pre>
                                    )}
                                </td>

                                {/* timestamp */}
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
