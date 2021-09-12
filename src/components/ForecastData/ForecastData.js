import React from 'react';
import waiting from '../../spiffygif_40x40.gif';

const ForecastData = (props) => {
  let headings, data = null;
  const units = props.unitsInFeet ? "ft" : "m";

  if (props.fetchingForecast) {
    data = (
      <tr className="text-back">
        <td colSpan="2">
          <center><img src={waiting} alt="Loading data..."/></center>
        </td>
      </tr>
    );
  } else {
    if (props.error) {
      data = (
        <tr className="text-back">
          <td colSpan="2">
            <center>An error occurred.</center>
          </td>
        </tr>
      );
    } else {
      if (props.data.length === 0) {
        data = (
          <tr className="text-back">
            <td colSpan="2">
              <center>No results...</center>
            </td>
          </tr>
        );
      } else {
        headings = (
          <thead>
            <tr className="text-back">
              <th className="colLeft">When</th>
              <th className="colRight">Level</th>
              <th>Type</th>
            </tr>
          </thead>
        );

        data = props.data.map((item, index) => {
          const tideLevel = parseFloat(item.tideLevel).toFixed(1);
          return (
            <tr
              key={index}
              className={'text-back ' + item.className}
              >
              <td>{item.dateTime}</td>
              <td>{tideLevel} {units}</td>
              <td>{item.tideType}</td>
            </tr>
          );
        });
      }
    }
  }

  return (
    <table className="table">
      {headings}
      <tbody>
        {data}
      </tbody>
    </table>
  );
}

export default ForecastData;
