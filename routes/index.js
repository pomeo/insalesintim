var express    = require('express'),
    router     = express.Router(),
    xml2js     = require('xml2js'),
    rest       = require('restler'),
    crypto     = require('crypto'),
    mongoose   = require('mongoose'),
    Schema     = mongoose.Schema,
    moment     = require('moment'),
    nodemailer = require('nodemailer'),
    xmlparser  = require('express-xml-bodyparser'),
    reg        = {};

var transport = nodemailer.createTransport("SMTP", {
  service: "yandex",
  auth: {
    user: process.env.EMAILLOGIN,
    pass: process.env.EMAILPASS
  }
});

/* GET home page. */
router.get('/', function(req, res) {
  if (req.cookies.email == undefined || req.cookies.pass == undefined){
    res.render('index', { title: 'Партнёрская программа intimmarket.com' });
  } else {
    reg.autoLogin(req.cookies.email, req.cookies.pass, function(o){
      if (o !== null) {
        req.session.email = o;
        res.redirect('/dashboard');
      } else {
        res.render('index', { title: 'Партнёрская программа intimmarket.com' });
      }
    });
  }
});

router.post('/', function(req, res) {
  reg.manualLogin(req.param('email'), req.param('pass'), function(e, o){
    if (!o){
      res.send(e, 400);
    } else {
      req.session.email = o;
      res.cookie('email', o.email, { maxAge: 900000 });
      res.cookie('pass', o.pass, { maxAge: 900000 });
      res.redirect('/dashboard');
      //res.send(o, 200); для проверки что возвращается именно того пользователя
    }
  });
});

router.get('/signup', function(req, res) {
  res.render('signup', { title: 'Регистрация' });
});

router.post('/signup', function(req, res) {
  reg.addNewAccount(res, {
    email : req.param('email')
  }, function(e) {
       if (e) {
         res.send(e, 400);
       } else {
         res.send('ok', 200);
       }
     });
});

router.get('/unique/:partnerid', function(req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
  console.log(req.param('partnerid'));
  Users.findOne({partnerid:req.param('partnerid')}, function(e, o) {
    if (o) {
      o.unique = o.unique + 1;
      o.save(function (err) {
        if (err) {
          res.send(e, 400);
        } else {
          res.send(200);
        }
      });
    } else {
      res.send(200);
    }
  });
});

router.get('/check/:partnerid/:orderid', function(req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
  console.log(req.param('partnerid'));
  console.log(req.param('orderid'));
  Users.findOne({partnerid:req.param('partnerid')}, function(e, u) {
    if (u) {
      rest.get('http://' + process.env.insalesid + ':' + process.env.insalessecret + '@' + process.env.insalesurl + '/admin/orders/' + req.param('orderid') + '.xml').once('complete', function(order) {
        if (order instanceof Error) {
          console.log('Error: ' + order.message);
          res.send(200);
        } else {
          u.orders = u.orders + 1;
          u.save(function (err) {
            if (err) {
              res.send(e, 400);
            } else {
              var sum = 0;
              order['order']['order-lines'][0]['order-line'].forEach(function (value, index) {
                sum = sum + parseInt(value.quantity[0]._);
              });
              var o = new Orders({
                orderid    : order['order'].id[0]._,
                partnerid  : u.partnerid,
                sum        : parseFloat(order['order']['items-price'][0]._),
                quantity   : sum,
                status     : order['order']['fulfillment-status'][0],
                comment    : order['order'].comment[0],
                created_at : moment().format('ddd, DD MMM YYYY HH:mm:ss ZZ'),
                updated_at : moment().format('ddd, DD MMM YYYY HH:mm:ss ZZ'),
                enabled    : true
              });
              order['order']['order-lines'][0]['order-line'].forEach(function (value, index) {
                o.items.push({
                  itemid    : value.id[0]._,
                  productid : value['product-id'][0]._,
                  name      : value.title[0],
                  quantity  : value.quantity[0]._,
                  sum       : parseInt(value['sale-price'][0]._)
                });
              });
              o.save(function (err) {
                if (err) {
                  console.log(err);
                  res.send(200);
                } else {
                  res.send(200);
                }
              });
            }
          });
        }
      });
    } else {
      res.send(200);
    }
  });
});

