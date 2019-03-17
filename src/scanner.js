const { NFC, CONNECT_MODE_DIRECT } = require("nfc-pcsc");
const axios = require("axios");

const serverURL = "http://192.168.8.123:8080/";

const nfc = new NFC();

const requestConfig = {
	headers: {
		"Content-Type": "application/json"
	}
};

// reader.led(led, blinking)


	// BLINKING:
	// [0x05, 0x05, 0x02, 0x03]

	// Data In: Blinking Duration Control (4 bytes)
	// Byte 0: T1 Duration Initial Blinking State (Unit = 100 ms)
	// Byte 1: T2 Duration Toggle Blinking State (Unit = 100 ms)
	// Byte 2: Number of repetition
	// Byte 3: Link to Buzzer
	// - 00: The buzzer will not turn on
	// - 01: The buzzer will turn on during the T1 Duration
	// - 02: The buzzer will turn on during the T2 Duration
	// - 03: The buzzer will turn on during the T1 and T2 Duration

nfc.on('reader', reader => {
	reader.aid = "F222222222";

	reader.connect(CONNECT_MODE_DIRECT).then(() => {
		reader.setBuzzerOutput(false);
		//reader.led(0b01011101, [0x00, 0x00, 0x00, 0x03]);
		//reader.disconnect();
	});

	// Device attached
	console.log("device attached");
		reader.on('card', card => {

			
			reader.led(0b01011101, [0x05, 0x05, 0x02, 0x03]).catch((err) => {
				console.log("LED ERROR: ", err);
			})


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