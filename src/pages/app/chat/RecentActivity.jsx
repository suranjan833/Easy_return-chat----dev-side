import MessagesLayout from "@/layouts/MessagesLayout";
import { Row, Col, PreviewCard } from "@/components/Component";

const RecentActivity = () => {
  const activities = [
    // your activity data
  ];

  return (
    <MessagesLayout 
      title="Recent Activity" 
      description="Your recent messages and notifications"
    >
      <Row>
        <Col md="12">
          <PreviewCard>
            {/* Activity list implementation */}
          </PreviewCard>
        </Col>
      </Row>
    </MessagesLayout>
  );
};

export default RecentActivity;