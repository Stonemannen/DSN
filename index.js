console.log("Hello World");
// Create the IPFS node instance
const node = new Ipfs()

node.on('ready', () => {
    // Your node is now ready to use \o/
    console.log("ready");
    node.files.add(new node.types.Buffer('My Name Is Nonzi'), (err, filesAdded) => {
        if (err) {
          return console.error('Error - ipfs add', err, res);
        }
  
        filesAdded.forEach((file) => console.log('successfully stored', file.hash));
    });
    // stopping a node
    node.stop(() => {
    // node is now 'offline'

    });
});
