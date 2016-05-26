"use strict";
/*global setImmediate: true*/

var base = require("xbase"),
    C = require("C"),
    fs = require("fs"),
    shared = require("shared"),
    path = require("path"),
    tiptoe = require("tiptoe"),
    request = require("request");



var tested =[];

shared.getSetsToDo().serialForEach(processSet, function(err)
{
    console.log(tested.length +" cards tested");
    if(err)
    {
        base.error(err);
        process.exit(1);
    }

    process.exit(0);
});

function processSet(code, cb)
{
    var set;
    tiptoe(
        function getJSON()
        {
            fs.readFile(path.join(__dirname, "..", "jsonFD", code + ".json"), {encoding : "utf8"}, this);
        },
        function processCards(setRaw) {
            set = JSON.parse(setRaw);
            this();
        },
        function testTranslations(){
            var souldContainsFRLanguage = set.languages.filter(function(language){
                return language=="French";
            }).length>0;

            set.cards.forEach(function(card){
                tested.push(card);

                if(card.name==null){
                    console.log("No name found for card "+card.number+" ("+set.code+")");
                    return;
                }

                if(card.type==null){
                    console.log("No type found for card "+card.name+" ("+set.code+")");
                    return;
                }

                if(souldContainsFRLanguage) {
                    if(card.foreignNames==null){
                        console.log("No foreignNames found for card "+card.name+" ("+set.code+")");
                        return;
                    }
                    var frenchTranslation = card.foreignNames.filter(function(translation){
                       return translation.language=="fr";
                    });

                    if(frenchTranslation.length==0){
                        console.log("No french translation found for card "+card.name);
                        return;
                    }
                    if(frenchTranslation.length>1){
                        console.log("Many french translation found for card "+card.name);
                        return;
                    }
                    if(!isUTF8(frenchTranslation[0].name)) {
                        console.log("UTF 8 error for french translation : "+frenchTranslation[0].name+" ("+set.code+")");
                    }
                    if(!isUTF8(frenchTranslation[0].type)) {
                        console.log("UTF 8 error for french type translation : "+frenchTranslation[0].type+" ("+card.name+")");
                    }

                    if(frenchTranslation[0].name==null || frenchTranslation[0].name=="") {
                        console.log("French name missing for card "+card.name);
                        return;
                    }

                    if(frenchTranslation[0].type==null || frenchTranslation[0].type=="") {
                        console.log("French type missing for card "+card.name);
                        return;
                    }

                    if(frenchTranslation[0].type == card.type){
                        console.log("French type identical to english type, please check type "+card.type+" of card "+card.name);
                        return;
                    }


                }
            });
            this()
        },

        function testTypes(){
            set.cards.forEach(function(card)
            {
                if(!card.types || card.types.length==0){
                    console.log("No types found for card: "+ card.name+ " in set "+set.code);
                    return;
                }
                card.types.forEach(function(type) {
                    if (C.TYPES.indexOf(type) == -1) {
                        console.log("Type " + type + " not found in static list");
                        return;
                    }
                    if(C.TYPES_TRANSLATIONS[type]==null || C.TYPES_TRANSLATIONS[type].fr==null || C.TYPES_TRANSLATIONS[type].fr==""){
                        console.log("No translations found for type " + type + "");
                        return;
                    }

                });

                if(card.supertypes){
                    card.supertypes.forEach(function(type) {
                        if (C.SUPERTYPES.indexOf(type) == -1) {
                            console.log("Supertype " + type + " not found in static list");
                            return;
                        }
                        if(C.SUPERTYPES_TRANSLATIONS[type]==null || C.SUPERTYPES_TRANSLATIONS[type].fr==null || C.SUPERTYPES_TRANSLATIONS[type].fr==""){
                            console.log("No translations found for supertype " + type + "");
                            return;
                        }
                    });
                }

                if(card.subtypes){
                    card.subtypes.forEach(function(type) {
                        if (C.SUBTYPES_TRANSLATIONS[type] == null) {
                            console.log("Subtype " + type + " not found in static list for card: "+ card.name+ " in set "+set.code);
                            return;
                        }
                        if(C.SUBTYPES_TRANSLATIONS[type]==null || C.SUBTYPES_TRANSLATIONS[type].fr==null || C.SUBTYPES_TRANSLATIONS[type].fr==""){
                            console.log("No translations found for subtype " + type + "");
                            return;
                        }
                    });
                }

            });
            this();
        },

        function testInfoPresence(){

            set.cards.forEach(function(card)
            {
                if(!card.hasOwnProperty("images") || !card.images.hasOwnProperty("en"))
                    console.log("Images not found for card: "+ card.name+ " in set "+set.code);
                if(!card.hasOwnProperty("cmc"))
                    console.log("CMC not found for card: "+ card.name+ " in set "+set.code);
                if(!card.hasOwnProperty("colors")){
                    console.log("Colors not found for card: "+ card.name+ " in set "+set.code);
                }else if(Array.isArray(card.colors)){
                    console.log("Colors is an array for card: "+ card.name+ " in set "+set.code);
                }
                if(!card.mkm_product_id){
                    console.log("MKM Product id not found for card: "+ card.name+ " in set "+set.code);
                }
                if(!card.rarity)
                    console.log("Rarity not found for card: "+ card.name+ " in set "+set.code);
                if(!card.artist)
                    console.log("Artist not found for card: "+ card.name+ " in set "+set.code);
                if(!card.number)
                    base.warn("Number not found for card: %s", card.name+ " in set "+set.code);
                if(!card.numberSpecial)
                    base.warn("NumberSpecial not found for card: %s", card.name+ " in set "+set.code);
                if(!card.multiverseid && card.layout!="token")
                    base.warn("Multiverseid not found for card: %s", card.name+ " in set "+set.code);
            });
            this();
        },

        function testIDUnique(){

            var ids=[];
            set.cards.forEach(function(card)
            {
                if(ids.indexOf(card.numberSpecial)>-1){
                    console.log("ERROR: duplicates id "+card.numberSpecial+" in set "+set.code);
                }
                ids.push(card.numberSpecial);
            });
            this();
        },

        function testPrintingsAndVariations(){

            set.cards.forEach(function(card)
            {
                if(card.printings){
                    if(!Array.isArray(card.printings)){
                        console.log("ERROR: printings of card: %s", card.name+ " in set "+set.code+" is not an array : "+card.printings);
                    }
                    card.printings.forEach(function(printing){
                       if(typeof printing!="string" || printing.indexOf("_")==-1 || printing.indexOf("_to")>-1){
                           console.log("ERROR: printing of card: %s", card.name+ " in set "+set.code+" has incorrect value of "+printing);
                       }
                    });
                }

                if(card.variations){
                    if(!Array.isArray(card.variations)){
                        console.log("ERROR: variations of card: %s", card.name+ " in set "+set.code+" is not an array : "+card.variations);
                    }
                    card.variations.forEach(function(variation){
                        if(typeof variation!="string" || variation.indexOf("_")==-1 || variation.indexOf("_to")>-1){
                            console.log("ERROR: variation of card: %s", card.name+ " in set "+set.code+" has incorrect value of "+variation);
                        }
                    });
                }

            });
            console.log(set.code+" successfully test");
            this();
        },

        function finish(err)
        {
            setImmediate(function() { cb(err); });
        }
    );

}

function isUTF8(string){

    var rePattern = new RegExp(/[Ã©]+/);
    return string.match(rePattern) == null;
}
