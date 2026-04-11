import React, { useState } from "react";

const GroupForwardModal = ({ show, onClose, message, onForwardToGroup, groups, currentGroupId }) => {
  const [search, setSearch] = useState("");

  if (!show || !message) return null;

  const filteredGroups = (groups || [])
    .filter((g) => g.id !== currentGroupId)
    .filter((g) => (g.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded shadow w-96 flex flex-col" style={{ maxHeight: "500px" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-bottom">
          <h5 className="mb-0">Forward to Group</h5>
        </div>

        <div className="p-2 border-bottom">
          <input type="text" className="form-control" placeholder="Search groups..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filteredGroups.length === 0 ? (
            <div className="p-3 text-muted text-center small">No groups found</div>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.id} className="d-flex align-items-center p-2 border-bottom" style={{ cursor: "pointer" }}
                onClick={() => { onForwardToGroup(message, g.id); onClose(); }}>
                <div style={{ width: 35, height: 35, borderRadius: "50%", background: "#0d6efd", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, fontSize: 14, fontWeight: 600 }}>
                  {(g.name || "G")[0].toUpperCase()}
                </div>
                <div>{g.name}</div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-top text-end">
          <button className="btn btn-light btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default GroupForwardModal;
