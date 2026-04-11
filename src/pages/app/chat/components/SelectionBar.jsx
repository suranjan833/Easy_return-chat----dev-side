import { Icon } from "@/components/Component";
import React from "react";
import { DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from "reactstrap";

const SelectionBar = ({ messages, selectedMessages, setSelectedMessages, setIsSelectionMode, deleteMessage }) => {
  return (
    <div className="modern-selection-mode">
      <div className="modern-selection-mode-content">
        {selectedMessages.length} message(s) selected
      </div>
      <div className="modern-selection-mode-actions">
        <button
          className="modern-selection-mode-btn secondary"
          onClick={() => {
            const allIds = messages.filter((m) => !m.meta).map((m) => m.id);
            setSelectedMessages(allIds);
          }}
        >
          Select All
        </button>
        <button
          className="modern-selection-mode-btn secondary"
          onClick={() => {
            setIsSelectionMode(false);
            setSelectedMessages([]);
          }}
        >
          Cancel
        </button>
        <UncontrolledDropdown>
          <DropdownToggle tag="button" className="modern-selection-mode-btn primary">
            Actions
          </DropdownToggle>
          <DropdownMenu end>
            <ul className="link-list-opt no-bdr">
              <li>
                <DropdownItem
                  tag="a"
                  href="#delete"
                  onClick={(e) => {
                    e.preventDefault();
                    selectedMessages.forEach((id) => deleteMessage(id));
                    setIsSelectionMode(false);
                    setSelectedMessages([]);
                  }}
                >
                  <Icon name="trash" className="me-2" />
                  Delete Selected
                </DropdownItem>
              </li>
              <li>
                <DropdownItem tag="a" href="#forward" onClick={(e) => e.preventDefault()}>
                  <Icon name="forward" className="me-2" />
                  Forward Selected
                </DropdownItem>
              </li>
            </ul>
          </DropdownMenu>
        </UncontrolledDropdown>
      </div>
    </div>
  );
};

export default SelectionBar;
