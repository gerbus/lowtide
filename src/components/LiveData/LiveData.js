import React from 'react';

const LiveData = (props) => {
  const currentDepth = parseFloat(props.currentDepth).toFixed(2);
  const units = props.unitsInFeet ? "ft" : "m";
  let currentRate = parseFloat(props.currentRate * 100).toFixed(1) + " cm/min";
  if (props.unitsInFeet) {
    currentRate = parseFloat(props.currentRate * 12).toFixed(1) + " inches/min";
  }
  let conditions = (
    <React.Fragment>
      Current depth is <strong>{currentDepth} {units}</strong>
      <div className={props.currentDirection}>
        ({props.currentDirection} at {currentRate})
      </div>
    </React.Fragment>
  );
  if (props.error) {
    conditions = (
      <React.Fragment>
        Failed to get current conditions
      </React.Fragment>
    );
  }
  
  return (
    <div className="current">
      <div>
        <div className="time">
          {props.currentDate}<br/>{props.currentTime}
        </div>
        <div className="conditions">
          {conditions}
        </div>
      </div>
    </div>
  );
}

export default LiveData;