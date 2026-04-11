import React, { useState, useEffect } from "react";
import { Card, Button, Table, FormGroup, Label, Input, Row, Col } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import axios from "axios";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const TrendsAnalytics = () => {
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate);
  defaultStartDate.setDate(defaultEndDate.getDate() - 29); // 30 days including start and end

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [days, setDays] = useState(30);
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

  // Calculate days between start and end dates
  useEffect(() => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
    setDays(diffDays);
  }, [startDate, endDate]);

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
        console.error("[TrendsAnalytics] Error fetching sites:", error);
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
        console.error("[TrendsAnalytics] Error fetching departments:", error);
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
        console.error("[TrendsAnalytics] Error fetching agents:", error);
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
        days: days,
        ...(siteId && { site_id: siteId }),
        ...(selectedDept && { department_id: selectedDept.id }),
        ...(agentEmail && { agent_email: agentEmail }),
      };

      try {
        const response = await axios.get("https://supportdesk.fskindia.com/analytics/trends", {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("[TrendsAnalytics] Error fetching analytics data:", error);
        setAnalyticsData(null);
      }
    };
    if (token && days) {
      fetchAnalytics();
    }
  }, [days, siteId, departmentName, agentEmail, departments, token]);

  const getAgentName = (email) => {
    const agent = agents.find((agent) => agent.email === email);
    return agent ? `${agent.first_name} ${agent.last_name}` : email;
  };

  // Chart data for daily trends (Line chart)
  const dailyTrendsChartData = {
    labels: analyticsData ? Object.keys(analyticsData.daily_trends) : [],
    datasets: [
      {
        label: "Total Requests",
        data: analyticsData ? Object.values(analyticsData.daily_trends).map((day) => day.total) : [],
        fill: false,
        borderColor: "#118ab2",
        tension: 0.4,
        pointBackgroundColor: "#073b4c",
        pointBorderColor: "#073b4c",
      },
      {
        label: "Resolved Requests",
        data: analyticsData ? Object.values(analyticsData.daily_trends).map((day) => day.resolved) : [],
        fill: false,
        borderColor: "#06d6a0",
        tension: 0.4,
        pointBackgroundColor: "#073b4c",
        pointBorderColor: "#073b4c",
      },
      {
        label: "Urgent Requests",
        data: analyticsData ? Object.values(analyticsData.daily_trends).map((day) => day.urgent) : [],
        fill: false,
        borderColor: "#ff6b6b",
        tension: 0.4,
        pointBackgroundColor: "#073b4c",
        pointBorderColor: "#073b4c",
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
          autoSkip: true,
          maxTicksLimit: 10,
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
            <h6 className="title">Trends Analytics: {analyticsData ? `${analyticsData.start_date} to ${analyticsData.end_date}` : ''} ({days} days)</h6>
            <p>Performance trends over the last {days} days.</p>
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
            <Col sm="6" md="4">
              <div className="analytic-data">
                <div className="title">Total Requests</div>
                <div className="amount">{analyticsData.total_requests}</div>
              </div>
            </Col>
            <Col sm="6" md="4">
              <div className="analytic-data">
                <div className="title">Average Daily Requests</div>
                <div className="amount">{analyticsData.average_daily_requests.toFixed(2)}</div>
              </div>
            </Col>
            <Col sm="6" md="4">
              <div className="analytic-data">
                <div className="title">Overall Resolution Rate</div>
                <div className="amount">{analyticsData.overall_resolution_rate.toFixed(2)}%</div>
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
                  <td>Period (Days)</td>
                  <td>{analyticsData.period_days}</td>
                </tr>
                <tr>
                  <td>Start Date</td>
                  <td>{analyticsData.start_date}</td>
                </tr>
                <tr>
                  <td>End Date</td>
                  <td>{analyticsData.end_date}</td>
                </tr>
                <tr>
                  <td>Total Requests</td>
                  <td>{analyticsData.total_requests}</td>
                </tr>
                <tr>
                  <td>Average Daily Requests</td>
                  <td>{analyticsData.average_daily_requests.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Overall Resolution Rate</td>
                  <td>{analyticsData.overall_resolution_rate.toFixed(2)}%</td>
                </tr>
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Daily Trends</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Resolved</th>
                  <th>Urgent</th>
                </tr>
                {analyticsData &&
                  Object.entries(analyticsData.daily_trends).map(([date, data]) => (
                    <tr key={date}>
                      <td>{date}</td>
                      <td>{data.total}</td>
                      <td>{data.resolved}</td>
                      <td>{data.urgent}</td>
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
                <h6>Daily Trends</h6>
                <Line data={dailyTrendsChartData} options={chartOptions} />
              </div>
            </Col>
          </Row>
        )}
      </div>
    </Card>
  );
};

export default TrendsAnalytics;