import { useState, useEffect, useRef } from "react";
import { Card, Button, Table, UncontrolledDropdown, DropdownMenu, DropdownItem, DropdownToggle, Row, Col } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import { DoubleBar } from "@/components/partials/charts/default/Charts";
import axios from "axios";

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const OverallAnalytics = () => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [agentTimeRange, setAgentTimeRange] = useState("15");
  const [agents, setAgents] = useState([]);

  const cardStyles = {
    maxWidth: "100%",
    overflowX: "auto",
    padding: "1.5rem",
  };

  const agentsFetchedRef = useRef(false);
  // Fetch agents
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
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
      } catch (error) {
        console.error("[OverallAnalytics] Error fetching agents:", error);
        setAgents([]);
      }
    };
    fetchAgents();
    agentsFetchedRef.current = true;
  }, []);

  const analyticsFetchedRef = useRef(null);
  // Fetch analytics data
  useEffect(() => {
    // Prevent double fetch if dependencies haven't truly changed
    if (analyticsFetchedRef.current &&
        analyticsFetchedRef.current.startDate === startDate &&
        analyticsFetchedRef.current.endDate === endDate) {
        return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await axios.get("https://supportdesk.fskindia.com/analytics/overall", {
          params: {
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            Accept: "application/json",
          },
        });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("[OverallAnalytics] Error fetching analytics data:", error);
        setAnalyticsData(null);
      }
    };
    fetchAnalytics();
    analyticsFetchedRef.current = { startDate, endDate };
  }, [startDate, endDate]);

  const getAgentName = (email) => {
    const agent = agents.find((agent) => agent.email === email);
    return agent ? `${agent.first_name} ${agent.last_name}` : email.split("@")[0];
  };

  // Filter agent performance data based on time range
  const filteredAgentData = analyticsData
    ? Object.entries(analyticsData.agent_performance)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10) // Limit to top 10 agents
    : [];

  // Calculate totals for display
  const totalRequests = filteredAgentData.reduce((sum, [, data]) => sum + data.total, 0);
  const resolvedRequests = filteredAgentData.reduce((sum, [, data]) => sum + data.resolved, 0);

  // Chart data for site performance
  const siteChartData = {
    labels: analyticsData ? Object.keys(analyticsData.site_performance) : [],
    datasets: [
      {
        label: "Total Requests",
        data: analyticsData
          ? Object.values(analyticsData.site_performance).map((site) => site.total)
          : [],
        backgroundColor: "#118ab2",
        borderColor: "#073b4c",
        borderWidth: 1,
      },
      {
        label: "Resolved Requests",
        data: analyticsData
          ? Object.values(analyticsData.site_performance).map((site) => site.resolved)
          : [],
        backgroundColor: "#06d6a0",
        borderColor: "#023047",
        borderWidth: 1,
      },
    ],
  };

  // Chart data for department performance (Line chart)
  const departmentChartData = {
    labels: analyticsData ? Object.keys(analyticsData.department_performance) : [],
    datasets: [
      {
        label: "Total Requests",
        data: analyticsData
          ? Object.values(analyticsData.department_performance).map((dept) => dept.total)
          : [],
        fill: false,
        borderColor: "#ef476f",
        tension: 0.4,
        pointBackgroundColor: "#ffb3c1",
        pointBorderColor: "#ffb3c1",
      },
      {
        label: "Resolved Requests",
        data: analyticsData
          ? Object.values(analyticsData.department_performance).map((dept) => dept.resolved)
          : [],
        fill: false,
        borderColor: "#ffd166",
        tension: 0.4,
        pointBackgroundColor: "#8ecae6",
        pointBorderColor: "#8ecae6",
      },
    ],
  };

  // Chart data for agent performance (DoubleBar)
  const agentChartData = {
    labels: filteredAgentData.map(([email]) => getAgentName(email)),
    datasets: [
      {
        label: "Total Requests",
        data: filteredAgentData.map(([, data]) => data.total),
        backgroundColor: "#118ab2",
        borderColor: "#073b4c",
        borderWidth: 1,
      },
      {
        label: "Resolved Requests",
        data: filteredAgentData.map(([, data]) => data.resolved),
        backgroundColor: "#06d6a0",
        borderColor: "#023047",
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
          maxTicksLimit: 20,
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Card className="card-bordered h-100" style={cardStyles}>
      <div className="card-inner">
        <div className="card-title-group pb-3 g-2">
          <div className="card-title">
            <h6 className="title">Overall System Analytics</h6>
            <p>Comprehensive analytics for the entire system.</p>
          </div>
          <div className="card-tools">
            <div className="d-flex gap-2 align-items-center">
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
              <div className="title">Active Requests</div>
              <div className="amount">{analyticsData.active_requests}</div>
            </div>
          </div>
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
                  <td>Active Requests</td>
                  <td>{analyticsData.active_requests}</td>
                </tr>
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Site Performance</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.site_performance).map(([siteId, data]) => (
                    <tr key={siteId}>
                      <td>Site ID {siteId}</td>
                      <td>
                        Total: {data.total} / Resolved: {data.resolved}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Department Performance</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.department_performance).map(([dept, data]) => (
                    <tr key={dept}>
                      <td>{dept}</td>
                      <td>
                        Total: {data.total} / Resolved: {data.resolved}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Agent Performance</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.agent_performance).map(([email, data]) => (
                    <tr key={email}>
                      <td>{getAgentName(email)}</td>
                      <td>
                        Total: {data.total} / Resolved: {data.resolved}
                      </td>
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
                <h6>Site Performance</h6>
                <Bar data={siteChartData} options={chartOptions} />
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Department Performance</h6>
                <Line data={departmentChartData} options={chartOptions} />
              </div>
            </div>
            <div className="col-md-12">
  <div className="card-title-group align-start mb-3">
    <div className="card-title">
      <h6 className="title">Agent Performance</h6>
      <p>In last {agentTimeRange === "30" ? "30" : "15"} days agent performance overview.</p>
    </div>
    <div className="card-tools mt-n1 me-n1">
      <UncontrolledDropdown>
        <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger">
          <Icon name="more-h"></Icon>
        </DropdownToggle>
        <DropdownMenu end>
          <ul className="link-list-opt no-bdr">
            <li className={agentTimeRange === "15" ? "active" : ""}>
              <DropdownItem
                tag="a"
                href="#dropdownitem"
                onClick={(e) => {
                  e.preventDefault();
                  setAgentTimeRange("15");
                  setStartDate(new Date(endDate.getTime() - 15 * 24 * 60 * 60 * 1000));
                }}
              >
                <span>15 Days</span>
              </DropdownItem>
            </li>
            <li className={agentTimeRange === "30" ? "active" : ""}>
              <DropdownItem
                tag="a"
                href="#dropdownitem"
                onClick={(e) => {
                  e.preventDefault();
                  setAgentTimeRange("30");
                  setStartDate(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));
                }}
              >
                <span>30 Days</span>
              </DropdownItem>
            </li>
          </ul>
        </DropdownMenu>
      </UncontrolledDropdown>
    </div>
  </div>
  <div className="nk-order-ovwg">
    <Row className="g-4 align-end">
      <Col xxl="8">
        <div className="nk-order-ovwg-ck" style={{ height: "300px", overflowX: "auto" }}>
          <DoubleBar state={agentTimeRange} data={agentChartData} options={chartOptions} />
        </div>
      </Col>
      <Col xxl="4">
        <Row className="g-4">
          <Col xxl="12" sm="6">
            <div className="nk-order-ovwg-data buy">
              <div className="amount">{totalRequests}</div>
              <div className="info">
                Last {agentTimeRange === "30" ? "30" : "15"} days <strong>{totalRequests} requests</strong>
              </div>
              <div className="title">
                <Icon name="arrow-down-left"></Icon> Total Requests
              </div>
            </div>
          </Col>
          <Col xxl="12" sm="6">
            <div className="nk-order-ovwg-data sell">
              <div className="amount">{resolvedRequests}</div>
              <div className="info">
                Last {agentTimeRange === "30" ? "30" : "15"} days <strong>{resolvedRequests} requests</strong>
              </div>
              <div className="title">
                <Icon name="arrow-up-left"></Icon> Resolved Requests
              </div>
            </div>
          </Col>
        </Row>
      </Col>
    </Row>
  </div>
</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default OverallAnalytics
