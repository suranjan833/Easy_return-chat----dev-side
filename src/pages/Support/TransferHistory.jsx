import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { BiHistory } from "react-icons/bi";
import "./TransferHistory.css";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const TransferHistory = ({ ticketNumber, selectedTicket }) => {
  const [showModal, setShowModal] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);
 
  // Fetch transfer history when modal opens
  useEffect(() => {
    if (!showModal || !ticketNumber) return;

    const fetchTransferHistory = async () => {
      setLoading(true);
      try {
        const historyUrl = `https://supportdesk.fskindia.com/transfer/transfer/history/${ticketNumber}`;
        const token = localStorage.getItem("websocket_token");
        const apiKey = import.meta.env.VITE_API_KEY || "90N1TcGbz1Ia37BRjSVQAig_4S6eZ7q2";


        const response = await axios.get(historyUrl, {
          headers: {
            "x-api-key": apiKey,
            Authorization: `Bearer ${token}`,
          },
        });


        if (!response.data.ticket_number || !Array.isArray(response.data.transfer_history)) {
          throw new Error("Invalid response: Expected ticket_number and transfer_history array");
        }
        setTransferHistory(response.data.transfer_history);
      } catch (err) {
        console.error("[TransferHistory] Error fetching transfer history:", err);
        toast.error(`Failed to load transfer history: ${err.message}`);
        setTransferHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTransferHistory();
  }, [showModal, ticketNumber]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && showModal) {
        setShowModal(false);
        setTransferHistory([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && showModal) {
        setShowModal(false);
        setTransferHistory([]);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [showModal]);

  return (
    <div className="transfer-history-container">
      {/* <button
        className="btn btn-info mx-2"
        onClick={() => setShowModal(true)}
        disabled={loading || !ticketNumber}
        aria-label="View transfer history"
      >
        <BiHistory />
      </button> */}
       <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="tooltip-history">View Transfer History</Tooltip>}
    >
      <button
        onClick={() => setShowModal(true)}
        disabled={loading || !ticketNumber}
        aria-label="View transfer history"
        className={`
          mx-2 px-2 py-1 rounded
          bg-sky-500 text-white text-sm
          hover:bg-green-600
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center
        `}
      >
        <BiHistory size={16} />
      </button>
    </OverlayTrigger>

      {showModal && (
        <>
          <div className="custom-modal-backdrop"></div>
          <div className="custom-modal" ref={modalRef}>
            <div className="custom-modal-content">
              <div className="custom-modal-header">
                <h5>Transfer History for Ticket</h5>
                <button
                  type="button"
                  className="custom-modal-close"
                  onClick={() => {
                    setShowModal(false);
                    setTransferHistory([]);
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="custom-modal-body">
                {loading ? (
                  <div className="text-center">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span> Loading...</span>
                  </div>
                ) : transferHistory.length === 0 ? (
                  <p>No transfer history available.</p>
                ) : (
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Details</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferHistory.map((entry, index) => (
                        <tr key={index}>
                          <td>{new Date(entry.timestamp).toLocaleString()}</td>
                          <td>{entry.content.split('\n').map((line, i) => <div key={i}>{line}</div>)}</td>
                          <td>{entry.metadata.notes || "No notes"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setTransferHistory([]);
                  }}
                  disabled={loading}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransferHistory;
