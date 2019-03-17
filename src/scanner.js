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
		//reader.led(0b01011101, [0x00, 0x00, 0x00, 0x03]);
		reader.led(0b01011101, [0x02, 0x01, 0x03, 0x01]).catch((err) => {
			console.log("LED ERROR: ", err);
		})
		//reader.disconnect();
	});

	// Device attached
	console.log("device attached");
		reader.on('card', card => {
			//reader.led(0b01011101, [0x00, 0x00, 0x00, 0x03]);
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