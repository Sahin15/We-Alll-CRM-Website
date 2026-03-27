import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, ListGroup } from 'react-bootstrap';
import { FaComment, FaPaperPlane } from 'react-icons/fa';
import './CommentInputWithMentions.css';

/**
 * CommentInputWithMentions Component
 * Allows users to mention team members with @ symbol
 */
const CommentInputWithMentions = ({ 
  value, 
  onChange, 
  onSubmit, 
  loading, 
  currentUser,
  teamMembers = [],
  onKeyDown
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const textareaRef = useRef(null);
  const mentionsListRef = useRef(null);

  // Debug: Log team members
  useEffect(() => {
    console.log('CommentInputWithMentions - teamMembers:', teamMembers);
    console.log('CommentInputWithMentions - currentUser:', currentUser);
  }, [teamMembers, currentUser]);

  // Get filtered team members based on search
  const filteredMembers = teamMembers && teamMembers.length > 0
    ? (mentionSearch.length > 0
        ? teamMembers.filter(member => 
            member && member.name && 
            member.name.toLowerCase().includes(mentionSearch.toLowerCase()) &&
            member._id !== currentUser?._id
          )
        : teamMembers.filter(member => member && member._id !== currentUser?._id))
    : [];

  console.log('filteredMembers:', filteredMembers, 'showMentions:', showMentions);

  // Handle text change and detect @ mentions
  const handleChange = (e) => {
    const text = e.target.value;
    onChange(e);

    // Check if user is typing @ mention
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Find the last space before the @
      const textBeforeAt = text.substring(0, lastAtIndex);
      const lastSpaceIndex = textBeforeAt.lastIndexOf(' ');
      
      // Check if @ is at the start or after a space
      if (lastAtIndex === 0 || lastSpaceIndex === lastAtIndex - 1) {
        const searchText = text.substring(lastAtIndex + 1);
        
        // Show mentions if @ is followed by nothing or text without spaces
        if (!searchText.includes(' ')) {
          setMentionSearch(searchText);
          setShowMentions(true);
          setMentionIndex(-1);
        } else {
          setShowMentions(false);
          setMentionSearch('');
          setMentionIndex(-1);
        }
      } else {
        setShowMentions(false);
        setMentionSearch('');
        setMentionIndex(-1);
      }
    } else {
      setShowMentions(false);
      setMentionSearch('');
      setMentionIndex(-1);
    }
  };

  // Handle mention selection
  const handleSelectMention = (member) => {
    const text = value;
    const lastAtIndex = text.lastIndexOf('@');
    
    // Replace @ and search text with @mention (without ID in display)
    const beforeMention = text.substring(0, lastAtIndex);
    const afterMention = text.substring(lastAtIndex + mentionSearch.length + 1);
    
    // Store mention as @name with a marker for the backend to parse
    const newText = `${beforeMention}@${member.name} ${afterMention}`;
    
    onChange({ target: { value: newText } });
    setShowMentions(false);
    setMentionSearch('');
    setMentionIndex(-1);
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Set cursor position after the mention
      const cursorPos = beforeMention.length + member.name.length + 2; // @name + space
      textareaRef.current.setSelectionRange(cursorPos, cursorPos);
    }
  };

  // Handle keyboard navigation in mentions list
  const handleMentionsKeyDown = (e) => {
    if (!showMentions || filteredMembers.length === 0) {
      if (onKeyDown) onKeyDown(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setMentionIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (mentionIndex >= 0) {
          handleSelectMention(filteredMembers[mentionIndex]);
        } else if (filteredMembers.length > 0) {
          handleSelectMention(filteredMembers[0]);
        } else {
          // Submit comment if no mentions to select
          if (onKeyDown) onKeyDown(e);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowMentions(false);
        break;
      default:
        if (onKeyDown) onKeyDown(e);
    }
  };

  // Scroll to selected mention
  useEffect(() => {
    if (mentionIndex >= 0 && mentionsListRef.current) {
      const items = mentionsListRef.current.querySelectorAll('.mention-item');
      if (items[mentionIndex]) {
        items[mentionIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [mentionIndex]);

  return (
    <div className="comment-input-wrapper">
      <div className="mb-3 p-3" style={{ background: '#f8f9fc', borderRadius: '12px', border: '1px solid #e3e6f0' }}>
        <div className="d-flex align-items-center mb-3">
          <FaComment className="me-2 text-primary" />
          <strong style={{ fontSize: '0.95rem', color: '#495057' }}>Add Comment</strong>
        </div>
        
        <Form.Group className="mb-3" style={{ position: 'relative' }}>
          <Form.Control
            ref={textareaRef}
            as="textarea"
            rows={3}
            placeholder="Share updates, ask questions, or provide feedback... Type @ to mention team members"
            value={value}
            onChange={handleChange}
            onKeyDown={handleMentionsKeyDown}
            disabled={loading}
            style={{
              borderRadius: '8px',
              border: '2px solid #e3e6f0',
              fontSize: '0.9rem',
              resize: 'vertical',
              minHeight: '80px'
            }}
          />
          
          {/* Mentions Dropdown */}
          {showMentions && filteredMembers && filteredMembers.length > 0 && (
            <div 
              ref={mentionsListRef}
              className="mentions-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #e3e6f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                marginTop: '4px'
              }}
            >
              <ListGroup variant="flush">
                {filteredMembers.map((member, index) => (
                  <ListGroup.Item
                    key={member._id}
                    className={`mention-item ${index === mentionIndex ? 'active' : ''}`}
                    onClick={() => handleSelectMention(member)}
                    style={{
                      cursor: 'pointer',
                      background: index === mentionIndex ? '#e7f1ff' : 'white',
                      borderBottom: '1px solid #f0f0f0',
                      padding: '8px 12px',
                      fontSize: '0.9rem',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <div 
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          marginRight: '8px'
                        }}
                      >
                        {member.name && member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{member.name}</strong>
                        {member.role && (
                          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                            {member.role}
                          </div>
                        )}
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}
          
          <Form.Text className="text-muted">
            💡 Tip: Type @ to mention team members, or press Ctrl+Enter to post quickly
          </Form.Text>
        </Form.Group>
        
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Posting as <strong>{currentUser?.name}</strong>
          </small>
          <Button
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={!value.trim() || loading}
            style={{
              borderRadius: '20px',
              padding: '6px 16px',
              fontWeight: '600'
            }}
          >
            {loading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" style={{ width: '12px', height: '12px' }} />
                Posting...
              </>
            ) : (
              <>
                <FaPaperPlane className="me-2" />
                Post Comment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentInputWithMentions;
