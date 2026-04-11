import { useState, useEffect, useRef } from "react";
import { Card, Button, Table, FormGroup, Label, Input, Row, Col } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import axios from "axios";

ChartJS.register(LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const DailyAnalytics = () => {
  const [targetDate, setTargetDate] = useState(new Date());
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

  const sitesFetchedRef = useRef(false);
  // Fetch sites
  useEffect(() => {
    if (!token) {
      setSiteFetchError("Authentication token is missing");
      setSites([]);
      setIsLoadingSites(false);
      return;
    }
    if (sitesFetchedRef.current) return; // Prevent double fetch in StrictMode

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
        console.error("[DailyAnalytics] Error fetching sites:", error);
        setSiteFetchError("Failed to load sites");
        setSites([]);
      } finally {
        setIsLoadingSites(false);
      }
    };
    fetchSites();
    sitesFetchedRef.current = true;
  }, [token]);

  const departmentsFetchedRef = useRef(false);
  // Fetch departments
  useEffect(() => {
    if (!token) {
      setDeptFetchError("Authentication token is missing");
      setDepartments([]);
      setIsLoadingDepartments(false);
      return;
    }
    if (departmentsFetchedRef.current) return; // Prevent double fetch in StrictMode

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
        console.error("[DailyAnalytics] Error fetching departments:", error);
        setDeptFetchError("Failed to load departments");
        setDepartments([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    };
    fetchDepartments();
    departmentsFetchedRef.current = true;
  }, [token]);

  const agentsFetchedRef = useRef(false);
   useEffect(() => {
    if (!token) {
      setAgents([]);
      return;
    }
    if (agentsFetchedRef.current) return; // Prevent double fetch in StrictMode

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
        console.error("[DailyAnalytics] Error fetching agents:", error);
        setAgents([]);
      }
    };
    fetchAgents();
    agentsFetchedRef.current = true;
  }, [token]);

  const analyticsFetchedRef = useRef(null);
  // Fetch analytics data
  useEffect(() => {
    const selectedDept = departments.find((dept) => dept.name === departmentName);
    const params = {
      target_date: targetDate.toISOString().split("T")[0],
      ...(siteId && { site_id: siteId }),
      ...(selectedDept && { department_id: selectedDept.id }),
      ...(agentEmail && { agent_email: agentEmail }),
    };

    // Prevent double fetch if dependencies haven't truly changed
    if (analyticsFetchedRef.current &&
        analyticsFetchedRef.current.targetDate === targetDate &&
        analyticsFetchedRef.current.siteId === siteId &&
        analyticsFetchedRef.current.departmentName === departmentName &&
        analyticsFetchedRef.current.agentEmail === agentEmail) {
        return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await axios.get("https://supportdesk.fskindia.com/analytics/daily", {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("[DailyAnalytics] Error fetching analytics data:", error);
        setAnalyticsData(null);
      }
    };
    if (token) {
      fetchAnalytics();
      analyticsFetchedRef.current = { targetDate, siteId, departmentName, agentEmail };
    }
  }, [targetDate, siteId, departmentName, agentEmail, departments, token]);

    const getAgentName = (email) => {
    const agent = agents.find((agent) => agent.email === email);
    return agent ? `${agent.first_name} ${agent.last_name}` : email;
  };

  // Chart data for hourly breakdown (Line chart)
  const hourlyChartData = {
    labels: analyticsData ? Object.keys(analyticsData.hourly_breakdown).map((hour) => `${hour}:00`) : [],
    datasets: [
      {
        label: "Requests per Hour",
        data: analyticsData ? Object.values(analyticsData.hourly_breakdown) : [],
        fill: false,
        borderColor: "#118ab2",
        tension: 0.4,
        pointBackgroundColor: "#073b4c",
        pointBorderColor: "#073b4c",
      },
    ],
  };

  // Chart data for priority distribution (Pie chart)
  const priorityChartData = {
    labels: analyticsData ? Object.keys(analyticsData.requests_by_priority) : [],
    datasets: [
      {
        data: analyticsData ? Object.values(analyticsData.requests_by_priority) : [],
        backgroundColor: ["#ff6b6b", "#ffd166", "#06d6a0", "#118ab2"],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  // Chart data for status distribution (Pie chart)
  const statusChartData = {
    labels: analyticsData ? Object.keys(analyticsData.requests_by_status) : [],
    datasets: [
      {
        data: analyticsData ? Object.values(analyticsData.requests_by_status) : [],
        backgroundColor: ["#ef476f", "#ffd166", "#06d6a0", "#118ab2"],
        borderColor: "#ffffff",
        borderWidth: 2,
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
            <h6 className="title">Daily Analytics: {targetDate.toISOString().split("T")[0]}</h6>
            <p>Analytics for a specific day with hourly breakdown.</p>
          </div>
          <div className="card-tools">
            <Row className="g-2 align-items-end">
              <Col sm="6" md="3">
                <FormGroup>
                  <Label for="dateSelect">Select Date</Label>
                  <DatePicker
                    selected={targetDate}
                    onChange={(date) => setTargetDate(date)}
                    className="form-control"
                    placeholderText="Select Date"
                  />
                </FormGroup>
              </Col>
              <Col sm="6" md="3">
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
              <Col sm="6" md="3">
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
              <Col sm="6" md="1" className="d-flex align-items-end">
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
          <Row className="analytic-data-group g-3 mb-4">
            <Col xs="6" sm="4" md="2">
              <div className="analytic-data text-center p-2 bg-light rounded">
                <div className="title fw-bold text-muted">Total Requests</div>
                <div className="amount fs-4">{analyticsData.total_requests}</div>
              </div>
            </Col>
            <Col xs="6" sm="4" md="2">
              <div className="analytic-data text-center p-2 bg-light rounded">
                <div className="title fw-bold text-muted">Peak Hour</div>
                <div className="amount fs-4">{analyticsData.peak_hour}:00</div>
              </div>
            </Col>
            <Col xs="6" sm="4" md="2">
              <div className="analytic-data text-center p-2 bg-light rounded">
                <div className="title fw-bold text-muted">Resolved Requests</div>
                <div className="amount fs-4">{analyticsData.requests_by_status.resolved}</div>
              </div>
            </Col>
            <Col xs="6" sm="4" md="2">
              <div className="analytic-data text-center p-2 bg-light rounded">
                <div className="title fw-bold text-muted">Closed Requests</div>
                <div className="amount fs-4">{analyticsData.requests_by_status.closed}</div>
              </div>
            </Col>
            <Col xs="6" sm="4" md="2">
              <div className="analytic-data text-center p-2 bg-light rounded">
                <div className="title fw-bold text-muted">Agent Engaged</div>
                <div className="amount fs-4">{analyticsData.requests_by_status.agent_engaged}</div>
              </div>
            </Col>
            <Col xs="6" sm="4" md="2">
              <div className="analytic-data text-center p-2 bg-light rounded">
                <div className="title fw-bold text-muted">Initiated Requests</div>
                <div className="amount fs-4">{analyticsData.requests_by_status.initiated}</div>
              </div>
            </Col>
          </Row>
        ) : analyticsData ? (
          <div style={{ maxHeight: "300px", overflowY: "auto", overflowX: "auto" }}>
            <Table responsive className="table-bordered" style={{ minWidth: "600px" }}>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Date</td>
                  <td>{analyticsData.date}</td>
                </tr>
                <tr>
                  <td>Total Requests</td>
                  <td>{analyticsData.total_requests}</td>
                </tr>
                <tr>
                  <td>Peak Hour</td>
                  <td>{analyticsData.peak_hour}:00</td>
                </tr>
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Hourly Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.hourly_breakdown).map(([hour, count]) => (
                    <tr key={hour}>
                      <td>{hour}:00</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Requests by Priority</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.requests_by_priority).map(([priority, count]) => (
                    <tr key={priority}>
                      <td>{priority}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Requests by Status</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.requests_by_status).map(([status, count]) => (
                    <tr key={status}>
                      <td>{status}</td>
                      <td>{count}</td>
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
                <h6>Hourly Breakdown</h6>
                <Line data={hourlyChartData} options={chartOptions} />
              </div>
            </Col>
            <Row className="g-3">
              <Col md="6">
                <div style={{ height: "300px" }}>
                  <h6>Priority Distribution</h6>
                  <Pie data={priorityChartData} options={chartOptions} />
                </div>
              </Col>
              <Col md="6">
                <div style={{ height: "300px" }}>
                  <h6>Status Distribution</h6>
                  <Pie data={statusChartData} options={chartOptions} />
                </div>
              </Col>
            </Row>
          </Row>
        )}
      </div>
    </Card>
  );
};

export default DailyAnalytics;
