var React = require('react');
var ReactDOM = require('react-dom');
var C3 = require('c3');
var request = require('superagent');

var data = {
    chartTrends: [
        { label: 'current', period: 0 },
        { label: '3 months ago', period: 3 },
        { label: '6 months ago', period: 6 },
        { label: '12 months ago', period: 12 }
    ]
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

var ChartTrend = React.createClass({
    render: function() {
        return (
            <div className="chart-trend">
                <h5>{this.props.label}</h5>
                <h5>{this.props.percentage + '%'}</h5>
                <h2>{this.props.value}</h2>
            </div>
        );
    }
});

var Metric = React.createClass({
    getInitialState: function() {
        return {loading: true};
    },
    componentDidMount: function() {
        request.get('/allTimeSignupsDetail', function(err, res) {
            if (err) { console.log(err); }
            else {
                var data = ['Total'];
                data.push(res.body.result[0].value);
                for (var i = 1; i < res.body.result.length; i++) {
                    data.push(data[i] + res.body.result[i].value);
                }
                this.setState({ data: data, loading: false, title: res.body.title });
            }
        }.bind(this));
    },
    render: function() {
        if (this.state.loading) {
            return <h1>Loading...</h1>
        } else {
            var chartTrends = [];
            var firstValue = this.state.data[this.state.data.length - 1];
            for (var i = 0; i < this.props.data.chartTrends.length; i++) {
                var currentValue = this.state.data[this.state.data.length - 1 - this.props.data.chartTrends[i].period];
                var percentage = Math.round(((firstValue / currentValue) - 1) * 100);

                chartTrends.push(
                    <div className="col-sm-3" key={i}>
                        <ChartTrend
                            label={this.props.data.chartTrends[i].label}
                            percentage={percentage}
                            value={currentValue} />
                    </div>
                );
            }
            var chart = {
                columns: [this.state.data],
                types: { Total: 'area' }
            };
            return (
                <div>
                    <div className="chart-container">
                      <ChartTitle title={this.state.title} />
                      <Chart chart={chart} />
                    </div>
                    <div className="row chart-trends">{chartTrends}</div>
                </div>
            );
        }
    }
});

ReactDOM.render(
  <Metric data={data} />,
  document.getElementById('example')
);
