import React, { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button } from "reactstrap";
import { toast } from "react-toastify";
import { checkExternalApiStatus } from "../../Services/widget";

const StatusCheckModal = ({ isOpen, toggle, ticketNumber, isAgent, isHumanHandoff, agentEmail, localAgentEmail, socket, setMessages }) => {
  const [statusForm, setStatusForm] = useState({
    req_type: "",
    key: "",
    txnid: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleStatusFormChange = (e) => {
    const { name, value } = e.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckStatus = async () => {
    if (!ticketNumber) {
      toast.error("No ticket selected.");
      return;
    }
    if (!statusForm.req_type || !statusForm.key || !statusForm.txnid) {
      toast.error("Please fill all fields in the status check form.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await checkExternalApiStatus({
        ticket_number: ticketNumber,
        req_type: statusForm.req_type,
        key: statusForm.key,
        txnid: statusForm.txnid,
      });
      if (socket && socket.readyState === WebSocket.OPEN) {
        const message = {
          message_type: "notification",
          content: `Transaction Status (${statusForm.req_type} - ${statusForm.txnid}): ${response.data.transaction_status}`,
          sender_type: isAgent || isHumanHandoff ? "agent" : "user",
          sender_email:
            isAgent || isHumanHandoff
              ? agentEmail || localAgentEmail || "humanstar@gmail.com"
              : "humanstar@gmail.com",
          timestamp: new Date().toISOString(),
        };
        socket.send(JSON.stringify(message));

      }
      setMessages((prev) =>
        [
          ...prev,
          {
            message_type: "notification",
            content: `Transaction Status (${statusForm.req_type} - ${statusForm.txnid}): ${response.data.transaction_status}`,
            sender_type: isAgent || isHumanHandoff ? "agent" : "user",
            sender_email:
              isAgent || isHumanHandoff
                ? agentEmail || localAgentEmail || "humanstar@gmail.com"
                : "humanstar@gmail.com",
            timestamp: new Date().toISOString(),
          },
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      );
      setStatusForm({ req_type: "", key: "", txnid: "" });
      toast.success("Status fetched successfully!");
      toggle();
    } catch (err) {
      console.error("[StatusCheckModal] Check status error:", {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
      });
      toast.error(err.message || "Failed to fetch transaction status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} fade={true}>
      <ModalHeader toggle={toggle}>Check Transaction Status</ModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Label for="req_type">Request Type</Label>
            <Input
              type="select"
              name="req_type"
              id="req_type"
              value={statusForm.req_type}
              onChange={handleStatusFormChange}
              required
            >
              <option value="">Select Request Type</option>
              <option value="ITR">Income Tax Return</option>
              <option value="GSTRETURN">GST Return</option>
              <option value="GSTREG">GST Registration</option>
              <option value="PAN">PAN Card</option>
              <option value="INSURANCE">Insurance</option>
              <option value="BSPR">BSPR</option>
              <option value="BCERT">BCERT</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label for="key">Status Type</Label>
            <Input
              type="select"
              name="key"
              id="key"
              value={statusForm.key}
              onChange={handleStatusFormChange}
              required
            >
              <option value="">Select Status Type</option>
              <option value="status">Status</option>
              <option value="refund">Refund</option>
              <option value="prioritised">Prioritised</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label for="txnid">Transaction ID</Label>
            <Input
              type="text"
              name="txnid"
              id="txnid"
              value={statusForm.txnid}
              onChange={handleStatusFormChange}
              placeholder="Enter Transaction ID"
              required
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          color="primary"
          onClick={handleCheckStatus}
          disabled={submitting}
        >
          {submitting ? "Checking..." : "Check Status"}
        </Button>
        <Button color="secondary" onClick={toggle}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StatusCheckModal;