'use client';

// No field-by-field editor. The patient returns to the conversation to add or
// correct information, then regenerates.

export default function PatientConfirm({
  onConfirm,
  onEdit,
}: {
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2>Is this an accurate summary of what you want to tell the nurse?</h2>
      <button className="btn" onClick={onConfirm}>
        This is accurate
      </button>
      <button
        className="btn btn-secondary"
        onClick={onEdit}
        style={{ marginTop: 10 }}
      >
        I want to change something
      </button>
    </div>
  );
}
