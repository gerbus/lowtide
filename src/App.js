import React, { Component } from 'react';
import './App.css';
import moment from 'moment';
import queryString from 'query-string';
import waiting from './spiffygif_40x40.gif';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      days: 60,
      depth: 1.5,
      startHour: 9,
      endHour: 16,
      data: [],
      inputsChanged: false,
      dataFetched: false
    }
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
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
      //console.log(data);
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
                    m</b> occur between the hours of <b>
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
                    :00</b> on Vancouver shores.</p>
                  { (this.state.inputsChanged) ? (
                  <button 
                    className="btn btn-primary btn-sm" 
                    type="submit"
                    >
                  Find Tides</button>
                    ) : null
                   }
                </form>
              </div>				

      
              <table className="table headroom">
                
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
    this.setState({[e.target.id]: e.target.value, inputsChanged: true});
  }
  handleSubmit(e) {
    e.preventDefault();
    this.setState({dataFetched: false, inputsChanged: false});
    window.history.pushState(this.state,"Low Tide Finder | Vancouver (" + this.state.days + "d/" + this.state.depth + "m/" + this.state.startHour + ":00/" + this.state.endHour + ":00)","/?days=" + this.state.days + "&depth=" + this.state.depth + "&startHour=" + this.state.startHour + "&endHour=" + this.state.endHour);
    this.getTideData();
  }
}

export default App;
