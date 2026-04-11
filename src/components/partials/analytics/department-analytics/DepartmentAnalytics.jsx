import { useState, useEffect, useRef } from "react";
import { Card, Button, Table, FormGroup, Label, Input } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import axios from "axios";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const DepartmentAnalytics = () => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [departmentName, setDepartmentName] = useState("human"); // Default to "human"
  const [departments, setDepartments] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [deptFetchError, setDeptFetchError] = useState(null);
  const token = localStorage.getItem("accessToken");

  const cardStyles = {
    maxWidth: "100%",
    overflowX: "auto",
    padding: "2px",
  };

  const departmentsFetchedRef = useRef(false);
  // Fetch department list
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
        console.error("[DepartmentAnalytics] Error fetching departments:", error);
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
    if (!selectedDept) return;

    // Prevent double fetch if dependencies haven't truly changed
    if (analyticsFetchedRef.current &&
        analyticsFetchedRef.current.departmentName === departmentName &&
        analyticsFetchedRef.current.startDate === startDate &&
        analyticsFetchedRef.current.endDate === endDate) {
        return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`https://supportdesk.fskindia.com/analytics/department/${selectedDept.id}`, {
          params: {
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
          },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("[DepartmentAnalytics] Error fetching analytics data:", error);
        setAnalyticsData(null);
      }
    };
    fetchAnalytics();
    analyticsFetchedRef.current = { departmentName, startDate, endDate };
  }, [departmentName, startDate, endDate, departments, token]);

  // Chart data for priority distribution (Line chart)
  const priorityChartData = {
    labels: analyticsData ? Object.keys(analyticsData.priority_distribution) : [],
    datasets: [
      {
        label: "Priority Distribution",
        data: analyticsData ? Object.values(analyticsData.priority_distribution) : [],
        fill: false,
        borderColor: "#118ab2",
        tension: 0.4,
        pointBackgroundColor: "#073b4c",
        pointBorderColor: "#073b4c",
      },
    ],
  };

  // Chart data for agent performance (Line chart)
  const agentChartData = {
    labels: analyticsData ? Object.keys(analyticsData.agent_performance) : [],
    datasets: [
      {
        label: "Total Requests",
        data: analyticsData
          ? Object.values(analyticsData.agent_performance).map((perf) => perf.total)
          : [],
        fill: false,
        borderColor: "#06d6a0",
        tension: 0.4,
        pointBackgroundColor: "#023047",
        pointBorderColor: "#023047",
      },
      {
        label: "Resolved Requests",
        data: analyticsData
          ? Object.values(analyticsData.agent_performance).map((perf) => perf.resolved)
          : [],
        fill: false,
        borderColor: "#ffd166",
        tension: 0.4,
        pointBackgroundColor: "#8ecae6",
        pointBorderColor: "#8ecae6",
      },
    ],
  };

  // Chart data for site distribution (Line chart)
  // const siteChartData = {
  //   labels: analyticsData ? Object.keys(analyticsData.site_distribution) : [],
  //   datasets: [
  //     {
  //       label: "Requests by Site",
  //       data: analyticsData ? Object.values(analyticsData.site_distribution) : [],
  //       fill: false,
  //       borderColor: "#ef476f",
  //       tension: 0.4,
  //       pointBackgroundColor: "#ffb3c1",
  //       pointBorderColor: "#ffb3c1",
  //     },
  //   ],
  // };

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
            <h6 className="title">
              Department Analytics: {departmentName}
            </h6>
            <p>Comprehensive analytics for department performance.</p>
          </div>
          <div className="card-tools">
            <div className="d-flex gap-2 align-items-center">
              <FormGroup>
                <Label for="deptSelect">Select Department</Label>
                <Input
                  type="select"
                  id="deptSelect"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  disabled={isLoadingDepartments || !!deptFetchError}
                >
                  <option value="">Select a department</option>
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
                  <td>Department Name</td>
                  <td>{analyticsData.department_name}</td>
                </tr>
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
                  <th colSpan="2">Agent Performance</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.agent_performance).map(([email, data]) => (
                    <tr key={email}>
                      <td>{email}</td>
                      <td>
                        Total: {data.total} / Resolved: {data.resolved}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Priority Distribution</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.priority_distribution).map(([priority, count]) => (
                    <tr key={priority}>
                      <td>{priority}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Site Distribution</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.site_distribution).map(([siteId, count]) => (
                    <tr key={siteId}>
                      <td>Site ID {siteId}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p>{departmentName ? "Loading data..." : "Please select a department"}</p>
        )}
        {!showTable && analyticsData && (
          <div className="row g-3 mt-4">
            <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Priority Distribution</h6>
                <Line data={priorityChartData} options={chartOptions} />
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Agent Performance</h6>
                <Line data={agentChartData} options={chartOptions} />
              </div>
            </div>
            {/* <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Site Distribution</h6>
                <Line data={siteChartData} options={chartOptions} />
              </div>
            </div> */}
          </div>
        )}
      </div>
    </Card>
  );
};

export default DepartmentAnalytics;
