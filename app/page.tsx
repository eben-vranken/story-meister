'use client'

import WriteFromPrompt from "@/components/writing/WriteFromPrompt"
import WriteYourself from "@/components/writing/WriteYourself"
import { useState } from "react"

const Home = () => {
    const [mode, setMode] = useState("from-prompt")

    const changeMode = (newMode: string) => {
        setMode(newMode);
    }

    return (
        <section className="h-full mb-10">
            <nav className="flex gap-x-8 items-center h-8">
                <span
                    className={`cursor-pointer ${mode === "from-prompt" ? 'opacity-80 underline' : 'opacity-50'}`}
                    onClick={() => changeMode('from-prompt')}
                >
                    from-prompt
                </span>
                <span
                    className={`cursor-pointer ${mode === "write-yourself" ? 'opacity-80 underline' : 'opacity-50'}`}
                    onClick={() => changeMode('write-yourself')}
                >
                    write-youself
                </span>
            </nav>

            {
                {
                    'from-prompt': <WriteFromPrompt />,
                    'write-yourself': <WriteYourself />
                }[mode]
            }

        </section>
    )
}

export default Home