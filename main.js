"use strict";

const OrbitDB = require("orbit-db");
var IPFS = require("ipfs");
const Room = require("ipfs-pubsub-room");
const CryptoEdDSAUtil = require("./cryptoEdDSAUtil");
const crypto = require("crypto");

const SHA256 = require("crypto-js/sha256");

process.on("uncaughtException", function(err) {
  console.log("Caught exception: ", err);
});

const node = new IPFS({
  repo: "ipfss/" + String(Math.random() + Date.now()),
  start: true,
  EXPERIMENTAL: {
    pubsub: true
  },
  config: {
    Addresses: {
      Swarm: [
        // Use IPFS dev signal server
        // '/dns/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star/',
        "/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star"
        // Use local signal server '/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/',
      ]
    }
  }
});

var feed = [];

document.getElementById("loginDiv").style.display = "none";
document.getElementById("mainDiv").style.display = "none";

//const room = Room(node, 'ins')
var orbitdb;
var profileDB;
node.on("ready", async () => {
  console.log("starting Orbit...");
  orbitdb = new OrbitDB(node, "./orbitdb");
  profileDB = await orbitdb.open(
    "/orbitdb/QmSexedp5pUNuHrXGDZ9NZXtWCQf156Lfar9mqstRZwr77/DSN",
    {
      sync: true
    }
  );
  //profileDB = await orbitdb.eventlog('DSN', { sync: true })
  console.log("ready");

  profileDB.events.on("replicated", address => {
    console.log(
      profileDB
        .iterator({
          limit: -1
        })
        .collect()
        .map(e => e.payload.value)
    );
  });

  console.log(
    profileDB
      .iterator({
        limit: -1
      })
      .collect()
      .map(e => e.payload.value)
  );

  if (getCookie("createProfile")) {
    console.log("Creating new profile...");
    var username = getCookie("createProfile");
    var PublicKey = getCookie("publicKey");
    var privateKey = getCookie("privateKey");
    var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
    var Follow = [PublicKey];
    var Metadata = {
      follow: Follow
    };
    var Posts = [];
    var Hash = SHA256(PublicKey + username + Metadata + Posts).toString();
    var Sign = CryptoEdDSAUtil.signHash(keyPair, Hash);
    var profile = {
      publicKey: PublicKey,
      name: username,
      metadata: Metadata,
      posts: Posts,
      hash: Hash,
      sign: Sign
    };
    await node.files.add(Buffer.from(JSON.stringify(profile)), (err, res) => {
      if (err || !res) {
        return console.error("ipfs add error", err, res);
      }

      res.forEach(file => {
        if (file && file.hash) {
          console.log("successfully stored", file.hash);
          publishProfile(PublicKey, username, file.hash);
          deleteCookie("createProfile");
        }
      });
    });
  }
  await profileDB.load();
  console.log("DB Loaded");

  if (!getCookie("publicKey")) {
    document.getElementById("loginDiv").style.display = "block";
    document.getElementById("mainDiv").style.display = "none";
    document.getElementById("loading").style.display = "none";
  } else {
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("mainDiv").style.display = "block";
    if (!getCookie("createProfile")) {
      validateLogin();
    } else {
      document.getElementById("loading").style.display = "none";
    }
  }
});

function validateLogin() {
  console.log("Validating credentials");
  console.log(
    profileDB
      .iterator({
        limit: -1
      })
      .collect()
      .map(e => e.payload.value)
  );
  var succes = false;
  var all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  if (all.length < 1) {
    setTimeout(validateLogin, 3000);
    return;
  }
  for (var i = 0; i < all.length; i++) {
    var body = JSON.parse(all[i]);
    if (body.publicKey == getCookie("publicKey")) {
      succes = true;
      updateFeed();
      document.getElementById("loginDiv").style.display = "none";
      document.getElementById("mainDiv").style.display = "block";
      document.getElementById("loading").style.display = "none";
    }
  }
  if (!succes) {
    setCookie("error", "login");
    deleteCookie("publicKey");
    location.href = "./index.html";
  }
}

function store() {
  var toStore = "Nonzi";

  room.broadcast("Nonzi");

  node.files.add(Buffer.from(toStore), (err, res) => {
    if (err || !res) {
      return console.error("ipfs add error", err, res);
    }

    res.forEach(file => {
      if (file && file.hash) {
        console.log("successfully stored", file.hash);
        display("QmTeW79w7QQ6Npa3b1d5tANreCDxF2iDaAPsDvW6KtLmfB/index.html");
      }
    });
  });
}

