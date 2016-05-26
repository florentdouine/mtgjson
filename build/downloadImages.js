"use strict";
/*global setImmediate: true*/

var base = require("xbase"),
	C = require("C"),
	fs = require("fs"),
	shared = require("shared"),
	path = require("path"),
	tiptoe = require("tiptoe"),
	request = require("request");



var IMAGE_FOLDER = "../images/";

if (!fs.existsSync(IMAGE_FOLDER)){
	fs.mkdirSync(IMAGE_FOLDER);
}

shared.getSetsToDo().serialForEach(processSet, function(err)
{
	if(err)
	{
		base.error(err);
		process.exit(1);
	}

	process.exit(0);
});

function processSet(code, cb)
{
	base.info("Downloading images for set: %s", code);
	var set;
	tiptoe(
		function getJSON()
		{
			fs.readFile(path.join(__dirname, "..", "jsonFD", code + ".json"), {encoding : "utf8"}, this);
		},
		function processCards(setRaw)
		{
			set = JSON.parse(setRaw);

			var next = this;
			downloadSet(set, function(){
				console.log(set.code+" images successfully downloaded");
				next();
			});

		},
		function saveInCards()
		{
			set.cards.forEach(function(card){
				card.images = {};
				["en", "fr"].forEach(function(langCode) {
					var relativePath = "/"+set.code.toLowerCase() + "/" + langCode + "/" + card.numberSpecial + ".jpg";
					var localPath = IMAGE_FOLDER + relativePath;
					if(shared.isValidCardImage(localPath)){
						card.images[langCode] = relativePath;
					}
				});
			});

			this();
		},
		function save() {
			shared.saveSet(set, cb);
		},
		function finish(err)
		{
			setImmediate(function() { cb(err); });
		}
	);
}

function downloadSet(set, cb){

	var SET_FOLDER = IMAGE_FOLDER+set.code.toLowerCase()+"/";
	if (!fs.existsSync(SET_FOLDER)){
		fs.mkdirSync(SET_FOLDER);
	}

	var allLanguages = [{code:"en", name:"English"}, {code:"fr", name:"French"}];
	if(!set.languages || set.languages.indexOf("French")==-1) allLanguages.pop();

	tiptoe(
		function downloadAllLanguages() {
			var self = this;
			allLanguages.forEach(function (lang) {
				downloadLanguage(set, lang, self.parallel());
			});

		},
		function(){
			console.log("Finish all languages");
			cb();
		}
	);



}

function downloadLanguage(set, lang, cb){


	var langCode = lang.code;

	var LANG_FOLDER = IMAGE_FOLDER+set.code+"/"+langCode+"/";
	if (!fs.existsSync(LANG_FOLDER)){
		fs.mkdirSync(LANG_FOLDER);
	}

	tiptoe(
		function downloadAllCards() {
			this.capture();
			var self = this;
			set.cards.forEach(function(card){
				downloadCard(set, card, lang, self.parallel());
			});
		},
		function cleanFolder(arg1, arg2){
			console.log("Clean folder "+langCode);
			var self = this;
			fs.readdir(LANG_FOLDER, function(err, items) {
				for (var i=0; i<items.length; i++) {
					var cardPath = (items[i]);
					if(!shared.isValidCardImage(LANG_FOLDER+cardPath, cardPath.indexOf("fr/")>-1) ||
						(cardPath.indexOf("temp.")>-1)){
						shared.removeFile(LANG_FOLDER+cardPath);
					}
				}
				self();
			});
		},
		function finishLanguage(){
			console.log("Finish all cards "+langCode);
			cb();
		}
	);
}

function downloadCard(set, card, lang, cb) {

	var urlObject = getURLsForCard(set, card, lang);
	if(urlObject==null ||
		!urlObject.hasOwnProperty("localPath") ||
		!urlObject.hasOwnProperty("remoteURLs")||
		urlObject.remoteURLs.length==0)
	{ cb(); return; }

	if(shared.isValidCardImage(urlObject.localPath)){
		cb();
		return;
	}
	/*tiptoe(
		function downloadMainURL(){
			downloadImage(urlObject.remoteURLs[0], urlObject.localPath, cb);
		},
		function finish(err)
		{
			setImmediate(function() { cb(err); });
		}
	);*/

	downloadImage(urlObject.remoteURLs[0], urlObject.localPath, function(err){
		if(!err || urlObject.remoteURLs.length==1) {
			cb();
			return;
		}

		downloadImage(urlObject.remoteURLs[1], urlObject.localPath, function(err) {
			cb();
		});
	});

}

function getURLsForCard(set, card, lang){
	var urlObject = {};

	var langCode = lang.code;

	if(!card.numberSpecial || !card.number){
		console.log("No number for card : ("+langCode+")");
		return null;
	}

	urlObject.localPath =  IMAGE_FOLDER+set.code+"/"+langCode+"/" + card.numberSpecial+".jpg";



	if(card.layout=="token") {
		if(langCode!="en") return null;
		urlObject.remoteURLs = [card.mkm_url, card.mtg_onl_url];
		return urlObject;
	}



	urlObject.remoteURLs = ['http://magiccards.info/scans/'+langCode+'/'+set.magicCardsInfoCode+'/'+card.number+'.jpg'];
	var multiverseId = getMultiverseIdForCard(card, lang);
	if(multiverseId){
		urlObject.remoteURLs.push('http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid='+multiverseId+'&type=card');
	}

	return urlObject;
}


function downloadImage(remoteURL, localPath, cb, retry){

	var tempLocalPath = localPath.replaceAll(".jpg", "temp.jpg");
	request
		.get(remoteURL, function(){
			if(shared.isValidCardImage(tempLocalPath)){
				fs.rename(tempLocalPath, localPath);
				cb();
				return;
			}
			if(shared.fileExist(tempLocalPath)){
				shared.removeFile(tempLocalPath);
			}
			cb("Error for url "+remoteURL);
		})
		.on('error', function(err) {
			if(!retry) retry = 1;
			if(retry<3) {
				retry++;
				console.log("Error on url "+remoteURL+" try again "+retry);
				downloadImage(remoteURL, localPath, cb, retry);
				return;
			}

			if(shared.fileExist(tempLocalPath)){
				shared.removeFile(tempLocalPath);
			}
			cb("Error on url "+remoteURL+" after "+retry+" retry, err: "+err);


		})
		.pipe(fs.createWriteStream(tempLocalPath.toLowerCase()))

}

function getMultiverseIdForCard(card, language){

	if(language.code=="en"){
		if(card.multiverseid==null){
			console.log("No multiverseid for card "+card.name);
			return null;
		}
		return card.multiverseid;
	}

	if(card.foreignNames==null){
		console.log("No foreignNames for card "+card.name);
		return null;
	}

	var frName = card.foreignNames.filter(function(foreignName){
		return foreignName.language==language.name;
	});
	if(frName.length==0){
		return null;
	}

	return frName[0].multiverseid;
}
