
export function Header() {
    return (
        <div className="flex-1 content-center overflow-y-auto px-6">
            <header className="m-auto flex max-w-96 flex-col gap-5 text-center">
                <h1 className="text-2xl font-semibold leading-none tracking-tight">AI Chatbot With RAG</h1>
                <p className="text-muted-foreground text-sm">
                    Connect an API Key from your provider and send a message to get started or
                    use a local model by installing&nbsp;
                    <a className="underline" href="https://ollama.com/download">Ollama</a>.
                </p>
            </header>
        </div >
    );
}