function display(hash) {
  node.files.cat(hash, (err, data) => {
    if (err) {
      return console.error("ipfs cat error", err);
    }
    console.log(String(data));
  });
}

async function orbit() {
  await profileDB.add("Nonzi");
  const all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  console.log(all);
}

async function createdb() {
  var name = "DSN";
  profileDB = await orbitdb.open(name, {
    // If database doesn't exist, create it
    create: true,
    overwrite: true,
    // Load only the local version of the database, don't load the latest from the
    // network yet
    localOnly: false,
    type: "feed",
    write: ["*"]
  });
  console.log(profileDB.address.toString());
}

async function createProfile() {
  var username = document.getElementById("name").value;
  if (getCookie("publicKey")) {
    var PublicKey = getCookie("publicKey");
    var privateKey = getCookie("privateKey");
  } else {
    var PublicKey = document.getElementById("publicKey").value;
    var privateKey = document.getElementById("privateKey").value;
  }
  var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
  var Follow = [];
  var Metadata = {
    follow: Follow
  };
  var Posts = [];
  var Hash = SHA256(PublicKey + username + Metadata + Posts).toString();
  var Sign = CryptoEdDSAUtil.signHash(keyPair, Hash);
  var profile = {
    publicKey: PublicKey,
    name: username,
    metadata: Metadata,
    posts: Posts,
    hash: Hash,
    sign: Sign
  };
  await node.files.add(Buffer.from(JSON.stringify(profile)), (err, res) => {
    if (err || !res) {
      return console.error("ipfs add error", err, res);
    }

    res.forEach(file => {
      if (file && file.hash) {
        console.log("successfully stored", file.hash);
        publishProfile(PublicKey, username, file.hash);
      }
    });
  });
}

async function publishProfile(PublicKey, Name, profileHash) {
  var all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  for (var i = 0; i < all.length; i++) {
    console.log(all);
    console.log(all[i]);
    try {
      var body = JSON.parse(all[i]);
    } catch (error) {
      console.log("error");
    }
    if (body.publicKey == PublicKey) {
      all = profileDB
        .iterator({
          limit: -1
        })
        .collect()
        .map(e => e);
      for (var j = 0; j < all.length; j++) {
        if (JSON.parse(all[j].payload.value).publicKey == PublicKey) {
          const hash = await profileDB.remove(all[j].hash);
        }
      }
    }
  }
  var dbProfile = {
    publicKey: PublicKey,
    username: Name,

    hash: profileHash
  };
  await profileDB.add(JSON.stringify(dbProfile));
  all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  console.log(all);
  updateFeed();
}

async function createKeyPair() {
  var privateKey = CryptoEdDSAUtil.generateSecret(
    crypto.randomBytes(32).toString("hex")
  );
  var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
  var publicKey = CryptoEdDSAUtil.toHex(keyPair.getPublic());
  console.log("privateKey: " + privateKey);
  console.log("publicKey: " + publicKey);
}

async function post() {
  console.log("post");
  var Text = document.getElementById("postText").value;
  if (getCookie("publicKey")) {
    var PublicKey = getCookie("publicKey");
    var privateKey = getCookie("privateKey");
  } else {
    var PublicKey = document.getElementById("publicKey").value;
    var privateKey = document.getElementById("privateKey").value;
  }

  var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
  var Time = Date.now();
  var Content = [
    {
      type: "txt",
      text: Text
    }
  ];
  var Metadata = {};
  var Hash = SHA256(PublicKey + Time + Content + Metadata).toString();
  var Sign = CryptoEdDSAUtil.signHash(keyPair, Hash);
  var post = {
    publicKey: PublicKey,
    time: Time,
    content: Content,
    metadata: Metadata,
    hash: Hash,
    sign: Sign
  };
  console.log("publishing");
  await node.files.add(Buffer.from(JSON.stringify(post)), (err, res) => {
    if (err || !res) {
      return console.error("ipfs add error", err, res);
    }

    res.forEach(file => {
      if (file && file.hash) {
        console.log("successfully stored", file.hash);
        updateProfilePost(PublicKey, privateKey, file.hash);
      }
    });
  });
}

