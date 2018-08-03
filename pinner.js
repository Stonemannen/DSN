var IPFS = require('ipfs');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const node = new IPFS({
    repo: "ipfss/" + String(Math.random() + Date.now()),
    start: true,
    EXPERIMENTAL: {
        pubsub: true,
    },
    config: {
        Addresses: {
            Swarm: [
                // Use IPFS dev signal server
                // '/dns/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star/',
                '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
                // Use local signal server
                //'/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/',
            ]
        },
    }
})

node.on('ready', async () => {

})

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/pinner.html');
});

app.get('/pinnerbundle.js', function (req, res) {
    res.sendFile(__dirname + '/pinnerbundle.js');
});

io.on('connection', function(socket){
    console.log("con");
    socket.on('ipfs', function(msg){
      console.log('message: ' + msg);
    });
  });

http.listen(3000, function () {
    console.log('listening on *:3000');
});