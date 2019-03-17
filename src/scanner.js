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

// reader.led(led, blinking)

	// 0x50 | 0x04 | 0x05 | 0x0A | 0x02 | 0x00

	// LED
	// 0 101 1101

	// P2: LED State Control (1 byte = 8 bits)
	// format:
	/*

	0b 0101 1101

	0000 1010

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
		*/


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
	// - 03: The buzzer will turn on during the T1 and T2 DuratioN

nfc.on('reader', reader => {
	reader.aid = "F222222222";

	reader.connect(CONNECT_MODE_DIRECT).then(() => {
		reader.setBuzzerOutput(false);
		reader.disconnect();
	});

	// reader.connect().catch((e) => {
	// 	console.log("my connection error", e);
	// });

	console.log("reader connected");

	setTimeout(() => {
		reader.led(0b10101110, [0x05, 0x05, 0x01, 0x00]).catch((e) => {
			console.log("LED ERROR: ", e);
		});
	}, 1000);

	reader.on('detection', () => {
		console.log("detected");
	});

	reader.on('card', card => {
		// handle_Iso_14443_3_Tag


		console.log("card event!");
		reader.led(0b01011001, [0x05, 0x00, 0x01, 0x00]).then(() => {
			console.log("led turned red");
		}).catch((e) => {
			console.log("LED ERROR: ", e);
		});

		const uid = card.uid;
		//const uid = 0;

		axios.post(serverURL + "cardScanned", {
			uid,
		}, requestConfig).then((res) => {
			console.log("server responded with: ", res.data);
		}).catch((e) => {
			console.log("AXIOS ERROR: ", e);
		});
	});

	reader.on('card.off', card => {
		console.log("card removed");
	});

	reader.on('error', err => {
		console.log("ERROR: ", err);
	});

	reader.on('end', () => {
		console.log("reader removed");
		reader.disconnect();
	});
});
 
nfc.on('error', err => {
	console.log("ERROR: ", err);
});