function getProfile() {
  var publicKey = document.getElementById("profilePubKey").value;
  const all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  for (var i = 0; i < all.length; i++) {
    var body = JSON.parse(all[i]);
    if (body.publicKey == publicKey) {
      node.files.get(body.hash, function(err, files) {
        files.forEach(file => {
          console.log(file.path);
          console.log(file.content.toString("utf8"));
          var profile = JSON.parse(file.content.toString("utf8"));
          if (profile.posts.length > 0) {
            for (var j = 0; j < profile.posts.length; j++) {
              node.files.get(profile.posts[j], function(err, files) {
                files.forEach(file => {
                  var post = JSON.parse(file.content.toString("utf8"));
                  var feed = document.getElementById("feed");
                  const h6 = document.createElement("h6");
                  const text = document.createTextNode(
                    profile.name + ": " + post.content[0].text
                  );
                  h6.appendChild(text);
                  feed.insertBefore(h6, feed.childNodes[0]);
                });
              });
            }
          }
        });
      });
    }
  }
}

function updateProfilePost(pubKey, privateKey, hash) {
  var all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  console.log(all);
  for (var i = 0; i < all.length; i++) {
    var body = JSON.parse(all[i]);
    if (body.publicKey == pubKey) {
      console.log(pubKey);
      node.files.get(body.hash, function(err, files) {
        files.forEach(file => {
          console.log(file.path);
          console.log(file.content.toString("utf8"));
          var profile = JSON.parse(file.content.toString("utf8"));
          profile.posts.push(hash);
          profile.hash = SHA256(
            profile.publicKey + profile.name + profile.metadata + profile.posts
          ).toString();
          var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
          var Sign = CryptoEdDSAUtil.signHash(keyPair, profile.hash);
          profile.sign = Sign;
          node.files.add(Buffer.from(JSON.stringify(profile)), (err, res) => {
            if (err || !res) {
              return console.error("ipfs add error", err, res);
            }

            res.forEach(file => {
              if (file && file.hash) {
                console.log("successfully stored", file.hash);
                publishProfile(pubKey, profile.name, file.hash);
              }
            });
          });
        });
      });
    }
  }
}

function followProfile() {
  var follow = document.getElementById("profilePubKey").value;
  console.log("follow: " + follow);
  var publicKey = getCookie("publicKey");
  console.log("pubkey: " + publicKey);
  const all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  for (var i = 0; i < all.length; i++) {
    var body = JSON.parse(all[i]);
    if (body.publicKey == publicKey) {
      console.log(follow);
      node.files.get(body.hash, function(err, files) {
        files.forEach(file => {
          console.log(file.content.toString("utf8"));
          var profile = JSON.parse(file.content.toString("utf8"));
          profile.metadata.follow.push(follow);
          profile.hash = SHA256(
            profile.publicKey + profile.name + profile.metadata + profile.posts
          ).toString();
          var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(
            getCookie("privateKey")
          );
          var Sign = CryptoEdDSAUtil.signHash(keyPair, profile.hash);
          profile.sign = Sign;
          node.files.add(Buffer.from(JSON.stringify(profile)), (err, res) => {
            if (err || !res) {
              return console.error("ipfs add error", err, res);
            }

            res.forEach(file => {
              if (file && file.hash) {
                console.log("successfully stored", file.hash);
                publishProfile(publicKey, profile.name, file.hash);
              }
            });
          });
        });
      });
    }
  }
}

function login() {
  setCookie("publicKey", document.getElementById("publicKey").value, 30);
  setCookie("privateKey", document.getElementById("privateKey").value, 30);
  updateFeed();
}

async function updateFeed() {
  feed = [];
  document.getElementById("follow").style.display = "none";
  document.getElementById("feed").style.display = "block";
  console.log("updating feed");
  if (getCookie("publicKey")) {
    var publicKey = getCookie("publicKey");
  } else {
    var publicKey = document.getElementById("publicKey").value;
  }
  const all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  for (var i = 0; i < all.length; i++) {
    var body = JSON.parse(all[i]);
    console.log(body);
    if (body.publicKey == publicKey) {
      node.files.get(body.hash, function(err, files) {
        files.forEach(file => {
          console.log(file.path);
          console.log(file.content.toString("utf8"));
          var profile = JSON.parse(file.content.toString("utf8"));
          console.log(profile);
          if (profile.metadata.follow) {
            for (var j = 0; j < profile.metadata.follow.length; j++) {
              for (var k = 0; k < all.length; k++) {
                var bodys = JSON.parse(all[k]);
                if (bodys.publicKey == profile.metadata.follow[j]) {
                  node.files.get(bodys.hash, function(err, files) {
                    files.forEach(file => {
                      console.log(file.path);
                      console.log(file.content.toString("utf8"));
                      var profile = JSON.parse(file.content.toString("utf8"));
                      if (profile.posts.length > 0) {
                        for (var j = 0; j < profile.posts.length; j++) {
                          node.files.get(profile.posts[j], function(
                            err,
                            files
                          ) {
                            files.forEach(file => {
                              var post = JSON.parse(
                                file.content.toString("utf8")
                              );
                              post.profile = profile.name;
                              feed.push(post);
                              renderFeed();
                            });
                          });
                        }
                      }
                    });
                  });
                }
              }
            }
          }
        });
      });
    }
  }
}

