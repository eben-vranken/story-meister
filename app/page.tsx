'use client'

import { invoke } from "@tauri-apps/api/core";
import { useState, useMemo, useEffect, FormEvent } from "react";
import useGetPrompt from "@/hooks/useGetPrompt";
import { Pen, ArrowClockwise } from "phosphor-react";

/**
 * TYPES ------------------------------------------------------------------
 */
export type StoryRow = {
  id: number;
  story: string;
  subject: string;
  verb: string;
  object_: string;
  setting: string;
  consequences: string;
  created_at: string;
};

export type Prompt = {
  subject: string;
  verb: string;
  object: string;
  setting: string;
  consequences: string;
};

/**
 * LOCAL‑STORAGE HELPERS --------------------------------------------------
 */
const LS_KEYS = {
  STORY: "draft_story_v1",
};

const loadDraftStory = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_KEYS.STORY) || "";
};

const saveDraftStory = (story: string) => {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEYS.STORY, story);
};

const clearDraftStory = () => {
  if (typeof window !== "undefined") localStorage.removeItem(LS_KEYS.STORY);
};

/**
 * COMPONENT --------------------------------------------------------------
 */
export default function Home() {
  /**
   * PROMPT --------------------------------------------------------------
   * `refreshToggle` is simply flipped each time the user clicks “New Prompt”.
   * Because it’s passed directly into `useGetPrompt`, every change triggers a
   * new fetch cycle. The hook stays happy (boolean), and we never have to rely
   * on truthy/falsey gymnastics.
   */
  const [refreshToggle, setRefreshToggle] = useState(true);
  const prompt = useGetPrompt(refreshToggle);

  /**
   * STORY (with persistent draft) ---------------------------------------
   */
  const [story, setStory] = useState<string>(() => loadDraftStory());

  // Persist the draft to localStorage whenever it changes
  useEffect(() => {
    saveDraftStory(story);
  }, [story]);

  const wordCount = useMemo<number>(
    () => (story.trim() ? story.trim().split(/\s+/).length : 0),
    [story]
  );

  /**
   * HANDLERS -------------------------------------------------------------
   */
  const handleNewPrompt = () => {
    // Force a false→true flip so useGetPrompt receives `true` again and fetches.
    setRefreshToggle(false);
    // Queue the second update in the next tick so React processes both.
    setTimeout(() => setRefreshToggle(true), 0);
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt || wordCount < 500) return; // Guard against edge‑cases

    await invoke("save_story", {
      payload: {
        story,
        subject: prompt.subject,
        verb: prompt.verb,
        object: prompt.object,
        setting: prompt.setting,
        consequences: prompt.consequences,
      },
    });

    clearDraftStory();
    setStory("");

    try {
      const stories = await invoke<StoryRow[]>("list_stories");
      console.log("[UI] 📚 stories after save:", stories);
    } catch (err) {
      console.error("[UI] ❌ list_stories after save failed:", err);
    }
  };

  /**
   * DEBUG: Log existing stories once on mount ---------------------------
   */
  useEffect(() => {
    (async () => {
      try {
        const stories = await invoke<StoryRow[]>("list_stories");
        console.log("[UI] 📚 existing stories:", stories);
      } catch (err) {
        console.error("[UI] ❌ list_stories failed:", err);
      }
    })();
  }, []);

  /**
   * RENDER ---------------------------------------------------------------
   */
  return (
    <main className="h-full w-full flex flex-col justify-between mb-10">
      {/* --- NEW PROMPT BUTTON (always visible) ---------------------- */}
      <button
        type="button"
        onClick={handleNewPrompt}
        title="Generate a new prompt"
        className="self-start mb-3 flex items-center gap-x-1 border border-emerald-300 px-2 py-1 text-sm rounded hover:bg-emerald-300/10 transition"
      >
        <ArrowClockwise size={16} className="text-emerald-300" /> New Prompt
      </button>

      {/* --- STORY FORM ---------------------------------------------- */}
      <form
        onSubmit={handleSave}
        className="gap-y-3 flex flex-col w-full border border-white/40 p-3 h-full"
      >
        <h1 className="text-light underline font-bold flex items-center gap-x-2">
          <Pen size={25} className="text-emerald-300" /> Story‑From‑Prompt
        </h1>

        {/* Prompt preview OR loading indicator ---------------------- */}
        {prompt ? (
          <section className="flex justify-between">
            <p className="italic opacity-80">
              <span className="text-pink-300">A {prompt.subject}</span>&nbsp;
              <span className="text-sky-300">{prompt.verb}</span>&nbsp;
              <span className="text-emerald-300">{prompt.object}</span>&nbsp;
              <span className="text-violet-300">{prompt.setting}</span>&nbsp;
              <span className="text-amber-300">{prompt.consequences}</span>.
            </p>

            {/* Word counter */}
            <span className="opacity-80">
              <span
                className={
                  wordCount >= 500 ? "text-green-500" : "text-red-500"
                }
              >
                {wordCount}
              </span>
              /500
            </span>
          </section>
        ) : (
          <p className="italic opacity-70">Fetching a fresh prompt…</p>
        )}

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
          disabled={!prompt || wordCount < 500}
          className={`border-2 px-3 text-lg font-bold transition-opacity ${!prompt || wordCount < 500
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
