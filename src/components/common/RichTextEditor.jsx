import Cropper from "react-easy-crop";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useCurrentEditor,
  useEditor,
} from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import api from "../../services/api";

function ResizableImage({ editor, node, updateAttributes, selected, getPos }) {
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [previewSize, setPreviewSize] = useState(null);
  const previewSizeRef = useRef(null);

  const selectImage = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!editor || typeof getPos !== "function") return;

    const position = getPos();

    if (typeof position === "number") {
      editor.commands.setNodeSelection(position);
      editor.commands.focus();
    }
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragRef.current) return;

      const { startX, startY, startWidth, startHeight, direction } =
        dragRef.current;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      const nextWidth =
        direction === "width" || direction === "both"
          ? Math.max(60, startWidth + deltaX)
          : startWidth;

      const nextHeight =
        direction === "height" || direction === "both"
          ? Math.max(40, startHeight + deltaY)
          : startHeight;

      const nextSize = {
        width: nextWidth,
        height: nextHeight,
      };

      previewSizeRef.current = nextSize;
      setPreviewSize(nextSize);
    };

    const handlePointerUp = () => {
      const drag = dragRef.current;

      if (!drag) return;

      const current = previewSizeRef.current;

      if (current) {
        const attributes = {};

        if (drag.direction === "width" || drag.direction === "both") {
          attributes.imageWidth = `${Math.round(current.width)}px`;
        }

        if (drag.direction === "height" || drag.direction === "both") {
          attributes.imageHeight = `${Math.round(current.height)}px`;
        }
        updateAttributes(attributes);
      }

      previewSizeRef.current = null;
      dragRef.current = null;
      setPreviewSize(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateAttributes]);

  const startResize = (event, direction) => {
    event.preventDefault();
    event.stopPropagation();

    selectImage(event);

    if (!imageRef.current) return;

    const image = imageRef.current;
    const rect = image.getBoundingClientRect();

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      direction,
    };
  };

  const width =
    previewSize?.width != null
      ? `${Math.round(previewSize.width)}px`
      : node.attrs.imageWidth || "auto";

  const height =
    previewSize?.height != null
      ? `${Math.round(previewSize.height)}px`
      : node.attrs.imageHeight || "auto";

  const margins = {
    left: "0 auto 0 0",
    center: "0 auto",
    right: "0 0 0 auto",
  };

  const handleStyle = {
    position: "absolute",
    width: "14px",
    height: "14px",
    background: "#0ea5e9",
    border: "2px solid white",
    borderRadius: "3px",
    zIndex: 10,
    touchAction: "none",
  };

  return (
    <NodeViewWrapper
      as="div"
      className="my-2"
      style={{
        display: "flow-root",
        width: "100%",
        maxWidth: "100%",
        marginTop: node.attrs.imageSpacing || "0px",
        marginBottom: node.attrs.imageSpacing || "0px",
      }}
    >
      <div
        style={{
          width,
          maxWidth: "none",
          position: "relative",
          margin: margins[node.attrs.imageAlign] || margins.left,
          borderRadius: "12px",
        }}
      >
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          draggable={false}
          onClick={selectImage}
          onPointerDown={selectImage}
          style={{
            display: "block",
            width,
            height,
            maxWidth: "none",
            maxHeight: "none",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        />

        {selected && (
          <>
            <button
              type="button"
              contentEditable={false}
              aria-label="Resize image width"
              title="Drag horizontally to resize width"
              onPointerDown={(event) => startResize(event, "width")}
              style={{
                ...handleStyle,
                right: "-7px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "ew-resize",
              }}
            />

            <button
              type="button"
              contentEditable={false}
              aria-label="Resize image height"
              title="Drag vertically to resize height"
              onPointerDown={(event) => startResize(event, "height")}
              style={{
                ...handleStyle,
                bottom: "-7px",
                left: "50%",
                transform: "translateX(-50%)",
                cursor: "ns-resize",
              }}
            />

            <button
              type="button"
              contentEditable={false}
              aria-label="Resize image width and height"
              title="Drag to resize both dimensions"
              onPointerDown={(event) => startResize(event, "both")}
              style={{
                ...handleStyle,
                right: "-7px",
                bottom: "-7px",
                cursor: "nwse-resize",
              }}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

const ImageWithOptions = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      imageAlign: {
        default: "left",
        parseHTML: (element) =>
          element.getAttribute("data-image-align") || "left",
        renderHTML: (attributes) => ({
          "data-image-align": attributes.imageAlign,
        }),
      },

      imageWidth: {
        default: "auto",
        parseHTML: (element) =>
          element.getAttribute("data-image-width") || "auto",
        renderHTML: (attributes) => ({
          "data-image-width": attributes.imageWidth,
        }),
      },
      imageHeight: {
        default: "auto",
        parseHTML: (element) =>
          element.getAttribute("data-image-height") || "auto",
        renderHTML: (attributes) => ({
          "data-image-height": attributes.imageHeight,
        }),
      },

      imageMaxHeight: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-image-max-height") || "",
        renderHTML: (attributes) => ({
          "data-image-max-height": attributes.imageMaxHeight,
        }),
      },

      imageSpacing: {
        default: "0px",
        parseHTML: (element) =>
          element.getAttribute("data-image-spacing") || "0px",
        renderHTML: (attributes) => ({
          "data-image-spacing": attributes.imageSpacing,
        }),
      },

      imageLayout: {
        default: "above",
        parseHTML: (element) =>
          element.getAttribute("data-image-layout") || "above",
        renderHTML: (attributes) => ({
          "data-image-layout": attributes.imageLayout,
        }),
      },

      imageStyle: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          const align = attributes.imageAlign || "left";
          const width = attributes.imageWidth || "auto";
          const height = attributes.imageHeight || "auto";
          const maxHeight = attributes.imageMaxHeight || "";
          const spacing = attributes.imageSpacing || "0px";

          const margins = {
            left: "0 auto 0 0",
            center: "0 auto",
            right: "0 0 0 auto",
          };

          return {
            style: [
              "display: block",
              `width: ${width}`,
              "max-width: none",
              `height: ${height}`,
              "object-fit: fill",
              `margin: ${margins[align] || margins.left}`,
              `margin-top: ${spacing}`,
              `margin-bottom: ${spacing}`,
              `max-height: ${maxHeight || "none"}`,
              "border-radius: 12px",
            ].join("; "),
          };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImage);
  },
});

