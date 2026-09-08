import { Truck } from "lucide-react";
import Robot from "./Robot.jsx";
import Trolley from "./Trolley.jsx";

function FactoryFloor({canDisrupt,drag,floorRef,floorStyle,onPointerCancel,onPointerMove,onPointerUp,onTrolleyPointerDown,phase,robot,slots,trolleys,}) {

    function SlotMarker({ slot }) {
        return (
            <div className={`slot ${slot.kind}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
                {slot.kind === "truck" ? <Truck size={34} aria-hidden="true" /> : <span className="bay-number">{slot.label}</span>}
            </div>
        );
    }

    return (
        <div className="floor-wrap">
            <div className="factory-floor"ref={floorRef}style={floorStyle}onPointerMove={onPointerMove}onPointerUp={onPointerUp}onPointerCancel={onPointerCancel}>
                <div className="floor-grid" aria-hidden="true" />
                {Object.values(slots).map((slot) => (<SlotMarker key={slot.id} slot={slot} />))}
                <Robot carrying={robot.carrying} phase={phase} />
                {canDisrupt ? <div className="disrupt-hint">Move trolley4 again</div> : null}
                {trolleys.map((trolley) => {
                    const isDragging = drag?.id === trolley.id;
                    const slot = slots[trolley.slot] ?? slots.bay1;
                    const position = isDragging
                        ? { left: `${drag.x}%`, top: `${drag.y}%` }
                        : { left: `${slot.x}%`, top: `${slot.y + (trolley.background ? 9 : 0)}%` };
                    return (
                        <Trolley
                            key={trolley.id}
                            isDragging={isDragging}
                            position={position}
                            trolley={trolley}
                            onPointerDown={(event) => onTrolleyPointerDown(event, trolley)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default FactoryFloor;
