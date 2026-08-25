import { Outlet } from "react-router-dom";
import Header from "../components/Header";

function PublicLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default PublicLayout;
