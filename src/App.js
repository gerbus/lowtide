import React, { Component } from 'react';
import './App.css';
import moment from 'moment';
import queryString from 'query-string';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      days: 90,
      depth: 1.2,
      startTime: 11,
      endTime: 18
    }
  }
  componentDidMount() {
    // Check querystring for params, apply to state
    const qs = queryString.parse(window.location.search);
    const state = this.state;
    if (qs.days) {state.days = qs.days;}
    if (qs.depth) {state.depth = qs.depth;}
    if (qs.startTime) {state.startTime = qs.startTime;}
    if (qs.endTime) {state.endTime = qs.endTime;}
    this.setState(state);
  }
  render() {
    const endDate = moment().add(this.state.days,"days");
    
    return (
      <div className="App">
        <div class="container">
          <div class="row">
            <div class="col-sm-10 col-md-8">
              
              <div class="text-back intro">
                <h1>Last Stand: Dates</h1>
                <p>Listed are dates within <b>{this.state.days} days</b> (today to <span class="moment date">{endDate.format("Y-M-D")}</span>) on which low tides of less than <b>{this.state.depth}m</b> occur between the hours of <b>{this.state.startTime}:00 and {this.state.endTime}:00</b> on Vancouver shores.</p>
                <div class="alert alert-info info"><b>To alter the parameters of the results</b>, use the link below and modify the querystring parameters:
                  <table class="minimal">
                    <tr><td><i>startTime</i>, <i>endTime</i>&nbsp;&nbsp;</td><td>show results between <i>startTime</i> and <i>endTime</i>; integer / hour on 24-hour clock</td></tr>
                    <tr><td><i>days</i></td><td>show results before today + <i>days</i>; integer</td></tr>
                    <tr><td><i>depth</i></td><td>show results where low-tide is less than <i>depth</i>; decimal / meters</td></tr>
                  </table>
                  i.e. <a href={"http://gerbus.ca/laststand?startTime=" + this.state.startTime + "&endTime=" + this.state.endTime + "&days=" + this.state.days + "&depth=" + this.state.depth}>http://gerbus.ca/laststand?startTime={this.state.startTime}&endTime={this.state.endTime}&days={this.state.days}&depth={this.state.depth}</a>
                </div>
              </div>				

              <table class="table headroom">
                <tr><th>When</th><th>Low Tide Height</th></tr>

                <tr class='text-back weekend longweekend'><td><span class="moment full">date here</span></td><td>tide level here</td></tr>

                <tr class="text-back"><td>No data</td></tr>

              </table>
              
            </div>
          </div>
          <p class="info">
    Data provided by the <a href="http://www.charts.gc.ca/help-aide/about-apropos/index-eng.asp" target="_blank">Canadian Hydrographic Service</a></p>
        </div>
      </div>
    );
  }
}

export default App;
