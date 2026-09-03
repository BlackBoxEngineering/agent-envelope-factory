function Robot({ carrying, phase }) {

  return (
    <div className={`robot ${phase}`} style={{ left: "var(--robot-x)", top: "var(--robot-y)" }}>
      <div className="robot-head">R2</div>
      <div className="robot-arm" />
      {carrying ? <div className="carry-label">{carrying}</div> : null}
    </div>
  );
}

export default Robot;