import { Outlet } from "react-router";
import Footer from "./layout/footer/Footer";
import Header from "./layout/header/Header";

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
