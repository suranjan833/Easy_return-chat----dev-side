import React from "react";
import { Outlet } from "react-router-dom";
import menu from "./sidebar/MenuData";
import Sidebar from "./sidebar/Sidebar";
import Head from "./head/Head";
import Header from "./header/Header";
import Footer from "./footer/Footer";
import AppRoot from "./global/AppRoot";
import AppMain from "./global/AppMain";
import AppWrap from "./global/AppWrap";

import FileManagerProvider from "@/pages/app/file-manager/components/Context";
import ChatPopupsContainer from "@/pages/app/chat-popups/ChatPopupsContainer";

const Layout = ({title, ...props}) => {
  return (
    <FileManagerProvider>
      <Head title={!title && 'Easy Return'} />
      <AppRoot>
        <AppMain>
          <Sidebar   menuData={menu} fixed />
          <AppWrap>
            <Header fixed />
              <Outlet />
            <Footer />
            <ChatPopupsContainer />
          </AppWrap>
        </AppMain>
      </AppRoot>
    </FileManagerProvider>
  );
};
export default Layout;
