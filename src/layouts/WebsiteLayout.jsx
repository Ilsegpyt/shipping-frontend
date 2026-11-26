import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import LoadingScreen from "../components/common/LoadingScreen";
import WebsiteNavbar from "../components/website/WebsiteNavbar";
import WebsiteFooter from "../components/website/WebsiteFooter";

export default function WebsiteLayout() {
  return (
    <div className="ils-website min-h-screen">
      <WebsiteNavbar />
      <Suspense fallback={<LoadingScreen compact />}><Outlet /></Suspense>
      <WebsiteFooter />
    </div>
  );
}
