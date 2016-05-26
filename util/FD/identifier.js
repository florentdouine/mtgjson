exports.identifyMkmLogs = function(username) {

	// var identifier = new Array(); // bad
	// JavaScript does not support associative arrays.
	// You should use objects when you want the element names to be strings (text).
	// You should use arrays when you want the element names to be numbers.

	if(username == "Nearmint") {
		return { appToken			:	"wsZODRSx9Jp1TNV6",
			appSecret		:	"1rVRshb7hiifiNE9fTZN1EoJBWCFAp4v",
			accessToken	:	"AWJTw35TAEUSpOEyBCKKae2dthO3n31C",
			accessSecret	:	"6yw3mxByg0kyfACJukEpz8vFMGhgMKIP" };
	}
	// NEBELWELKINS by default

	else {
		return { appToken			:	"bdBjcbqYk4ImZ1AE",
			appSecret		:	"I3SifBWCvkqS8bPjXGhTEizBJMhON8h5",
			accessToken	:	"5HqrwHlsP9YVtNYkAW90GKXBvwQ2Tkqx",
			accessSecret	:	"Q9Dlmbhi9Tp0UmnMjSmJuVSzaVa2DTz4" };
	}


};
