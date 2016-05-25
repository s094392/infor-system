var cp = require('child_process');
var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
var db = require('../database/db');
var fs = require('fs');
var escape = require('escape-html');
var config = require('../config.json');
var mailId = config.mailId;

/* GET home page. */
router.get('/', function(req, res) {
    if(req.session.user){
        res.render('home', { title: 'Home', user: req.session.user });
    }
    res.render('index', { title: 'Express' });
});

router.route('/signup')
.get(function(req, res) {
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
                        res.redirect('/login');
                    }
                }
            });
        });
    });
});
 
router.route('/login')
.get(function(req, res) {
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
                                token: bcrypt.hashSync('bcrypt' + data.username + 'ILoveINfOR')
                            }
                        }
                        req.session.user = user;
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
    res.render('forgot_pw', {title: 'Forgot password'});
});
 
router.get('/logout', function(req, res) {
    req.session.user = null;
    res.redirect('/');
});
 
// Users pages
router.get('/home', function(req, res) {
    authentication(req, res);
    res.render('home', { title: 'Home', user: req.session.user });
});

router.route('/ipython')
.get(function(req, res){
    authentication(req, res);
    res.render('ipython', { title: 'Ipython', user: req.session.user });
})
.post(function(req, res){
    db.open(function(err){
        console(err);
        db.collection('ipython', function(error, collection){
            if(error)
        	console.log(error);
	    collection.findOne({port:req.body.port}, function(err, data){
	        if(data){

		} 
	    });
        });
    });
});

router.get('/workstation', function(req, res){
    authentication(req, res);
    res.render('workstation', { title: 'Workstation', user: req.session.user });
});

// Admin pages
router.route('/admin')
.get(function(req, res){
    authentication(req, res);
    adminAuthentication(req, res);
    res.render('admin', { title: 'Admin', user: req.session.user });
})

router.route('/admin/users')
.get(function(req, res){
    authentication(req, res);
    adminAuthentication(req, res);
    res.render('userManage', { title: 'User Manage', user: req.session.user });
})

router.route('/admin/workstations')
.get(function(req, res){
    authentication(req, res);
    adminAuthentication(req, res);
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
    res.render('ipythonAdmin', { title: 'Ipython', user: req.session.user });
})
.post(function(req, res){
    db.open(function(err){
        console.log(err);
        db.collection('ipython', function(error, collection){
            if(error)
                console.log(error);
            collection.insert({port: parseInt(req.body.port), domain: req.body.domain, owner: req.body.owner, isUsing: false});
        });
    });
    res.redirect('/admin')
});



function adminAuthentication(req, res){
    if (!req.session.user.admin){
        return res.redirect('/');
    }
}

function authentication(req, res) {
    if (!req.session.user) {
        return res.redirect('/');
    }
}

function signupMail(username, password){
    cp.exec('docker exec ' + mailId ' poste email:create ' + username + ' ' + password, function(err, stdout, stderr){
        console.log(stdout);
    });
}

module.exports = router;
