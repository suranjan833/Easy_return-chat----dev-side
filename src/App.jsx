import { useEffect, useState } from "react";
import Router from "./internalRoute/Index";
import { ChatProvider } from "../src/Global/ChatContext";
import { TicketsProvider } from "../src/Global/TicketsContext";
import { ChatPopupsProvider } from "../src/Global/ChatPopupsContext";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import Sidebar from "./layout/sidebar/Sidebar";
import Loading from "../src/pages/Loading/Loading";
import { store } from "./redux/store";
import { Provider } from "react-redux";

import ChatServiceInitializer from "./components/ChatServiceInitializer";

import DirectChatProvider from "./pages/app/chat/DirectChatContext";
import { GroupChatProvider } from "./pages/app/group-chat/GroupChatContext";

const AppLayout = ({ children, isAuthenticated }) => {
  const isAuthPage = ["/auth-login", "/auth-register", "/auth-reset"].includes(
    window.location.pathname,
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {isAuthenticated && !isAuthPage && <Sidebar menuData={[]} />}

      <div style={{ flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    if (
      typeof window !== "undefined" &&
      (!token ||
        !userId ||
        userId === "unknown" ||
        isNaN(parseInt(userId, 10))) &&
      !["/auth-login", "/auth-register", "/auth-reset"].includes(
        window.location.pathname,
      )
    ) {
      console.warn("Invalid session detected, redirecting to login");
      window.location.href = "/auth-login";
    }

    if (
      token &&
      userId &&
      userId !== "unknown" &&
      !isNaN(parseInt(userId, 10)) &&
      typeof window !== "undefined" &&
      !["/auth-login", "/auth-register", "/auth-reset"].includes(
        window.location.pathname,
      )
    ) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  if (isAuthenticated === null) {
    return <Loading />;
  }

  return (
    <Provider store={store}>
      <GroupChatProvider>
        <DirectChatProvider>
          <TicketsProvider>
            <ChatProvider>
              <ChatPopupsProvider>
                <ChatServiceInitializer />

                <ToastContainer
                  position="top-right"
                  autoClose={2000}
                  hideProgressBar={false}
                  newestOnTop
                  rtl={false}
                  draggable
                />

                <Router>
                  <AppLayout isAuthenticated={isAuthenticated} />
                </Router>
              </ChatPopupsProvider>
            </ChatProvider>
          </TicketsProvider>
        </DirectChatProvider>
      </GroupChatProvider>
    </Provider>
  );
};

export default App;
