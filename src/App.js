import React, { Component } from 'react';
import './App.css';
import moment from 'moment';
import queryString from 'query-string';
import waiting from './spiffygif_40x40.gif';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      days: 90,
      depth: 1.2,
      startHour: 11,
      endHour: 18,
      data: [],
      dataFetched: false
    }
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
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
    this.getTideData();
  }
  getTideData() {
    const startDate = moment();
    const endDate = moment().add(this.state.days,"days");
    const endpoint = "http://api.gerbus.ca/chs/" + startDate.valueOf() + "-" + endDate.valueOf();
    
    fetch(endpoint)
    .then(resp => resp.json())
    .then(rawData => {
      let data = [];
      rawData.searchReturn.data.data.map(item => {
        let itemDateTime = moment.utc(item.boundaryDate.max.$value,"YYYY-MM-DD HH:mm:ss");
        itemDateTime.local(); // convert to local timezone
        const itemTideLevel = item.value.$value;
        
        if (itemTideLevel <= this.state.depth && this.state.startHour <= itemDateTime.hour() && itemDateTime.hour() < this.state.endHour) {
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
           
          data.push({
            className: itemClassName,
            dateTime: itemDateTime.format("ddd, MMM D, YYYY @ h:mma"),
            tideLevel: itemTideLevel
          });
        }
      });
      console.log(data);
      this.setState({data: data, dataFetched: true});
    })
    .catch(err => console.log("Fetch error: " + err))
  }
  render() {
    const endDate = moment().add(this.state.days,"days");
    
    return (
      <div className="App">
        <div className="container">
          <div className="row">
            <div className="col-sm-10 col-md-8">
              
              
              <div className="text-back intro">
                <h1>Low Tide Finder (Vancouver)</h1>
                <p>Listed are dates within <b>{this.state.days} days</b> (today to {endDate.format("MMM Do")}) on which low tides of less than <b>{this.state.depth}m</b> occur between the hours of <b>{this.state.startHour}:00</b> and <b>{this.state.endHour}:00</b> on Vancouver shores. To try different search parameters, check the <a href="#params">bottom of this page</a>.</p>
              </div>				

      
              <table className="table headroom">
                
                {(this.state.dataFetched && this.state.data.length > 0) ? (
                  <thead>
                    <tr className="text-back"><th>When</th><th>Low Tide Level</th></tr>
                  </thead>
                ) : null}
                
                <tbody>
                {
                  (this.state.dataFetched) ? (
                    (this.state.data.length > 0) ? (
                      this.state.data.map((item, index) => (
                        <tr key={index} className={'text-back ' + item.className}>
                          <td>{item.dateTime}</td>
                          <td>{item.tideLevel} m</td>
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
              

              <div id="params" className="alert alert-info info">
                <form className="form" onSubmit={this.handleSubmit}>
                  <div className="form-group">
                    <label for="days">Number of days (from today)</label>
                    <input className="form-control" id="days" value={this.state.days} onChange={this.handleChange} />
                  </div>
                  <div className="form-group">
                    <label for="depth">Maximum depth of low tide (meters)</label>
                    <input className="form-control" id="depth" value={this.state.depth} onChange={this.handleChange} />
                  </div>
                  <div className="form-group">
                    <label for="startHour">Minimum hour of day</label>
                    <input className="form-control" id="startHour" value={this.state.startHour} onChange={this.handleChange} />
                  </div>
                  <div className="form-group">
                    <label for="endHour">Maximum hour of day</label>
                    <input className="form-control" id="endHour" value={this.state.endHour} onChange={this.handleChange} />
                  </div>
                  <button className="btn btn-primary" type="submit">Find Tides</button>
                </form>
              </div>
              
              
            </div>
          </div>
          <p className="info">
    Data provided by the <a href="http://www.charts.gc.ca/help-aide/about-apropos/index-eng.asp" target="_blank">Canadian Hydrographic Service</a></p>
        </div>
      </div>
    );
  }
  handleChange(e) {
    this.setState({[e.target.id]: e.target.value});
  }
  handleSubmit(e) {
    e.preventDefault();
    this.setState({dataFetched: false});
    this.getTideData();
  }
}

export default App;
