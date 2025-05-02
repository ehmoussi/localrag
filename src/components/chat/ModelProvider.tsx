import React from "react";
import { initialModelState, ModelContext, modelReducer } from "./use-model";



export function ModelProvider({ children }: { children: React.ReactNode }) {
    const [modelState, modelDispatch] = React.useReducer(modelReducer, initialModelState);
    return (
        <ModelContext.Provider value={{ modelState, modelDispatch }}>
            {children}
        </ModelContext.Provider>
    );
}
