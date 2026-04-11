import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { BiTransfer } from "react-icons/bi";
import "./ChatTransfer.css";
import { useTickets } from "../../Global/TicketsContext";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const ChatTransfer = ({ticketNumber,selectedTicket, isAgentWithFallback,hasJoined,agentEmail,localAgentEmail,setMessages,socket,setSelectedTicket,setTicketNumber,setWebsocketUrl,setToken,setIsHumanHandoff,navigate,
}) => {
  const { updateTicketPartial } = useTickets();
  const [transferType, setTransferType] = useState("department");
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [priorityEscalation, setPriorityEscalation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [targetAgentEmail, setTargetAgentEmail] = useState("");
  const [agents, setAgents] = useState([]);
  const [searchAgent, setSearchAgent] = useState("")
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const modalRef = useRef(null);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!selectedTicket || !selectedTicket.site_id) {
        toast.error("Cannot fetch departments: No site ID available.");
        console.error("[ChatTransfer] Missing site_id in selectedTicket:", selectedTicket);
        return;
      }

      try {
        const departmentsUrl = "https://chatsupport.fskindia.com/agents/departments";
        const apiKey = import.meta.env.VITE_API_KEY || "90N1TcGbz1Ia37BRjSVQAig_4S6eZ7q2"

        // console.log("[ChatTransfer] Fetching departments from:", departmentsUrl);
        const response = await axios.get(departmentsUrl, {
          headers: {
            "x-api-key": apiKey,
          },
        });

        //console.log("[ChatTransfer] Departments data:", response.data);
        if (!Array.isArray(response.data)) {
          throw new Error("Invalid response: Expected an array of departments");
        }
        if (response.data.length === 0) {
          toast.error("No departments available for this site.");
          return;
        }
        setDepartments(response.data);
      } catch (err) {
        console.error("[ChatTransfer] Error fetching departments:", err);
        toast.error(
          err.message.includes("Site not found")
            ? "This site is not registered. Please contact support."
            : `Failed to load departments: ${err.message}`
        );
      }
    };
    fetchDepartments();
  }, [selectedTicket]);

  useEffect(() => {
    const fetchAgents = async () => {
      if (transferType === "agent" && targetDepartmentId) {
        try {
          const agentsUrl = `https://chatsupport.fskindia.com/agents/departments/${targetDepartmentId}`;
         
          const apiKey = import.meta.env.VITE_API_KEY || "90N1TcGbz1Ia37BRjSVQAig_4S6eZ7q2";

          //console.log("[ChatTransfer] Fetching agents from:", agentsUrl);
          const response = await axios.get(agentsUrl, {
            headers: {
              "x-api-key": apiKey,
            },
          });

          //console.log("[ChatTransfer] Agents data:", response.data);
          if (!Array.isArray(response.data)) {
            throw new Error("Invalid response: Expected an array of agents");
          }
          setAgents(response.data);
        } catch (err) {
          console.error("[ChatTransfer] Error fetching agents:", err);
          toast.error(`Failed to load agents: ${err.message}`);
          setAgents([]);
        }
      } else {
        setAgents([]);
        setTargetAgentEmail("");
      }
    };
    fetchAgents();
  }, [transferType, targetDepartmentId]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && showModal) {
        setShowModal(false);
        setTransferType("department");
        setTargetDepartmentId("");
        setReason("");
        setNotes("");
        setPriorityEscalation(false);
        setShowAgentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal, showAgentDropdown]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && showModal) {
        setShowModal(false);
        setTransferType("department");
        setTargetDepartmentId("");
        setReason("");
        setNotes("");
        setPriorityEscalation(false);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [showModal]);

