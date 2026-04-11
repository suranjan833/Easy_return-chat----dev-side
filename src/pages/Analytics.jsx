import { useState } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import AgentAnalytics from "../components/partials/analytics/agent-analytics/AgentAnalytics";
// import ActiveUser from "@/components/partials/analytics/active-user/ActiveUser";
import SiteAnalytics from "../components/partials/analytics/site-analytics/SiteAnalytics";
import DepartmentAnalytics from "../components/partials/analytics/department-analytics/DepartmentAnalytics";
import TrafficDougnut from "@/components/partials/analytics/traffic-dougnut/TrafficDoughnut";
import WeeklyAnalytics from "../components/partials/analytics/weekly-analytics/WeeklyAnalytics";
import OverallAnalytics from "../components/partials/analytics/overall-analytics/OverallAnalytics";
import DailyAnalytics from "../components/partials/analytics/daily-analytics/DailyAnalytics";
import MonthlyAnalytics from "../components/partials/analytics/monthly-analytics/MontlyAnalytics";
// import SessionDevice from "@/components/partials/analytics/session-devices/SessionDevice";
import {
  DropdownToggle,
  DropdownMenu,
  Card,
  UncontrolledDropdown,
  DropdownItem,
} from "reactstrap";
import {
  Block,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Button,
  Row,
  Col,
  PreviewAltCard,
} from "@/components/Component";
import QuarterlyAnalytics from "../components/partials/analytics/quarterrly-analytics/Quarterlyanalytics";
import YearlyAnalytics from "../components/partials/analytics/yearly-analytics/YearlyAnalytics";
import TrendsAnalytics from "../components/partials/analytics/trends-analytics/TrendsAnalytics";
import WorkloadAnalytics from "../components/partials/analytics/workload-analytics/WorkloadAnalytics";


const AnalyticsHomePage = () => {
  const [sm, updateSm] = useState(false);
  return (
    <>
      <Head title="Analytics Dashboard" />
      <Content>
        <BlockHead size="sm">
          <div className="nk-block-between">
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Easy Return
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>Analytics</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""
                    }`}
                  onClick={() => updateSm(!sm)}
                >
                  <Icon name="more-v"></Icon>
                </Button>
                <div
                  className="toggle-expand-content"
                  style={{ display: sm ? "block" : "none" }}
                >
                  <ul className="nk-block-tools g-3">
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle
                          tag="a"
                          className="dropdown-toggle btn btn-white btn-dim btn-outline-light"
                        >
                          <Icon
                            className="d-none d-sm-inline"
                            name="calender-date"
                          ></Icon>
                          <span>
                            <span className="d-none d-md-inline">Last</span> 30
                            Days
                          </span>
                          <Icon className="dd-indc" name="chevron-right"></Icon>
                        </DropdownToggle>
                        <DropdownMenu>
                          <ul className="link-list-opt no-bdr">
                            <li>
                              <DropdownItem
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                Last 30 days
                              </DropdownItem>
                            </li>
                            <li>
                              <DropdownItem
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                Last 6 months
                              </DropdownItem>
                            </li>
                            <li>
                              <DropdownItem
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                Last 3 weeks
                              </DropdownItem>
                            </li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                    <li className="nk-block-tools-opt">
                      <Button color="primary">
                        <Icon name="reports"></Icon>
                        <span>Reports</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </div>
        </BlockHead>

        <Block>
          <Row className="mb-4">
           <Col md="12" lg="7" xxl="12">
              <PreviewAltCard className="h-100">
                <AgentAnalytics />
              </PreviewAltCard>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col md="12" lg="7" xxl="12">
              <PreviewAltCard className="h-100">
                <SiteAnalytics />
              </PreviewAltCard>
            </Col>
          </Row>
          <Row className="g-gs">
            <Col lg="7" xxl="6">
              <PreviewAltCard className="h-100">
                <DepartmentAnalytics />
              </PreviewAltCard>
            </Col>
            <Col xxl="6">
              <Card className="card-bordered h-100">
                <OverallAnalytics />
              </Card>
            </Col>
            <Col lg="7" xxl="6">
              <PreviewAltCard className="h-100">
                <DailyAnalytics />
              </PreviewAltCard>
            </Col>
            <Col xxl="6">
              <PreviewAltCard className="h-100">
                <WeeklyAnalytics />
              </PreviewAltCard>
            </Col>
            <Col xxl="6">
              <PreviewAltCard className="h-100">
                <MonthlyAnalytics />
              </PreviewAltCard>
            </Col>
            <Col lg="7" xxl="6">
              <PreviewAltCard className="h-100">
                <QuarterlyAnalytics />
              </PreviewAltCard>
            </Col>
            <Col lg="7" xxl="6">
              <PreviewAltCard className="h-100">
                <YearlyAnalytics />
              </PreviewAltCard>
            </Col>
            <Col lg="7" xxl="6">
              <PreviewAltCard className="h-100">
                <TrendsAnalytics />
              </PreviewAltCard>
            </Col>
            <Col lg="7" xxl="6">
              <PreviewAltCard className="h-100">
                <WorkloadAnalytics />
              </PreviewAltCard>
            </Col>
          </Row>
        </Block>
      </Content>
    </>
  );
};

export default AnalyticsHomePage;
