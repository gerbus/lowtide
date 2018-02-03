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
    const endpoint = "http://gerbus.ca:3012/chs/" + startDate.valueOf() + "-" + endDate.valueOf();
    
    fetch(endpoint)
    .then(resp => resp.json())
    .then(rawData => {
      let data = this.state.data;
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
            dateTime: itemDateTime.format("dddd, MMMM Do, YYYY @ h:mma"),
            tideLevel: itemTideLevel
          });
        }
      });
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
                <p>Listed are dates within <b>{this.state.days} days</b> (today to {endDate.format("MMM Do")}) on which low tides of less than <b>{this.state.depth}m</b> occur between the hours of <b>{this.state.startHour}:00 and {this.state.endHour}:00</b> on Vancouver shores. To change search parameters, see <a href="#params">bottom of page</a>.</p>
              </div>				

      
              <table className="table headroom"><thead>
                <tr className="text-back"><th>When</th><th>Low Tide Level</th></tr>
                </thead><tbody>
                
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
                      <tr className="text-back"><td colSpan="2">No data</td></tr>
                    )
                  ) : (
                    <tr className="text-back"><td colSpan="2"><center><img src={waiting} /></center></td></tr>
                  )
                }
                  
                </tbody>
              </table>
              

              <div id="params" className="alert alert-info info"><b>To alter the parameters of the results</b>, use the link below and modify these querystring parameters as needed:
                <table className="minimal">
                  <tbody>
                    <tr><td><i>days</i></td><td>only show results before today + <i>days</i>; integer</td></tr>
                    <tr><td><i>depth</i></td><td>only show results where low-tide is less than <i>depth</i>; decimal / meters</td></tr>
                    <tr><td><i>startHour</i>, <i>endHour</i>&nbsp;&nbsp;</td><td>only show results between the hours of <i>startHour</i> and <i>endHour</i>; integer / hour on 24-hour clock</td></tr>

                  </tbody>
                </table>
                i.e. <a href={window.location.origin + window.location.pathname + "?days=" + this.state.days + "&depth=" + this.state.depth + "&startHour=" + this.state.startHour + "&endHour=" + this.state.endHour}>{window.location.origin + window.location.pathname}?days={this.state.days}&depth={this.state.depth}&startHour={this.state.startHour}&endHour={this.state.endHour}</a>
              </div>

            </div>
          </div>
          <p className="info">
    Data provided by the <a href="http://www.charts.gc.ca/help-aide/about-apropos/index-eng.asp" target="_blank">Canadian Hydrographic Service</a></p>
        </div>
      </div>
    );
  }
}

export default App;