const handleTransfer = async () => {
    if (!ticketNumber || !selectedTicket) {
      toast.error("No ticket selected.");
      return;
    }
    if (selectedTicket.status === "closed" || selectedTicket.status === "resolved") {
      toast.error("Cannot transfer closed or resolved tickets.");
      return;
    }
    if (!isAgentWithFallback || !hasJoined) {
      toast.error("You must be an assigned agent to transfer this chat.");
      return;
    }
    if (!targetDepartmentId) {
      toast.error("Please select a target department.");
      return;
    }
    if (transferType === "agent" && !targetAgentEmail) {
      toast.error("Please select a target agent.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the transfer.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ticket_number: ticketNumber,
        transfer_type: transferType,
        target_agent_email: transferType === "agent" ? targetAgentEmail : undefined,
        target_department_id: parseInt(targetDepartmentId),
        target_site_id: selectedTicket.site_id || 1,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        priority_escalation: priorityEscalation,
      };



      const response = await axios.post(
        "https://supportdesk.fskindia.com/transfer/transfer",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("websocket_token")}`,
          },
        }
      );



      if (response.data.success) {
        toast.success(response.data.message || "Chat transferred successfully!");

        if (socket && socket.readyState === WebSocket.OPEN) {
          const transferMessage = {
            message_type: "system",
            content: `TRANSFER: Ticket ${ticketNumber} transferred to ${transferType === "agent" ? targetAgentEmail : `department ID ${targetDepartmentId}`} (Priority: ${priorityEscalation ? "high" : "normal"})`,
            sender_type: "system",
            sender_email: agentEmail || localAgentEmail || "agent@example.com",
            to: transferType,
            target_department_id: transferType === "department" ? targetDepartmentId : undefined,
            target_agent_email: transferType === "agent" ? targetAgentEmail : undefined,
            ticket_number: ticketNumber,
            timestamp: new Date().toISOString(),
          };
          const notificationMessage = {
            message_type: "notification",
            notification_type: "transfer",
            ticket_number: ticketNumber,
            agent_email: transferType === "agent" ? targetAgentEmail : agentEmail || localAgentEmail || "agent@example.com",
            message: `Ticket ${ticketNumber} has been transferred to ${transferType === "agent" ? targetAgentEmail : `department ID ${targetDepartmentId}`}${priorityEscalation ? " with priority escalation" : ""}. Reason: ${reason.trim()}${notes.trim() ? `. Notes: ${notes.trim()}` : ""}`,
            timestamp: new Date().toISOString(),
          };
          socket.send(JSON.stringify(transferMessage));
          socket.send(JSON.stringify(notificationMessage));


        }

        updateTicketPartial(ticketNumber, {
          status: response.data.new_status || "transferred",
          agent_email: transferType === "agent" ? targetAgentEmail : null,
          agent_name: transferType === "agent" ? agents.find(a => a.email === targetAgentEmail)?.name || null : null,
        });

        setMessages([]);
        setSelectedTicket(null);
        setTicketNumber(null);
        setWebsocketUrl(null);
        setToken(null);
        setIsHumanHandoff(false);
        navigate("/support-chat", { replace: true });

        setShowModal(false);
        setTransferType("department");
        setTargetDepartmentId("");
        setTargetAgentEmail("");
        setReason("");
        setNotes("");
        setPriorityEscalation(false);
      } else {
        throw new Error(response.data.message || "Transfer failed.");
      }
    } catch (err) {
      console.error("[ChatTransfer] Transfer error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || "Failed to transfer chat.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chat-transfer-container">
      {/* <button
        className="btn btn-primary mx-1"
        onClick={() => setShowModal(true)}
        disabled={submitting || !isAgentWithFallback || !hasJoined}
        aria-label="Transfer chat"
      >
        <BiTransfer />
      </button> */}
        <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="tooltip-transfer">Transfer Chat</Tooltip>}
    >
      <button
        onClick={() => setShowModal(true)}
        disabled={submitting || !isAgentWithFallback || !hasJoined}
        aria-label="Transfer chat"
        className={`
          mx-1 px-2 py-1 rounded 
          bg-blue-600 text-white text-sm
          hover:bg-indigo-700
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center
        `}
      >
        <BiTransfer size={16} />
      </button>
    </OverlayTrigger>

      {showModal && (
        <>
          <div className="custom-modal-backdrop"></div>
          <div className="custom-modal" ref={modalRef}>
            <div className="custom-modal-content">
              <div className="custom-modal-header">
                <h5>Transfer Chat</h5>
                <button
                  type="button"
                  className="custom-modal-close"
                  onClick={() => {
                    setShowModal(false);
                    setTransferType("department");
                    setTargetDepartmentId("");
                    setReason("");
                    setNotes("");
                    setPriorityEscalation(false);
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="custom-modal-body">
                <div className="mb-3">
                  <label className="form-label">Transfer Type</label>
                  <select
                    className="form-select"
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="department">Department</option>
                    <option value="agent">Agent</option>
                  </select>
                  {transferType === "agent" && (
                    <small className="form-text text-muted">
                      Select an agent from the selected department.
                    </small>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Target Department</label>
                  <select
                    className="form-select"
                    value={targetDepartmentId}
                    onChange={(e) => {
                      setTargetDepartmentId(e.target.value);
                      setTargetAgentEmail(""); 
                    }}
                    disabled={submitting}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

              {transferType === "agent" && targetDepartmentId && (
  <div className="mb-3">
    <label className="form-label">Target Agent</label>
    <div className="position-relative">
      <input
        type="text"
        className="form-control mb-2"
        placeholder="Search agents..."
        value={searchAgent}
        onChange={(e) => setSearchAgent(e.target.value)}
        disabled={submitting || !agents.length}
        onFocus={() => setShowAgentDropdown(true)} 
      />
      {showAgentDropdown && (
        <div className="agent-dropdown">
          {agents.length > 0 ? (
            agents
              .filter(
                (agent) =>
                  `${agent.first_name} ${agent.last_name}`
                    .toLowerCase()
                    .includes(searchAgent.toLowerCase()) ||
                  agent.email.toLowerCase().includes(searchAgent.toLowerCase())
              )
              .map((agent) => (
                <div
                  key={agent.email}
                  className="agent-dropdown-item"
                  onClick={() => {
                    setTargetAgentEmail(agent.email);
                    setShowAgentDropdown(false); // Close dropdown after selection
                    setSearchAgent(`${agent.first_name} ${agent.last_name}` || agent.email); // Optional: Set search input to selected agent
                  }}
                >
                  {agent.first_name + ' ' + agent.last_name || agent.email}
                </div>
              ))
          ) : (
            <div className="agent-dropdown-item disabled">No agents available</div>
          )}
        </div>
      )}
      {!agents.length && targetDepartmentId && (
        <small className="form-text text-muted">
          No agents available in this department.
        </small>
      )}
    </div>
  </div>
)}

                <div className="mb-3">
                  <label className="form-label">Reason for Transfer</label>
                  <input
                    type="text"
                    className="form-control"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for transfer"
                    disabled={submitting}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes"
                    rows="3"
                    disabled={submitting}
                  ></textarea>
                </div>

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={priorityEscalation}
                    onChange={(e) => setPriorityEscalation(e.target.checked)}
                    disabled={submitting}
                    id="priorityEscalation"
                  />
                  <label className="form-check-label" htmlFor="priorityEscalation">
                    Priority Escalation
                  </label>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setTransferType("department");
                    setTargetDepartmentId("");
                    setReason("");
                    setNotes("");
                    setPriorityEscalation(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleTransfer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : (
                    "Transfer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default ChatTransfer;
