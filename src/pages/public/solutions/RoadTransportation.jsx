import StructuredPublicPage from "../About ILS/StructuredAboutPage";

// Road Transportation now uses the shared CMS loader, structured model, and renderer.
// The shared renderer's Solutions variant keeps the dark hero and Solutions navigation.
export default function RoadTransportation() {
  return (
    <StructuredPublicPage
      pageTitle="Road Transportation"
      parentCategoryTitle="ILS Solutions"
      styleVariant="solutions"
    />
  );
}
