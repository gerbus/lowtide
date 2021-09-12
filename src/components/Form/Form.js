import React from 'react';
import moment from 'moment-timezone';

const Form = (props) => {
  const endDate = moment().add(props.days,"days");

  let submitButton = null;
  if (props.showSubmit) {
    submitButton = (
      <button
        className="btn btn-primary btn-sm"
        type="submit"
        >Find Low Tides</button>
    );
  }
  let otherUnits = "feet";
  let currentUnitsShort = "m";
  if (props.unitsInFeet) {
    otherUnits = "meters";
    currentUnitsShort = "ft";
  }

  return (
    <form className="form-inline" onSubmit={props.handleSubmit}>
      <ul>
      <li>Show <b>
        <input
          className="form-control form-control-sm"
          type="number"
          max="365"
          id="days"
          value={props.days}
          onChange={props.handleChange}
          onFocus={props.handleFocus}
          />
        days</b> (to {endDate.format("MMM Do")})
      </li>
      <li>Show tide levels less than <b>
        <input
          className="form-control form-control-sm"
          type="number"
          step="any"
          id="depth"
          value={props.depth}
          onChange={props.handleChange}
          onFocus={props.handleFocus}
          />
        {currentUnitsShort}</b>
      </li>
      <li>Show slack tides occurring between <b>
        <input
          className="form-control form-control-sm"
          type="number"
          max="24"
          id="startHour"
          value={props.startHour}
          onChange={props.handleChange}
          onFocus={props.handleFocus}
          />
        :00</b> and <b>
        <input
          className="form-control form-control-sm"
          type="number"
          max="24"
          id="endHour"
          value={props.endHour}
          onChange={props.handleChange}
          onFocus={props.handleFocus}
          />
        :00</b>
      </li></ul>
      <div style={{"width":"100%"}}>
        {submitButton}
        <button
          className="btn btn-default btn-sm"
          type="button"
          onClick={props.handleChangeUnits}
        >Switch to {otherUnits}</button>
      </div>
    </form>
  );
}

export default Form;
