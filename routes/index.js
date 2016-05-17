var cp = require('child_process');
gar express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
var db = require('../database/db');

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
        if(err)
            console.log(err);
        db.collection('user', function(error, collection){
            if(error)
                console.log(error);
            bcrypt.hash(req.body.username, null, null, function(err, hash) {
                collection.insert({username: req.body.username, password: hash, admin: (req.body.admin==='on'), workstation: parseInt(req.body.workstation), workstationUsed: 0});
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
        console.log(err);
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
                        res.redirect('/home');
                    }
                    else{
                        res.redirect('/login');
                    }
                }
                else{
                    res.redirect('/login');
                }
            });
        });
    });
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
	    collection.findOne({port:req.body})
        });
    });
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
    res.render('workstation', { title: 'Workstation', user: req.session.user });
})
.post(function(req, res){
    db.open(function(err){
        console.log(err);
        db.collection('workstation', function(error, collection){
            if(error)
                console.log(error);
            collection.insert({port: req.body.port, domain: req.body.domain, owner: req.body.owner});
        });
    });
    res.redirect('/admin/workstations')
});

router.route('/admin/ipython')
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
    res.redirect('/admin/workstations')
});

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
