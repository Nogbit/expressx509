var sys     = require('sys');
var exec    = require('child_process').exec;
var fs      = require('fs');
var https   = require('https');
var request = require('request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

commands = [
 'openssl req -new -x509 -days 9999 -config input/ca.cnf -keyout output/ca-key.pem -out output/ca-crt.pem',

 'openssl genrsa -out output/server-key.pem 4096',

 'openssl req -new -config input/ca.cnf -key output/server-key.pem -out output/server-csr.pem',

 'openssl x509 -req -extfile input/ca.cnf -days 999 -passin "pass:password" -in output/server-csr.pem -CA output/ca-crt.pem -CAkey output/ca-key.pem -CAcreateserial -out output/server-crt.pem',

 'openssl genrsa -out output/client-key.pem 4096',

 'openssl req -new -config input/client.cnf -key output/client-key.pem -out output/client-csr.pem',

 'openssl x509 -req -extfile input/client.cnf -days 999 -passin "pass:password" -in output/client-csr.pem -CA output/ca-crt.pem -CAkey output/ca-key.pem -CAcreateserial -out output/client-crt.pem',

 'openssl verify -CAfile output/ca-crt.pem output/client-crt.pem'
];

// Create our certificate authority
exec(commands[0], function (err, stdout, stderr) {
  // Create server private key
  exec(commands[1], function (err, stdout, stderr) {
    // Create a CSR
    exec(commands[2], function (err, stdout, stderr) {
      // Sing the request
      exec(commands[3], function (err, stdout, stderr) {

        // create client private key
        exec(commands[4], function (err, stdout, stderr) {
          // create the CSR
          exec(commands[5], function (err, stdout, stderr) {
            // sign the request...using the same CA
            exec(commands[6], function (err, stdout, stderr) {
              // verify
              exec(commands[7], function (err, stdout, stderr) {

                if (stdout !== 'output/client-crt.pem: OK\n') {
                  throw new Error('certs were not created correctly');
                }

                goGetIt();
              });
            });
          });
        });
      });
    });
  });
});

var goGetIt = function makeRequest() {

  console.log('starting server on https://localhost:4433');

  var options = {
    key: fs.readFileSync('output/server-key.pem'),
    cert: fs.readFileSync('output/server-crt.pem'),
    ca: fs.readFileSync('output/ca-crt.pem'),
    requestCert: true,
    rejectUnauthorized: true
  };

  https.createServer(options, function (req, res) {
    console.log(new Date()+' '+
      req.connection.remoteAddress+' '+
      req.socket.getPeerCertificate().subject.CN+' '+
      req.method+' '+req.url);
    res.writeHead(200);
    res.end("hello world\n");
  }).listen(4433);


  //now make a request to the server
  var reqOptions = {
    hostname: 'localhost',
    port: 4433,
    path: '/',
    method: 'GET',
    key: fs.readFileSync('output/client-key.pem'),
    cert: fs.readFileSync('output/client-crt.pem'),
    ca: fs.readFileSync('output/ca-crt.pem')
  };

  var req = https.request(reqOptions, function(res) {
    res.on('data', function(data) {
      process.stdout.write(data);
     });
  });

  req.end();

  req.on('error', function(e) {
    console.error(e);
  });
};
