// Mock for react-native-chart-kit

const React = require('react');
const { View, Text } = require('react-native');

const MockChart = ({ data, ...props }) => {
  return React.createElement(View, { testID: 'mock-chart', ...props },
    React.createElement(Text, null, 'Chart Mock')
  );
};

module.exports = {
  LineChart: MockChart,
  BarChart: MockChart,
  PieChart: MockChart,
  ProgressChart: MockChart,
  ContributionGraph: MockChart,
  StackedBarChart: MockChart,
};