router.post('/order/update', xmlparser({trim: false, explicitArray: false}), function(req, res) {
  rest.get('http://' + process.env.insalesid + ':' + process.env.insalessecret + '@' + process.env.insalesurl + '/admin/orders/' + req.body.order.id[0]._ + '.xml').once('complete', function(o) {
    Orders.findOne({orderid:o.order.id[0]._}, function(err, order) {
      if (err || order == null) {
        console.log(err);
        res.send(200);
      } else {
        order.status = o.order['fulfillment-status'][0];
        order.comment = o.order.comment[0];
        order.updated_at = moment().format('ddd, DD MMM YYYY HH:mm:ss ZZ');
        order.save(function (err) {
          if (err) {
            console.log(err);
            res.send(200);
          } else {
            res.send(200);
          }
        });
      }
    });
  });
});

module.exports = router;

//registration

reg.autoLogin = function(email, pass, callback) {
  Users.findOne({email:email}, function(e, o) {
    if (o) {
      o.pass == pass ? callback(o) : callback(null);
    } else {
      callback(null);
    }
  });
}

reg.manualLogin = function(email, pass, callback) {
  Users.findOne({email:email}, function(e, o) {
    if (o == null) {
      callback('user-not-found');
    } else {
      validatePassword(pass, o.pass, function(err, res) {
        if (res) {
          callback(null, o);
        } else {
          callback('invalid-password');
        }
      });
    }
  });
}

reg.addNewAccount = function(res, newData, callback) {
  Users.findOne({email:newData.email}, function(e, o) {
    if (o) {
      callback('email-taken');
    } else {
      var pass = generateSalt();
      console.log(pass);
      var message = {
        from: 'Партнёрская программа intimmarket.com <robot@intimmarket.com>',
        to: newData.email,
        replyTo: 'support@intimmarket.com',
        subject: 'Регистрация',
        text: 'Ваш логин: ' + newData.email + '\nВаш пароль: ' + pass + '\n\nВойти в панель можно здесь http://www.intimmarket.com/page/partners\n\nВаша партнёрская ссылка находится внутри панели.'
      };
      transport.sendMail(message, function(error) {
        if(error){
          console.log(error.message);
          return;
        } else {
          transport.close();
          saltAndHash(pass, function(hash) {
            Users.findOne({}, {}, { sort: { 'created_at' : -1 } }, function(err, userid) {
              if (userid == null) {
                newData.partnerid  = 1000;
              } else {
                newData.partnerid  = userid.partnerid + 1;
              }
              newData.pass       = hash;
              newData.admin      = 0;
              newData.orders     = 0;
              newData.unique     = 0;
              newData.created_at = moment().format('ddd, DD MMM YYYY HH:mm:ss ZZ');
              newData.updated_at = newData.created_at;
              newData.enabled    = 1;
              console.log(newData);
              var user = new Users(newData);
              user.save(function (err) {
                if (err) {
                  res.send(e, 400);
                } else {
                  res.redirect('/complete');
                }
              });
            });
          });
        }
      });
    }
  });
}

reg.updatePassword = function(email, newPass, callback) {
  Users.findOne({email:email}, function(e, o) {
    if (e) {
      callback(e, null);
    } else {
      saltAndHash(newPass, function(hash) {
        o.pass = hash;
        o.save(o, callback);
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
  Users.remove({_id: getObjectId(id)}, callback);
}

reg.activateAccount = function(id, callback) {
  Users.remove({_id: getObjectId(id)}, callback);
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
  return Users.db.bson_serializer.ObjectID.createFromHexString(id);
}

//mongodb

mongoose.connect('mongodb://mongodb.fr1.server.sovechkin.com/intimmarket');

var UsersSchema = new Schema();

UsersSchema.add({
  partnerid   : { type: Number, unique: true },
  email       : { type: String, lowercase: true, unique: true },
  pass        : String,
  admin       : Boolean,
  orders      : Number,
  unique      : Number,
  created_at  : Date,
  updated_at  : Date,
  enabled     : Boolean
});

var OrdersSchema = new Schema();

OrdersSchema.add({
  orderid     : { type: Number, unique: true },
  partnerid   : { type: Number, index: true},
  sum         : Number,
  quantity    : Number,
  status      : String,
  comment     : String,
  items       : [ItemsSchema],
  created_at  : Date,
  updated_at  : Date,
  enabled     : Boolean
});

var ItemsSchema = new Schema();

ItemsSchema.add({
  itemid      : { type: Number, index: true },
  productid   : Number,
  name        : String,
  quantity    : Number,
  sum         : Number
});

var Users = mongoose.model('Users', UsersSchema);
var Orders = mongoose.model('Orders', OrdersSchema);
