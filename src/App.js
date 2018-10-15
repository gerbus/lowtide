import React, { Component } from 'react';
import './App.css';
import moment from 'moment-timezone';
import queryString from 'query-string';
import waiting from './spiffygif_40x40.gif';
import Form from './components/Form';

const feetPerMeter = 3.28084;

class App extends Component {
  constructor(props) {
    super(props);
    
    // Check querystring for params
    const qs = queryString.parse(window.location.search);
    
    this.state = {
      days: qs.days ? qs.days : 30,
      depth: qs.depth? qs.depth : 1.5,
      startHour: qs.startHour ? qs.startHour : 9,
      endHour: qs.endHour ? qs.endHour : 16,
      data: [],
      currentDepth: null,
      currentDirection: "", // "rising" or "falling"
      currentRate: null,
      currentDate: null,
      currentTime: null,
      showSubmit: false,
      dataFetched: false,
      unitsInFeet: false,
      error: false,
    }
    
    // Fetch initial data from Canadian Hydrographic Service
    this.getData();
    
    // Refresh current conditions every 5s and current time every 1s
    setInterval(() => {this.getCurrentConditionsData();}, 5000);
    setInterval(() => {this.getCurrentTime();}, 1000);  
  }
  getData() {
    this.getLowTideData();
    this.getCurrentConditionsData();
  }
  getLowTideData() {
    // Get Low Tide Prediction Data
    const startDate = moment();
    const endDate = moment().add(this.state.days,"days");
    const endpoint = window.location.protocol + "//api.gerbus.ca/chs/hilo/" + startDate.valueOf() + "-" + endDate.valueOf();  // .valueOf always gets UTC
    
    fetch(endpoint)
    .then(resp => resp.json())
    .then(rawData => {
      //console.log(rawData.searchReturn.data);
      let data = [];
      let depthInMeters = this.getInMeters(this.state.depth);
      rawData.searchReturn.data.data.filter(item => {
        let itemDateTime = moment.utc(item.boundaryDate.max.$value,"YYYY-MM-DD HH:mm:ss");
        itemDateTime = itemDateTime.tz("America/Vancouver");  // Convert to Vancouver Time
        const itemTideLevel = item.value.$value;  // Always in meters
        
        return (itemTideLevel <= depthInMeters && 
            itemDateTime.hours() >= this.state.startHour && 
            itemDateTime.hours() < this.state.endHour);
      })
      .forEach(item => {
        let itemDateTime = moment.utc(item.boundaryDate.max.$value,"YYYY-MM-DD HH:mm:ss");
        itemDateTime = itemDateTime.tz("America/Vancouver");  // Convert to Vancouver Time
        const itemTideLevel = item.value.$value;  // Always in meters
        
        // Highlight weekends and long weekends
        let itemClassName = "";
        switch (itemDateTime.day()) {
          case 0:
          case 6:
            itemClassName = "weekend";
            break;
          case 1:
          case 5:
            itemClassName = "longweekend";
            break;
          default:
            break;
        }

        // Convert depths to feet if necessary
        let tideLevelInCurrentUnits = itemTideLevel;  // always in meters
        if (this.state.unitsInFeet) {
          tideLevelInCurrentUnits = this.convertMetersToFeet(itemTideLevel).toFixed(2);
        }

        // Build data
        data.push({
          className: itemClassName,
          day: itemDateTime.day(),
          dateTime: itemDateTime.format("ddd, MMM D, YYYY @ h:mma"),
          tideLevel: tideLevelInCurrentUnits
        });
      });
      
      // Push to state
      this.setState({data: data, dataFetched: true});
    })
    .catch(err => {
      console.log("Fetch error: " + err);
      this.setState({error: true});
    });
  }
  getCurrentConditionsData() {
    // Get Current Water Level Prediction Data
    const nowUtc = moment().format("YYYY-MM-DD HH:mm:ss");
    //console.log(nowUtc);
    const startDate = moment(nowUtc).subtract(16,"m");
    const endDate = moment(nowUtc).add(14,"m");
    //console.log(startDate,endDate);
    const endpoint = window.location.protocol + "//api.gerbus.ca/chs/wl15/" + startDate.valueOf() + "-" + endDate.valueOf();  // .valueOf always gets UTC
    
    fetch(endpoint)
    .then(resp => resp.json())
    .then(rawData => {
      //console.log(rawData.searchReturn.data);
      const l1 = parseFloat(rawData.searchReturn.data.data[0].value.$value);
      const l2 = parseFloat(rawData.searchReturn.data.data[1].value.$value);
      const t1 = moment.utc(rawData.searchReturn.data.data[0].boundaryDate.max.$value).valueOf();
      const t2 = moment.utc(rawData.searchReturn.data.data[1].boundaryDate.max.$value).valueOf();
      //console.log("t1",t1,rawData.searchReturn.data.data[0].boundaryDate.max.$value);
      //console.log("t2",t2,rawData.searchReturn.data.data[1].boundaryDate.max.$value);
      //console.log("t",moment().valueOf());
      
      // Linear interpolation
      const intervalL = l2 - l1;  // meters
      const intervalT = t2 - t1;  // milliseconds
      const t = moment();
      const dT = t.valueOf() - t1;  // milliseconds
      const dL = intervalL * dT / intervalT;  // interpolate; meters
      const l = l1 + dL;
      //console.log("intervalL",intervalL,"dT",dT,"intervalT",intervalT,"dL",dL,"l1",l1);
      
      // Convert depths to feet if necessary
      let waterLevelInCurrentUnits = l;   // always in meters
      let depthChangeRateInCurrentUnits = Math.abs(dL) * 60000 / dT;   // meters per minute
      if (this.state.unitsInFeet) {
        waterLevelInCurrentUnits = this.convertMetersToFeet(waterLevelInCurrentUnits).toFixed(2);
        depthChangeRateInCurrentUnits = this.convertMetersToFeet(depthChangeRateInCurrentUnits).toFixed(2);
      }
      
      // Direction
      const direction = (dL < 0) ? "falling" : "rising";
      
      this.setState({
        currentDepth: waterLevelInCurrentUnits, 
        currentRate: depthChangeRateInCurrentUnits, 
        currentDirection: direction
      });
      //console.log(t1,t2,l1,l2,intervalT,intervalL,dT,dL,l1+dL);
    })
    .catch(err => {
      console.log("Fetch error: " + err);
      this.setState({ error: true });
    });
  }
  getCurrentTime() {
    this.setState({
      currentDate: moment().tz("America/Vancouver").format("ddd, MMM D, YYYY"),
      currentTime: moment().tz("America/Vancouver").format("h:mm:ssa z")
    });
  }
  render() {
    const {
      handleFocus,
      handleChange,
      handleSubmit,
      handleChangeUnits,
    } = this;
    const {
      showSubmit,
      unitsInFeet,
      days,
      depth,
      startHour,
      endHour,
    } = this.state;
    
    // Conditional Renders
    let headings = null;
    let data = null;
    if (this.state.dataFetched && this.state.data.length > 0) {
      headings = (
        <thead>
          <tr className="text-back">
            <th className="colLeft">When</th>
            <th className="colRight">Low Tide Level</th>
          </tr>
        </thead>
      );
      data = this.state.data.map((item, index) => (
          <tr key={index} className={'text-back ' + item.className}>
            <td>{item.dateTime}</td>
            <td>{parseFloat(item.tideLevel).toFixed(1)} {this.state.unitsInFeet ? "ft" : "m"}</td>
          </tr>
        ));
    }
    if (!this.state.dataFetched) {
      data = <tr className="text-back"><td colSpan="2"><center><img src={waiting} alt="Loading data..."/></center></td></tr>;
    } else if (this.state.data.length === 0) {
      data = <tr className="text-back"><td colSpan="2"><center>No results...</center></td></tr>;
    }
    
    return (
      <div className="App">
        <div className="container">
          <div className="row">
            <div className="col-sm-10 col-md-9">
              
              <div className="text-back intro">
                <h1>Low Tide Finder (Vancouver)</h1>
                <Form
                  showSubmit={showSubmit}
                  handleFocus={handleFocus}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  handleChangeUnits={handleChangeUnits}
                  unitsInFeet={unitsInFeet}
                  days={days}
                  depth={depth}
                  startHour={startHour}
                  endHour={endHour}
                  />
              </div>
              
              <div className="current"><div>
                <div className="time">{this.state.currentDate}<br/>{this.state.currentTime}</div>
                <div className="conditions">Current depth is <strong>{parseFloat(this.state.currentDepth).toFixed(2)} {this.state.unitsInFeet ? "ft" : "m"}</strong> <div className={this.state.currentDirection}>({this.state.currentDirection} at {
                    this.state.unitsInFeet ? 
                      parseFloat(this.state.currentRate * 12).toFixed(1) + " inches"
                    :
                      parseFloat(this.state.currentRate * 100).toFixed(1) + " cm"
                  }/min)</div></div>
                </div></div>
              
              <table className="table">
                {headings}
                <tbody>
                {data}
                </tbody>
              </table>
              
            </div>
          </div>
          <p className="info">
          Meteorological conditions can cause <strong>differences</strong> (time and height) between the predicted and the observed tides. These differences are mainly the result of atmospheric pressure changes, strong prolonged winds or variations of freshwater discharge.
          </p>
          <p className="info">Low tide levels are in reference to a fixed <strong>vertical datum</strong>, which water levels should rarely drop beneath. <a target="_blank" rel="noopener noreferrer" href="http://www.tides.gc.ca/eng/info/verticaldatums">More about vertical datums</a></p>
          <p className="info">
    Data provided by the <a href="http://www.charts.gc.ca/help-aide/about-apropos/index-eng.asp" target="_blank" rel="noopener noreferrer">Canadian Hydrographic Service</a></p>
        </div>
      </div>
    );
  }
  handleFocus = (e) => {
    e.target.select();
  }
  handleChange = (e) => {
    if (e.target.type === "number" && e.target.max) {
      if (parseFloat(e.target.value) > parseFloat(e.target.max)) {
        return;
      } 
    }
    this.setState({[e.target.id]: e.target.value, showSubmit: true});
  }
  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({dataFetched: false, showSubmit: false});

