//Socket.io
io.sockets.on('connection', function(socket){
    socket.on('reqUser', function(){
        console.log("jizz");
        db.open(function(err){
            db.collection('user', function(error, collection){
                var data = collection.find();
                socket.emit('giveUsers', data);
            });
        });
    }) 
});
