// import du module de création d'id unique
var uniqid = require('uniqid');
// import du module de hash
var crypto = require('crypto');
// import du module de gestion de la base 64
var btoa = require('btoa');
// import de la fonction de création de identifiants
var identifier = require('./identifier');

// we get MKM logs (Chris by default)
var mkm = identifier.identifyMkmLogs();

// creation de l'id unique
var nonce              = uniqid();
// creéation du timestamp
var timestamp          = Math.floor(new Date() / 1000);


exports.getOauth = function getOauth(url, path, method){

        var nonce              = uniqid();
        var timestamp          = Math.floor(new Date() / 1000);
        var signatureMethod    = "HMAC-SHA1";
        var version            = "1.0";


     /* Gather all parameters that need to be included in the Authorization header and are know yet
      @var $params array|string[] Associative array of all needed authorization header parameters */
     var paramsForHeader = {};
     paramsForHeader["realm"]   					= "https://" + url + path,
         paramsForHeader["oauth_consumer_key"]		= mkm.appToken,
         paramsForHeader["oauth_token"]				= mkm.accessToken,
         paramsForHeader["oauth_nonce"]				= nonce,
         paramsForHeader["oauth_timestamp"]			= timestamp,
         paramsForHeader["oauth_signature_method"]	= signatureMethod,
         paramsForHeader["oauth_version"]			= version
     ;

     var params = {};
     params["oauth_consumer_key"] 		= mkm.appToken,
         params["oauth_nonce"]               = nonce,
         params["oauth_signature_method"]    = signatureMethod,
         params["oauth_timestamp"]           = timestamp,
         params["oauth_token"] 				= mkm.accessToken,
         params["oauth_version"]             = version
     ;

     var encodedParams      = "";

     for(var key in params)
         if (key != "oauth_version") {
             encodedParams += key + "=" + params[key] + "&";
         }else
             encodedParams += key + "=" + params[key];

     var baseString = method+"&"+encodeURIComponent(paramsForHeader["realm"])+"&"+encodeURIComponent(encodedParams);

     var signatureKey = encodeURIComponent(mkm.appSecret)+"&"+encodeURIComponent(mkm.accessSecret);

     var hmac = crypto.createHmac('sha1', signatureKey);

     // change to 'binary' if you want a binary digest
     hmac.setEncoding('binary');

     // write in the text that you want the hmac digest for
     hmac.write(baseString);

     // you can't read from the stream until you call end()
     hmac.end();

     // read out hmac digest
     hash = hmac.read();

     var oAuthSignature = btoa(hash);
     /* Include the OAuth signature parameter in the header parameters array */
     paramsForHeader['oauth_signature'] = oAuthSignature;

     /* Construct the header string */
     var headerParams = "";
     for(var key in paramsForHeader)
         if (key != "oauth_signature") {
             headerParams += key + "=\"" + paramsForHeader[key] + "\", ";
         }else
             headerParams += key + "=\"" + paramsForHeader[key] + "\"";


     var header = "OAuth " + headerParams;


    var options = {
        url: "https://"+url+path,
        method : method,
        headers : {
            Authorization: header
        }
        //agent : false
    };

    return options;
};

