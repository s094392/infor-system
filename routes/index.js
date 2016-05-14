var cp = require('child_process');
var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
var db = require('../database/db');
/*
var mongodb = require('mongodb');
var mongo = mongodb.MongoClient;
var Server = mongodb.Server,
    Db = mongodb.Db,
    BSON = mongodb.BSONPure;
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('infor-system', server);
*/
/* GET home page. */
router.get('/', function(req, res) {
    if(req.session.user){
        res.render('home', { title: 'Home', user: req.session.user });
    }
    res.render('index', { title: 'Express' });
});

router.route('/signup')
.get(function(req, res) {
    res.render('signup', { title: 'Sigu up' });
})
.post(function(req, res) {
    db.open(function(err){
        db.collection('user', function(error, collection){
            if(error)
            console.log(error);
            bcrypt.hash(req.body.username, null, null, function(err, hash) {
                collection.insert({username:req.body.username, password:hash, admin: (req.body.admin==='on', workstation: parseInt(req.body.workstation), workstationUsed: 0});
            });
            res.redirect('/home');
        });
    });
});
 
router.route('/login')
.get(function(req, res) {
    res.render('login', { title: 'Login' });
})
.post(function(req, res) {
    var user = {};
    db.open(function(err){
        db.collection('user', function(error, collection){
            if(error)
            console.log(error);
            collection.findOne({username:req.body.username}, function(err, data){
                if(data){
                    if(bcrypt.compareSync(req.body.password, data.password)){
                        user = {
                            username: data.username,
                            admin: data.admin
                        }
                        req.session.user = user;
                        if(req.session.user){
                            res.redirect('/home');
                        }
                        else{
                            res.redirect('/login');
                        }
                    }
                }
            });
        });
    });
});
 
router.get('/logout', function(req, res) {
    req.session.user = null;
    res.redirect('/');
});
 
router.get('/home', function(req, res) {
    console.log("jiaa");
    authentication(req, res);
    res.render('home', { title: 'Home', user: req.session.user });
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
    db.open(function(err){
        db.collection('user', function(error, collection){
            var data = collection.find();

        });
    });
})

/*
router.route('/workstation')
.get(function(req, res){
    authentication(req, res);
    res.render('workstation', { title: 'Workstation', user: user });
})
.post(function(req, res){

});
*/
 
function adminAuthentication(req, res){
    if (!req.session.user.admin){
        return res.redirect('/login');
    }
}

function authentication(req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
}
module.exports = router;
