import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import axios from 'axios';

const  FilterPanel = ({
  usernameFilter,
  setUsernameFilter,
  userEmailFilter,
  setUserEmailFilter,
  agentEmailFilter,
  setAgentEmailFilter,
  ticketNumberFilter,
  setTicketNumberFilter,
  siteIdFilter,
  setSiteIdFilter,
  dateFilter,
  setDateFilter,
  datesFilter,
  setDatesFilter,
  fetchFilteredTickets,
  isFetching,
  setCurrentPage,
  resetFilteredTickets,
}) => {
  const [sites, setSites] = useState([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [siteFetchError, setSiteFetchError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentFetchError, setAgentFetchError] = useState(null);
  const dateInputRef = useRef(null); // Create a ref for the date input

  // Fetch sites when component mounts
  useEffect(() => {
    const fetchSites = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setSiteFetchError('Authentication token is missing');
        setSites([]);
        setIsLoadingSites(false);
        return;
      }

      setIsLoadingSites(true);
      try {
        const response = await axios.get(
          'https://chatsupport.fskindia.com/sites/',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        setSites(response.data.records || []);
        setSiteFetchError(null);

      } catch (error) {
        console.error('[FilterPanel] Error fetching sites:', error);
        setSiteFetchError('Failed to load sites');
        setSites([]);
      } finally {
        setIsLoadingSites(false);
      }
    };

    fetchSites();
  }, []);

  useEffect(() => {
    const fetchAgents = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setAgentFetchError('Authentication token is missing');
        setAgents([]);
        setIsLoadingAgents(false);
        return;
      }

      setIsLoadingAgents(true);
      try {
        const response = await axios.get(
          'https://chatsupport.fskindia.com/users/agents/all?skip=0&limit=100',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        setAgents(response.data || []);
        setAgentFetchError(null);
      } catch (error) {
        console.error('[FilterPanel] Error fetching agents:', error);
        setAgentFetchError('Failed to load agents');
        setAgents([]);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

  const handleClearFilters = () => {
    setUsernameFilter('');
    setUserEmailFilter('');
    setAgentEmailFilter('');
    setTicketNumberFilter('');
    setSiteIdFilter('');
    setDateFilter('active');
    setDatesFilter(''); // Revert to empty string as propType is string
    if (dateInputRef.current) {
      dateInputRef.current.value = ''; // Explicitly clear the date input using ref
    }
    setCurrentPage(1);
    resetFilteredTickets();
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchFilteredTickets();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [usernameFilter, userEmailFilter, agentEmailFilter, ticketNumberFilter, siteIdFilter, dateFilter]);

  return (
    <div className="filter-panel mb-3 p-3 bg-light border rounded">
      <h5>Filter Tickets</h5>
      <div className="d-flex flex-column">
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Search by username"
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
        />
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Search by user email"
          value={userEmailFilter}
          onChange={(e) => setUserEmailFilter(e.target.value)}
        />
        <select
          className="form-control mb-2"
          value={agentEmailFilter}
          onChange={(e) => setAgentEmailFilter(e.target.value)}
          disabled={isLoadingAgents || !!agentFetchError}
        >
          <option value="">None</option>
          {isLoadingAgents ? (
            <option value="" disabled>Loading agents...</option>
          ) : agentFetchError ? (
            <option value="" disabled>{agentFetchError}</option>
          ) : (
            agents.map((agent) => (
              <option key={agent.id} value={agent.email}>
                {agent.first_name} {agent.last_name}
              </option>
            ))
          )}
        </select>
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Filter by ticket number"
          value={ticketNumberFilter}
          onChange={(e) => setTicketNumberFilter(e.target.value)}
        />
        <select
          className="form-control mb-2"
          value={siteIdFilter}
          onChange={(e) => setSiteIdFilter(e.target.value)}
          disabled={isLoadingSites || !!siteFetchError}
        >
          <option value="">None</option>
          {isLoadingSites ? (
            <option value="" disabled>Loading sites...</option>
          ) : siteFetchError ? (
            <option value="" disabled>{siteFetchError}</option>
          ) : (
            sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.domain}
              </option>
            ))
          )}
        </select>

        {/* Date input */}
        <input
          type="date"
          className="form-control mb-2"
          ref={dateInputRef} // Attach the ref to the date input
          value={datesFilter}
          onChange={(e) => setDatesFilter(e.target.value)}
        />

        {/* Date filter buttons */}
        {/* <div
          className="btn-group mb-2"
          role="group"
          aria-label="Date filter"
        >
          <button
            type="button"
            className={`btn ${dateFilter === "active" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setDateFilter("active")}
          >
            Active
          </button>
          <button
            type="button"
            className={`btn ${dateFilter === "history" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setDateFilter("history")}
          >
            History
          </button>
          <button
            type="button"
            className={`btn ${dateFilter === "transferred" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setDateFilter("transferred")}
          >
            Transferred
          </button>
        </div> */}

        <div className="d-flex gap-2 mb-2">
          <Button
            className="btn btn-primary mt-2 flex-grow-1 p-2"
            onClick={() => {
              setCurrentPage(1);
              fetchFilteredTickets();
            }}
            disabled={isFetching || isLoadingSites}
          >
            {isFetching ? 'Fetching...' : 'Apply Filters'}
          </Button>
          <Button
            className="btn btn-secondary mt-2 p-2"
            onClick={handleClearFilters}
            disabled={isFetching || isLoadingSites}
          >
            Clear Filters
          </Button>
        </div>
         {/* <div
          className="btn-group mt-5"
          role="group"
          aria-label="Date filter"
        >
          <button
            type="button"
            className={`btn ${dateFilter === "active" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setDateFilter("active")}
          >
            Active
          </button>
          <button
            type="button"
            className={`btn ${dateFilter === "history" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setDateFilter("history")}
          >
            History
          </button>
          <button
            type="button"
            className={`btn ${dateFilter === "transferred" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setDateFilter("transferred")}
          >
            Transferred
          </button>
        </div> */}
      </div>
    </div>
  );
};

FilterPanel.propTypes = {
  usernameFilter: PropTypes.string.isRequired,
  setUsernameFilter: PropTypes.func.isRequired,
  userEmailFilter: PropTypes.string.isRequired,
  setUserEmailFilter: PropTypes.func.isRequired,
  agentEmailFilter: PropTypes.string.isRequired,
  setAgentEmailFilter: PropTypes.func.isRequired,
  ticketNumberFilter: PropTypes.string.isRequired,
  setTicketNumberFilter: PropTypes.func.isRequired,
  siteIdFilter: PropTypes.string.isRequired,
  setSiteIdFilter: PropTypes.func.isRequired,
  dateFilter: PropTypes.string.isRequired,
  setDateFilter: PropTypes.func.isRequired,
  datesFilter:PropTypes.string.isRequired,
  setDatesFilter:PropTypes.func.isRequired,
  fetchFilteredTickets: PropTypes.func.isRequired,
  isFetching: PropTypes.bool.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  resetFilteredTickets: PropTypes.func.isRequired,
};

export default FilterPanel;
