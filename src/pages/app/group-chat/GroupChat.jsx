import React from "react";
import Head from "@/layout/head/Head";
import ContentAlt from "@/layout/content/ContentAlt";
import { UncontrolledDropdown, DropdownToggle, DropdownMenu } from "reactstrap";
import { Button, Icon, UserAvatar } from "@/components/Component";
import GroupChatAside from "./GroupChatAside";
import GroupChatBody from "./GroupChatBody";
import { GroupChatProvider } from "./GroupChatContext";
import { useNavigate } from "react-router";
export default function GroupChat() {
  const navigate = useNavigate();
  return (
    <>
      <Head title="Group Chat" />
      <ContentAlt>
        <GroupChatProvider>
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
            <GroupChatBody />
          </div>
        </GroupChatProvider>
      </ContentAlt>
    </>
  );
}
