'use strict'

const OrbitDB = require('orbit-db')
var IPFS = require('ipfs');
var io = require('./socket.io.js');
var socket = io();

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

var orbitdb;
var profileDB;
node.on('ready', async () => {
    console.log("starting Orbit...")
    orbitdb = new OrbitDB(node, './orbitdb')
    profileDB = await orbitdb.open("/orbitdb/QmSexedp5pUNuHrXGDZ9NZXtWCQf156Lfar9mqstRZwr77/DSN", {
        sync: true
    })
    //profileDB = await orbitdb.eventlog('DSN', { sync: true })   
    console.log("ready");

    profileDB.events.on('replicated', (address) => {
        console.log(profileDB.iterator({
            limit: -1
        }).collect().map((e) => e.payload.value))
    })
    await profileDB.load()
    console.log(profileDB.iterator({
        limit: -1
    }).collect().map((e) => e.payload.value))

    socket.emit('ipfs', 'ready');
})


