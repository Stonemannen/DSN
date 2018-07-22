'use strict'

const OrbitDB = require('orbit-db')
var IPFS = require('ipfs');
const Room = require('ipfs-pubsub-room')
const CryptoEdDSAUtil = require('./cryptoEdDSAUtil');
const crypto = require('crypto');

const SHA256 = require("crypto-js/sha256");

const node = new IPFS({ repo: "ipfss/" + String(Math.random() + Date.now()),
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


//const room = Room(node, 'ins')
var orbitdb;
var profileDB;
node.on('ready', async () => {
    console.log("starting Orbit...")
    orbitdb = new OrbitDB(node, './orbitdb')
    profileDB = await orbitdb.open("/orbitdb/QmSexedp5pUNuHrXGDZ9NZXtWCQf156Lfar9mqstRZwr77/DSN", { sync: true })
    //profileDB = await orbitdb.eventlog('DSN', { sync: true })   
    console.log("ready");
    
    profileDB.events.on('replicated', (address) => {
        console.log(profileDB.iterator({ limit: -1 }).collect().map((e) => e.payload.value))
    })
    profileDB.load()
    console.log(profileDB.iterator({ limit: -1 }).collect().map((e) => e.payload.value))
})


function store(){
    var toStore = "Nonzi";

    room.broadcast("Nonzi");

    node.files.add(Buffer.from(toStore), (err, res) => {
        if (err || !res) {
            return console.error('ipfs add error', err, res)
        }

        res.forEach((file) => {
            if (file && file.hash) {
            console.log('successfully stored', file.hash)
            display('QmTeW79w7QQ6Npa3b1d5tANreCDxF2iDaAPsDvW6KtLmfB/index.html')
            }
        })
    })
}

function display(hash){
    node.files.cat(hash, (err, data) => {
        if (err) { return console.error('ipfs cat error', err) }
        console.log(String(data));
    })
}

async function orbit(){
    await profileDB.add("Nonzi")
    const all = profileDB.iterator({ limit: -1 }).collect().map((e) => e.payload.value)
    console.log(all);
}

async function createdb(){
    var name = "DSN"
    profileDB = await orbitdb.open(name, {
        // If database doesn't exist, create it
        create: true, 
        overwrite: true,
        // Load only the local version of the database, 
        // don't load the latest from the network yet
        localOnly: false,
        type: "feed",
        write: ['*'],
    })
    console.log(profileDB.address.toString())
}

async function createProfile(){
    var username = document.getElementById('name').value;
    var PublicKey = document.getElementById('publicKey').value;
    var privateKey = document.getElementById('privateKey').value;
    var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
    var Metadata = {};
    var Posts = [];
    var Hash = SHA256(PublicKey + username + Metadata + Posts).toString();
    var Sign = CryptoEdDSAUtil.signHash(keyPair, Hash);
    var profile = {publicKey: PublicKey, name: username, metadata: Metadata, posts: Posts, hash: Hash, sign: Sign}
    await node.files.add(Buffer.from(JSON.stringify(profile)), (err, res) => {
        if (err || !res) {
            return console.error('ipfs add error', err, res)
        }

        res.forEach((file) => {
            if (file && file.hash) {
            console.log('successfully stored', file.hash)
            publishProfile(PublicKey, file.hash);
            }
        })
    })
    
}

async function publishProfile(PublicKey, profileHash){
    var all = profileDB.iterator({ limit: -1 }).collect().map((e) => e.payload.value)
    for(var i = 0; i < all.length; i++){
        var body = JSON.parse(all[i]);
        if(body.publicKey == PublicKey){
            all = profileDB.iterator({ limit: -1 }).collect().map((e) => e)
            for(var j = 0; j < all.length; j++){
                if(JSON.parse(all[j].payload.value).publicKey == PublicKey){
                    const hash = await profileDB.remove(all[j].hash)
                }
            }
        }
    }
    var dbProfile = {publicKey: PublicKey, hash: profileHash}
    await profileDB.add(JSON.stringify(dbProfile));
    all = profileDB.iterator({ limit: -1 }).collect().map((e) => e.payload.value)
    console.log(all);
}

async function createKeyPair(){
    var privateKey = CryptoEdDSAUtil.generateSecret(crypto.randomBytes(32).toString('hex'));
    var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
    var publicKey = CryptoEdDSAUtil.toHex(keyPair.getPublic());
    console.log("privateKey: " + privateKey);
    console.log("publicKey: " + publicKey);
}

async function post(){
    console.log("post");
    var Text = document.getElementById("postText").value;
    var PublicKey = document.getElementById("publicKey").value;
    var privateKey = document.getElementById('privateKey').value;
    var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
    var Time =  Date.now();
    var Content = [{type: "txt", text: Text}];
    var Metadata = {};
    var Hash = SHA256(PublicKey + Time + Content + Metadata).toString();
    var Sign = CryptoEdDSAUtil.signHash(keyPair, Hash); 
    var post = {publicKey: PublicKey, time: Time, content: Content, metadata: Metadata, hash: Hash, sign: Sign};
    console.log("publishing");
    await node.files.add(Buffer.from(JSON.stringify(post)), (err, res) => {
        if (err || !res) {
            return console.error('ipfs add error', err, res)
        }

        res.forEach((file) => {
            if (file && file.hash) {
            console.log('successfully stored', file.hash)
            updateProfilePost(PublicKey,privateKey, file.hash)
            }
        })
    })
}

function getProfile(){
    var publicKey = document.getElementById('profilePubKey').value
    const all = profileDB.iterator({ limit: -1 }).collect().map((e) => e.payload.value)
    for(var i = 0; i < all.length; i++){
        var body = JSON.parse(all[i]);
        if(body.publicKey == publicKey){
            node.files.get(body.hash, function (err, files) {
                files.forEach((file) => {
                  console.log(file.path)
                  console.log(file.content.toString('utf8'))
                  var profile = JSON.parse(file.content.toString('utf8'))
                  if(profile.posts.length > 0){
                      for(var j = 0; j < profile.posts.length; j++){
                        node.files.get(profile.posts[j], function (err, files) {
                            files.forEach((file) => {
                                var post = JSON.parse(file.content.toString('utf8'))
                                var feed = document.getElementById('feed');
                                const h6 = document.createElement('h6');
                                const text = document.createTextNode(profile.name + ": " + post.content[0].text);
                                h6.appendChild(text);
                                feed.insertBefore(h6, feed.childNodes[0]);
                            })
                        })
                      }
                  }
                })
            })
        }
    }
}

function updateProfilePost(pubKey, privateKey, hash){
    var all = profileDB.iterator({ limit: -1 }).collect().map((e) => e.payload.value)
    console.log(all);
    for(var i = 0; i < all.length; i++){
        var body = JSON.parse(all[i]);
        if(body.publicKey == pubKey){
            console.log(pubKey)
            node.files.get(body.hash, function (err, files) {
                files.forEach((file) => {
                  console.log(file.path)
                  console.log(file.content.toString('utf8'))
                  var profile = JSON.parse(file.content.toString('utf8'));
                  profile.posts.push(hash);
                  profile.hash = SHA256(profile.publicKey + profile.name + profile.metadata + profile.posts).toString();
                  var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
                  var Sign = CryptoEdDSAUtil.signHash(keyPair, profile.hash);
                  profile.sign = Sign;
                  node.files.add(Buffer.from(JSON.stringify(profile)), (err, res) => {
                    if (err || !res) {
                        return console.error('ipfs add error', err, res)
                    }
            
                    res.forEach((file) => {
                        if (file && file.hash) {
                        console.log('successfully stored', file.hash)
                        publishProfile(pubKey, file.hash);
                        }
                    })
                })
                })
            })
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createdb').onclick = createdb
    document.getElementById('store').onclick = orbit
    document.getElementById('post').onclick = post
    document.getElementById('profile').onclick = createProfile
    document.getElementById('createKeyPair').onclick = createKeyPair
    document.getElementById('getProfile').onclick = getProfile
})
