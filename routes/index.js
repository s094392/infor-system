var cp = require('child_process');
var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
var db = require('../database/db');
var fs = require('fs');
var escape = require('escape-html');
var config = require('../config.json');
var mailId = config.mailId; var pkey = config.pkey;

var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});

/* GET home page. */
router.get('/', function(req, res) {
    if(req.session.user){
        res.render('home', { title: 'Home', user: req.session.user });
    }
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/index', { title: 'INFOR System' });
    else
    res.render('index', { title: 'INFOR System' });
});

router.route('/signup')
.get(function(req, res) {
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/signup', { title: 'Sign up', wrong: '' });
    else
    res.render('signup', { title: 'Sign up', wrong: '' });
})
.post(function(req, res) {
    console.log(req.files);
    db.open(function(err){
        if(err)
            console.log(err);
        db.collection('user', function(error, collection){
            if(error)
                console.log(error);
            collection.findOne({username: req.body.username}, function(err, data) {
                if(data)
                    res.render('signup', { title: 'Sign up', wrong: 'You cannot use this username.' });
                else{
                    if( req.body.password !== req.body.passwordV ){
                        res.render('signup', { title: 'Sign up', wrong: 'Password Validation Error' });
                    }
                    else{
                        bcrypt.hash(req.body.password, null, null, function(err, hash) {
                            collection.insert({username: escape(req.body.username), password: hash, admin: false, workstation: 1});
                        });
                        signupMail(req.body.username, req.body.password);
                        var lang = req.query.lang;
                        
                        if(lang==='ar')
                        res.redirect('/login?lang=ar');
                        else
                        res.redirect('/login');
                    }
                }
            });
        });
    });
});
 
router.route('/login')
.get(function(req, res) {
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/login', { title: 'Login', wrong: '' });
    else
    res.render('login', { title: 'Login', wrong: '' });
})
.post(function(req, res) {
    var user = {};
    db.open(function(err){
        console.log(err);
        db.collection('user', function(error, collection){
            if(error)
                console.log(error);
            collection.findOne({username:req.body.username}, function(err, data){
                if(data){
                    if(bcrypt.compareSync(req.body.password, data.password)){
                        user = {
                            username: data.username,
                            admin: data.admin,
                            key: {
                                method: 'bcrypt',
                                token: bcrypt.hashSync('bcrypt' + data.username + pkey)
                            }
                        }
                        req.session.user = user;
                        var lang = req.query.lang;
                        
                        if(lang==='ar')
                        res.redirect('/home?lang=ar');
                        else
                        res.redirect('/home');
                    }
                    else{
                        res.render('login', { title: 'Login', wrong: 'Wrong password' });
                    }
                }
                else{
                    res.render('login', { title: 'Login', wrong: 'Wrong username' });
                }
            });
        });
    });
});

router.get('/forgot_pw', function(req, res) {
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/forgot_pw', {title: 'Forgot password'});
    else
    res.render('forgot_pw', {title: 'Forgot password'});
});
 
router.get('/logout', function(req, res) {
    req.session.user = null;
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.redirect('/?lang=ar');
    else
    res.redirect('/');
});
 
// Users pages
router.get('/home', function(req, res) {
    authentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/home', { title: 'Home', user: req.session.user });
    else
    res.render('home', { title: 'Home', user: req.session.user });
});

router.route('/ipython')
.get(function(req, res){
    authentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/ipython', { title: 'Ipython', user: req.session.user });
    else
    res.render('ipython', { title: 'Ipython', user: req.session.user });
});

router.get('/workstation', function(req, res){
    authentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/workstation', { title: 'Workstation', user: req.session.user });
    else
    res.render('workstation', { title: 'Workstation', user: req.session.user });
});

router.route('/node')
.get(function(req, res){
    authentication(req, res);
    res.render('node', { title: 'Node', user: req.session.user });
})
.post(function(req, res){
    db.open(function(err){
        console.log(err);
        db.collection('node', function(error, collection){
            if(error)
                console.log(error);
            collection.insert({owner: req.session.user.username, github: req.body.github});
            console.log('insertttt');
            openNode(req.session.user.username);
        });
    });
    res.redirect('/node');
});

// Admin pages
router.route('/admin')
.get(function(req, res){
    authentication(req, res);
    adminAuthentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/admin', { title: 'Admin', user: req.session.user });
    else
    res.render('admin', { title: 'Admin', user: req.session.user });
})

router.route('/admin/users')
.get(function(req, res){
    authentication(req, res);
    adminAuthentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/userManage', { title: 'User Manage', user: req.session.user });
    else
    res.render('userManage', { title: 'User Manage', user: req.session.user });
})

