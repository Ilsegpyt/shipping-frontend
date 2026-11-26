import contentService from "./contentService";

const pending = new Map();

// Share simultaneous public reads; never retain completed responses or cache CMS edits.
function read(key, request) {
  const token = localStorage.getItem("accessToken") || "";
  const requestKey = JSON.stringify([token, key]);
  if (pending.has(requestKey)) return pending.get(requestKey);
  const promise = request().finally(() => pending.delete(requestKey));
  pending.set(requestKey, promise);
  return promise;
}

export default {
  getRootContent: () => read("root", () => contentService.getRootContent()),
  getChildren: (id) => read(`children/${id}`, () => contentService.getChildren(id)),
  getById: (id) => read(`content/${id}`, () => contentService.getById(id)),
};
