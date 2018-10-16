import React, { Component } from 'react';
import './App.css';
import moment from 'moment-timezone';
import queryString from 'query-string';
import Form from './components/Form';
import axios from 'axios';
import LiveData from './components/LiveData';
import ForecastData from './components/ForecastData';

const feetPerMeter = 3.28084;

class App extends Component {
  constructor(props) {
    super(props);
    
    // Check querystring for params
    const qs = queryString.parse(window.location.search);
    
    this.state = {
      inputs: {
        days: qs.days ? qs.days : 30,
        depth: qs.depth? qs.depth : 1.5,
        startHour: qs.startHour ? qs.startHour : 9,
        endHour: qs.endHour ? qs.endHour : 16,
        unitsInFeet: false,
      },
      liveData: {
        currentDepth: null,
        currentDirection: "", // "rising" or "falling"
        currentRate: null,
        currentDate: null,
        currentTime: null,
        error: null,
      },
      forecastData: {
        data: [],
        error: null,
      },
      showSubmit: false,
      fetchingForecast: true,
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
    const endDate = moment().add(this.state.inputs.days,"days");
    const endpoint = window.location.protocol + "//api.gerbus.ca/chs/hilo/" + startDate.valueOf() + "-" + endDate.valueOf();  // .valueOf always gets UTC
    
    axios.get(endpoint)
    .then(response => {
      //console.log(response);
      const rawData = response.data;
      let data = [];
      let depthInMeters = this.getInMeters(this.state.inputs.depth);
      rawData.searchReturn.data.data.filter(item => {
        let itemDateTime = moment.utc(item.boundaryDate.max.$value,"YYYY-MM-DD HH:mm:ss");
        itemDateTime = itemDateTime.tz("America/Vancouver");  // Convert to Vancouver Time
        const itemTideLevel = item.value.$value;  // Always in meters
        
        return (itemTideLevel <= depthInMeters && 
            itemDateTime.hours() >= this.state.inputs.startHour && 
            itemDateTime.hours() < this.state.inputs.endHour);
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
        if (this.state.inputs.unitsInFeet) {
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
      this.setState({
        forecastData: {
          data: data,
          error: null,
        },
        fetchingForecast: false
      });
    })
    .catch(err => {
      if (err.response) {      
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log("Invalid response from data source");
        console.log(err.response.data);
        console.log(err.response.status);
        console.log(err.response.headers);
      } else if (err.request) {
        console.log("No response from data source", err.request);
      } else {
        console.log(err.message);
      }
      console.log(err.config);
      
      this.setState({
        forecastData: {
          data: [],
          error: err,
        },
      });
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
    
    axios.get(endpoint)
    .then(response => {
      //console.log(rawData.searchReturn.data);
      const rawData = response.data;
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
      if (this.state.inputs.unitsInFeet) {
        waterLevelInCurrentUnits = this.convertMetersToFeet(waterLevelInCurrentUnits).toFixed(2);
        depthChangeRateInCurrentUnits = this.convertMetersToFeet(depthChangeRateInCurrentUnits).toFixed(2);
      }
      
      // Direction
      const direction = (dL < 0) ? "falling" : "rising";
      
      let liveData = Object.assign({},this.state.liveData);
      liveData.currentDepth = waterLevelInCurrentUnits;
      liveData.currentRate = depthChangeRateInCurrentUnits;
      liveData.currentDirection = direction;
      liveData.error = null;
      this.setState({
        liveData: liveData,
      });
      //console.log(t1,t2,l1,l2,intervalT,intervalL,dT,dL,l1+dL);
    })
    .catch(err => {
      if (err.response) {      
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log("Invalid response from data source");
        console.log(err.response.data);
        console.log(err.response.status);
        console.log(err.response.headers);
      } else if (err.request) {
        console.log("No response from data source", err.request);
      } else {
        console.log(err.message);
      }
      console.log(err.config);
      
      let liveData = Object.assign({},this.state.liveData);
      liveData.error = err;
      this.setState({
        liveData: liveData,
      });
    });
  }
  getCurrentTime() {
    let liveData = Object.assign({},this.state.liveData);
    liveData.currentDate = moment().tz("America/Vancouver").format("ddd, MMM D, YYYY");
    liveData.currentTime = moment().tz("America/Vancouver").format("h:mm:ssa z");
    this.setState({
      liveData: liveData,
    });
  }
  render() {
    const {
      handleFocus,
      handleChange,
      handleSubmit,
      handleChangeUnits,
    } = this;
    
    return (
      <div className="App">
        <div className="container">
          <div className="row">
            <div className="col-sm-10 col-md-9">
              
              <div className="text-back intro">
                <h1>Low Tide Finder (Vancouver)</h1>
                <Form
                  showSubmit={this.state.showSubmit}
                  handleFocus={handleFocus}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  handleChangeUnits={handleChangeUnits}
                  unitsInFeet={this.state.inputs.unitsInFeet}
                  days={this.state.inputs.days}
                  depth={this.state.inputs.depth}
                  startHour={this.state.inputs.startHour}
                  endHour={this.state.inputs.endHour}
                  />
              </div>
              
              <LiveData 
                currentDate={this.state.liveData.currentDate}
                currentTime={this.state.liveData.currentTime}
                currentDepth={this.state.liveData.currentDepth}
                unitsInFeet={this.state.inputs.unitsInFeet}
                currentDirection={this.state.liveData.currentDirection} 
                currentRate={this.state.liveData.currentRate}
                error={this.state.liveData.error}
                />
              
              <ForecastData 
                fetchingForecast={this.state.fetchingForecast}
                data={this.state.forecastData.data}
                unitsInFeet={this.state.inputs.unitsInFeet}
                error={this.state.forecastData.error}
                />
              
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
    let inputs = Object.assign({}, this.state.inputs);
    inputs[e.target.id] = e.target.value;
    this.setState({
      inputs: inputs,
      showSubmit: true
    });
  }
  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({
      fetchingForecast: true, 
      showSubmit: false,
    });

    // Push to browser history
    let depthInMeters = this.getInMeters(this.state.inputs.depth); // Convert to Meters if necessary
    window.history.pushState(
      this.state,
      "Low Tide Finder | Vancouver (" + 
       this.state.inputs.days + "d/" + 
       depthInMeters + "m/" + 
       this.state.inputs.startHour + ":00/" + 
       this.state.inputs.endHour + ":00)",
      "/?days=" + this.state.inputs.days + 
      "&depth=" + depthInMeters + 
      "&startHour=" + this.state.inputs.startHour + 
      "&endHour=" + this.state.inputs.endHour);
    
    // Fetch new data
    this.getData();
  }
  handleChangeUnits = (e) => {
    // Scale factor
    let s = 1;
    if (this.state.inputs.unitsInFeet) {
      // Feet to Meters
      s = 1 / feetPerMeter;
    } else {
      // Meters to Feet
      s = feetPerMeter;
    }
    
    // Mutate input
    let depth = this.state.inputs.depth;
    let convertedDepth = depth * s;
    convertedDepth = convertedDepth.toFixed(1);
    
    // Mutate data
    let data = this.state.forecastData.data.slice();
    let convertedData = [];
    convertedData = data.map(item => {
      item.tideLevel = item.tideLevel * s;
      return item;
    });
    const convertedCurrentDepth = this.state.liveData.currentDepth * s;
    const convertedCurrentRate = this.state.liveData.currentRate * s;
    
    // Update state
    let inputs = Object.assign({},this.state.inputs);
    inputs.unitsInFeet = !this.state.inputs.unitsInFeet;
    inputs.depth = convertedDepth;
    let liveData = Object.assign({},this.state.liveData);
    liveData.currentDepth = convertedCurrentDepth;
    liveData.currentRate = convertedCurrentRate;
    let forecastData = Object.assign({},this.state.forecastData);
    forecastData.data = convertedData;
    this.setState({
      inputs: inputs,
      liveData: liveData,
      forecastData: forecastData,
    });
  }
  getInMeters(measure) {
    let s = 1;  // assume measure already in meters
    if (this.state.inputs.unitsInFeet) s = 1 / feetPerMeter;
    let measureInMeters = s * measure;    
    return measureInMeters.toFixed(3);
  }
  convertMetersToFeet(measureInMeters) {
    let measureInFeet = feetPerMeter * measureInMeters;    
    return measureInFeet;
  }
}

export default App;
