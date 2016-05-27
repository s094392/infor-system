var express = require('express');
var path = require('path'); var favicon = require('serve-favicon'); var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var session = require('express-session');  
var Settings = require('./database/settings');  
var db = require('./database/db'); 

var routes = require('./routes/index');
var users = require('./routes/users');
var workstation = require('./workstation');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bcrypt = require('bcrypt-nodejs');

var cp = require('child_process');

var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});

var config = require('./config.json');
var pkey = config.pkey;

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

//Ipython
    socket.on('reqIpythonList', function(username, key){
        if(checkToken(username, key)){
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
        }
    });

    socket.on('reqIpythonListAdmin', function(username, user, key) {
        if(checkToken(username, key)) {
            db.open(function(err) {
                console.log(username);
                db.collection('user', function(error, collection) {
                    collection.findOne({username: username}, function(err, res) {
                        if(res.admin){
                            db.collection('ipython', function(error, collection) {
                                collection.find({owner: user}, {_id: 0}, function(err, res) {
                                    res.toArray(function(err, res) {
                                        console.log(res);
                                        console.log("jizzzzzzz");
                                        socket.emit('giveIpythonList', res);
                                    });
                                });
                            });
                        }
                    });
                });
            });
        }
    });

    socket.on('newIpython', function(username, key) {
        if(checkToken(username, key)){
            db.open(function(err) {
                db.collection('ipythonPortList', function(error, collection) {
                    collection.findOne({using: false}, function(err, res) {
                        collection.update({port: res.port}, {$set: {using: true}});
                        db.collection('ipython', function(error, collection) {
                            console.log({name: username+res.port, port: res.port, owner: username});
                            collection.insert({name: username+res.port, port: res.port, owner: username});
                        });
                    });
                });
            });
        }
    });

    socket.on('openIpython', function(username, port, pw, key){
        if(checkToken(username, key)){
            port = parseInt(port);
            db.open(function(err){
                db.collection('ipython', function(error, collection){
                    console.log(username+' open ipython notebook on '+port);
                    collection.findOne({owner: username, port: port}, function(err, res){
                        console.log(res);
                        if(res){
                            collection.update({owner: username, port: port}, {$set: {isUsing: true}});
                            openIpython(username, port, pw);
                        }
                    });
                });
            });
        }
    });

    socket.on('closeIpython', function(username, port, key){
        if(checkToken(username, key)){
            port = parseInt(port);
            db.open(function(err){
                db.collection('ipython', function(error, collection){
                    console.log(username+' close ipython notebook on '+port);
                    collection.findOne({owner: username, port: port}, function(err, res){
                        console.log(res);
                        if(res){
                            collection.update({owner: username, port: port}, {$set: {isUsing: false}});
                            closeIpython(username, port);
                        }
                    });
                });
            });
        }
    });

    socket.on('delIpython', function(username, port, key){
        if(checkToken(username, key)){
            port = parseInt(port);
            db.open(function(err){
                db.collection('ipython', function(error, collection){
                    console.log(username+' delete ipython notebook on '+port);
                    collection.findOne({owner: username, port: port}, function(err, res){
                        console.log(res);
                        if(res){
                            delIpython(username, port);
                            collection.update({owner: username, port: port}, {$set: {used: false}});
                        }
			            collection.dropIndex(port);
                    });
                });
            });
        }
    });

