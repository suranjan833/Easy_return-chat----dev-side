import MessagesLayout from "@/layouts/MessagesLayout";

const PendingReplies = () => {
  const pending = [
    // your pending replies data
  ];

  return (
    <MessagesLayout
      title="Pending Replies" 
      description={`You have ${pending.length} messages waiting`}
    >
      {/* Pending replies implementation */}
    </MessagesLayout>
  );
};

export default PendingReplies;