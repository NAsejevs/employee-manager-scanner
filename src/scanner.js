const { NFC} = require("nfc-pcsc");
const axios = require("axios");

const serverURL = "http://192.168.8.123:8080/";

const nfc = new NFC();

const requestConfig = {
	headers: {
		"Content-Type": "application/json"
	}
};
 
nfc.on('reader', async reader => {
	reader.aid = "F222222222";

	try {
		await reader.connect(CONNECT_MODE_DIRECT);
		await reader.setBuzzerOutput(false);
		await reader.disconnect();
	} catch (err) {
		console.log(err);
	}

	// Device attached
	console.log(`${reader.reader.name}  device attached`);
 
		reader.on('card', card => {
		// Card has been read
		console.log(`${reader.reader.name}  card detected`, card);

		const uid = reader.card.uid;

		axios.post(serverURL + "cardScanned", {
			uid,
		}, requestConfig)
			.catch((e) => {
				console.log("axios error: ", e);
			})
		});
 
		reader.on('card.off', card => {
		// Card has been removed
				console.log(`${reader.reader.name}  card removed`, card);
		});
 
		reader.on('error', err => {
		// Error
				console.log(`${reader.reader.name}  an error occurred`, err);
		});
 
		reader.on('end', () => {
		// Device removed
				console.log(`${reader.reader.name}  device removed`);
		});
 
});
 
nfc.on('error', err => {
	// Error
		console.log('an error occurred', err);
});