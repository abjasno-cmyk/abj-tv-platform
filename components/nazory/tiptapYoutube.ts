import { Node, mergeAttributes } from "@tiptap/core";

export const Youtube = Node.create({
  name: "youtube",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      videoId: { default: null },
      url: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-youtube-video-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const videoId = HTMLAttributes.videoId;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-youtube-video-id": videoId,
        class: "nazory-editor-youtube",
      }),
    ];
  },
});
