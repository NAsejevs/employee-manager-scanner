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

	// 0x50 | 0x04 | 0x05 | 0x0A | 0x02 | 0x00

	// LED
	// 0 101 1101

	// P2: LED State Control (1 byte = 8 bits)
	// format:
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
	// - 03: The buzzer will turn on during the T1 and T2 Duration

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
	console.log("device attached");
		reader.on('card', async card => {

			try {
				await reader.led(0b01011101, [0x02, 0x01, 0x05, 0x01]);
			} catch (err) {
				console.log("LED ERROR: ", err);
			}


			const uid = card.uid;

			axios.post(serverURL + "cardScanned", {
				uid,
			}, requestConfig).then((res) => {
				console.log("success!: ", res.data);
			}).catch((e) => {
				console.log("axios error: ", e);
			});
		});
 
		reader.on('card.off', async card => {
			console.log("card removed!");

			try {
				await reader.led(0b01011101, [0x02, 0x01, 0x05, 0x01]);
			} catch (err) {
				console.log("LED ERROR: ", err);
			}
		});
 
		reader.on('error', err => {
			console.log("ERROR: ", err);
		});
 
		reader.on('end', () => {
			console.log("device removed");
		});
 
});
 
nfc.on('error', err => {
	// Error
	console.log("ERROR: ", err);
});