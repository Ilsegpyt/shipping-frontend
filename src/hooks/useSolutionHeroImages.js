import { useEffect, useState } from "react";
import contentService from "../services/contentService";
import { cleanImageUrl } from "../utils/mediaUrl";

const normalize = (value) => String(value || "").trim().toLowerCase();
const typeName = (type) => typeof type === "string" ? type : ({ 1: "Category", 2: "Page" }[type] || "");

// A single CMS image source shared by the Home and Solutions cards.
export default function useSolutionHeroImages() {
  const [images, setImages] = useState({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const rootsResponse = await contentService.getRootContent();
        const roots = Array.isArray(rootsResponse.data) ? rootsResponse.data : [];
        const category = roots.find((item) => typeName(item.type) === "Category" && normalize(item.title) === "ils solutions");
        if (!category?.id) return;
        const childrenResponse = await contentService.getChildren(category.id);
        const children = Array.isArray(childrenResponse.data) ? childrenResponse.data : [];
        const pages = children.filter((item) => typeName(item.type) === "Page" && item.id);
        const entries = await Promise.all(pages.map(async (page) => {
          const details = page.featuredImage ? page : (await contentService.getById(page.id)).data;
          return [normalize(page.title), cleanImageUrl(details?.featuredImage || "", import.meta.env.VITE_API_BASE_URL || "")];
        }));
        if (active) setImages(Object.fromEntries(entries));
      } catch (error) {
        console.error("Failed to load solution images:", error);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const imageFor = (title, fallback) => {
    const key = normalize(title);
    const aliases = key === "project transport" ? ["ils projects transport"] : key === "warehousing and distribution" ? ["warehousing & distribution"] : [];
    const match = [key, ...aliases].find((name) => images[name] || Object.keys(images).some((titleKey) => titleKey.startsWith(`${name} -`)));
    return (match && (images[match] || Object.entries(images).find(([name]) => name.startsWith(`${match} -`))?.[1])) || fallback;
  };
  return imageFor;
}
