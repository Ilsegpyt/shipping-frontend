
import api from "./api";

const contentService = {
    getRootContent() {
        return api.get("/api/content/root");
    },

    getChildren(contentId) {
        return api.get(`/api/content/${contentId}/children`);
    },

    getById(contentId) {
        return api.get(`/api/content/${contentId}`);
    },

    create(payload) {
        return api.post("/api/content", payload);
    },

    update(contentId, payload) {
        return api.put(`/api/content/${contentId}`, payload);
    },

    delete(contentId) {
        return api.delete(`/api/content/${contentId}`);
    },

    uploadImage(file) {
        const formData = new FormData();
        formData.append("file", file);

        return api.post("/api/content/upload-image", formData);
    },
};

export default contentService;
