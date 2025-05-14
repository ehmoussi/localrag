import { ConversationID } from "@/lib/db";
import React from "react";
import { WorkerPoolContext } from "./use-assistantstreaming";





export function WorkerPoolProvider({ children }: { children: React.ReactNode }) {
    const workerPoolRef = React.useRef<Map<ConversationID, Worker>>(undefined);
    if (workerPoolRef.current === undefined) {
        workerPoolRef.current = new Map();
    }

    // Clean the pool of workers when unmounting
    React.useEffect(() => {
        const workerPool = workerPoolRef.current;
        return () => {
            if (workerPool !== undefined) {
                workerPool.forEach((worker) => worker.terminate());
                workerPool.clear();
            }
        };
    }, []);

    return (
        <WorkerPoolContext.Provider value={workerPoolRef.current}>
            {children}
        </WorkerPoolContext.Provider>
    );
}