//workstation
    socket.on('reqWorkstationList', function(username, key){
        if(checkToken(username, key)){
            db.open(function(err){
                db.collection('workstation', function(error, collection){
                    collection.find({owner: username}, {_id:0}, function(err, res){
                        res.toArray(function(err, res){
                            socket.emit('giveWorkstationList', res);
                        });
                    });
                });
            });
        }
    });

    socket.on('openWorkstation', function(username, port, pw, image, key){
	    if(checkToken(username, key)){
	        port = parseInt(port);
	        db.open(function(err){
		        db.collection('workstation', function(error, collection){
		            collection.findOne({owner: username, port: port}, function(err, res){
			            console.log(res);
			            if(res){
			                collection.update({owner: username, port: port}, {$set: {isUsing: true}});
			                workstation.openWorkstation(username, port, pw, image);
			                console.log(username+' open '+image+' workstation on '+port);
			            }
		            });
		        });
	        });
	    }
    });

    socket.on('closeWorkstation', function(username, port, key){
	    if(checkToken(username, key)){
            port = parseInt(port);
            db.open(function(err){
                db.collection('workstation', function(error, collection){
                    collection.findOne({owner: username, port: port}, function(err, res){
                        console.log(res);
                        if(res){
                            collection.update({owner: username, port: port}, {$set: {isUsing: false}});
                            workstation.closeWorkstation(username, port)
                            console.log(username+ ' close workstation on '+port);
                        }
                    });
                });
            });
	    }
    });

    socket.on('delWorkstation', function(username, port, key){
        if(checkToken(username, key)){
            port = parseInt(port);
            db.open(function(err){
                db.collection('workstation', function(error, collection){
                    collection.findOne({owner: username, port, port}, function(err, res){
                        console.log(res);
                        if(res){
                            workstation.delWorkstation(username, port);
                            collection.update({owner: username, port: port}, {$set: {used: false}});
                            console.log(username+' delete workstation on '+port);
                        }
                    });
                });
            });
        }
    });

    socket.on('reqDocker', function(){
        docker.listContainers(function (err, containers) {
            console.log(containers);
            socket.emit('giveDocker', containers);
        });
    });

    socket.on('reqNode', function(username, key){
        cp.exec('docker logs ' + username + 'node', function(err, stdout, stderr){
            console.log(stdout);
            socket.emit('giveNode', stderr);
        });
    });

    // Ipython Notebook
    function openIpython(username, port, pw){
        docker.createContainer({Image: 'ipython/notebook', name: username + port, Env: ["PASSWORD=" + pw], Ports: {"8888/tcp": [{"HostIp": "0.0.0.0", "HostPort": toString(port)}]}}, function(err, container){
            console.log(err);
            container.start(function (err, data) {
                console.log(err);
                console.log(data);
                db.open(function(err){
                    db.collection('ipython',function(error, collection){
                        collection.find({owner: username}, {_id: 0}, function(err, res){
                            res.toArray(function(err, res){
                                console.log("Emittttt.");
                                socket.emit('giveIpythonList', res);
                                collection.update({owner: username, port: port}, {$set: {isUsing: true}});
                            });
                        });
                    });
                });
            });
        });
    }

    function closeIpython(username, port){
        var container = docker.getContainer(username + port);
        container.stop(function(err, data){
        console.log("cloaseipython");
            console.log(data);
            container.remove(function(err, data){
                console.log("removeipython");
                console.log(data);
                db.open(function(err){
                    db.collection('ipython', function(error, collection) {
                        collection.find({owner: username}, {_id: 0}, function(err, res){
                            res.toArray(function(err, res){
                                console.log("Emittttt.");
                                socket.emit('giveIpythonList', res);
                            });
                        });
                        collection.update({owner: username, port: port}, {$set: {isUsing: false}});
                    });
                });
            });
            db.open(function(err){
                db.collection('ipythonPortList', function(error, collection) {
                    collection.update({port: port}, {$set: {used: false}});
                });
            });
        });
    }
});


function checkToken(username, key){
    return bcrypt.compareSync(key.method + username + pkey, key.token);
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
    cookie: { maxAge: 14 * 24 * 3600000 },
    secret: Settings.COOKIE_SECRET,
    resave: true,
    saveUninitialized: true
}));


app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    var err = req.session.error;
    delete req.session.error;
    res.locals.message = '';
    if (err) {
        res.locals.message = '<div class="alert alert-dismissible alert-danger"><button type="button" class="close" data-dismiss="alert">&times;</button><h4>Warning!</h4><p>' + err + '</p></div>';
    }
    console.log(res.locals);
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
