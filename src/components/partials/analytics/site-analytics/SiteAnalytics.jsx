import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Table, FormGroup, Label, Input } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { Icon } from "@/components/Component";
import axios from "axios";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

const SiteAnalytics = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState(new Date());
  const [siteId, setSiteId] = useState("13");
  const [sites, setSites] = useState([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [siteFetchError, setSiteFetchError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const cardStyles = {
    maxWidth: "100%",
    overflowX: "auto",
    padding: "2px",
  };

  const sitesFetchedRef = useRef(false);
  useEffect(() => {
    if (sitesFetchedRef.current) return; // Prevent double fetch in StrictMode

    const fetchSites = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setSiteFetchError("Authentication token is missing");
        setSites([]);
        setIsLoadingSites(false);
        return;
      }

      setIsLoadingSites(true);
      try {
        const response = await axios.get(
          "https://chatsupport.fskindia.com/sites/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          },
        );
        setSites(response.data.records || []);
        setSiteFetchError(null);
      } catch (error) {
        console.error("[SiteAnalytics] Error fetching sites:", error);
        setSiteFetchError("Failed to load sites");
        setSites([]);
      } finally {
        setIsLoadingSites(false);
      }
    };
    fetchSites();
    sitesFetchedRef.current = true;
  }, []);

  const analyticsFetchedRef = useRef(null);
  useEffect(() => {
    if (!siteId) return;

    // Prevent double fetch if dependencies haven't truly changed
    if (
      analyticsFetchedRef.current &&
      analyticsFetchedRef.current.siteId === siteId &&
      analyticsFetchedRef.current.startDate === startDate &&
      analyticsFetchedRef.current.endDate === endDate
    ) {
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(
          `https://supportdesk.fskindia.com/analytics/site/${siteId}`,
          {
            params: {
              start_date: startDate.toISOString().split("T")[0],
              end_date: endDate.toISOString().split("T")[0],
            },
          },
        );
        setAnalyticsData(response.data);
      } catch (error) {
        console.error("[SiteAnalytics] Error fetching analytics data:", error);
        setAnalyticsData(null);
      }
    };
    fetchAnalytics();
    analyticsFetchedRef.current = { siteId, startDate, endDate };
  }, [siteId, startDate, endDate]);

  const departmentChartData = {
    labels: analyticsData
      ? Object.keys(analyticsData.department_distribution)
      : [],
    datasets: [
      {
        label: "Requests",
        data: analyticsData
          ? Object.values(analyticsData.department_distribution)
          : [],
        backgroundColor: "#118ab2",
        borderColor: "#073b4c",
        borderWidth: 1,
      },
    ],
  };

  const statusChartData = {
    labels: analyticsData ? Object.keys(analyticsData.status_distribution) : [],
    datasets: [
      {
        data: analyticsData
          ? Object.values(analyticsData.status_distribution)
          : [],
        backgroundColor: [
          "#ff6b6b",
          "#ffd166",
          "#06d6a0",
          "#118ab2",
          "#073b4c",
          "#ef476f",
        ],
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
        {/* 🔹 HEADER */}
        <div style={{ marginBottom: "20px" }}>
          <h5 style={{ marginBottom: "5px" }}>
            Site Analytics:{" "}
            {sites.find((s) => s.id.toString() === siteId)?.domain ||
              `Site ID ${siteId}`}
          </h5>
          <p style={{ margin: 0, color: "#6c757d" }}>
            Comprehensive analytics for site performance.
          </p>
        </div>

        {/* 🔹 FILTER SECTION (FIXED AREA) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "flex-end",
            marginBottom: "25px",
            padding: "15px",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          {/* Select Site */}
          <div style={{ minWidth: "220px" }}>
            <Label>Select Site</Label>
            <Input
              type="select"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.domain}
                </option>
              ))}
            </Input>
          </div>

          {/* From */}
          <div>
            <Label>From</Label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              className="form-control"
            />
          </div>

          {/* To */}
          <div>
            <Label>To</Label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              className="form-control"
            />
          </div>

          {/* Button */}
          <div>
            <Label style={{ visibility: "hidden" }}>btn</Label>
            <Button color="primary" onClick={() => setShowTable(!showTable)}>
              {showTable ? "Charts" : "Table"}
            </Button>
          </div>

          {/* 🔹 Row 2 → Filters */}
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
                  <td>Site ID</td>
                  <td>{analyticsData.site_id}</td>
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
                <tr>
                  <th>Agent Email</th>
                  <th>Total / Resolved</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.agent_performance).map(
                    ([email, data]) => (
                      <tr key={email}>
                        <td>{email}</td>
                        <td>
                          {data.total} / {data.resolved}
                        </td>
                      </tr>
                    ),
                  )}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Department Distribution</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.department_distribution).map(
                    ([dept, count]) => (
                      <tr key={dept}>
                        <td>{dept}</td>
                        <td>{count}</td>
                      </tr>
                    ),
                  )}
              </tbody>
              <thead>
                <tr>
                  <th colSpan="2">Status Distribution</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData &&
                  Object.entries(analyticsData.status_distribution).map(
                    ([status, count]) => (
                      <tr key={status}>
                        <td>{status}</td>
                        <td>{count}</td>
                      </tr>
                    ),
                  )}
              </tbody>
            </Table>
          </div>
        ) : (
          <p>{siteId ? "Loading data..." : "Please select a site"}</p>
        )}
        {!showTable && analyticsData && (
          <div className="row g-3 mt-4">
            <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Department Distribution</h6>
                <Bar data={departmentChartData} options={chartOptions} />
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ height: "300px" }}>
                <h6>Status Distribution</h6>
                <Pie data={statusChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SiteAnalytics;