function renderFeed() {
  feed.sort(compare);
  console.log(feed);
  var rows = [];
  for (var i = 0; i < feed.length; i++) {
    if (feed[i].content[0].type === "txt") {
      var date = new Date(feed[i].time);
      rows.push(
        <TextPost
          key={i}
          user={feed[i].profile}
          text={feed[i].content[0].text}
          time={date.toString()}
        />
      );
    }
  }
  console.log(rows);
  var ulStyle = {
    listStyleType: "none"
  };
  ReactDOM.render(
    <div>
      {" "}
      <ul style={ulStyle}>{rows}</ul>{" "}
    </div>,
    document.getElementById("feed")
  );
}

function compare(a, b) {
  if (a.time < b.time) return 1;
  if (a.time > b.time) return -1;
  return 0;
}

function deleteCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

async function search() {
  document.getElementById("follow").style.display = "block";
  document.getElementById("feed").style.display = "none";
  console.log("Searching");
  const all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  var rows = [];
  for (var i = 0; i < all.length; i++) {
    var body = JSON.parse(all[i]);
    rows.push(<FollowButton key={i} user={body.username} />);
  }
  ReactDOM.render(
    <ul id="searchUL"> {rows} </ul>,
    document.getElementById("follow")
  );
  var input, filter, ul, li, a;
  input = document.getElementById("searchText");
  filter = input.value.toUpperCase();
  ul = document.getElementById("searchUL");
  li = ul.getElementsByTagName("li");
  for (var i = 0; i < li.length; i++) {
    a = li[i].getElementsByTagName("a")[0];
    if (a.innerHTML.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}

function follow(username) {
  var follow;
  const alla = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  for (var i = 0; i < alla.length; i++) {
    var body = JSON.parse(alla[i]);
    if (body.username == username) {
      follow = body.publicKey;
    }
  }
  console.log("follow: " + follow);
  var publicKey = getCookie("publicKey");
  const all = profileDB
    .iterator({
      limit: -1
    })
    .collect()
    .map(e => e.payload.value);
  for (var i = 0; i < all.length; i++) {
    var body = JSON.parse(all[i]);
    if (body.publicKey == publicKey) {
      console.log(follow);
      node.files.get(body.hash, function(err, files) {
        files.forEach(file => {
          console.log(file.content.toString("utf8"));
          var profile = JSON.parse(file.content.toString("utf8"));
          profile.metadata.follow.push(follow);
          profile.hash = SHA256(
            profile.publicKey + profile.name + profile.metadata + profile.posts
          ).toString();
          var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(
            getCookie("privateKey")
          );
          var Sign = CryptoEdDSAUtil.signHash(keyPair, profile.hash);
          profile.sign = Sign;
          node.files.add(Buffer.from(JSON.stringify(profile)), (err, res) => {
            if (err || !res) {
              return console.error("ipfs add error", err, res);
            }

            res.forEach(file => {
              if (file && file.hash) {
                console.log("successfully stored", file.hash);
                publishProfile(publicKey, profile.name, file.hash);
              }
            });
          });
        });
      });
    }
  }
}

function signout() {
  deleteCookie("publicKey");
  document.getElementById("loginDiv").style.display = "block";
  document.getElementById("mainDiv").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("post").onclick = post;
  document.getElementById("updateFeed").onclick = updateFeed;
  document.getElementById("searchText").onkeyup = search;
  document.getElementById("validateLogin").onclick = validateLogin;
  document.getElementById("signout").onclick = signout;
});

class FollowButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: this.props.user
    };
  }
  render() {
    return (
      <li>
        <h4>
          {" "}
          <a href="#">{this.state.user}</a>{" "}
          <button
            className="followButton"
            onClick={() => follow(this.state.user)}>
            Follow{" "}
          </button>{" "}
        </h4>
      </li>
    );
  }
}

class TextPost extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: this.props.user,
      time: this.props.time,
      text: this.props.text
    };
  }
  render() {
    var liStyle = {
      borderStyle: "ridge"
    };
    return (
      <li style={liStyle}>
        <i> {this.props.user} </i>
        <small> {this.props.time} </small>
        <h4> {this.props.text} </h4>
      </li>
    );
  }
}
