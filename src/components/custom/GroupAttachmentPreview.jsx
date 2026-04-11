import { Button } from '@/components/Component';

const GroupAttachmentPreview = ({ attachmentPreview, setAttachmentPreview }) => {
    if (!attachmentPreview) {
        return null;
    }

    return (
        <div className="attachment-preview-container" style={{ border: '2px solid #25d366' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>📎 File selected:</div>
            <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                    {attachmentPreview.type === 'image' ? (
                        <>
                            <img
                                src={attachmentPreview.url}
                                alt="Preview"
                                className="me-2"
                                style={{ maxWidth: '45px', maxHeight: '45px', objectFit: 'contain' }}
                            />
                            <span className="text-truncate" style={{ maxWidth: '140px', fontSize: '14px' }}>
                                {attachmentPreview.name}
                            </span>
                        </>
                    ) : attachmentPreview.type === 'pdf' ? (
                        <>
                            <i className="fas fa-file-pdf text-danger me-2" style={{ fontSize: '20px' }}></i>
                            <span className="text-truncate" style={{ maxWidth: '140px', fontSize: '14px' }}>
                                {attachmentPreview.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <i className="fas fa-file-word text-primary me-2" style={{ fontSize: '20px' }}></i>
                            <span className="text-truncate" style={{ maxWidth: '140px', fontSize: '14px' }}>
                                {attachmentPreview.name}
                            </span>
                        </>
                    )}
                </div>
                <Button
                    color="link"
                    className="text-danger"
                    onClick={() => {
                        setAttachmentPreview(null);
                    }}
                >
                    ✕
                </Button>
            </div>
        </div>
    );
};

export default GroupAttachmentPreview;
