import React, { useContext, useEffect } from "react";
import Head from "@/layout/head/Head";
import ContentAlt from "@/layout/content/ContentAlt";
import { UncontrolledDropdown, DropdownToggle, DropdownMenu } from "reactstrap";
import { Button, Icon, UserAvatar } from "@/components/Component";
import GroupChatAside from "./GroupChatAside";
import GroupChatBody from "./GroupChatBody";
import { GroupChatProvider, GroupChatContext } from "./GroupChatContext";
import { useNavigate, useLocation } from "react-router";

function GroupChatInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const groupChat = useContext(GroupChatContext);

  // Handle maximize navigation: open group conversation inline when navigated here with openGroupId state
  useEffect(() => {
    const openGroupId = location.state?.openGroupId;
    if (openGroupId && groupChat?.selectGroup) {
      groupChat.selectGroup(openGroupId);
      // Clear state to avoid re-triggering on re-renders
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head title="Group Chat" />
      <ContentAlt>
        <div className="nk-chat">
          <div className={`nk-chat-aside`}>
            <div className="nk-chat-aside-head">
              <div className="nk-chat-aside-user">
                <UncontrolledDropdown>
                  <DropdownToggle
                    tag="a"
                    className="dropdown-toggle dropdown-indicator"
                  >
                    <UserAvatar theme="primary" text="GR" />
                    <div className="title">Groups</div>
                  </DropdownToggle>
                  <DropdownMenu>
                    <ul className="link-list-opt no-bdr">
                      <li>
                        <a
                          href="#groups"
                          onClick={(e) => e.preventDefault()}
                          className="dropdown-item"
                        >
                          Groupssss
                        </a>
                      </li>
                    </ul>
                    <ul className="link-list-opt no-bdr">
                      <li>
                        <a
                          href="#messages"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate("/messages");
                          }}
                          className="dropdown-item"
                        >
                          Chats
                        </a>
                      </li>
                    </ul>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </div>
              <ul className="nk-chat-aside-tools g-2">
                <li>
                  <Button
                    onClick={() => navigate("/app-group-create")}
                    color="light"
                    className="btn-round btn-icon"
                  >
                    <Icon name="edit-alt-fill" />
                  </Button>
                </li>
              </ul>
            </div>
            <GroupChatAside />
          </div>
          <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            <GroupChatBody />
          </div>
        </div>
      </ContentAlt>
    </>
  );
}

export default function GroupChat() {
  return (
    <GroupChatProvider>
      <GroupChatInner />
    </GroupChatProvider>
  );
}
