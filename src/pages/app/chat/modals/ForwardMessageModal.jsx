import React from "react";

const ForwardMessageModal = ({
  show,
  onClose,
  forwardMessage,
  forwardSearch,
  setForwardSearch,
  recentForwardUsers,
  allForwardUsers,
  onForward,
}) => {
  if (!show) return null;

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
          <h5>Forward Message</h5>
        </div>

        {/* SEARCH */}
        <div className="p-2 border-bottom">
          <input
            type="text"
            className="form-control"
            placeholder="Search user..."
            value={forwardSearch}
            onChange={(e) => setForwardSearch(e.target.value)}
          />
        </div>

        {/* BODY */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* RECENT */}
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
          {allForwardUsers.map((user) => (
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
                width={35}
                height={35}
                style={{ borderRadius: "50%", marginRight: 10 }}
              />
              <div>
                {user.first_name} {user.last_name}
              </div>
            </div>
          ))}
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
