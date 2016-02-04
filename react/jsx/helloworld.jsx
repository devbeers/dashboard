var React = require('react');
var ReactDOM = require('react-dom');
var C3 = require('c3');

var data = {
    title: 'Temp title',
    chart: {
        columns: [
            ['data1', 300, 350, 300, 0, 0, 0],
            ['data2', 130, 100, 140, 200, 150, 50]
        ],
        types: {
            data1: 'area',
            data2: 'area-spline'
        }
    }
};

var ChartTitle = React.createClass({
    render: function() {
        return (
            <h1 className="metric-title">{this.props.title}</h1>
        );
    }
});

var Chart = React.createClass({
    componentDidMount: function() {
        var node = ReactDOM.findDOMNode(this);
        var config = {
            bindto: node,
            data: this.props.chart
        };

        C3.generate(config);
    },

    render: function() {
        return (
            <div></div>
        );
    }
});

var Metric = React.createClass({
    render: function() {
        return (
            <div>
                <ChartTitle title={this.props.data.title} />
                <Chart chart={this.props.data.chart} />
            </div>
        );
    }
});

ReactDOM.render(
  <Metric data={data} />,
  document.getElementById('example')
);
