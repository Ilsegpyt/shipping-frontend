import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import api from "../../services/api";

export default function RichTextEditor({ value, onChange }) {
    const fileInputRef = useRef(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
            }),
            Image.configure({
                inline: false,
                allowBase64: false,
            }),
        ],
        content: value || "",
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        const currentContent = editor.getHTML();
        const nextContent = value || "";

        if (nextContent !== currentContent) {
            editor.commands.setContent(nextContent, false);
        }
    }, [editor, value]);

    const handleImageButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file || !editor) {
            return;
        }

        try {
            setUploadingImage(true);

            const formData = new FormData();
            formData.append("file", file);

            const response = await api.post(
                "/api/content/upload-image",
                formData
            );

            const imageUrl = response.data.url;

            editor
                .chain()
                .focus()
                .setImage({
                    src: `http://localhost:5250${imageUrl}`,
                })
                .run();
        } catch (error) {
            console.error("Failed to upload editor image:", error);
        } finally {
            setUploadingImage(false);
            event.target.value = "";
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        editor.chain().focus().toggleBold().run()
                    }
                    className={`rounded px-3 py-1.5 text-sm font-bold ${editor.isActive("bold")
                            ? "bg-slate-200"
                            : "hover:bg-slate-200"
                        }`}
                >
                    B
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                    }
                    className={`rounded px-3 py-1.5 text-sm italic ${editor.isActive("italic")
                            ? "bg-slate-200"
                            : "hover:bg-slate-200"
                        }`}
                >
                    I
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleHeading({ level: 2 })
                            .run()
                    }
                    className={`rounded px-3 py-1.5 text-sm font-semibold ${editor.isActive("heading", { level: 2 })
                            ? "bg-slate-200"
                            : "hover:bg-slate-200"
                        }`}
                >
                    H2
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleHeading({ level: 3 })
                            .run()
                    }
                    className={`rounded px-3 py-1.5 text-sm font-semibold ${editor.isActive("heading", { level: 3 })
                            ? "bg-slate-200"
                            : "hover:bg-slate-200"
                        }`}
                >
                    H3
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                    className={`rounded px-3 py-1.5 text-sm ${editor.isActive("bulletList")
                            ? "bg-slate-200"
                            : "hover:bg-slate-200"
                        }`}
                >
                    • List
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                    className={`rounded px-3 py-1.5 text-sm ${editor.isActive("orderedList")
                            ? "bg-slate-200"
                            : "hover:bg-slate-200"
                        }`}
                >
                    1. List
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleImageButtonClick}
                    disabled={uploadingImage}
                    className="rounded px-3 py-1.5 text-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {uploadingImage ? "Uploading..." : "Image"}
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                />

                <button
                    type="button"
                    onClick={() =>
                        editor.chain().focus().undo().run()
                    }
                    disabled={!editor.can().undo()}
                    className="rounded px-3 py-1.5 text-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Undo
                </button>

                <button
                    type="button"
                    onClick={() =>
                        editor.chain().focus().redo().run()
                    }
                    disabled={!editor.can().redo()}
                    className="rounded px-3 py-1.5 text-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Redo
                </button>
            </div>

            <EditorContent
                editor={editor}
                className="
                    min-h-[250px]
                    px-4
                    py-3
                    text-sm
                    outline-none
                    [&_h2]:mb-3
                    [&_h2]:text-2xl
                    [&_h2]:font-bold
                    [&_h3]:mb-2
                    [&_h3]:text-xl
                    [&_h3]:font-semibold
                    [&_ul]:ml-6
                    [&_ul]:list-disc
                    [&_ol]:ml-6
                    [&_ol]:list-decimal
                    [&_p]:mb-2
                    [&_img]:my-4
                    [&_img]:max-w-full
                    [&_img]:rounded-lg
                "
            />
        </div>
    );
}
