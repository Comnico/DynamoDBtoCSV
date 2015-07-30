var program = require('commander');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config.json');
var dynamoDB = new AWS.DynamoDB();
var headers = [];

program.version('0.0.1').option('-t, --table [tablename]', 'Add the table you want to output to csv').option('-d, --describe').parse(process.argv);

if (!program.table) {
  console.log('You must specify a table');
  program.outputHelp();
  process.exit(1);
}

var query = {
  TableName: program.table,
  Limit: 1000
};

var describeTable = function(query) {

  dynamoDB.describeTable({
    TableName: program.table
  }, function(err, data) {

    if (!err) {

      console.dir(data.Table);

    } else console.dir(err);
  });
};

var scanDynamoDB = function(query) {

  dynamoDB.scan(query, function(err, data) {

    if (!err) {
      printout(data.Items); // Print out the subset of results.

      if (data.LastEvaluatedKey) { // Result is incomplete; there is more to come.
        query.ExclusiveStartKey = data.LastEvaluatedKey;
        scanDynamoDB(query);
      }
    } else console.dir(err);

  });
};

function arrayToCSV(arrayInput) {
  var stringOutPut = '';
  for (var i = 0; i < arrayInput.length; i++) {
    // 文字列内のダブルクォーテーションをエスケープ
    stringOutPut += ('"' + arrayInput[i].replace(/\"/g, '\\"') + '"');
    if (i != arrayInput.length - 1) stringOutPut += "\t";
  }

  return stringOutPut;
}

function printout(items) {
  var headersMap = {};
  var values;
  var header;
  var value;

  if (headers.length === 0) {
    if (items.length > 0) {
      for (var i = 0; i < items.length; i++) {
        for (var key in items[i]) {
          if (key === 'new_memo') {
            // new_memoは移行しないのでスキップ
            continue;
          } else {
            headersMap[key] = true;
          }
        }
      }
    }

    for (var headerKey in headersMap) {
      headers.push(headerKey);
    }

    console.log(arrayToCSV(headers));
  }

  for (var index in items) {
    values = [];
    for (var j = 0; j < headers.length; j++) {
      value = '';
      header = headers[j];

      // Loop through the header rows, adding values if they exist
      if (items[index].hasOwnProperty(header)) {
        if (items[index][header].N) {
          value = items[index][header].N;
        } else if (items[index][header].S) {
          value = items[index][header].S;
        } else if (items[index][header].SS) {
          value = items[index][header].SS.toString();
        }
      }

      values.push(value);
    }

    console.log(arrayToCSV(values));
  }
}

if (program.describe) {
  describeTable(query);
} else {
  scanDynamoDB(query);
}