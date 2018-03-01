import React, { Component } from 'react';
import './App.css';
import moment from 'moment';
import queryString from 'query-string';
import waiting from './spiffygif_40x40.gif';

const feetPerMeter = 3.28084;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      days: 60,
      depth: 1.5,
      startHour: 9,
      endHour: 16,
      data: [],
      currentDepth: null,
      currentDirection: "", // coming "in" or going "out"
      currentTime: null,
      showSubmit: false,
      dataFetched: false,
      unitsInFeet: false
    }
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleChangeUnits = this.handleChangeUnits.bind(this);
  }
  componentDidMount() {
    // Check querystring for params, apply to state
    const qs = queryString.parse(window.location.search);
    const state = this.state;
    if (qs.days) {state.days = qs.days;}
    if (qs.depth) {state.depth = qs.depth;}
    if (qs.startHour) {state.startHour = qs.startHour;}
    if (qs.endHour) {state.endHour = qs.endHour;}
    this.setState(state);
    
    // Fetch data from Canadian Hydrographic Service
    this.getData();
  }
  getData() {
    this.getLowTideData();
    this.getCurrentConditionsData();
  }
  getLowTideData() {
    // Get Low Tide Prediction Data
    const startDate = moment();
    const endDate = moment().add(this.state.days,"days");
    //console.log("lowTideData",startDate,endDate);
    const endpoint = "http://api.gerbus.ca/chs/hilo/" + startDate.valueOf() + "-" + endDate.valueOf();  // .valueOf always gets UTC
    
    fetch(endpoint)
    .then(resp => resp.json())
    .then(rawData => {
      //console.log(rawData.searchReturn.data);
      let data = [];
      let depthInMeters = this.getInMeters(this.state.depth);
      rawData.searchReturn.data.data.map(item => {
        let itemDateTime = moment.utc(item.boundaryDate.max.$value,"YYYY-MM-DD HH:mm:ss");
        itemDateTime.local(); // convert to local timezone
        const itemTideLevel = item.value.$value;  // Always in meters
        
        // Filter results
        if (itemTideLevel <= depthInMeters && 
            this.state.startHour <= itemDateTime.hour() && 
            itemDateTime.hour() < this.state.endHour) {
          
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
          }
          
          // Convert depths to feet if necessary
          let tideLevelInCurrentUnits = itemTideLevel;  // always in meters
          if (this.state.unitsInFeet) {
            tideLevelInCurrentUnits = this.convertMetersToFeet(itemTideLevel).toFixed(2);
          }
          
          // Build data
          data.push({
            className: itemClassName,
            dateTime: itemDateTime.format("ddd, MMM D, YYYY @ h:mma"),
            tideLevel: tideLevelInCurrentUnits
          });
        }
      });
      
      // Push to state (render)
      this.setState({data: data, dataFetched: true});
    })
    .catch(err => console.log("Fetch error: " + err))
  }
  getCurrentConditionsData() {
    // Get Current Water Level Prediction Data
    const nowUtc = moment.utc().format("YYYY-MM-DD HH:mm:ss");
    const startDate = moment(nowUtc).subtract(16,"m");
    const endDate = moment(nowUtc).add(14,"m");
    //console.log(startDate,endDate);
    const endpoint = "http://api.gerbus.ca/chs/wl15/" + startDate.valueOf() + "-" + endDate.valueOf();  // .valueOf always gets UTC
    
    fetch(endpoint)
    .then(resp => resp.json())
    .then(rawData => {
      console.log(rawData.searchReturn.data);
      const t1 = moment.utc(rawData.searchReturn.data.data[0].boundaryDate.max.$value).valueOf();
      const t2 = moment.utc(rawData.searchReturn.data.data[1].boundaryDate.max.$value).valueOf();
      const l1 = parseFloat(rawData.searchReturn.data.data[0].value.$value);
      const l2 = parseFloat(rawData.searchReturn.data.data[1].value.$value);
      
      // Linear interpolation
      const intervalT = t2 - t1;
      const intervalL = l2 - l1;
      const t = moment();
      const dT = t.valueOf() - t1;
      const dL = intervalL * dT / intervalT;
      const l = l1 + dL;
      //console.log(intervalL,dT,intervalT,dL,l1);
      
      // Convert depths to feet if necessary
      let waterLevelInCurrentUnits = l;   // always in meters
      if (this.state.unitsInFeet) {
        waterLevelInCurrentUnits = this.convertMetersToFeet(l).toFixed(2);
      }
      
      // Direction
      const direction = (dL < 0) ? "falling" : "rising";
      
      this.setState({currentDepth: waterLevelInCurrentUnits, currentDirection: direction, currentTime: t.format("ddd, MMM D, YYYY @ h:mma")});
      //console.log(t1,t2,l1,l2,intervalT,intervalL,dT,dL,l1+dL);
    })
    .catch(err => console.log("Fetch error: " + err))
  }
  render() {
    const endDate = moment().add(this.state.days,"days");
    
    return (
      <div className="App">
        <div className="container">
          <div className="row">
            <div className="col-sm-10 col-md-9">
              
              
              <div className="text-back intro">
                <h1>Low Tide Finder (Vancouver)</h1>
                <form className="form-inline" onSubmit={this.handleSubmit}>
                  <p>Listed below are dates within <b>
                    <input 
                      className="form-control form-control-sm" 
                      type="number" 
                      max="365"
                      id="days" 
                      value={this.state.days} 
                      onChange={this.handleChange} 
                      onFocus={this.handleFocus}
                      /> 
                    days</b> (today to {endDate.format("MMM Do")}) on which low tide levels of less than <b>
                    <input 
                      className="form-control form-control-sm" 
                      type="number"
                      step="any"
                      id="depth" 
                      value={this.state.depth} 
                      onChange={this.handleChange}  
                      onFocus={this.handleFocus}
                      />
                    {this.state.unitsInFeet ? "ft" : "m"}</b> occur between the hours of <b>
                    <input 
                      className="form-control form-control-sm" 
                      type="number" 
                      max="24" 
                      id="startHour" 
                      value={this.state.startHour} 
                      onChange={this.handleChange}  
                      onFocus={this.handleFocus}
                      />
                    :00</b> and <b>
                    <input 
                      className="form-control form-control-sm" 
                      type="number" 
                      max="24" 
                      id="endHour" 
                      value={this.state.endHour} 
                      onChange={this.handleChange}  
                      onFocus={this.handleFocus}
                      />
                    :00</b> on Vancouver shores.
                  </p>
                  <div style={{"width":"100%"}}>
                    { (this.state.showSubmit) ? (
                    <button 
                      className="btn btn-primary btn-sm" 
                      type="submit"
                      >
                    Find Low Tides</button>
                      ) : null
                     }
                    <button 
                      className="btn btn-default btn-sm"
                      type="button"
                      onClick={this.handleChangeUnits}
                    >
                    Switch to {this.state.unitsInFeet ? "meters" : "feet"}
                    </button>
                  </div>
                </form>
              </div>				

              <div className="current">
                <p>Current depth is <strong>{parseFloat(this.state.currentDepth).toFixed(2)} {this.state.unitsInFeet ? "ft" : "m"}</strong> <span className={this.state.currentDirection}>({this.state.currentDirection})</span></p>
              </div>
              
              <table className="table">
                
                {(this.state.dataFetched && this.state.data.length > 0) ? (
                  <thead>
                    <tr className="text-back">
                      <th className="colLeft">When</th>
                      <th className="colRight">Low Tide Level</th>
                    </tr>
                  </thead>
                ) : null}
                
                <tbody>
                {
                  (this.state.dataFetched) ? (
                    (this.state.data.length > 0) ? (
                      this.state.data.map((item, index) => (
                        <tr key={index} className={'text-back ' + item.className}>
                          <td>{item.dateTime}</td>
                          <td>{parseFloat(item.tideLevel).toFixed(1)} {this.state.unitsInFeet ? "ft" : "m"}</td>
                        </tr>
                      )) 
                    ) : (
                      <tr className="text-back"><td colSpan="2"><center>No results. To try different search parameters, see the <a href="#params">bottom of this page</a>.</center></td></tr>
                    )
                  ) : (
                    <tr className="text-back"><td colSpan="2"><center><img src={waiting} alt="Loading data..."/></center></td></tr>
                  )
                }
                </tbody>

              </table>
              
              
            </div>
          </div>
          <p className="info">
    Data provided by the <a href="http://www.charts.gc.ca/help-aide/about-apropos/index-eng.asp" target="_blank">Canadian Hydrographic Service</a></p>
        </div>
      </div>
    );
  }
  handleFocus(e) {
    e.target.select();
  }
  handleChange(e) {
    if (e.target.type === "number" && e.target.max) {
      if (parseFloat(e.target.value) > parseFloat(e.target.max)) {
        return;
      } 
    }
    this.setState({[e.target.id]: e.target.value, showSubmit: true});
  }
  handleSubmit(e) {
    e.preventDefault();
    this.setState({dataFetched: false, showSubmit: false});

    // Push to browser history
    let depthInMeters = this.getInMeters(this.state.depth); // Convert to Meters if necessary
    window.history.pushState(this.state,"Low Tide Finder | Vancouver (" + this.state.days + "d/" + depthInMeters + "m/" + this.state.startHour + ":00/" + this.state.endHour + ":00)","/?days=" + this.state.days + "&depth=" + depthInMeters + "&startHour=" + this.state.startHour + "&endHour=" + this.state.endHour);
    
    // Fetch new data
    this.getData();
  }
  handleChangeUnits(e) {
    // Scale factor
    let s = 1;
    if (this.state.unitsInFeet) {
      // Feet to Meters
      s = 1 / 3.28084;
    } else {
      // Meters to Feet
      s = 3.28084;
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
    let convertedCurrentDepth = this.state.currentDepth * s;

    // Update state
    this.setState({
      unitsInFeet: !this.state.unitsInFeet,
      depth: convertedDepth,
      data: convertedData,
      currentDepth: convertedCurrentDepth
    });
  }
  getInMeters(measure) {
    let s = 1;  // assume measure already in meters
    if (this.state.unitsInFeet) s = 1 / 3.28084;
    let measureInMeters = s * measure;    
    return measureInMeters.toFixed(3);
  }
  convertMetersToFeet(measureInMeters) {
    let s = 3.28084;
    let measureInFeet = s * measureInMeters;    
    return measureInFeet;
  }
}

export default App;
