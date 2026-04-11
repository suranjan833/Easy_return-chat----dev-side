import { useState, useEffect } from "react";
import classNames from "classnames";
import Toggle from "../sidebar/Toggle";
import Logo from "../logo/Logo";
import News from "../news/News";
import User from "./dropdown/user/User";
import Notification from "./dropdown/notification/Notification";
import ChatServiceInitializer from "../../components/ChatServiceInitializer";
import GroupChatServiceInitializer from "../../components/GroupChatServiceInitializer";

import { useTheme, useThemeUpdate } from "../provider/Theme";

const Header = ({ fixed, className, ...props }) => {
  const theme = useTheme();
  const themeUpdate = useThemeUpdate();
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1200);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1200);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const headerClass = classNames({
    "nk-header": true,
    "nk-header-fixed": fixed,
    [`is-light`]: theme.header === "white",
    [`is-${theme.header}`]:
      theme.header !== "white" && theme.header !== "light",
    [`${className}`]: className,
  });

  return (
    <>
      <GroupChatServiceInitializer />
      <div
        className={headerClass}
        style={{
          minHeight: isSmallScreen ? "60px" : "auto",
          maxHeight: isSmallScreen ? "60px" : "auto",
        }}
      >
        <div
          className="container-fluid"
          style={{
            padding: isSmallScreen ? "0 10px" : "0 15px",
          }}
        >
          <div
            className="nk-header-wrap d-flex align-items-center"
            style={{
              flexWrap: "nowrap",
              minHeight: isSmallScreen ? "60px" : "auto",
              maxHeight: isSmallScreen ? "60px" : "auto",
              padding: isSmallScreen ? "0 5px" : "0",
            }}
          >
            <div
              className="nk-menu-trigger d-xl-none ms-n1"
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                height: isSmallScreen ? "40px" : "auto",
                margin: isSmallScreen ? "0" : "0 -4px 0 0",
              }}
            >
              <Toggle
                className="nk-nav-toggle nk-quick-nav-icon d-xl-none ms-n1"
                icon="menu"
                click={themeUpdate.sidebarVisibility}
              />
            </div>

            {/* Sidebar Toggle Button - Visible on all screen sizes */}
            <div
              className="nk-sidebar-toggle d-none d-xl-block"
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                height: isSmallScreen ? "40px" : "auto",
                marginLeft: isSmallScreen ? "10px" : "10px",
              }}
            >
              <Toggle
                className="nk-sidebar-toggle-btn nk-quick-nav-icon"
                icon={theme.sidebarHidden ? "menu" : "arrow-left"}
                click={themeUpdate.sidebarHidden}
                title={theme.sidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
              />
            </div>

            <div
              className="nk-header-brand d-xl-none"
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                height: isSmallScreen ? "40px" : "auto",
                marginLeft: isSmallScreen ? "10px" : "10px",
              }}
            >
              <Logo />
            </div>
            <div
              className="nk-header-news d-none d-xl-block"
              style={{
                flexGrow: 1,
                display: isSmallScreen ? "none" : "block",
              }}
            >
              <News />
            </div>
            <div
              className="nk-header-tools"
              style={{
                flexShrink: 0,
                marginLeft: isSmallScreen ? "auto" : "0",
                zIndex: 1000,
              }}
            >
              <ul
                className="nk-quick-nav d-flex align-items-center"
                style={{
                  margin: isSmallScreen ? "0" : "0",
                  padding: isSmallScreen ? "0" : "0",
                }}
              >
                <li className="user-dropdown">
                  <User />
                </li>
                <li className="notification-dropdown me-n1">
                  <Notification />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
