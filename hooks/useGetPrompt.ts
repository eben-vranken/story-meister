import { useEffect, useState } from "react";
import elements from "@/public/story_prompt_elements.json";

export interface Prompt {
    subject: string;
    verb: string;
    object: string;
    setting: string;
    consequences: string;
}

// helper to pick a random element
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// prepend a random adjective to the provided noun
const withAdjective = (noun: string) => `${pick(elements.adjectives)} ${noun}`;

export default function useGetPrompt(active: boolean) {
    const [prompt, setPrompt] = useState<Prompt | null>(null);

    useEffect(() => {
        if (active) {
            const subjectNoun = pick(elements.subjects);

            setPrompt({
                subject: withAdjective(subjectNoun),
                verb: pick(elements.verbs),
                object: pick(elements.objects),
                setting: pick(elements.settings),
                consequences: pick(elements.consequences),
            });
        } else {
            setPrompt(null);
        }
    }, [active]);

    return prompt;
}
