import { Outlet } from "react-router-dom";
import WebsiteNavbar from "../components/website/WebsiteNavbar";
import WebsiteFooter from "../components/website/WebsiteFooter";

export default function WebsiteLayout() {
  return (
    <div className="ils-website min-h-screen">
      <WebsiteNavbar />
      <Outlet />
      <WebsiteFooter />
    </div>
  );
}
