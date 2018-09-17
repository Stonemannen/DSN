const CryptoEdDSAUtil = require('./cryptoEdDSAUtil');
const crypto = require('crypto');
const SHA256 = require("crypto-js/sha256");

if (getCookie("error") == "login") {
    const message = document.getElementById('message');
    const h6 = document.createElement('h6');
    const text = document.createTextNode('Failed to login');
    h6.appendChild(text);
    message.insertBefore(h6, message.childNodes[0]);
}

function login() {
    console.log(`login`)
    if (!checkPassword(document.getElementById('password').value)) {
        var message = document.getElementById('message');
        const h6 = document.createElement('h6');
        const text = document.createTextNode('Failed to login');
        h6.appendChild(text);
        message.insertBefore(h6, message.childNodes[0]);
    }
    var privateKey = CryptoEdDSAUtil.generateSecret(SHA256(document.getElementById('username').value + document.getElementById('password').value).toString());
    var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
    var publicKey = CryptoEdDSAUtil.toHex(keyPair.getPublic());
    setCookie("publicKey", publicKey, 30);
    setCookie("privateKey", privateKey, 30);
    setCookie("error", "")
}

function signup() {
    var username = document.getElementById('username').value
    var pwd1 = document.getElementById('password').value
    var pwd2 = document.getElementById('password2').value
    if (username == "") {
        return
    }
    if (!(pwd1 === pwd2)) {
        return
    }
    if (!checkPassword(pwd1)) {
        return
    }
    var privateKey = CryptoEdDSAUtil.generateSecret(SHA256(username + pwd1).toString());
    var keyPair = CryptoEdDSAUtil.generateKeyPairFromSecret(privateKey);
    var publicKey = CryptoEdDSAUtil.toHex(keyPair.getPublic());
    setCookie("publicKey", publicKey, 30);
    setCookie("privateKey", privateKey, 30);
    setCookie("createProfile", username);
    document.getElementById('indexx').click();
}

function checkPassword(str) {
    // at least one number, one lowercase and one uppercase letter
    // at least six characters
    var re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    return re.test(str);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('signup').onclick = signup;
    document.getElementById('login').onclick = login;
})

function deleteCookie( name ) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
