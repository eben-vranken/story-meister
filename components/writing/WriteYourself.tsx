'use client'

import { invoke } from "@tauri-apps/api/core";
import { useState, useMemo, useEffect, FormEvent } from "react";
import { Pen } from "phosphor-react";

/**
 * TYPES ------------------------------------------------------------------
 */
export type SelfWrittenStoryRow = {
  id: number;
  story: string;
  name: string; // title supplied by the user
  created_at: string;
};

/**
 * LOCAL-STORAGE HELPERS --------------------------------------------------
 */
const LS_KEYS = {
  STORY: "draft_story_v1",
  TITLE: "draft_title_v1",
};

const loadDraft = (key: keyof typeof LS_KEYS) => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_KEYS[key]) || "";
};

const saveDraft = (key: keyof typeof LS_KEYS, value: string) => {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEYS[key], value);
};

const clearDraft = (key: keyof typeof LS_KEYS) => {
  if (typeof window !== "undefined") localStorage.removeItem(LS_KEYS[key]);
};

/**
 * COMPONENT --------------------------------------------------------------
 */
export default function WriteYourself() {
  /* TITLE ----------------------------------------------------------------*/
  const [title, setTitle] = useState<string>(() => loadDraft("TITLE"));

  /* STORY (with persistent draft) ---------------------------------------*/
  const [story, setStory] = useState<string>(() => loadDraft("STORY"));

  // Persist both drafts to localStorage whenever they change
  useEffect(() => {
    saveDraft("TITLE", title);
  }, [title]);

  useEffect(() => {
    saveDraft("STORY", story);
  }, [story]);

  const wordCount = useMemo<number>(
    () => (story.trim() ? story.trim().split(/\s+/).length : 0),
    [story]
  );

  /* HANDLERS -------------------------------------------------------------*/
  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || wordCount < 500) return; // Guard against edge-cases

    await invoke("save_self_written_story", {
      payload: {
        story,
        name: title,
      },
    });

    // Clear drafts
    clearDraft("TITLE");
    clearDraft("STORY");
    setTitle("");
    setStory("");

    // Optional: log current stories for debugging
    try {
      const stories = await invoke<SelfWrittenStoryRow[]>(
        "list_self_written_stories"
      );
      console.log("[UI] 📚 self-written stories after save:", stories);
    } catch (err) {
      console.error("[UI] ❌ list_self_written_stories failed:", err);
    }
  };

  /* DEBUG: Log existing stories once on mount ---------------------------*/
  useEffect(() => {
    (async () => {
      try {
        const stories = await invoke<SelfWrittenStoryRow[]>(
          "list_self_written_stories"
        );
        console.log("[UI] 📚 existing self-written stories:", stories);
      } catch (err) {
        console.error("[UI] ❌ list_self_written_stories failed:", err);
      }
    })();
  }, []);

  /* RENDER ---------------------------------------------------------------*/
  return (
    <main className="h-full w-full flex flex-col justify-between mb-10">
      {/* --- STORY FORM ---------------------------------------------- */}
      <form
        onSubmit={handleSave}
        className="gap-y-3 flex flex-col w-full border border-white/40 p-3 h-full"
      >
        <section className="flex justify-between items-center">
          <h1 className="text-light underline font-bold flex items-center gap-x-2">
            <Pen size={25} className="text-emerald-300" /> Write-Yourself
          </h1>
        </section>

        <section className="flex items-center gap-x-4">
          {/* Title input ------------------------------------------------*/}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Story title…"
            className="border border-gray-500 p-2 flex-1"
          />

          {/* Word counter & guidelines ----------------------------------*/}
          <section className="flex justify-end">
            <span className="opacity-80">
              <span
                className={wordCount >= 500 ? "text-green-500" : "text-red-500"}
              >
                {wordCount}
              </span>
              /500
            </span>
          </section>
        </section>

        <hr className="opacity-50" />

        {/* Story textarea ------------------------------------------ */}
        <textarea
          id="story"
          className="border border-gray-500 p-3 flex-1"
          rows={10}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Start writing…"
          spellCheck="true"
        />

        {/* Save button */}
        <button
          type="submit"
          disabled={!title.trim() || wordCount < 1}
          className={`border-2 px-3 text-lg font-bold transition-opacity ${!title.trim() || wordCount < 500
            ? "border-red-500 text-red-500 opacity-50 cursor-not-allowed"
            : "border-green-300 text-green-300 hover:opacity-100"
            }`}
        >
          Save
        </button>
      </form>
    </main>
  );
}