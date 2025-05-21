import { FileTag } from "../ui/filetag";

export function ChatFileTags({ files, onRemove }: { files: File[], onRemove: ((name: string) => void) | undefined }) {
    return (
        // files.length > 0 &&
        <div className="w-full flex flex-wrap gap-2 mb-3">
            {
                files.map((f) => {
                    return (
                        <FileTag key={f.name} filename={f.name} onRemove={onRemove !== undefined ? () => onRemove(f.name) : undefined} />
                    );
                })
            }
        </div>

    );
}