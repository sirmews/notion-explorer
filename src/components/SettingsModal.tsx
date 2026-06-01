import React from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  isConnected: boolean
  onNotionAction: () => void
  onClearCache: () => void
  onResetToDemo: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onNotionAction,
  onClearCache,
  onResetToDemo
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" id="settings-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="modal-close" id="close-settings" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Section: Notion Connection */}
          <div className="settings-section">
            <h3>Notion Connection</h3>
            <div className="connection-card">
              <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`} id="notion-status">
                <span className="status-dot"></span>
                <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <p className="settings-desc" id="notion-details">
                {isConnected 
                  ? 'Successfully connected to your Notion workspace.' 
                  : 'Connect your Notion workspace to sync and view your pages live.'
                }
              </p>
              <button 
                className={`settings-btn ${isConnected ? 'dest-btn' : ''}`} 
                id="notion-action-btn"
                onClick={onNotionAction}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Section: Cache Management */}
          <div className="settings-section">
            <h3>Local Cache</h3>
            <p className="settings-desc">Your Notion data is cached locally in IndexedDB for offline access and rapid navigation.</p>
            <div className="settings-actions">
              <button className="settings-btn dest-btn" id="clear-cache-btn" onClick={onClearCache}>Clear Local Cache</button>
              <button className="settings-btn" id="load-demo-btn" onClick={onResetToDemo}>Reset to Demo Data</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
