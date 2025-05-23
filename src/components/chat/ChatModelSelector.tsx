import React from "react";
import { useModel } from "./use-model";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import ollama from 'ollama/browser';
import { getOllamaLastModel, setOllamaLastModel } from "@/lib/storage";


export function ChatModelSelector({ isDisabled }: { isDisabled: boolean }) {
    const { modelState, modelDispatch } = useModel();


    // Fetch all the models available
    React.useEffect(() => {
        let isMounted = true;
        const fetchModels = async () => {
            try {
                const responses = await ollama.list();
                if (isMounted) {
                    const models = responses.models.map((modelResponse) => modelResponse.name);
                    modelDispatch({ type: "SET_MODELS", payload: models });
                }
            } catch (error) {
                if (isMounted)
                    console.error("Failed to fetch the Ollama models:", error);
            };
        };
        fetchModels();
        return () => {
            isMounted = false;
            ollama.abort();
        };
    }, [modelDispatch]);

    const setCurrentModel = React.useCallback((currentModel: string) => {
        modelDispatch({ type: "SET_CURRENT_MODEL", payload: currentModel });
        setOllamaLastModel(currentModel);
    }, [modelDispatch]);

    // Set the last model used as the current model
    React.useEffect(() => {
        if (modelState.currentModel === undefined && modelState.models.length > 0) {
            const lastModel = getOllamaLastModel();
            // Retrieve the selected model during the last visit if available
            // Othewise select the first one
            if (lastModel && modelState.models.includes(lastModel))
                setCurrentModel(lastModel);
            else
                setCurrentModel(modelState.models[0]);
        }
        else
            console.log("failed to fetch the models");
    }, [modelState, setCurrentModel]);

    return (
        <Select
            disabled={isDisabled}
            value={modelState.currentModel ? modelState.currentModel : ""}
            onValueChange={setCurrentModel}>
            <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Models</SelectLabel>
                    {modelState.models.map(model => (
                        <SelectItem key={model} value={model}>
                            {model}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
