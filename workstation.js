var express = require('express');
var path = require('path');
var cp = require('child_process');

var db = require('./database/db');



module.exports = {
	//Workstation
	openWorkstation: (username, port, pw, image) => {
	    db.open(function(err){
		db.collection('workstation', function(error, collection){
		    collection.findOne({owner: username, port: port}, function(err, res){
			if(res.used){
			    cp.exec('docker start ' + username + port, function(err, stdout, stderr){
				console.log('docker start '+username+port+' workstation.');
				if(stdout){
				    console.log('--------stdout: --------')
				    console.log(stdout);
				    console.log('------------------------')
				}
				if(stderr){
				    console.log('--------stderr: --------')
				    console.log(stderr);
				    console.log('------------------------')
				}
			    });
			}
			else{
			    cp.exec('docker run -d -p ' + port + ':8888 --name ' + username + port + ' ' + image + ' /bin/bash', function(err, stdout, stderr){
				console.log('docker run '+username+port+' workstation.');
				if(stdout){
				    console.log('--------stdout: --------')
				    console.log(stdout);
				    console.log('------------------------')
				}
				if(stderr){
				    console.log('--------stderr: --------')
				    console.log(stderr);
				    console.log('------------------------')
				}
			    });
			}
		    });
		    collection.update({owner: username, port: port}, {$set: {used: true}});
		});
	    });
	},

	closeWorkstation: (username, port) => {
	    cp.exec('docker stop ' + username + port, function(err, stdout, stderr){
		console.log('docker stop '+username+port+' workstation.');
		if(stdout){
		    console.log('--------stdout: --------')
		    console.log(stdout);
		    console.log('------------------------')
		}
		if(stderr){
		    console.log('--------stderr: --------')
		    console.log(stderr);
		    console.log('------------------------')
		}
	    });
	},

	delWorkstation: (username, port) => {
	    cp.exec('docker rm ' + username + port, function(err, stdout, stderr){
		console.log('docker rm '+username+port+' workstation.');
		if(stdout){
		    console.log('--------stdout: --------')
		    console.log(stdout);
		    console.log('------------------------')
		}
		if(stderr){
		    console.log('--------stderr: --------')
		    console.log(stderr);
		    console.log('------------------------')
		}
	    });
	}
}
