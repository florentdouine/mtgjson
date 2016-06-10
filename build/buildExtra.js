"use strict";
/*global setImmediate: true*/

var base = require("xbase"),
	C = require("C"),
	fs = require("fs"),
	path = require("path"),
	shared = require("shared"),
	tiptoe = require("tiptoe"),
	rip = require("./rip.js");

var errors = 0;

shared.getSetsToDo().serialForEach(processSet, function(err)
{
	if(errors>0)
	{
		base.error("Création du fichier impossible : "+errors+" erreurs trouvées");
		process.exit(1);
	}


	saveExtraFile(function(filePath){
		base.info("Création du fichier "+filePath+" réussi");

		process.exit(0);
	});

});

function processSet(code, cb)
{
	var set;
	tiptoe(
		function getJSON()
		{
			fs.readFile(path.join(__dirname, "..", "json", code + ".json"), {encoding : "utf8"}, this);
		},
		function processCards(setRaw) {
			set = JSON.parse(setRaw);
			this();
		},
		function testTypes(){
			set.cards.forEach(function(card)
			{
				if(!card.types || card.types.length==0){
					console.log("No types found for card: "+ card.name+ " in set "+set.code);
					errors++;
					return;
				}
				card.types.forEach(function(type) {
					if (C.TYPES.indexOf(type) == -1) {
						console.log("Type " + type + " not found in static list");
						errors++;
						return;
					}
					if(C.TYPES_TRANSLATIONS[type]==null || C.TYPES_TRANSLATIONS[type].fr==null || C.TYPES_TRANSLATIONS[type].fr==""){
						console.log("No translations found for type " + type + "");
						errors++;
						return;
					}

				});

				if(card.supertypes){
					card.supertypes.forEach(function(type) {
						if (C.SUPERTYPES.indexOf(type) == -1) {
							console.log("Supertype " + type + " not found in static list");
							errors++;
							return;
						}
						if(C.SUPERTYPES_TRANSLATIONS[type]==null || C.SUPERTYPES_TRANSLATIONS[type].fr==null || C.SUPERTYPES_TRANSLATIONS[type].fr==""){
							console.log("No translations found for supertype " + type + "");
							errors++;
							return;
						}
					});
				}

				if(card.subtypes){
					card.subtypes.forEach(function(type) {
						if (C.SUBTYPES_TRANSLATIONS[type] == null) {
							console.log("Subtype " + type + " not found in static list for card: "+ card.name+ " in set "+set.code);
							errors++;
							return;
						}
						if(C.SUBTYPES_TRANSLATIONS[type]==null || C.SUBTYPES_TRANSLATIONS[type].fr==null || C.SUBTYPES_TRANSLATIONS[type].fr==""){
							console.log("No translations found for subtype " + type + "");
							errors++;
							return;
						}
					});
				}

			});
			this();
		},

		function finish(err)
		{
			cb(err);
		}
	);

}

function saveExtraFile(cb){
	var EXTRA_FOLDER = "../jsonFD/extras/";
	if (!fs.existsSync(EXTRA_FOLDER)){
		fs.mkdirSync(EXTRA_FOLDER);
	}

	var typeObject = {};
	typeObject.types = C.TYPES_TRANSLATIONS;
	typeObject.supertypes = C.SUPERTYPES_TRANSLATIONS;
	typeObject.subtypes = C.SUBTYPES_TRANSLATIONS;

	var filePath = EXTRA_FOLDER+"types.json";
	fs.writeFile(filePath, JSON.stringify(typeObject, null, '  '), {encoding:"utf8"}, function(){
		cb(filePath);
	});

}
