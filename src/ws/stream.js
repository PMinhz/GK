const stream = ( socket ) => {
    socket.on( 'subscribe', ( data ) => {
        //Tham gia phòng
        socket.join( data.room );
        socket.join( data.socketId );

        //Thông báo có user truy cập mới
        if ( socket.adapter.rooms.has(data.room) === true ) {
            socket.to( data.room ).emit( 'new user', { socketId: data.socketId } );
        }
    } );

    //tạo ra screen user mới truy cập
    socket.on( 'newUserStart', ( data ) => {
        socket.to( data.to ).emit( 'newUserStart', { sender: data.sender } );
    } );

    //show màn hình user mới
    socket.on( 'sdp', ( data ) => {
        socket.to( data.to ).emit( 'sdp', { description: data.description, sender: data.sender } );
    } );

    //load ICE 
    socket.on( 'ice candidates', ( data ) => {
        socket.to( data.to ).emit( 'ice candidates', { candidate: data.candidate, sender: data.sender } );
    } );

};

module.exports = stream;
