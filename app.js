var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var session = require('express-session');  
var Settings = require('./database/settings');  
var db = require('./database/db'); 

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var cp = require('child_process');

//Socket.io
io.sockets.on('connection', function(socket){
    socket.on('reqUser', function(){
        db.open(function(err){
            db.collection('user', function(error, collection){
                collection.find({}, {_id:0}, function(err, res){
                    res.toArray(function(err, res){
                        socket.emit('giveUsers', res);
                    })
                });
            });
        });
    }) 
    socket.on('reqStatus', function(username){
        db.open(function(err){
            db.collection('user', function(error, collection){
                collection.findOne({username: username}, function(err, res){
                    socket.emit('giveStatus', res);
                });
            });
        }); 
    });
    socket.on('reqIpythonList', function(username){
        db.open(function(err){
            console.log(username);
            db.collection('ipython', function(error, collection){
                collection.find({owner: username}, {_id: 0}, function(err, res){
                    res.toArray(function(err, res){
                        socket.emit('giveIpythonList', res);
                    });
                });
            });
        });
    });
    socket.on('openIpython', function(username, port, pw){
        port = parseInt(port);
        db.open(function(err){
            db.collection('ipython', function(error, collection){
                console.log(username);
                console.log(port);
                collection.findOne({owner: username, port: port}, function(err, res){
                    console.log(res);
                    if(res){
                        openIpython(username, port, "jizz");
                        collection.update({owner: username, port: port}, {$set: {isUsing: true}});
                    }
                });
            });
        });
    });
    socket.on('closeIpython', function(username, port){
        port = parseInt(port);
        db.open(function(err){
            db.collection('ipython', function(error, collection){
                console.log(username);
                console.log(port);
                collection.findOne({owner: username, port: port}, function(err, res){
                    console.log(res);
                    if(res){
                        console.log("ipythonnnn");
                        closeIpython(username, port);
                        collection.update({owner: username, port: port}, {$set: {isUsing: false}});
                    }
                });
            });
        });
    });
    socket.on('delIpython', function(username, port){
        port = parseInt(port);
        db.open(function(err){
            db.collection('ipython', function(error, collection){
                console.log(username);
                console.log(port);
                collection.findOne({owner: username, port: port}, function(err, res){
                    console.log(res);
                    if(res){
                        console.log("ipythonnnn");
                        delIpython(username, port);
                        collection.update({owner: username, port: port}, {$set: {used: false}});
                    }
                });
            });
        });
    });
});

// Ipython Notebook
function openIpython(username, port, pw){
    db.open(function(err){
        db.collection('ipython', function(error, collection){
            collection.findOne({owner: username, port: port}, function(err, res){
                if(res.used){
                    cp.exec('docker start ' + username + port, function(err, stdout, stderr){
                        if(stdout)
                            console.log(stdout);
                    });
                }
                else{
                    cp.exec('docker run -d -p ' + port + ':8888 --name ' + username + port + ' -e "PASSWORD='+pw+'" ipython/notebook', function(err, stdout, stderr){
                        if(stdout)
                            console.log(stdout);
                    });
                    collection.update({owner: username, port: port}, {$set: {used: true}});
                }
            });
        });
    });
    console.log("openipython");
}

function closeIpython(username, port){
    console.log("cloaseipython");
    cp.exec('docker stop ' + username + port, function(err, stdout, stderr){
        console.log('docker stop ' + username + port);
        if(stdout)
            console.log(stdout);
    });
}

function delIpython(username, port){
    console.log("removeipython");
    cp.exec('docker rm ' + username + port, function(err, stdout, stderr){
        console.log('docker rm ' + username + port);
        if(stdout)
            console.log(stdout);
    });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json()); app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    cookie: { maxAge: 600000 },
    secret: Settings.COOKIE_SECRET,
    resave: true,
    saveUninitialized: true
}));

app.use(function(req, res, next){
    res.locals.user = req.session.user;
    next();
});

app.use('/', routes);
app.use('/users', users);
app.use('/signup', routes);
app.use('/login', routes);
app.use('/logout', routes);

// error handlers

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

server.listen(3000);
//module.exports = app;
