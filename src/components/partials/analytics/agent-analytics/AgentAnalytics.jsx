import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Table } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import axios from "axios";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AgentAnalytics = () => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgentEmail, setSelectedAgentEmail] = useState("");
  const agentEmail = "forus@gmail.com";

  const cardStyles = {
    maxWidth: "100%",
    overflowX: "auto",
    padding: "2px",
  };

  const agentsFetchedRef = useRef(false);
  useEffect(() => {
    if (agentsFetchedRef.current) return; // Prevent double fetch in StrictMode
    
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get("https://chatsupport.fskindia.com/users/agents/all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAgents(response.data);
        if (response.data.length > 0) {
          setSelectedAgentEmail(response.data[0].email);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };
    fetchAgents();
    agentsFetchedRef.current = true;
  }, []);

  const analyticsFetchedRef = useRef(false);
  useEffect(() => {
    if (!selectedAgentEmail) return;
    // Reset ref if dependencies change, allowing a new fetch
    if (analyticsFetchedRef.current && analyticsFetchedRef.current.selectedAgentEmail === selectedAgentEmail &&
        analyticsFetchedRef.current.startDate === startDate && analyticsFetchedRef.current.endDate === endDate) {
        return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`https://supportdesk.fskindia.com/analytics/agent/${encodeURIComponent(selectedAgentEmail)}`, {
          params: {
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
          },
        });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      }
    };
    fetchAnalytics();
    analyticsFetchedRef.current = { selectedAgentEmail, startDate, endDate };
  }, [startDate, endDate, selectedAgentEmail]);

  const handleAgentChange = (event) => {
    setSelectedAgentEmail(event.target.value);
  };

  const getAgentName = (email) => {
    const agent = agents.find((agent) => agent.email === email);
    return agent ? `${agent.first_name} ${agent.last_name}` : email;
  };

  const priorityChartData = {
    labels: analyticsData ? Object.keys(analyticsData.priority_distribution) : [],
    datasets: [
      {
        data: analyticsData ? Object.values(analyticsData.priority_distribution) : [],
        backgroundColor: ["#ff6b6b", "#ffd166", "#06d6a0", "#118ab2"],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const departmentChartData = {
    labels: analyticsData ? Object.keys(analyticsData.department_distribution) : [],
    datasets: [
      {
        label: "Requests",
        data: analyticsData ? Object.values(analyticsData.department_distribution) : [],
        backgroundColor: "#118ab2",
        borderColor: "#073b4c",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Card className="h-100" style={cardStyles}>
      <div className="card-inner">
      <div className="card-title-group pb-3 g-2">
          <div className="card-title">
            <h6 className="title">Agent Analytics: {getAgentName(selectedAgentEmail)}</h6>
            <p>Comprehensive analytics for agent performance.</p>
          </div>
          <div className="card-tools">
            <div className="d-flex gap-2 align-items-center">
              <select
                className="form-control"
                value={selectedAgentEmail}
                onChange={handleAgentChange}
              >
                <option value="">Select Agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.email}>
                    {`${agent.first_name} ${agent.last_name}`}
                  </option>
                ))}
              </select>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="form-control"
                placeholderText="Select Start Date"
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="form-control"
                placeholderText="Select End Date"
              />
              <Button color="primary" onClick={() => setShowTable(!showTable)}>
                <Icon name={showTable ? "bar-chart" : "table"} />
                {showTable ? "Show Charts" : "Show Table"}
              </Button>
            </div>
          </div>
        </div>
        {analyticsData && !showTable ? (
          <div className="analytic-data-group g-3">
            <div className="analytic-data">
              <div className="title">Total Requests</div>
              <div className="amount">{analyticsData.total_requests}</div>
            </div>
            <div className="analytic-data">
              <div className="title">Resolved Requests</div>
              <div className="amount">{analyticsData.resolved_requests}</div>
              <div className="change up">
                <Icon name="arrow-long-up" />
                {analyticsData.resolution_rate.toFixed(2)}%
              </div>
            </div>
            <div className="analytic-data">
              <div className="title">Closed Requests</div>
              <div className="amount">{analyticsData.closed_requests}</div>
            </div>
            <div className="analytic-data">
              <div className="title">Avg Resolution Time</div>
              <div className="amount">{analyticsData.average_resolution_time_hours} hrs</div>
            </div>
            <div className="analytic-data">
              <div className="title">Active Requests</div>
              <div className="amount">{analyticsData.active_requests}</div>
            </div>
          </div>
        ) : analyticsData ? (
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <Table responsive className="table-bordered">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Requests</td>
                  <td>{analyticsData.total_requests}</td>
                </tr>
                <tr>
                  <td>Resolved Requests</td>
                  <td>{analyticsData.resolved_requests}</td>
                </tr>
                <tr>
                  <td>Closed Requests</td>
                  <td>{analyticsData.closed_requests}</td>
                </tr>
                <tr>
                  <td>Resolution Rate</td>
                  <td>{analyticsData.resolution_rate.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>Avg Resolution Time</td>
                  <td>{analyticsData.average_resolution_time_hours} hrs</td>
                </tr>
                <tr>
                  <td>Active Requests</td>
                  <td>{analyticsData.active_requests}</td>
                </tr>
                {Object.entries(analyticsData.priority_distribution).map(([key, value]) => (
                  <tr key={`priority-${key}`}>
                    <td>Priority: {key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
                {Object.entries(analyticsData.department_distribution).map(([key, value]) => (
                  <tr key={`dept-${key}`}>
                    <td>Department: {key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p>Loading data...</p>
        )}
        {!showTable && analyticsData && (
          <div className="row g-3 mt-4">
            <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Priority Distribution</h6>
                <Pie data={priorityChartData} options={chartOptions} />
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Department Distribution</h6>
                <Bar data={departmentChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AgentAnalytics;
