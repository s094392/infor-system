var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var mongo = mongodb.MongoClient;
var bcrypt = require('bcrypt-nodejs');
var Server = mongodb.Server,
    Db = mongodb.Db,
    BSON = mongodb.BSONPure;
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('infor-system', server);
 
/* GET home page. */
router.get('/', function(req, res) {
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
                console.log(req.body.username);
                console.log(hash);
                collection.insert({username:req.body.username, password:hash});
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
    var jizz  = "uu";
    db.open(function(err){
        db.collection('user', function(error, collection){
            if(error)
            console.log(error);
            collection.findOne({username:req.body.username}, function(err, data){
                if(data){
                    if(bcrypt.compareSync(req.body.password, data.password)){
                        user = {
                            username: req.body.username
                        }
                        jizz = "oo";
                        req.session.user = user;
                        console.log(req.session.user);
                        console.log(user);
        res.redirect('/home');
                    }
                }
            });
        });
    });
    console.log(jizz);
    if(req.session.user){
        res.redirect('/home');
    }
    res.redirect('/login');
});
 
router.get('/logout', function(req, res) {
    req.session.user = null;
    res.redirect('/');
});
 
router.get('/home', function(req, res) {
    console.log("jiaa");
    authentication(req, res);
    res.render('home', { title: 'Home', user: user });
});
 
function authentication(req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
}
module.exports = router;
