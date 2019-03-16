const { NFC, CONNECT_MODE_DIRECT } = require("nfc-pcsc");
const axios = require("axios");

const serverURL = "http://192.168.8.123:8080/";

const nfc = new NFC();

const requestConfig = {
	headers: {
		"Content-Type": "application/json"
	}
};
 
nfc.on('reader', reader => {
	reader.aid = "F222222222";

	reader.connect(CONNECT_MODE_DIRECT).then(() => {
		reader.setBuzzerOutput(false);
	});

	// Device attached
	console.log(`${reader.reader.name}  device attached`);
 
		reader.on('card', card => {
			// Card has been read
			console.log(`${reader.reader.name}  card detected`, card);

			const uid = reader.card.uid;

			axios.post(serverURL + "cardScanned", {
				uid,
			}, requestConfig).then((res) => {
				console.log("success!: ", res.data);
				reader.setBuzzerOutput(true);
			}).catch((e) => {
				console.log("axios error: ", e);
			});
		});
 
		reader.on('card.off', card => {
			// Card has been removed
			console.log(`${reader.reader.name}  card removed`, card);
			reader.setBuzzerOutput(false);
		});
 
		reader.on('error', err => {
			// Error
			console.log(`${reader.reader.name}  an error occurred`, err);
		});
 
		reader.on('end', () => {
			// Device removed
			console.log(`${reader.reader.name}  device removed`);
			reader.disconnect();
		});
 
});
 
nfc.on('error', err => {
	// Error
	console.log('an error occurred', err);
});