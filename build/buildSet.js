"use strict";
/*global setImmediate: true*/

var base = require("xbase"),
	C = require("C"),
	fs = require("fs"),
	path = require("path"),
	shared = require("shared"),
	tiptoe = require("tiptoe"),
	rip = require("./rip.js");

var setsToDo = shared.getSetsToDo();

setsToDo.removeAll(C.SETS_NOT_ON_GATHERER.concat(shared.getMCISetCodes()));

base.info("Doing sets: %s", setsToDo);



rip.cacheMultiverseIds(processSets);

function processSets(){
	setsToDo.serialForEach(function(arg, subcb)
	{

		var targetSet = C.SETS.mutateOnce(function(SET) { if(SET.name.toLowerCase()===arg.toLowerCase() || SET.code.toLowerCase()===arg.toLowerCase()) { return SET; } });

		if(!targetSet)
		{
			base.error("Set %s not found!", arg);
			return setImmediate(subcb);
		}

		if(targetSet.isMCISet)
		{
			base.error("Set %s is an MCI set, use importMCISet.js instead.", arg);
			return setImmediate(subcb);
		}

		tiptoe(
			function build()
			{
				rip.ripSet(targetSet, this);
			},
			function save(set)
			{
				shared.saveSet(set, this);
			},
			function finish(err)
			{
				subcb(err);
			}
		);
	}, function exit(err)
	{
		base.info("Don't forget to execute 'node buildExtra.js FD' after that");

		if(err)
				{
					base.error(err);
					process.exit(1);
				}

				process.exit(0)



	});
}
