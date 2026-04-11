import { useEffect, useState } from "react";
import Router from "./internalRoute/Index";
import { ChatProvider } from "../src/Global/ChatContext";
import { TicketsProvider, useTickets } from "../src/Global/TicketsContext";
import { ChatPopupsProvider } from "../src/Global/ChatPopupsContext";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import Sidebar from "./layout/sidebar/Sidebar";
import Loading from "../src/pages/Loading/Loading";
import { store } from "./redux/store";
import { Provider } from "react-redux";
import ChatServiceInitializer from "./components/ChatServiceInitializer";
import DirectChatProvider from "./pages/app/chat/DirectChatContext";
const AppLayout = ({ children, isAuthenticated }) => {
  const isAuthPage = ["/auth-login", "/auth-register", "/auth-reset"].includes(
    window.location.pathname,
  );
  // console.log('[AppLayout] isAuthenticated:', isAuthenticated, 'isAuthPage:', isAuthPage);
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {isAuthenticated && !isAuthPage && <Sidebar menuData={[]} />}
      <div style={{ flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Changed to null to indicate loading

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    // console.log('App - localStorage:', { userId, token });

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
  }, []); // Remove isAuthenticated dependency to avoid circular dependency

  // Note: ChatService cleanup is now handled by ChatServiceInitializer component

  // SW navigation handling moved under Router context

  // Show loading component while authentication is being checked
  if (isAuthenticated === null) {
    return <Loading />;
  }

  return (
    <Provider store={store}>
      <DirectChatProvider>
        <TicketsProvider>
          <ChatProvider>
            <ChatPopupsProvider>
              {" "}
              {/* Wrap with ChatPopupsProvider */}
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
    </Provider>
  );
};
export default App;

// import { useEffect, useState } from 'react';
// import Router from "./internalRoute/Index";
// import { ChatProvider } from '../src/Global/ChatContext';
// import { TicketsProvider, useTickets } from '../src/Global/TicketsContext';
// import { ChatPopupsProvider } from '../src/Global/ChatPopupsContext';
// import 'react-toastify/dist/ReactToastify.css';
// import { ToastContainer } from 'react-toastify';
// import Sidebar from './layout/sidebar/Sidebar';
// import Loading from '../src/pages/Loading/Loading';
// import { store } from './redux/store';
// import { Provider } from 'react-redux';
// const AppLayout = ({ children, isAuthenticated }) => {
//   const isAuthPage = ['/auth-login', '/auth-register', '/auth-reset'].includes(window.location.pathname);
//   // console.log('[AppLayout] isAuthenticated:', isAuthenticated, 'isAuthPage:', isAuthPage);
//   return (
//     <div style={{ display: 'flex', minHeight: '100vh' }}>
//       {isAuthenticated && !isAuthPage && <Sidebar menuData={[]} />}
//       <div style={{ flex: 1, position: 'relative' }}>
//         {children}
//       </div>
//     </div>
//   );
// };

// const App = () => {
//   const [isAuthenticated, setIsAuthenticated] = useState(null); // Changed to null to indicate loading

//   useEffect(() => {
//     const token = localStorage.getItem('accessToken');
//     const userId = localStorage.getItem('userId');
//     // console.log('App - localStorage:', { userId, token });

//     // if (
//     //   (!token || !userId || userId === 'unknown' || isNaN(parseInt(userId, 10))) &&
//     //   !['/auth-login', '/auth-register', '/auth-reset'].includes(window.location.pathname)
//     // ) {
//     //   console.warn('Invalid session detected, redirecting to login');
//     //   window.location.href = '/auth-login';
//     // }

//     if (
//       token &&
//       userId &&
//       userId !== 'unknown' &&
//       !isNaN(parseInt(userId, 10)) &&
//       !['/auth-login', '/auth-register', '/auth-reset'].includes(window.location.pathname)
//     ) {
//
//       setIsAuthenticated(true);
//     } else {
//
//       setIsAuthenticated(false);
//     }
//   }, []); // Remove isAuthenticated dependency to avoid circular dependency

//   // Note: ChatService cleanup is now handled by ChatServiceInitializer component

//   // SW navigation handling moved under Router context

//   // Show loading component while authentication is being checked
//   if (isAuthenticated === null) {
//     return <Loading />;
//   }

//   return (
//      <Provider store={store}>
//   <TicketsProvider>
//     <ChatProvider>
//       <ChatPopupsProvider> {/* Wrap with ChatPopupsProvider */}
//         <ToastContainer
//           position="top-right"
//           autoClose={2000}
//           hideProgressBar={false}
//           newestOnTop
//           rtl={false}
//           draggable
//         />

//         <Router>
//           <AppLayout isAuthenticated={isAuthenticated} />
//         </Router>

//       </ChatPopupsProvider>
//     </ChatProvider>
//   </TicketsProvider>
// </Provider>
//   );
// };
// export default App;
