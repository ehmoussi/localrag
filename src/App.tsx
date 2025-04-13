import React, { useRef, useState } from "react";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Button } from "./components/ui/button";
import { ArrowUpIcon, PaperclipIcon } from "lucide-react";

function Header() {
    return (
        <header className="m-auto flex max-w-96 flex-col gap-5 text-center">
            <h1 className="text-2xl font-semibold leading-none tracking-tight">AI Chatbot With RAG</h1>
            <p className="text-muted-foreground text-sm">
                Connect an API Key from your provider and send a message to get started.
            </p>
        </header>
    );
}

function App() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [input, setInput] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    };

    const handleFileUpload = () => {

    };

    const handleKeyDown = () => {

    };

    const handleFileButtonClick = () => {

    };

    return (
        <TooltipProvider>
            <main className="ring-none mx-auto flex h-svh max-h-svh w-full max-w-[35rem] flex-col items-stretch border-none">
                <div className="flex-1 content-center overflow-y-auto px-6">{<Header />}</div>
                <form
                    onSubmit={handleSubmit}
                    className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex flex-col items-center rounded-[16px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
                >
                    <div className="flex w-full items-center">
                        <AutoResizeTextarea
                            onKeyDown={handleKeyDown}
                            onChange={(v) => { setInput(v) }}
                            value={input}
                            placeholder="Enter a message"
                            className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
                        />
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mr-1 size-6 rounded-full"
                                    onClick={handleFileButtonClick}
                                >
                                    <PaperclipIcon size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={12}>Attach file</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="size-6 rounded-full">
                                    <ArrowUpIcon size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={12}>Submit</TooltipContent>
                        </Tooltip>
                    </div>
                </form>
            </main>
        </TooltipProvider>
    )
}

export default App
