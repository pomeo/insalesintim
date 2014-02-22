var express = require('express'),
    router = express.Router(),
    xml2js   = require('xml2js'),
    rest     = require('restler'),
    crypto   = require('crypto'),
    mongoose = require('mongoose'),
    Schema   = mongoose.Schema,
    moment   = require('moment')

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

//mongodb

mongoose.connect('mongodb://mongodb.fr1.server.sovechkin.com/intimmarket');

var UsersSchema = new Schema();

UsersSchema.add({
    partnerid   : { type: Number, index: true },
    email       : { type: String, lowercase: true },
    pass        : String,
    admin       : Boolean,
    created_at  : Date,
    updated_at  : Date,
    enabled     : Boolean
});

var OrdersSchema = new Schema();

OrdersSchema.add({
    ordersid    : { type: Number, index: true },
    sum         : Number,
    quantity    : Number,
    status      : String,
    items       : [ItemsSchema],
    created_at  : Date,
    updated_at  : Date,
    enabled     : Boolean
});

var ItemsSchema = new Schema();

ItemsSchema.add({
    insales_id  : { type: Number, index: true },
    url         : { type: String, lowercase: true },
    pass        : String,
    created_at  : Date,
    updated_at  : Date,
    enabled     : Boolean
});

var User = mongoose.model('User', UsersSchema);
var Order = mongoose.model('Order', OrdersSchema);
