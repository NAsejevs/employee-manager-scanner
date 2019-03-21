const { NFC, CONNECT_MODE_DIRECT } = require("nfc-pcsc");
const axios = require("axios");

const serverURL = "http://192.168.8.123:8080/";

//const nfc = new NFC(console); // deep debug
const nfc = new NFC();

const requestConfig = {
	headers: {
		"Content-Type": "application/json"
	}
};

// LED
/*
+-----+----------------------------------+-------------------------------------+
| Bit |               Item               |             Description             |
+-----+----------------------------------+-------------------------------------+
|   0 | Final Red LED State              | 1 = On; 0 = Off                     |
|   1 | Final Green LED State            | 1 = On; 0 = Off                     |
|   2 | Red LED State Mask               | 1 = Update the State; 0 = No change |
|   3 | Green LED State Mask             | 1 = Update the State; 0 = No change |
|   4 | Initial Red LED Blinking State   | 1 = On; 0 = Off                     |
|   5 | Initial Green LED Blinking State | 1 = On; 0 = Off                     |
|   6 | Red LED Blinking Mask            | 1 = Blink; 0 = Not Blink            |
|   7 | Green LED Blinking Mask          | 1 = Blink; 0 = Not Blink            |
+-----+----------------------------------+-------------------------------------+
10001000
*/

// BLINKING
// Data In: Blinking Duration Control (4 bytes)
// Byte 0: T1 Duration Initial Blinking State (Unit = 100 ms)
// Byte 1: T2 Duration Toggle Blinking State (Unit = 100 ms)
// Byte 2: Number of repetition
// Byte 3: Link to Buzzer
// - 00: The buzzer will not turn on
// - 01: The buzzer will turn on during the T1 Duration
// - 02: The buzzer will turn on during the T2 Duration
// - 03: The buzzer will turn on during the T1 and T2 DuratioN

nfc.on("reader", async reader => {
	reader.aid = "F222222222";

	try {
		await reader.connect(CONNECT_MODE_DIRECT);
		await reader.setBuzzerOutput(false);
		await reader.disconnect();
	} catch(e) {
		console.log("reader connection error: ", e);
	}

	reader.on("card", card => {
		console.log("card read");

		const waitingLEDBits = 0b10001000;

		reader.led(waitingLEDBits, [0x05, 0x00, 0x01, 0x00]).then(() => {
			console.log("led turned red");
		}).catch((e) => {
			console.log("led error: ", e);
		});
		const waitingInterval = setInterval(() => {
			reader.led(waitingLEDBits, [0x05, 0x00, 0x01, 0x00]).then(() => {
				console.log("led turned red");
			}).catch((e) => {
				console.log("led error: ", e);
			});
		}, 500);

		const uid = card.uid;

		axios.post(serverURL + "cardScanned", {
			uid,
		}, requestConfig).then((res) => {
			console.log("success!");
			clearInterval(waitingInterval);
		}).catch((e) => {
			console.log("axios error: ", e);
		});
	});

	reader.on("card.off", card => {
		console.log("card removed");
	});

	reader.on("error", err => {
		console.log("error: ", err);
	});

	reader.on("end", () => {
		console.log("reader removed");
		reader.disconnect();
	});
});
 
nfc.on("error", err => {
	console.log("error: ", err);
});