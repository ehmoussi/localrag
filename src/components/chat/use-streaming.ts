import React from "react";


interface IStreamingContext {
    isStreaming: boolean;
    setStreaming: (isStreaming: boolean) => void;
}

export const StreamingContext = React.createContext<IStreamingContext | undefined>(undefined);

export function useStreaming(): IStreamingContext {
    const context = React.useContext(StreamingContext);
    if (context === undefined) throw new Error("useStreaming can't be used outside a StreamingProvider");
    return context;
}

