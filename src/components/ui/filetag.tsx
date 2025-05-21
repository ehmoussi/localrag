import { Badge } from "./badge"
import { FileText, X } from "lucide-react"

export function FileTag({ filename, onRemove }: { filename: string; onRemove: (() => void) | undefined }) {
    return (
        <Badge
            variant="secondary"
            className="inline-flex items-center space-x-1 rounded-full px-2 py-1"
        >
            <FileText size={14} />
            <span className="text-sm">{filename}</span>
            {
                onRemove !== undefined &&
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <X size={12} />
                </button>
            }
        </Badge>
    )
}
