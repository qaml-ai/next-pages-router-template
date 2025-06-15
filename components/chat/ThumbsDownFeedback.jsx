import React from 'react';

const ThumbsDownFeedback = ({ onSubmit, onOtherClick, showOtherInput, otherDetails, setOtherDetails, handleOtherSubmit }) => (
    <div className="feedback-container">
        <p>Thanks for your feedback! What was wrong?</p>
        <div className="feedback-buttons">
            <button className="button secondary no-shrink" onClick={() => onSubmit("Unable to Complete Task")}>
                <span className="light">Failed to complete action</span>
            </button>
            <button className="button secondary no-shrink" onClick={() => onSubmit("Incorrect response")}>
                <span className="light">Incorrect response</span>
            </button>
            <button className="button secondary no-shrink" onClick={() => onSubmit("Poor graph")}>
                <span className="light">Poor graph</span>
            </button>
            <button className="button secondary no-shrink" onClick={() => onSubmit("Did not follow instructions")}>
                <span className="light">Did not follow instructions</span>
            </button>
            <button className="button secondary no-shrink" onClick={onOtherClick}>
                <span className="light">Other</span>
            </button>
        </div>
        {showOtherInput && (
            <div className="other-feedback-input">
                <textarea
                    className="other-feedback-input-field"
                    id="other-feedback-input-field"
                    rows="1"
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleOtherSubmit();
                        }
                    }}
                    placeholder="Please provide details..."
                />
                <button className="button secondary no-shrink" onClick={handleOtherSubmit}>
                    <span>Submit</span>
                </button>
            </div>
        )}
    </div>
);

export default ThumbsDownFeedback;