export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <h3>Are you sure?</h3>
        <p>{message}</p>
        <div className="action-row">
          <button className="button button-ghost" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="button button-danger" onClick={onConfirm} type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
