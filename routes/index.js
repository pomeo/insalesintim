var express    = require('express'),
    router     = express.Router(),
    xml2js     = require('xml2js'),
    rest       = require('restler'),
    crypto     = require('crypto'),
    mongoose   = require('mongoose'),
    Schema     = mongoose.Schema,
    moment     = require('moment'),
    nodemailer = require('nodemailer'),
    reg        = {};

/* GET home page. */
router.get('/', function(req, res) {
  if (req.cookies.user == undefined || req.cookies.pass == undefined){
    res.render('index', { title: 'Партнёрская программа intimmarket.com' });
  } else {
    req.autoLogin(req.cookies.user, req.cookies.pass, function(o){
      if (o !== null) {
        req.session.user = o;
        res.redirect('/home');
      } else {
        res.render('index', { title: 'Партнёрская программа intimmarket.com' });
      }
    });
  }
});

router.get('/signup', function(req, res) {
  res.render('signup', { title: 'Регистрация' });
});

router.post('/signup', function(req, res){
  AM.addNewAccount({
    name    : req.param('name'),
    email   : req.param('email'),
    user    : req.param('user'),
    pass    : req.param('pass'),
    country : req.param('country')
  }, function(e) {
       if (e) {
         res.send(e, 400);
       } else {
         res.send('ok', 200);
       }
     });
});

module.exports = router;

//registration

reg.autoLogin = function(email, pass, callback) {
  User.findOne({email:email}, function(e, o) {
    if (o) {
      o.pass == pass ? callback(o) : callback(null);
    } else {
      callback(null);
    }
  });
}

reg.manualLogin = function(email, pass, callback) {
  User.findOne({email:email}, function(e, o) {
    if (o == null) {
      callback('user-not-found');
    } else {
      validatePassword(pass, o.pass, function(err, res) {
        if (res){
          callback(null, o);
        } else {
          callback('invalid-password');
        }
      });
    }
  });
}

reg.updatePassword = function(email, newPass, callback) {
  User.findOne({email:email}, function(e, o) {
    if (e) {
      callback(e, null);
    } else {
      saltAndHash(newPass, function(hash) {
        o.pass = hash;
        User.save(o, {safe: true}, callback);
      });
    }
  });
}

var generateSalt = function() {
  var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
  var salt = '';
  for (var i = 0; i < 10; i++) {
    var p = Math.floor(Math.random() * set.length);
    salt += set[p];
  }
  return salt;
}

reg.deactivateAccount = function(id, callback) {
  User.remove({_id: getObjectId(id)}, callback);
}

reg.activateAccount = function(id, callback) {
  User.remove({_id: getObjectId(id)}, callback);
}

var md5 = function(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

var saltAndHash = function(pass, callback) {
  var salt = generateSalt();
  callback(salt + md5(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback) {
  var salt = hashedPass.substr(0, 10);
  var validHash = salt + md5(plainPass + salt);
  callback(null, hashedPass === validHash);
}

var getObjectId = function(id) {
  return User.db.bson_serializer.ObjectID.createFromHexString(id);
}

//mongodb

mongoose.connect('mongodb://mongodb.fr1.server.sovechkin.com/intimmarket');

var UsersSchema = new Schema();

UsersSchema.add({
    partnerid   : { type: Number, index: true, unique: true },
    email       : { type: String, lowercase: true, unique: true },
    pass        : String,
    admin       : Boolean,
    created_at  : Date,
    updated_at  : Date,
    enabled     : Boolean
});

var OrdersSchema = new Schema();

OrdersSchema.add({
    orderid    : { type: Number, index: true, unique: true },
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
    itemid      : { type: Number, index: true },
    name        : String,
    quantity    : Number,
    sum         : Number
});

var User = mongoose.model('User', UsersSchema);
var Order = mongoose.model('Order', OrdersSchema);
