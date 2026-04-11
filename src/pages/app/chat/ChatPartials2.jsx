import React, { useContext, useState } from "react";
import { DropdownToggle, DropdownMenu, UncontrolledDropdown, DropdownItem } from "reactstrap";
import { Link } from "react-router-dom";
import { Icon, UserAvatar } from "@/components/Component";
import { findUpper } from "@/utils/Utils";
import { ChatContext } from "./ChatContext";
import { DirectChatContext } from "./DirectChatContext";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const MeChat = ({ item, chat, onRemoveMessage, messageId, isDelivered, isRead, message, onEdit, onReply }) => {
  const direct = useContext(DirectChatContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const canEditDelete = !!direct; // only on direct mode
  return (
    <div className="modern-message sent">
      <div className="modern-message-bubble">
        {item.chat.map((msg, idx) => {
          return (
            <div key={idx}>
              {msg === "deleted" ? (
                <div className="modern-message-content" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                  Message has been deleted
                </div>
              ) : (
                <div className="modern-message-content">{msg}</div>
              )}
              <div className="modern-message-time">
                {item.date}
                {isDelivered && (
                  <span style={{ marginLeft: '8px' }}>
                    {isRead ? (
                      <i className="bi bi-check2-all" style={{ color: '#28a745' }} title="Read"></i>
                    ) : (
                      <i className="bi bi-check2" style={{ color: '#007bff' }} title="Delivered"></i>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {canEditDelete && (
        <div className="modern-message-actions">
          <UncontrolledDropdown isOpen={menuOpen} toggle={() => setMenuOpen((v) => !v)}>
            <DropdownToggle tag="button" className="modern-message-action-btn">
              <Icon name="more-h"></Icon>
            </DropdownToggle>
            <DropdownMenu end>
              <ul className="link-list-opt no-bdr">
                <li>
                  <DropdownItem
                    tag="a"
                    href="#edit"
                    onClick={(ev) => {
                      ev.preventDefault();
                      onEdit && onEdit(message);
                    }}
                  >
                    <Icon name="edit" className="me-2" />
                    Edit
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem
                    tag="a"
                    href="#delete"
                    onClick={(ev) => {
                      ev.preventDefault();
                      direct.deleteMessage(messageId);
                    }}
                  >
                    <Icon name="trash" className="me-2" />
                    Delete
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem
                    tag="a"
                    href="#select"
                    onClick={(ev) => {
                      ev.preventDefault();
                      direct.setIsSelectionMode(true);
                      direct.setSelectedMessages((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
                    }}
                  >
                    <Icon name="check" className="me-2" />
                    Select
                  </DropdownItem>
                </li>
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      )}
    </div>
  );
};

export const ReplyChat = ({ reply, originalMessage, onEdit, onDelete, onReply }) => {
  const direct = useContext(DirectChatContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const currentUserId = parseInt(localStorage.getItem("userId") || "0");
  const isOwnReply = reply.user_id === currentUserId;

  return (
    <div className="chat is-reply" style={{ marginLeft: '20px', marginTop: '4px' }}>
      <div className="chat-content" style={{ display: 'flex' }}>
        {direct && (
          <div className="me-2">
            <button
              className="btn border-0"
              onClick={() => onReply && onReply(originalMessage)}
              style={{ fontSize: '10px', padding: '2px 6px' }}
            >
              <Icon name="reply" className="me-1" />
            </button>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div className="chat-bubbles">
            <div className="chat-bubble">
              <div className={`chat-msg ${isOwnReply ? 'bg-primary' : 'bg-light'}`} style={{ fontSize: '12px', padding: '6px 10px' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                  {reply.user?.first_name || 'User'}
                </div>
                {reply.reply_message}
              </div>
              {isOwnReply && direct && (
                <ul className="chat-msg-more">
                  <li className="d-sm-block">
                    <UncontrolledDropdown isOpen={menuOpen} toggle={() => setMenuOpen(!menuOpen)}>
                      <DropdownToggle tag="a" className="btn btn-icon btn-sm btn-trigger dropdown-toggle">
                        <Icon name="more-h" />
                      </DropdownToggle>
                      <DropdownMenu end>
                        <ul className="link-list-opt no-bdr">
                          <li>
                            <DropdownItem
                              tag="a"
                              href="#edit"
                              onClick={(ev) => {
                                ev.preventDefault();
                                onEdit && onEdit(reply, originalMessage.id);
                              }}
                            >
                              <Icon name="edit" className="me-2" />
                              Edit
                            </DropdownItem>
                          </li>
                          <li>
                            <DropdownItem
                              tag="a"
                              href="#delete"
                              onClick={(ev) => {
                                ev.preventDefault();
                                onDelete && onDelete(reply.id);
                              }}
                            >
                              <Icon name="trash" className="me-2" />
                              Delete
                            </DropdownItem>
                          </li>
                        </ul>
                      </DropdownMenu>
                    </UncontrolledDropdown>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const YouChat = ({ item, chat, messageId, message, onReply }) => {
  const direct = useContext(DirectChatContext);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="modern-message received">
      {chat.group ? (
        <img 
          src={item.user.image || "https://via.placeholder.com/32"} 
          alt={item.user.name}
          className="modern-message-avatar"
        />
      ) : (
        <img 
          src={chat.image || "https://via.placeholder.com/32"} 
          alt={chat.name}
          className="modern-message-avatar"
        />
      )}
      
      <div className="modern-message-bubble">
        {item.chat.map((msg, idx) => (
          <div key={idx}>
            <div className="modern-message-content">{msg}</div>
            <div className="modern-message-time">{item.date}</div>
          </div>
        ))}
      </div>
      
      {direct && (
        <div className="modern-message-actions">
          <UncontrolledDropdown isOpen={menuOpen} toggle={() => setMenuOpen((v) => !v)}>
            <DropdownToggle tag="button" className="modern-message-action-btn">
              <Icon name="more-h"></Icon>
            </DropdownToggle>
            <DropdownMenu end>
              <ul className="link-list-opt no-bdr">
                <li>
                  <DropdownItem
                    tag="a"
                    href="#select"
                    onClick={(ev) => {
                      ev.preventDefault();
                      direct.setIsSelectionMode(true);
                      direct.setSelectedMessages((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
                    }}
                  >
                    <Icon name="check" className="me-2" />
                    Select
                  </DropdownItem>
                </li>
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      )}
      <ul className="chat-meta" style={{ fontSize: '12px', color: '#666', margin: '4px 0', textAlign: 'left', listStyle: 'none', display: 'flex', gap: '8px' }}>
        <li>{chat.name}</li>
        <li>{formatTime(item.date)}</li>
      </ul>
      {direct && (
        <div className="ms-1">
          <button
            className="btn border-0"
            onClick={() => onReply && onReply(message)}
            style={{ fontSize: '12px', padding: '4px 8px', alignSelf: 'center' }}
          >
            <Icon name="reply" className="me-1" />
          </button>
        </div>
      )}
    </div>
  );
};
export const MetaChat = ({ item }) => {
  return (
    <div className="modern-message-date">
      <span className="modern-message-date-badge">{item}</span>
    </div>
  );
};

export const ChatItem = ({ item, chatItemClick, setSelectedId, selectedId }) => {

  const { deleteConvo, propAction } = useContext(ChatContext);

  const checkBeforeDelete = (id) => {
    deleteConvo(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <li className={`chat-item ${item.unread ? "is-unread" : ""}`}>
      <a
        className="chat-link"
        href="#chat-link"
        onClick={(ev) => {
          ev.preventDefault();
          chatItemClick(item.id);
        }}
      >
        {item.group === true ? (
          <div className="chat-media user-avatar user-avatar-multiple">
            {item.user.slice(0, 2).map((user, idx) => {
              return (
                <UserAvatar
                  key={idx}
                  theme={user.theme}
                  text={findUpper(user.name)}
                  image={user.image}
                  className="chat-media"
                ></UserAvatar>
              );
            })}
            <span className={"status dot dot-lg dot-success"}></span>
          </div>
        ) : (
          <UserAvatar theme={item.theme} text={findUpper(item.name)} image={item.image} className="chat-media">
            <span className={`status dot dot-lg dot-${item.active === true ? "success" : "gray"}`}></span>
          </UserAvatar>
        )}
        <div className="chat-info">
          <div className="chat-from">
            <div className="name">{item.nickname ? item.nickname : item.name}</div>
            <span className="time">{item.date}</span>
          </div>
          <div className="chat-context">
            <div className="text">
              <p>{item.convo.length !== 0 && item.convo[item.convo.length - 1].chat.at(-1)}</p>
            </div>
            <div className="status delivered">
              <Icon
                name={`${
                  item.delivered === true ? "check-circle-fill" : item.delivered === "sent" ? "check-circle" : ""
                }`}
              ></Icon>
            </div>
          </div>
        </div>
      </a>
      <div className="chat-actions">
        <UncontrolledDropdown >
          <DropdownToggle tag="a" className="btn btn-icon btn-sm btn-trigger dropdown-toggle">
            <Icon name="more-h"></Icon>
          </DropdownToggle>
          <DropdownMenu end>
            <ul className="link-list-opt no-bdr">
              <li onClick={() => checkBeforeDelete(item.id)}>
                <DropdownItem
                  tag="a"
                  href="#delete"
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  Delete
                </DropdownItem>
              </li>
              <li onClick={() => propAction(item.id, "unread")}>
                <DropdownItem
                  tag="a"
                  href="#unread"
                  className={item.unread ? "disabled" : ""}
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  Mark as Unread
                </DropdownItem>
              </li>
              <li onClick={() => propAction(item.id, "archive")}>
                <DropdownItem
                  tag="a"
                  href="#archive"
                  className={item.archive ? "disabled" : ""}
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  Archive Message
                </DropdownItem>
              </li>
            </ul>
          </DropdownMenu>
        </UncontrolledDropdown>
      </div>
    </li>
  );
};

export const ContactItem = ({ item, setTab, setSelectedId }) => {
  return (
    <div className="modern-chat-list">
      <h6 style={{ padding: '16px 24px 8px', margin: 0, fontSize: '14px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>
        {item.contacts.length > 0 && item.title}
      </h6>
      {item.contacts.map((contact, idx) => {
        return (
          <div
            key={idx}
            className="modern-chat-item"
            onClick={() => {
              setTab("Chats");
              setSelectedId(contact.id);
            }}
            style={{ cursor: 'pointer' }}
          >
            {contact.image ? (
              <img 
                src={contact.image} 
                alt={contact.name}
                className="modern-chat-item-avatar"
              />
            ) : (
              <div 
                className="modern-chat-item-avatar"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                {findUpper(contact.name)}
              </div>
            )}
            <div className="modern-chat-item-content">
              <div className="modern-chat-item-name">{contact.name}</div>
              <div className="modern-chat-item-message">Contact</div>
            </div>
            <Link 
              to={`/app-chat`}
              style={{ 
                color: '#667eea', 
                textDecoration: 'none', 
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Start Chat
            </Link>
          </div>
        );
      })}
    </div>
  );
};
