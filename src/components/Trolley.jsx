function Trolley({ isDragging, onPointerDown, position, trolley }) {
  return (
    <button
      type="button"
      className={`trolley ${trolley.background ? "background" : ""} ${isDragging ? "dragging" : ""}`}
      style={position}
      onPointerDown={onPointerDown}
      title={`Drag ${trolley.label}`}
    >
      <span>{trolley.id}</span>
      <small>{trolley.slot}</small>
    </button>
  );
}

export default Trolley;