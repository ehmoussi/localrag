import React from "react";

type ModelAction =
    | { type: "SET_MODELS", payload: string[] }
    | { type: "SET_CURRENT_MODEL", payload: string | undefined };


interface ModelState {
    models: string[];
    currentModel: string | undefined;
}

interface IModelContext {
    modelState: ModelState;
    modelDispatch: React.Dispatch<ModelAction>;
}

export const ModelContext = React.createContext<IModelContext | undefined>(undefined);

export const initialModelState: ModelState = {
    models: [],
    currentModel: undefined
};

export function modelReducer(state: ModelState, action: ModelAction): ModelState {
    switch (action.type) {
        case "SET_CURRENT_MODEL":
            return { ...state, currentModel: action.payload };
        case "SET_MODELS":
            return { ...state, models: action.payload };
        default:
            return state;
    };
}


export function useModel(): IModelContext {
    const context = React.useContext(ModelContext);
    if (context === undefined) throw new Error("useModel can't be used outside a ModelProvider");
    return context;
}
