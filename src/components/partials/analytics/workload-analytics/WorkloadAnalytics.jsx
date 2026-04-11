import React, { useState, useEffect } from "react";
import { Card, Button, Table, FormGroup, Label, Input, Row, Col } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import axios from "axios";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const WorkloadAnalytics = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [siteId, setSiteId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [siteFetchError, setSiteFetchError] = useState(null);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [deptFetchError, setDeptFetchError] = useState(null);
  const token = localStorage.getItem("accessToken");

  const cardStyles = {
    maxWidth: "100%",
    overflowX: "auto",
    padding: "2px",
  };

  // Fetch sites
  useEffect(() => {
    if (!token) {
      setSiteFetchError("Authentication token is missing");
      setSites([]);
      setIsLoadingSites(false);
      return;
    }

    const fetchSites = async () => {
      setIsLoadingSites(true);
      try {
        const response = await axios.get("https://chatsupport.fskindia.com/sites/", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setSites(response.data.records || []);
        setSiteFetchError(null);
      } catch (error) {
        console.error("[WorkloadAnalytics] Error fetching sites:", error);
        setSiteFetchError("Failed to load sites");
        setSites([]);
      } finally {
        setIsLoadingSites(false);
      }
    };
    fetchSites();
  }, [token]);

  // Fetch departments
  useEffect(() => {
    if (!token) {
      setDeptFetchError("Authentication token is missing");
      setDepartments([]);
      setIsLoadingDepartments(false);
      return;
    }

    const fetchDepartments = async () => {
      setIsLoadingDepartments(true);
      try {
        const response = await axios.get("https://chatsupport.fskindia.com/departments/", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const deptData = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.records)
            ? response.data.records
            : Array.isArray(response.data.data)
              ? response.data.data
              : [];
        setDepartments(deptData);
        setDeptFetchError(null);
      } catch (error) {
        console.error("[WorkloadAnalytics] Error fetching departments:", error);
        setDeptFetchError("Failed to load departments");
        setDepartments([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, [token]);

  useEffect(() => {
    if (!token) {
      setAgents([]);
      return;
    }

    const fetchAgents = async () => {
      try {
        const response = await axios.get("https://chatsupport.fskindia.com/users/agents/all", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setAgents(response.data);
        if (response.data.length > 0) {
          setAgentEmail(response.data[0].email);
        }
      } catch (error) {
        console.error("[WorkloadAnalytics] Error fetching agents:", error);
        setAgents([]);
      }
    };
    fetchAgents();
  }, [token]);
  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      const selectedDept = departments.find((dept) => dept.name === departmentName);
      const params = {
        ...(startDate && { start_date: startDate.toISOString().split("T")[0] }),
        ...(endDate && { end_date: endDate.toISOString().split("T")[0] }),
        ...(siteId && { site_id: siteId }),
        ...(selectedDept && { department_id: selectedDept.id }),
        ...(agentEmail && { agent_email: agentEmail }),
      };

      try {
        const response = await axios.get("https://supportdesk.fskindia.com/analytics/workload", {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("[WorkloadAnalytics] Error fetching analytics data:", error);
        setAnalyticsData(null);
      }
    };
    if (token) {
      fetchAnalytics();
    }
  }, [startDate, endDate, siteId, departmentName, agentEmail, departments, token]);

  const getAgentName = (email) => {
    const agent = agents.find((agent) => agent.email === email);
    return agent ? `${agent.first_name} ${agent.last_name}` : email;
  };
  // Chart data for agent workload (top 10 agents by total requests)
  const topAgents = analyticsData
    ? Object.entries(analyticsData.agent_workload)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
    : [];

  const agentChartData = {
    labels: topAgents.map(([email]) => email.split("@")[0]),
    datasets: [
      {
        label: "Total Requests",
        data: topAgents.map(([, data]) => data.total),
        backgroundColor: "#118ab2",
        borderColor: "#073b4c",
        borderWidth: 1,
      },
      {
        label: "Resolved Requests",
        data: topAgents.map(([, data]) => data.resolved),
        backgroundColor: "#06d6a0",
        borderColor: "#073b4c",
        borderWidth: 1,
      },
    ],
  };

  // Chart data for site workload
  const siteChartData = {
    labels: analyticsData ? Object.keys(analyticsData.site_workload) : [],
    datasets: [
      {
        label: "Total Requests",
        data: analyticsData ? Object.values(analyticsData.site_workload).map((site) => site.total) : [],
        backgroundColor: "#118ab2",
        borderColor: "#073b4c",
        borderWidth: 1,
      },
      {
        label: "Resolved Requests",
        data: analyticsData ? Object.values(analyticsData.site_workload).map((site) => site.resolved) : [],
        backgroundColor: "#06d6a0",
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
            <h6 className="title">Workload Distribution Analytics {startDate && endDate ? `(${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]})` : ''}</h6>
            <p>Workload distribution across agents and sites.</p>
          </div>
          <div className="card-tools">
            <Row className="g-2 align-items-end">
              <Col sm="6" md="3">
                <FormGroup>
                  <Label for="dateRange">Select Date Range</Label>
                  <DatePicker
                    selectsRange
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => {
                      const [start, end] = update;
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    className="form-control"
                    placeholderText="Select Date Range"
                    isClearable
                  />
                </FormGroup>
              </Col>
              <Col sm="6" md="2">
                <FormGroup>
                  <Label for="siteSelect">Select Site</Label>
                  <Input
                    type="select"
                    id="siteSelect"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    disabled={isLoadingSites || !!siteFetchError}
                  >
                    <option value="">All Sites</option>
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
                  </Input>
                </FormGroup>
              </Col>
              <Col sm="6" md="2">
                <FormGroup>
                  <Label for="deptSelect">Select Department</Label>
                  <Input
                    type="select"
                    id="deptSelect"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    disabled={isLoadingDepartments || !!deptFetchError}
                  >
                    <option value="">All Departments</option>
                    {isLoadingDepartments ? (
                      <option value="" disabled>Loading departments...</option>
                    ) : deptFetchError ? (
                      <option value="" disabled>{deptFetchError}</option>
                    ) : (
                      departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))
                    )}
                  </Input>
                </FormGroup>
              </Col>
              <Col sm="6" md="2">
                <FormGroup>
                  <Label for="agentSelect">Select Agent</Label>
                  <Input
                    type="select"
                    id="agentSelect"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                  >
                    <option value="">All Agents</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.email}>
                        {`${agent.first_name} ${agent.last_name}`}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col sm="6" md="2" className="d-flex align-items-end">
                <FormGroup>
                  <Button color="primary" onClick={() => setShowTable(!showTable)}>
                    <Icon name={showTable ? "bar-chart" : "table"} />
                    {showTable ? "Charts" : "Table"}
                  </Button>
                </FormGroup>
              </Col>
            </Row>
          </div>
        </div>
        {analyticsData && !showTable ? (
          <Row className="analytic-data-group g-3">
            <Col sm="6" md="2">
              <div className="analytic-data">
                <div className="title">Total Agents</div>
                <div className="amount">{analyticsData.total_agents}</div>
              </div>
            </Col>
            <Col sm="6" md="2">
              <div className="analytic-data">
                <div className="title">Total Sites</div>
                <div className="amount">{analyticsData.total_sites}</div>
              </div>
            </Col>
            <Col sm="6" md="2">
              <div className="analytic-data">
                <div className="title">Avg. Requests/Agent</div>
                <div className="amount">{analyticsData.average_requests_per_agent.toFixed(2)}</div>
              </div>
            </Col>
            <Col sm="6" md="3">
              <div className="analytic-data">
                <div className="title">Most Busy Agent</div>
                <div className="amount">{getAgentName(analyticsData.most_busy_agent)}</div>
              </div>
            </Col>
            <Col sm="6" md="3">
              <div className="analytic-data">
                <div className="title">Most Busy Site</div>
                <div className="amount">{analyticsData.most_busy_site}</div>
              </div>
            </Col>
          </Row>
        ) : analyticsData ? (
          <div style={{ maxHeight: "300px", overflowY: "auto", overflowX: "auto" }}>
            <Table responsive className="table-bordered" style={{ minWidth: "800px" }}>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Agents</td>
                  <td>{analyticsData.total_agents}</td>
                </tr>
                <tr>
                  <td>Total Sites</td>
                  <td>{analyticsData.total_sites}</td>
                </tr>
                <tr>
                  <td>Average Requests per Agent</td>
                  <td>{analyticsData.average_requests_per_agent.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Most Busy Agent</td>
                  <td>{getAgentName(analyticsData.most_busy_agent)}</td>
                </tr>
                <tr>
                  <td>Most Busy Site</td>
                  <td>{analyticsData.most_busy_site}</td>
                </tr>
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Agent Workload</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Agent</th>
                  <th>Total</th>
                  <th>Resolved</th>
                  <th>Active</th>
                  <th>Urgent</th>
                  <th>High</th>
                  <th>Medium</th>
                  <th>Low</th>
                </tr>
                {analyticsData &&
                  Object.entries(analyticsData.agent_workload).map(([email, data]) => (
                    <tr key={email}>
                      <td>{getAgentName(email)}</td>
                      <td>{data.total}</td>
                      <td>{data.resolved}</td>
                      <td>{data.active}</td>
                      <td>{data.urgent}</td>
                      <td>{data.high}</td>
                      <td>{data.medium}</td>
                      <td>{data.low}</td>
                    </tr>
                  ))}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Site Workload</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Site ID</th>
                  <th>Total</th>
                  <th>Resolved</th>
                  <th>Active</th>
                </tr>
                {analyticsData &&
                  Object.entries(analyticsData.site_workload).map(([siteId, data]) => (
                    <tr key={siteId}>
                      <td>{siteId}</td>
                      <td>{data.total}</td>
                      <td>{data.resolved}</td>
                      <td>{data.active}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p>Loading data...</p>
        )}
        {!showTable && analyticsData && (
          <Row className="g-3 mt-4">
            <Col md="12">
              <div style={{ height: "300px" }}>
                <h6>Agent Workload (Top 10 Agents)</h6>
                <Bar data={agentChartData} options={chartOptions} />
              </div>
            </Col>
            <Col md="12">
              <div style={{ height: "300px" }}>
                <h6>Site Workload</h6>
                <Bar data={siteChartData} options={chartOptions} />
              </div>
            </Col>
          </Row>
        )}
      </div>
    </Card>
  );
};

export default WorkloadAnalytics;