import React from "react";
import { StreamingContext } from "./use-streaming";

export function StreamingProvider({ children }: { children: React.ReactNode }) {
    const [isStreaming, setStreaming] = React.useState(false);
    return (
        <StreamingContext.Provider value={{ isStreaming, setStreaming }}>
            {children}
        </StreamingContext.Provider>
    )
}