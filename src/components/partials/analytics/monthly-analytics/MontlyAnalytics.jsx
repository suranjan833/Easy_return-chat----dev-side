import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Table, FormGroup, Label, Input, Row, Col } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import axios from "axios";

ChartJS.register(LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const MonthlyAnalytics = () => {
  const [selectedDate, setSelectedDate] = useState(new Date("2025-06-01"));
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [month, setMonth] = useState(selectedDate.getMonth() + 1); // Months are 1-12
  const [siteId, setSiteId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
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
        console.error("[MonthlyAnalytics] Error fetching sites:", error);
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
        console.error("[MonthlyAnalytics] Error fetching departments:", error);
        setDeptFetchError("Failed to load departments");
        setDepartments([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    };
    fetchDepartments();
    departmentsFetchedRef.current = true;
  }, [token]);

  const analyticsFetchedRef = useRef(null);
  // Fetch analytics data
  useEffect(() => {
    const selectedDept = departments.find((dept) => dept.name === departmentName);
    const params = {
      year: year,
      month: month,
      ...(siteId && { site_id: siteId }),
      ...(selectedDept && { department_id: selectedDept.id }),
      ...(agentEmail && { agent_email: agentEmail }),
    };

    // Prevent double fetch if dependencies haven't truly changed
    if (analyticsFetchedRef.current &&
        analyticsFetchedRef.current.year === year &&
        analyticsFetchedRef.current.month === month &&
        analyticsFetchedRef.current.siteId === siteId &&
        analyticsFetchedRef.current.departmentName === departmentName &&
        analyticsFetchedRef.current.agentEmail === agentEmail) {
        return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await axios.get("https://supportdesk.fskindia.com/analytics/monthly", {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("[MonthlyAnalytics] Error fetching analytics data:", error);
        setAnalyticsData(null);
      }
    };
    if (token && year && month) {
      fetchAnalytics();
      analyticsFetchedRef.current = { year, month, siteId, departmentName, agentEmail };
    }
  }, [year, month, siteId, departmentName, agentEmail, departments, token]);

  // Chart data for weekly breakdown (Line chart)
  const weeklyChartData = {
    labels: analyticsData ? Object.keys(analyticsData.weekly_breakdown) : [],
    datasets: [
      {
        label: "Requests per Week",
        data: analyticsData ? Object.values(analyticsData.weekly_breakdown).map((week) => week.count) : [],
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
            <h6 className="title">Monthly Analytics: {analyticsData ? `${analyticsData.month_name} ${analyticsData.year}` : ''}</h6>
            <p>Analytics for a specific month with weekly breakdown.</p>
          </div>
          <div className="card-tools">
            <Row className="g-2 align-items-end">
              <Col sm="6" md="2">
                <FormGroup>
                  <Label for="dateSelect">Select Date in Month</Label>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => {
                      setSelectedDate(date);
                      setYear(date.getFullYear());
                      setMonth(date.getMonth() + 1);
                    }}
                    className="form-control"
                    placeholderText="Select Date in Month"
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
                  <Label for="agentEmail">Agent Email</Label>
                  <Input
                    type="email"
                    id="agentEmail"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    placeholder="Enter agent email"
                  />
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
            <Col sm="6" md="3">
              <div className="analytic-data">
                <div className="title">Total Requests</div>
                <div className="amount">{analyticsData.total_requests}</div>
              </div>
            </Col>
            <Col sm="6" md="3">
              <div className="analytic-data">
                <div className="title">Initiated Requests</div>
                <div className="amount">{analyticsData.requests_by_status.initiated}</div>
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
                  <td>Year</td>
                  <td>{analyticsData.year}</td>
                </tr>
                <tr>
                  <td>Month</td>
                  <td>{analyticsData.month_name}</td>
                </tr>
                <tr>
                  <td>Total Requests</td>
                  <td>{analyticsData.total_requests}</td>
                </tr>
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Weekly Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.weekly_breakdown).map(([weekKey, weekData]) => (
                    <tr key={weekKey}>
                      <td>{weekKey} ({weekData.start} to {weekData.end})</td>
                      <td>{weekData.count}</td>
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
                <h6>Weekly Breakdown</h6>
                <Line data={weeklyChartData} options={chartOptions} />
              </div>
            </Col>
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
        )}
      </div>
    </Card>
  );
};

export default MonthlyAnalytics;
