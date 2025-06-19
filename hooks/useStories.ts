import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface StoryRow {
    id: number;
    story: string;
    subject: string;
    verb: string;
    object_: string;        // ← keep the underscore because Rust still returns it
    setting: string;
    consequences: string;
    created_at: string;
}

export function useStories() {
    const [stories, setStories] = useState<StoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const rows = await invoke<StoryRow[]>("list_stories");
                setStories(rows);
            } catch (err) {
                setError(`${err}`);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { stories, loading, error };
}
