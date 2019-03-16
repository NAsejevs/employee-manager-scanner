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
		reader.setBuzzerOutput(true);
		reader.led(0b01011101, [0xFF, 0x00, 0x40, 0x50, 0x04, 0x05, 0x0A, 0x02, 0x00]);
	});

	// Device attached
	console.log("device attached");
 
		reader.on('card', card => {
			const uid = card.uid;

			axios.post(serverURL + "cardScanned", {
				uid,
			}, requestConfig).then((res) => {
				console.log("success!: ", res.data);
			}).catch((e) => {
				console.log("axios error: ", e);
			});
		});
 
		reader.on('card.off', card => {
			console.log("card removed!");
		});
 
		reader.on('error', err => {
			console.log("ERROR: ", err);
		});
 
		reader.on('end', () => {
			console.log("device removed");
			reader.disconnect();
		});
 
});
 
nfc.on('error', err => {
	// Error
	console.log("ERROR: ", err);
});