// Define the file content to append to a user message

export async function transformFilesToXmlContent(files: File[]): Promise<string> {
    let content = files.length > 0 ? "<Files>\n" : "";
    for (const [index, file] of files.entries()) {
        content += await transformFileToXmlContent(index + 1, file);

    }
    content += files.length > 0 ? "</Files>\n" : "";
    return content;
}

async function transformFileToXmlContent(index: number, file: File): Promise<string> {
    let content = `<File index='${index}' name='${file.name}'`;
    if (file.type !== "")
        content += ` type='${file.type}'`;
    content += ">\n";
    const eventFn = async (): Promise<string> => {
        const reader = new FileReader();
        return await new Promise((resolve) => {
            reader.onloadend = () => {
                if (reader.result !== null)
                    resolve(reader.result.toString());
                else
                    resolve("");
            };
            reader.readAsText(file);
        });
    }
    content += await eventFn();
    content += `\n</File>\n`;
    return content;
}