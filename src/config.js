module.exports.production = false;

module.exports.serverURL = exports.production
	? "http://192.168.1.150:8080/"
	: "http://localhost:8080/";