const createCroppedImage = async (imageSrc, pixelCrop) => {
  if (!pixelCrop) {
    throw new Error("Please select a crop area first.");
  }

  const response = await fetch(imageSrc);

  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status}`);
  }

  const imageBlob = await response.blob();
  const objectUrl = URL.createObjectURL(imageBlob);

  try {
    const image = document.createElement("img");

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(new Error("Could not load the original image."));
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(pixelCrop.width);
    canvas.height = Math.round(pixelCrop.height);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create image canvas.");
    }

    context.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not crop the image."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const controlClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

export default function RichTextEditor({ value, onChange }) {
  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const lastEmittedHtmlRef = useRef(value || "");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      ImageWithOptions.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: value || "",

    onSelectionUpdate: ({ editor }) => {
      const { selection } = editor.state;

      const isImageSelected =
        selection instanceof NodeSelection &&
        selection.node.type.name === "image";

      setSelectedImage(isImageSelected);
    },

    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextContent = value || "";
    const currentContent = editor.getHTML();

    // Don't reset the editor when React receives the HTML
    // that this editor has just emitted.
    if (nextContent === lastEmittedHtmlRef.current) {
      return;
    }

    if (nextContent !== currentContent) {
      editor.commands.setContent(nextContent, false);
    }

    lastEmittedHtmlRef.current = nextContent;
  }, [editor, value]);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !editor) return;

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/api/content/upload-image", formData);

      const imageUrl = response.data.url;

      editor
        .chain()
        .focus()
        .setImage({
          src: `http://localhost:5250${imageUrl}`,
          alt: file.name || "",
          imageAlign: "center",
          imageWidth: "400px",
          imageHeight: "300px",
          imageMaxHeight: "",
          imageSpacing: "0px",
          imageLayout: "above",
        })
        .run();

      setSelectedImage(true);
    } catch (error) {
      console.error("Failed to upload editor image:", error);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleApplyCrop = async () => {
    if (!editor || !editor.isActive("image") || !croppedAreaPixels) {
      alert("Please select a crop area first.");
      return;
    }

    try {
      setUploadingImage(true);

      const croppedBlob = await createCroppedImage(
        cropImageSrc,
        croppedAreaPixels,
      );

      const formData = new FormData();
      formData.append("file", croppedBlob, "cropped-image.png");

      const response = await api.post("/api/content/upload-image", formData);

      const imageUrl = response.data.url;

      editor
        .chain()
        .focus()
        .updateAttributes("image", {
          src: `http://localhost:5250${imageUrl}`,
          imageCrop: false,
          imageCropPosition: "50% 50%",
        })
        .run();

      setIsCropModalOpen(false);
      setCropImageSrc("");
      setCrop({ x: 0, y: 0 });
      setCropZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error("Failed to crop image:", error);
      alert("Failed to crop the image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const updateImageOption = (attribute, value) => {
    if (!editor || !editor.isActive("image")) return;

    editor
      .chain()
      .focus()
      .updateAttributes("image", { [attribute]: value })
      .run();

    setSelectedImage(true);
  };

  if (!editor) return null;

  const imageAttributes = editor.getAttributes("image");

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-3 py-1.5 text-sm font-bold ${
            editor.isActive("bold") ? "bg-slate-200" : "hover:bg-slate-200"
          }`}
        >
          B
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-3 py-1.5 text-sm italic ${
            editor.isActive("italic") ? "bg-slate-200" : "hover:bg-slate-200"
          }`}
        >
          I
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`rounded px-3 py-1.5 text-sm font-semibold ${
            editor.isActive("heading", { level: 2 })
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
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`rounded px-3 py-1.5 text-sm font-semibold ${
            editor.isActive("heading", { level: 3 })
              ? "bg-slate-200"
              : "hover:bg-slate-200"
          }`}
        >
          H3
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded px-3 py-1.5 text-sm ${
            editor.isActive("bulletList")
              ? "bg-slate-200"
              : "hover:bg-slate-200"
          }`}
        >
          • List
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded px-3 py-1.5 text-sm ${
            editor.isActive("orderedList")
              ? "bg-slate-200"
              : "hover:bg-slate-200"
          }`}
        >
          1. List
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="rounded px-3 py-1.5 text-sm hover:bg-slate-200 disabled:opacity-40"
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
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="rounded px-3 py-1.5 text-sm hover:bg-slate-200 disabled:opacity-40"
        >
          Undo
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="rounded px-3 py-1.5 text-sm hover:bg-slate-200 disabled:opacity-40"
        >
          Redo
        </button>
      </div>

      {selectedImage && editor.isActive("image") && (
        <div className="border-b border-slate-200 bg-sky-50 p-3">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Image settings
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* <button
              type="button"
              className="mb-3 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const attrs = editor.getAttributes("image");

                if (!attrs.src) return;

                setCropImageSrc(attrs.src);
                setIsCropModalOpen(true);
              }}
            >
              Crop image
            </button> */}

            {/* Image alignment */}

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Alignment
              <select
                className={controlClass}
                value={imageAttributes.imageAlign || "left"}
                onChange={(e) =>
                  updateImageOption("imageAlign", e.target.value)
                }
              >
                {imageAttributes.imageLayout === "left" ||
                imageAttributes.imageLayout === "right" ? (
                  <>
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </>
                ) : (
                  <>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </>
                )}
              </select>
            </label>

            {/* Width in pixels */}
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Width (px)
              <input
                type="number"
                min="60"
                max="2000"
                className={controlClass}
                value={parseFloat(imageAttributes.imageWidth) || ""}
                placeholder="Auto"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    updateImageOption("imageWidth", "auto");
                    return;
                  }
                  updateImageOption("imageWidth", `${value}px`);
                }}
              />
            </label>

            {/* Height in pixels */}
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Height (px)
              <input
                type="number"
                min="40"
                max="1200"
                className={controlClass}
                value={parseFloat(imageAttributes.imageHeight) || ""}
                placeholder="Auto"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    updateImageOption("imageHeight", "auto");
                    return;
                  }
                  updateImageOption("imageHeight", `${value}px`);
                }}
              />
            </label>

            {/* Text layout */}
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Image & text layout
              <select
                className={controlClass}
                value={imageAttributes.imageLayout || "above"}
                onChange={(e) =>
                  updateImageOption("imageLayout", e.target.value)
                }
              >
                <option value="above">Image above text</option>
                <option value="left">Image left, text beside it</option>
                <option value="right">Image right, text beside it</option>
              </select>
            </label>

            {/* Maximum height */}
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Max height
              <select
                className={controlClass}
                value={imageAttributes.imageMaxHeight || ""}
                onChange={(e) =>
                  updateImageOption("imageMaxHeight", e.target.value)
                }
              >
                <option value="">No limit</option>
                <option value="150px">150 px</option>
                <option value="250px">250 px</option>
                <option value="350px">350 px</option>
                <option value="500px">500 px</option>
                <option value="700px">700 px</option>
              </select>
            </label>

            {/* Vertical spacing */}
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Vertical spacing
              <select
                className={controlClass}
                value={imageAttributes.imageSpacing || "0px"}
                onChange={(e) =>
                  updateImageOption("imageSpacing", e.target.value)
                }
              >
                <option value="0px">None</option>
                <option value="8px">Small</option>
                <option value="16px">Medium</option>
                <option value="24px">Large</option>
                <option value="32px">Extra large</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="
                    min-h-30 px-4 py-3 text-sm outline-none
                    [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold
                    [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold
                    [&_ul]:ml-6 [&_ul]:list-disc
                    [&_ol]:ml-6 [&_ol]:list-decimal
                    [&_p]:mb-2
                    [&_img]:max-w-full [&_img]:rounded-lg
                "
      />

      {/* {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Crop image
              </h2>

              <button
                type="button"
                onClick={() => {
                  setIsCropModalOpen(false);
                  setCropImageSrc("");
                  setCrop({ x: 0, y: 0 });
                  setCropZoom(1);
                  setCroppedAreaPixels(null);
                }}
                className="rounded-md px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close crop window"
              >
                &times;
              </button>
            </div>

            <div className="relative h-[300px] bg-slate-950 sm:h-[450px]">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={cropZoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setCropZoom}
                onCropComplete={(_, croppedAreaPixels) => {
                  setCroppedAreaPixels(croppedAreaPixels);
                }}
              />
            </div>

            <div className="space-y-4 p-4">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Zoom: {Math.round(cropZoom * 100)}%
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={cropZoom}
                  onChange={(event) => {
                    setCropZoom(Number(event.target.value));
                  }}
                  className="w-full accent-sky-600"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCropModalOpen(false);
                    setCropImageSrc("");
                    setCrop({ x: 0, y: 0 });
                    setCropZoom(1);
                    setCroppedAreaPixels(null);
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={uploadingImage || !croppedAreaPixels}
                  onClick={handleApplyCrop}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingImage ? "Applying..." : "Apply Crop"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
