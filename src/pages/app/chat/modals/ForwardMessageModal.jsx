import React, { useState } from "react";

const ForwardMessageModal = ({
  show,
  onClose,
  forwardMessage,
  forwardSearch,
  setForwardSearch,
  recentForwardUsers,
  allForwardUsers,
  onForward,
  groups = [],
  onForwardToGroup,
  currentGroupId,
}) => {
  const [activeTab, setActiveTab] = useState("users"); // "users" or "groups"

  if (!show) return null;

  const filteredGroups = (groups || [])
    .filter((g) => g.id !== currentGroupId)
    .filter((g) => (g.name || "").toLowerCase().includes(forwardSearch.toLowerCase()));

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow w-96 flex flex-col"
        style={{ maxHeight: "550px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-3 border-bottom">
          <h5 className="mb-0">Forward Message</h5>
        </div>

        {/* TABS */}
        <div className="d-flex border-bottom">
          <button
            className={`flex-1 py-2 px-3 border-0 bg-transparent ${
              activeTab === "users" ? "border-bottom border-primary text-primary fw-semibold" : "text-muted"
            }`}
            style={{ borderBottom: activeTab === "users" ? "2px solid" : "none" }}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
          <button
            className={`flex-1 py-2 px-3 border-0 bg-transparent ${
              activeTab === "groups" ? "border-bottom border-primary text-primary fw-semibold" : "text-muted"
            }`}
            style={{ borderBottom: activeTab === "groups" ? "2px solid" : "none" }}
            onClick={() => setActiveTab("groups")}
          >
            Groups
          </button>
        </div>

        {/* SEARCH */}
        <div className="p-2 border-bottom">
          <input
            type="text"
            className="form-control"
            placeholder={activeTab === "users" ? "Search user..." : "Search group..."}
            value={forwardSearch}
            onChange={(e) => setForwardSearch(e.target.value)}
          />
        </div>

        {/* BODY */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {activeTab === "users" ? (
            <>
              {/* RECENT USERS */}
              {recentForwardUsers.length > 0 && (
                <>
                  <div className="px-3 py-2 text-muted small">Recent Chats</div>
                  {recentForwardUsers.map((user) => (
                    <div
                      key={"recent" + user.id}
                      className="d-flex align-items-center p-2 border-bottom"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (forwardMessage?.id && user?.id) {
                          onForward(forwardMessage.id, user.id);
                        }
                        onClose();
                      }}
                    >
                      <img
                        src={user.profile_picture || "https://via.placeholder.com/40"}
                        alt={`${user.first_name} ${user.last_name}`}
                        width={35}
                        height={35}
                        style={{ borderRadius: "50%", marginRight: 10 }}
                      />
                      <div>
                        {user.first_name} {user.last_name}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ALL USERS */}
              <div className="px-3 py-2 text-muted small">All Users</div>
              {allForwardUsers.length > 0 ? (
                allForwardUsers.map((user) => (
                  <div
                    key={"all" + user.id}
                    className="d-flex align-items-center p-2 border-bottom"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      onForward(forwardMessage.id, user.id);
                      onClose();
                    }}
                  >
                    <img
                      src={user.profile_picture || "https://via.placeholder.com/40"}
                      alt={`${user.first_name} ${user.last_name}`}
                      width={35}
                      height={35}
                      style={{ borderRadius: "50%", marginRight: 10 }}
                    />
                    <div>
                      {user.first_name} {user.last_name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-muted text-center small">No users found</div>
              )}
            </>
          ) : (
            <>
              {/* GROUPS */}
              {filteredGroups.length === 0 ? (
                <div className="p-3 text-muted text-center small">No groups found</div>
              ) : (
                filteredGroups.map((g) => (
                  <div
                    key={g.id}
                    className="d-flex align-items-center p-2 border-bottom"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (onForwardToGroup) {
                        onForwardToGroup(forwardMessage, g.id);
                      }
                      onClose();
                    }}
                  >
                    <div
                      style={{
                        width: 35,
                        height: 35,
                        borderRadius: "50%",
                        background: "#0d6efd",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {(g.name || "G")[0].toUpperCase()}
                    </div>
                    <div>{g.name}</div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-2 border-top text-end">
          <button className="btn btn-light btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
