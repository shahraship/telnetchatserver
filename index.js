/**
 * Author: Raship Shah (shahraship@gmail.com)
 * Description: This program will start up a chat server which can be tested using a telnet program
 * Test Script:
 *      $ telnet localhost 8888
 *      Trying ::1...
 *      Connected to localhost.
 *      Escape character is '^]'.
 *      <= Welcome to the NodeJS Telnet Chat Server!
 *      <= Login Name?
 *      => gc
 *      <= Sorry, name taken.
 *      <= Login Name?
 *      => gc_reviewer
 *      <= Welcome gc_reviewer!
 *      => /rooms
 *      <= Active rooms are:
 *      <= * chat (0)
 *      <= * hottub (0)
 *      <= end of list.
 *      => /join chat
 *      <= entering room: chat
 *      <= * gc_reviewer (** this is you)
 *      <= end of list.
 *      <= * new user joined chat: gc
 *      <= gc: welcome gc_reviewer!
 *      => hi there!
 *      => gotta go!
 *      => /leave
 *      <= * user has left chat: gc_reviewer (** this is you)
 *      => /quit
 *      <= BYE
 *      <= Connection closed by foreign host.
 */
var net = require('net'),
    userobjects = [],
    rooms = [{name: 'chat', users: []}, {name: 'hottub', users: []}];

/*
 * Cleans the input of carriage return, newline
 */
function cleanInput(data) {
    return data.toString().replace(/(\r\n|\n|\r)/gm,"");
}

/*
 * Method executed when a socket ends
 */
function closeSocket(userobj) {
    var i = userobjects.indexOf(userobj);
    if (i != -1) {
        userobjects.splice(i, 1);
    } else {
        console.log('userobject could not be found');
    }
}

function getCommands(userobj, data) {
    var cleanData = cleanInput(data),
        roomkey,
        room,
        userobjkey,
        myuserobj;
    if (cleanData === '/rooms') {
        userobj.socket.write('Active rooms are:\n');
        for (roomkey in rooms) {
            if (rooms.hasOwnProperty(roomkey)) {
                room = rooms[roomkey];
                userobj.socket.write('* ' + room.name + ' (' + room.users.length + ')\n');
            }
        }
        userobj.socket.write('end of list.\n');
    } else if (cleanData.indexOf('/join ') === 0) {
        if (userobj.userdata.inroom === -1) {
            var roomName = cleanData.substring(6);
            var roomfound = false;
            for (roomkey in rooms) {
                if (rooms.hasOwnProperty(roomkey)) {
                    room = rooms[roomkey];
                    if (room.name === roomName) {
                        if (room.users.indexOf(userobj.userdata.name) === -1) {
                            room.users.push(userobj.userdata.name);
                        }
                        userobj.socket.write('entering room: ' + roomName + '\n');
                        for (var userkey in room.users) {
                            if (room.users.hasOwnProperty(userkey)) {
                                var user = room.users[userkey];
                                userobj.socket.write('* ' + user + ((user === userobj.userdata.name) ? ' (** this is you)\n' : '\n'));
                            }
                        }
                        userobj.socket.write('end of list.\n');
                        userobj.userdata.inroom = roomkey;
                        roomfound = true;

                        //send message to all the other users in the room
                        for (userobjkey in userobjects) {
                            if (userobjects.hasOwnProperty(userobjkey)) {
                                myuserobj = userobjects[userobjkey];
                                if (myuserobj.userdata.inroom === userobj.userdata.inroom && myuserobj.userdata.name !== userobj.userdata.name) {
                                    myuserobj.socket.write('* new user joined chat: ' + userobj.userdata.name + '\n');
                                }
                            }
                        }

                        break;
                    }
                }
            }
            if (!roomfound) {
                userobj.socket.write('room not found: "' + roomName + '"\n');
            }
        } else {
            userobj.socket.write('you must exit from one room before you can join another\n');
        }
    } else if (cleanData === '/leave') {
        if (userobj.userdata.inroom !== -1) {
            var i = rooms[userobj.userdata.inroom].users.indexOf(userobj.userdata.name);
            if (i !== -1) {

                //send message to all the other users in the room
                for (userobjkey in userobjects) {
                    if (userobjects.hasOwnProperty(userobjkey)) {
                        myuserobj = userobjects[userobjkey];
                        if (myuserobj.userdata.inroom === userobj.userdata.inroom) {
                            myuserobj.socket.write('* user has left chat: ' + userobj.userdata.name  + ((myuserobj.userdata.name === userobj.userdata.name) ? ' (** this is you)\n' : '\n'));
                        }
                    }
                }

                rooms[userobj.userdata.inroom].users.splice(i, 1);
            }
            userobj.userdata.inroom = -1;
        } else {
            userobj.socket.write('you are not in any room\n');
        }
    } else if (cleanData === '/quit') {
        if (userobj.userdata.inroom !== -1) {
            userobj.socket.write('you must exit room before quitting\n');
        } else {
            userobj.socket.write('BYE\n');
            userobj.socket.destroy();
            var i = userobjects.indexOf(userobj);
            if (i != -1) {
                userobjects.splice(i, 1);
            } else {
                console.log('userobject could not be found');
            }
        }
    } else if (userobj.userdata.inroom !== -1) {
        //send message to all users in the room
        for (userobjkey in userobjects) {
            if (userobjects.hasOwnProperty(userobjkey)) {
                myuserobj = userobjects[userobjkey];
                if (myuserobj.userdata.inroom === userobj.userdata.inroom && myuserobj.userdata.name !== userobj.userdata.name) {
                    myuserobj.socket.write(userobj.userdata.name + ': ' + cleanData + '\n');
                }
            }
        }
    } else {
        userobj.socket.write('Invalid command entered\n');
    }
}

function getName(userobj, data) {
    var cleanData = cleanInput(data);
    for (var userobjkey in userobjects) {
        if (userobjects.hasOwnProperty(userobjkey)) {
            var myuserobj = userobjects[userobjkey];
            if (myuserobj.hasOwnProperty('userdata') && myuserobj.userdata.name === cleanData) {
                userobj.socket.write('Sorry, name taken.\n');
                userobj.socket.write('Login Name?\n');
                return;
            }
        }
    }
    userobj.userdata.name = cleanData;
    userobj.socket.write('Welcome ' + cleanData + '!\n');
    userobj.socket._events.data = function (data) {
        getCommands(userobj, data);
    };
}

/*
 * Callback method executed when a new TCP socket is opened.
 */
function newSocket(socket) {
    var userobj = {socket: socket, userdata: {name: '', inroom: -1}};
    userobj.socket.write('Welcome to the NodeJS Telnet Chat Server!\n');
    userobj.socket.write('Login Name?\n');
    userobj.socket.on('data', function (data) {
        getName(userobj, data);
    });

    //windows workaround.... sends character by character
    /*var x='';
    socket.on('data', function(data) {
        if (data.toString().charCodeAt()==13) {
            getName(userobj, x);
            x=””;
        } else {
            x=x+data.toString();
        }
    });*/

    userobj.socket.on('end', function() {
        closeSocket(userobj);
    });
    userobjects.push(userobj);
}

// Create a new server and provide a callback for when a connection occurs
var server = net.createServer(newSocket);

// Listen on port 80
server.listen(80);