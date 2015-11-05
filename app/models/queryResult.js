// Example model
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var QueryResultSchema = new Schema({
  name: String,
  result: Schema.Types.Mixed
});

QueryResultSchema.virtual('date')
  .get(function(){
    return this._id.getTimestamp();
  });

mongoose.model('QueryResult', QueryResultSchema);