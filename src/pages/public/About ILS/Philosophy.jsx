import StructuredAboutPage from "./StructuredAboutPage";

// Philosophy now uses the same CMS loader and public renderer as other About ILS pages.
// Its visual treatment is selected through a renderer variant; saved CMS content remains unchanged.
export default function Philosophy() {
  return (
    <StructuredAboutPage pageTitle="ILS Philosophy" styleVariant="philosophy" />
  );
}
