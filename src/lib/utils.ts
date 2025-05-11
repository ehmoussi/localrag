import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}


export function setDocumentTitle(title: string) {
    if (title === "")
        document.title = `LocalRag`;
    else
        document.title = `LocalRag - ${title}`;
}