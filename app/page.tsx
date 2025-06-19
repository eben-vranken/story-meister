'use client'

import { invoke } from "@tauri-apps/api/core";
import { useState, useMemo, FormEvent, useEffect } from "react";
import useGetPrompt from "@/hooks/useGetPrompt";
import { Pen } from "phosphor-react";

type StoryRow = {
  id: number;
  story: string;
  subject: string;
  verb: string;
  object_: string;
  setting: string;
  consequences: string;
  created_at: string;
};

export default function Home() {
  const [day] = useState("Monday");
  const prompt = useGetPrompt(day === "Monday");

  const [story, setStory] = useState("");
  const wordCount = useMemo(
    () => (story.trim() ? story.trim().split(/\s+/).length : 0),
    [story]
  );

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

  async function handleSave() {
    await invoke("save_story", {
      /*  key MUST be called exactly `payload`
          because that’s the third parameter in Rust                   ↓↓↓↓ */
      payload: {
        story,
        subject: prompt?.subject,
        verb: prompt?.verb,
        object: prompt?.object,
        setting: prompt?.setting,
        consequences: prompt?.consequences,
      },
    });

    try {
      const stories = await invoke<StoryRow[]>("list_stories");
      console.log("[UI] 📚 stories after save:", stories);
    } catch (err) {
      console.error("[UI] ❌ list_stories after save failed:", err);
    }
  }

  return (
    <main className="h-full w-full flex flex-col justify-between mb-10">
      {prompt && (
        <form
          onSubmit={handleSave}
          className="gap-y-3 flex flex-col w-full border border-white/40  p-3 h-full"
        >
          <h1 className="text-light underline font-bold flex items-center gap-x-2">
            <Pen size={25} className="text-emerald-300" /> Story-From-Prompt
          </h1>

          <section className="flex justify-between">
            <p className="italic opacity-80">
              <span className="text-pink-300">A {prompt.subject}</span>&nbsp;
              <span className="text-sky-300">{prompt.verb}</span>&nbsp;
              <span className="text-emerald-300">{prompt.object}</span>&nbsp;
              <span className="text-violet-300">{prompt.setting}</span>&nbsp;
              <span className="text-amber-300">{prompt.consequences}</span>.
            </p>

            <span className="opacity-80">
              <span
                className={
                  wordCount > 500 ? "text-green-500" : "text-red-500"
                }
              >
                {wordCount}
              </span>
              /<span>500</span>
            </span>
          </section>

          <hr className="opacity-50" />

          <textarea
            id="story"
            className="border border-gray-500 p-3 flex-1"
            rows={10}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Start writing,..."
          />

          <button
            type="submit"
            className={`border-2 px-3 text-lg font-bold ${wordCount >= 500
              ? "border-green-300 text-green-300 hover:opacity-100"
              : "border-red-500 text-red-500 opacity-50"
              }`}
          >
            Save
          </button>
        </form>
      )}
    </main>
  );
}