    // Push to browser history
    let depthInMeters = this.getInMeters(this.state.depth); // Convert to Meters if necessary
    window.history.pushState(this.state,"Low Tide Finder | Vancouver (" + this.state.days + "d/" + depthInMeters + "m/" + this.state.startHour + ":00/" + this.state.endHour + ":00)","/?days=" + this.state.days + "&depth=" + depthInMeters + "&startHour=" + this.state.startHour + "&endHour=" + this.state.endHour);
    
    // Fetch new data
    this.getData();
  }
  handleChangeUnits = (e) => {
    // Scale factor
    let s = 1;
    if (this.state.unitsInFeet) {
      // Feet to Meters
      s = 1 / feetPerMeter;
    } else {
      // Meters to Feet
      s = feetPerMeter;
    }
    
    // Mutate input
    let depth = this.state.depth;
    let convertedDepth = depth * s;
    convertedDepth = convertedDepth.toFixed(1);
    
    // Mutate data
    let data = this.state.data;
    let convertedData = [];
    convertedData = data.map(item => {
      item.tideLevel = item.tideLevel * s;
      return item;
    });
    const convertedCurrentDepth = this.state.currentDepth * s;
    const convertedCurrentRate = this.state.currentRate * s;
    
    // Update state
    this.setState({
      unitsInFeet: !this.state.unitsInFeet,
      depth: convertedDepth,
      data: convertedData,
      currentDepth: convertedCurrentDepth,
      currentRate: convertedCurrentRate
    });
  }
  getInMeters(measure) {
    let s = 1;  // assume measure already in meters
    if (this.state.unitsInFeet) s = 1 / feetPerMeter;
    let measureInMeters = s * measure;    
    return measureInMeters.toFixed(3);
  }
  convertMetersToFeet(measureInMeters) {
    let measureInFeet = feetPerMeter * measureInMeters;    
    return measureInFeet;
  }
}

export default App;
