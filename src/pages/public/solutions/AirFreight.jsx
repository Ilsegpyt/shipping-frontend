import StructuredAboutPage from "../About ILS/StructuredAboutPage";

// Air Freight uses the shared CMS model and renderer, with the Solutions visual variant.
export default function AirFreight() {
  return (
    <StructuredAboutPage
      pageTitle="Air Freight"
      parentCategoryTitle="ILS Solutions"
      styleVariant="solutions"
    />
  );
}