router.route('/admin/workstations')
.get(function(req, res){
    authentication(req, res);
    adminAuthentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/workstationAdmin', { title: 'Workstation', user: req.session.user });
    else
    res.render('workstationAdmin', { title: 'Workstation', user: req.session.user });
})
.post(function(req, res){
    db.open(function(err){
        console.log(err);
        db.collection('workstation', function(error, collection){
            if(error)
                console.log(error);
            collection.insert({port: parseInt(req.body.port), domain: req.body.domain, owner: req.body.owner, isUsing: false, used: false});
        });
    });
    res.redirect('/admin')
});

router.route('/admin/ipythons')
.get(function(req, res){
    authentication(req, res);
    adminAuthentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/ipythonAdmin', { title: 'Ipython', user: req.session.user, wrong: '' });
    else
    res.render('ipythonAdmin', { title: 'Ipython', user: req.session.user, wrong: '' });
})
.post(function(req, res){
    db.open(function(err){
        console.log(err);
        db.collection('user', function(error, collection){
            if(error)
                console.log(error);
            collection.findOne({username: req.body.owner}, function(err, data){
                if(data){
                    db.collection('ipython', function(error, collection){
                        collection.findOne({port: parseInt(req.body.port)}, function(err, data){
                            if(data){
                                res.render('ipythonAdmin', { title: 'Ipython', user: req.session.user, wrong: 'port used.' });
                            }
                            else{
                                collection.insert({name: req.body.name, port: parseInt(req.body.port), owner: req.body.owner, isUsing: false});
                            }
                        });
                    });
                }
                else{
                    res.render('ipythonAdmin', { title: 'Ipython', user: req.session.user, wrong: 'no such user.' });
                }
            });
        });
    });
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.redirect('/admin?lang=ar');
    else
    res.redirect('/admin');
});

router.route('/admin/ipythons/multi')
.get(function(req, res) {
    authentication(req, res);
    adminAuthentication(req, res);
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.render('ar/ipythonMulti', { title: 'MultiIpython' });
    else
    res.render('ipythonMulti', { title: 'MultiIpython' });
})
.post(function(req, res) {
    db.open(function(err) {
        console.log(err);
        db.collection('ipythonPortList', function(error, collection) {
            if(error)
                console.log(error);
            var first = parseInt(req.body.first);
            var number = parseInt(req.body.number);
            for(var i=first; i<first+number; i++){
                collection.insert({port: i, using: false});
            }
        });
    });
    var lang = req.query.lang;
    
    if(lang==='ar')
    res.redirect('/admin?lang=ar');
    else
    res.redirect('/admin');
});

function adminAuthentication(req, res){
    if (!req.session.user.admin){
        var lang = req.query.lang;
        
        if(lang==='ar')
        return res.redirect('/?lang=ar');
        else
        return res.redirect('/');
    }
}

function authentication(req, res) {
    if (!req.session.user) {
        var lang = req.query.lang;
        
        if(lang==='ar')
        return res.redirect('/?lang=ar');
        else
        return res.redirect('/');
    }
}

function signupMail(username, password){
    var container = docker.getContainer(mailId);
    container.exec({cmd: 'poste email:create ' + username + ' ' + password})
    cp.exec('docker exec ' + mailId + ' poste email:create ' + username + ' ' + password, function(err, stdout, stderr){
        console.log(stdout);
    });
}

function openNode(username){
    db.open(function(err){
        console.log(err);
        db.collection('node', function(error, collection){
            if(error)
                console.log(error);
            collection.findOne({owner: username}, function(err, data){
                console.log('jizz');
                cp.exec('rm -rf /node/' + username);
                console.log('cloning in to /node/' + username + '......');
                cp.exec('git clone ' + data.github + ' /node/' + username, function(err, stdout, stderr){
                    console.log('dnoe!');
                    cp.exec('cp /node/Dockerfile /node/' + username, function(err, stdout, stderr){
                        console.log("start building image......");
                        console.log('docker build /node/' + username + ' -t ' + username + 'node');
                        cp.exec('docker build' + ' -t ' + username + 'node /node/' + username , function(err, stdout, stderr){
                            console.log(stderr);
                            console.log(stdout);
                            console.log(stderr);
                            console.log('done!');
                            console.log("start creating container......")
                            docker.createContainer({Image: username + 'node', name: username + 'node'}, function (err, container) {
                                container.start(function (err, data) {
                                    console.log(data);
                                    console.log('done!');
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}
module.exports = router;
