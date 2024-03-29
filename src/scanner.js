const express = require("express");
const app = express();
const { NFC, CONNECT_MODE_DIRECT } = require("nfc-pcsc");
const compression = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const cluster = require('cluster');
const { serverURL } = require("./config");

const admin = parseInt(process.env.ADMIN);
const lcd = parseInt(process.env.LCD);

if (cluster.isMaster) {
	cluster.fork();
  
    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });
}

if (cluster.isWorker) {
	var whitelist = [
		"http://localhost:8080",
		"http://192.168.1.150:8080",
	];

	const corsOptions = {
		credentials: true,
		origin: function(origin, callback){
			var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
			callback(null, originIsWhitelisted);
		},
		optionsSuccessStatus: 200
	};

	// Middleware
	app.use(
		cors(corsOptions), // User CORS to restric connections from anywhere other than localhost
		compression(),
		bodyParser.json() // Parse JSON requests
	);

	app.post("/ping", (req, res) => {
		res.send(true);
		res.end();
	});

	// Start the server!
	const server = app.listen(8081, () => {
		console.log("Server started...\nPORT: 8081");
	});

	// Server is on and is ready to listen and respond!
	server.on("listening", () => {
		console.log("Scanner listening for ping...");
	});

	// LEDs
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

	const onCardRead = (uid) => {
		if(uid) {
			return axios.post(serverURL + "cardScanned", {
				uid,
				admin
			});
		}
	}

	if(lcd === 1) {
		const lcd_reader = require('acr1222l2');

		const lcd_reader_error = async (err) => {
			console.log('NFC ERROR CODE:', err.error_code);
			console.log('NFC ERROR MESSAGE:', err.error);
			await lcd_reader.disconnect();
			await main();
		}

		const addZero = (i) => {
			if (i < 10) {
				i = "0" + i;
			}
			return i;
		}

		const getTime = () => {
			const date = new Date();
			return addZero(date.getHours()) + ":" + addZero(date.getMinutes());
		}

		const getDate = () => {
			const date = new Date();
			return addZero(date.getDate()) + "/" + addZero(date.getMonth() + 1) + "/" + addZero(date.getFullYear());
		}

		async function main() {
			const init = async () => {
				try {
					await lcd_reader.initialize(lcd_reader_error, debug=false);
					await lcd_reader.disableBuzzerEvents();
				} catch(e) {
					console.log("Failed to initialize: ", e);
					await init();
				}
			}

			const mainScreen = async () => {
				await lcd_reader.writeToLCD(getTime(), getDate());
			}

			const infiniteAttempt = async (func) => {
				try {
					console.log("trying...");
					await func();
				} catch(e) {
					console.log("failed, trying... ", e);
					await infiniteAttempt(func);
				}
			}

			const cardNotPresent = async () => {
				try {
					clearInterval(cardPresentInterval);
					await lcd_reader.stopReadUUID();
					await mainScreen();
					mainScreenInterval = setInterval(async () => {
						await mainScreen();
					}, 60000);
					await waitForCard();
				} catch(e) {
					cardNotPresent();
				}
			}

			// Initialize the scanner
			console.log("Initializing LCD scanner...");

			let cardPresentInterval = null;
			let mainScreenInterval = null;
			let uuid = null;

			let buzzerCounter = 0;
			let buzzerInterval = null;

			await init();
			await mainScreen();
			mainScreenInterval = setInterval(async () => {
				await mainScreen();
			}, 60000);

			const waitForCard = async () => { 
				try {
					uuid = await lcd_reader.readUUID();
					await onCardRead(uuid.toString("hex")).then(async (res) => {
						await clearInterval(mainScreenInterval);
						switch(res.data.status) {
							case 0: {
								// sound 3 beep due to error
								buzzerCounter = 0;
								buzzerInterval = setInterval(async () => {
									await lcd_reader.turnOnBuzzer();

									buzzerCounter += 1;
									if(buzzerCounter >= 3) {
										clearInterval(buzzerInterval);
									}
								}, 200);
								break;
							}
							default: {
								// sound 1 beep to indicate success
								await lcd_reader.writeToLCD(res.data.employee.name[0] + "." + res.data.employee.surname,
									res.data.employee.working 
									? "IZGAJIS      -->"
									: "IENACIS      <--");
								await lcd_reader.turnOnBuzzer();
								break;
							}
						}
					});
					cardPresentInterval = setInterval(async () => {
						if(!lcd_reader.cardPresent) {
							cardNotPresent();
						}
					});
				} catch(e) {
					console.log("ERROR!");
					setTimeout(async () => {
						main();
					}, 1000);
				}
			}

			try {
				await waitForCard();
			}
			catch(e) {
				main();
			}
		}

		main();
	} else {
		const nfc = new NFC();

		const successLEDBits = 0b10000000;
		const errorLEDBits = 0b01000000;

		console.log("Initializing NON-LCD scanner...");

		nfc.on("reader", async reader => {
			reader.aid = "F222222222";

			console.log("reader connected!");

			try {
				await reader.connect(CONNECT_MODE_DIRECT);
				await reader.setBuzzerOutput(false);
				await reader.disconnect();
			} catch(e) {
				console.log("reader connection error: ", e);
			}

			reader.on("card", card => {

				console.log("card read");

				const uid = card.uid;

				if(uid) {
					onCardRead(uid).then((res) => {
						switch(res.data.status) {
							case 0: {
								reader.led(errorLEDBits, [0x01, 0x01, 0x03, 0x01]).catch((e) => {
									console.log("led error: ", e);
								});
								break;
							}
							default: {
								reader.led(successLEDBits, [0x00, 0x02, 0x01, 0x02]).catch((e) => {
									console.log("led error: ", e);
								});
								break;
							}
						}
					}).catch((e) => {
						console.log("axios error: ", e);
						reader.led(errorLEDBits, [0x01, 0x01, 0x03, 0x01]).catch((e) => {
							console.log("led error: ", e);
						});
					});
				}
			});

			reader.on("card.off", card => {
				console.log("card removed");
			});

			reader.on("error", err => {
				console.log("error: ", err);

				reader.led(errorLEDBits, [0x01, 0x01, 0x03, 0x01]).catch((e) => {
					console.log("led error: ", e);
				});
			});

			reader.on("end", () => {
				console.log("reader removed");
			});
		});
		
		nfc.on("error", err => {
			console.log("error: ", err);
		});
	}
}