import LogoDark from "@/images/Easy return logo png.png";
import ContentAlt from "@/layout/content/ContentAlt";
import Head from "@/layout/head/Head";
import { useContext, useEffect, useState } from "react";
import ChatBody from "./ChatBody";
import { GroupChatProvider } from "@/pages/app/group-chat/GroupChatContext";
import SupportChatWidget from "../../Support/SupportChatWidget";
import { Icon, UserAvatar } from "@/components/Component";
import { useLocation, useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from "reactstrap";
import { ChatAsideBody } from "./ChatAsideBody";
import { GroupAsideBody } from "./GroupAsideBody";
import { ChatContext } from "./ChatContext";
import "./ModernChat.css";
import DirectChatProvider from "./DirectChatContext";
import GroupChatBody from "../group-chat/GroupChatBody";
import { DirectChatContext } from "./DirectChatContext";

const Chat = () => {
  // MAIN STATE
  const [mainTab, setMainTab] = useState("Chats");
  const [selectedId, setSelectedId] = useState(1);
  const [filterTab, setFilterTab] = useState("messages");

  //  SEARCH + FILTER STATES
  const [filteredChatList, setFilteredChatList] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [favState, setFavState] = useState(false);
  const [favFilter, setFavFilter] = useState([]);
  const [favFilterText, setFavFilterText] = useState("");

  // MOBILE STATE
  const [mobileView, setMobileView] = useState(false);

  //  CONTEXT
  const { chatState, fav } = useContext(ChatContext);
  const [chat, setChat] = chatState;
  const [favData] = fav;
  const direct = useContext(DirectChatContext);

  //  ROUTER
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle maximize navigation: open conversation inline when navigated here with openUserId state
  useEffect(() => {
    const openUserId = location.state?.openUserId;
    if (openUserId && direct?.selectUser) {
      direct.selectUser(openUserId);
      // Clear state to avoid re-triggering on re-renders
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  URL TAB AUTO SWITCH
  useEffect(() => {
    const tab = searchParams.get("tab");
    const ticket = searchParams.get("ticket");

    if (tab) {
      setMainTab(tab);
    }

    if (ticket) {
      console.log("Open Ticket From URL:", ticket);
    }
  }, [searchParams]);

  // FAV FILTER LOGIC
  useEffect(() => {
    if (favFilterText !== "") {
      const filteredObject = favData.filter((item) => {
        return (
          item.name.toLowerCase().includes(favFilterText.toLowerCase()) &&
          item.fav === false
        );
      });
      setFavFilter([...filteredObject]);
    } else {
      setFavFilter([]);
    }
  }, [favFilterText, favData]);

  // HANDLERS
  const onInputChange = (e) => {
    setFilterText(e.target.value);
  };

  const favInputSearchChange = (e) => {
    setFavFilterText(e.target.value);
  };

  const onFilterClick = (prop) => {
    setFilterTab(prop);
  };

  //  CHAT CLICK
  const chatItemClick = (id) => {
    let data = chat;
    const index = data.findIndex((item) => item.id === id);
    const dataSet = data.find((item) => item.id === id);

    if (dataSet?.unread === true) {
      data[index].unread = false;
      setChat([...data]);
    }

    setSelectedId(id);

    if (window.innerWidth < 860) {
      setMobileView(true);
    }
  };

  //  RENDER
  return (
    <>
      <Head title="Chat" />

      <ContentAlt>
        <GroupChatProvider>
          <div
            className={`modern-chat-container ${
              mainTab === "Support-Ticket" ? "support-ticket-layout" : ""
            }`}
          >
            {/* SIDEBAR */}
            <div
              className={`modern-chat-sidebar ${
                mobileView ? "has-aside" : ""
              } ${mainTab === "Support-Ticket" ? "support-hide-sidebar" : ""}`}
            >
              {/* ⭐ SIDEBAR HEADER */}
              <div
                className="modern-chat-sidebar-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* TITLE */}
                <div className="modern-chat-sidebar-title">
                  <UserAvatar image={LogoDark} />
                  <span>{mainTab}</span>
                </div>

                {/* SETTINGS MENU */}
                <div
                  className="modern-chat-sidebar-tools"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <UncontrolledDropdown>
                    <DropdownToggle
                      tag="a"
                      className="modern-chat-sidebar-tool-btn"
                    >
                      <Icon name="setting-alt-fill" />
                    </DropdownToggle>

                    <DropdownMenu end>
                      <ul className="link-list-opt no-bdr">
                        {/* CHAT TAB */}
                        <li
                          onClick={() => onFilterClick("messages")}
                          className={filterTab === "messages" ? "active" : ""}
                        >
                          <DropdownItem
                            tag="a"
                            href="#"
                            onClick={(ev) => {
                              ev.preventDefault();
                              setMainTab("Chats");
                            }}
                          >
                            <span>Messagessss</span>
                          </DropdownItem>
                        </li>

                        {/* GROUP TAB */}
                        <li
                          onClick={() => onFilterClick("group")}
                          className={filterTab === "group" ? "active" : ""}
                        >
                          <DropdownItem
                            tag="a"
                            href="#"
                            onClick={(ev) => {
                              ev.preventDefault();
                              setMainTab("Groups");
                            }}
                          >
                            <span>Group Chats</span>
                          </DropdownItem>
                        </li>

                        {/* SUPPORT TAB */}
                        <li
                          onClick={() => onFilterClick("Support-Ticket")}
                          className={
                            filterTab === "Support-Ticket" ? "active" : ""
                          }
                        >
                          <DropdownItem
                            tag="a"
                            href="#"
                            onClick={(ev) => {
                              ev.preventDefault();
                              setMainTab("Support-Ticket");
                            }}
                          >
                            <span>Support Ticket</span>
                          </DropdownItem>
                        </li>
                      </ul>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>
              </div>

              {/* ⭐ SIDEBAR BODY */}
              {mainTab === "Chats" && (
                <ChatAsideBody
                  filteredChatList={filteredChatList}
                  filterText={filterText}
                  chatItemClick={chatItemClick}
                />
              )}

              {mainTab === "Groups" && <GroupAsideBody />}
            </div>

            {/* DIRECT CHAT */}
            {mainTab === "Chats" && (
              <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
                <ChatBody id={7657865876} />
              </div>
            )}

            {/* GROUP CHAT */}
            {mainTab === "Groups" && (
              <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
                <GroupChatBody />
              </div>
            )}

            {/* SUPPORT CHAT */}
            {mainTab === "Support-Ticket" && <SupportChatWidget />}
          </div>
        </GroupChatProvider>
      </ContentAlt>
    </>
  );
};

export default Chat;
