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
        error: null,
      },
      now: {
        currentDate: moment().tz("America/Vancouver").format("ddd, MMM D, YYYY"),
        currentTime: moment().tz("America/Vancouver").format("h:mm:ssa z"),
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
    setInterval(() => {this.getLastObservation();}, 5000);
    setInterval(() => {this.getCurrentTime();}, 1000);
  }
  getData() {
    this.getForecast();
    this.getLastObservation()
  }
  async getForecast() {
    const endpointBase = "https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/5cebf1de3d0f4a073c4bb943/data?time-series-code=wlp-hilo"

    const startDate = moment().subtract(10,"minutes")
    const endDate = moment().add(this.state.inputs.days,"days")
    const interval = endDate.diff(startDate,"hours")
    let responseData = []

    // Since the endpoint can only give a week's worth (actually 168 hours) of data
    //  per request, need to break up into multiple requests if neccesary.
    for (let w = 0; w < interval/24/7; w++) {
      const from = moment(startDate).add(w*7*24,"hours").utc().format()
      const fromPlusWeek = moment(from).add(7*24,"hours").utc().format()
      const to = fromPlusWeek > endDate ? endDate : fromPlusWeek
      const endpoint = endpointBase + `&from=${from}&to=${to}`

      try {
        const response = await axios.get(endpoint)
        //console.debug(response.data)
        responseData = responseData.concat(response.data)
      } catch(e) {
        console.error(e)
        this.setState({
          forecastData: {
            data: [],
            error: e,
          },
          fetchingForecast: false
        });
        return
      }
    }

    // Add "high" or "low" to data
    if (parseFloat(responseData[0].value) > parseFloat(responseData[1].value)) {
      responseData[0].type = "high"
    } else {
      responseData[0].type = "low"
    }
    responseData.forEach((item, index, arr) => {
      if (item.type === undefined) {
        if (arr[index].value > arr[index-1].value) {
          arr[index].type = "high"
        } else {
          arr[index].type = "low"
        }
      }
    })

    console.debug(responseData)

    // Process data
    const processedData = responseData.filter(item => {
      const itemDateTime = moment.utc(item.eventDate).tz("America/Vancouver")
      return (
        itemDateTime.hours() >= this.state.inputs.startHour &&
        itemDateTime.hours() <= this.state.inputs.endHour
      )
    }).map(item => {
      const itemDateTime = moment.utc(item.eventDate).tz("America/Vancouver") // Convert to Vancouver times
      let itemTideLevel = item.value
      if (this.state.inputs.unitsInFeet) { // Convert to feet if neccesary
        itemTideLevel = this.convertMetersToFeet(itemTideLevel).toFixed(2);
      }

      return {
        className: "",
        day: itemDateTime.day(),
        dateTime: itemDateTime.format("ddd, MMM D @ h:mma"),
        tideLevel: itemTideLevel,
        tideType: item.type
      }
    })
    .filter(item => item.tideLevel <= this.state.inputs.depth)


    this.setState({
      forecastData: {
        data: processedData,
        error: null,
      },
      fetchingForecast: false
    });
  }
  async getLastObservation() {
    const start = moment().subtract(10,"minutes").utc().format()
    const end = moment().add(10, "minutes").utc().format()
    const endpoint = `https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/5cebf1de3d0f4a073c4bb943/data?time-series-code=wlo&from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`
    const liveData = {
      currentDepth: null,
      currentRate: null,
      currentDirection: null,
      error: null
    }

    try {
      const response = await axios.get(endpoint)
      //console.debug(response.data)
      const lastObservation = response.data[response.data.length-1]
      const baseObservation = response.data[response.data.length-6] // 5 minutes before last ob

      const l1 = parseFloat(baseObservation.value)
      const l2 = parseFloat(lastObservation.value)
      const t1 = moment.utc(baseObservation.eventDate)
      const t2 = moment.utc(lastObservation.eventDate)

      const dL = l2-l1 // meters
      const dT = t2-t1 // milliseconds

      // console.debug(lastObservation)
      // console.debug(baseObservation)
      // console.debug(dL)
      // console.debug(dT)

      liveData.currentDepth = lastObservation.value
      liveData.currentRate = Math.abs(dL) * 60000 / dT // meters per minute

      if (this.state.inputs.unitsInFeet) {
        liveData.currentDepth = this.convertMetersToFeet(liveData.currentDepth).toFixed(2);
        liveData.currentRate = this.convertMetersToFeet(liveData.currentRate).toFixed(2);
      }

      liveData.currentDirection = (dL < 0) ? "falling" : "rising"
    } catch(e) {
      console.error(e)
      liveData.error = e
    }

    this.setState({
      liveData: liveData
    })
  }
  getCurrentTime() {
    this.setState({
      now: {
        currentDate: moment().tz("America/Vancouver").format("ddd, MMM D, YYYY"),
        currentTime: moment().tz("America/Vancouver").format("h:mm:ssa z")
      }
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
                currentDate={this.state.now.currentDate}
                currentTime={this.state.now.currentTime}
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
