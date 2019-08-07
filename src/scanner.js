const express = require("express");
const { NFC, CONNECT_MODE_DIRECT } = require("nfc-pcsc");
const compression = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const admin = process.env.admin;
const lcd = process.env.lcd;

console.log("Running as admin: ", admin);

const { serverURL } = require("./config");

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

const lcd_reader = require('acr1222l');

if(lcd) {

	// const init = () => {
	// 	dateTimeInterval = setInterval(() => {
	// 		homeScreen();
	// 	}, 1000);

	// 	homeScreen().then(() => {
	// 		read();
	// 	}).catch(() => {
	// 		read();
	// 	});
	// }

	// const flashScreen = () => {
	// 	const flashPromise = new Promise((resolve, reject) => {
	// 		const flashTimes = 3;
	// 		let flashCount = 0;
	// 		let flashFlip = false;
	// 		let time = 150;
	
	// 		const flash = () => {
	// 			const promise = flashFlip
	// 			? lcd_reader.turnOnBacklight()
	// 			: lcd_reader.turnOffBacklight();
	
	// 			promise.then(() => {
	// 				setTimeout(() => {
	// 					flashCount++;
	// 					flashFlip = !flashFlip;
	
	// 					if(flashCount < flashTimes * 2) {
	// 						flash();
	// 					} else {
	// 						lcd_reader.turnOnBacklight().then(() => {
	// 							resolve();
	// 						});
	// 					}
	// 				}, time);
	// 			})
	// 		}
	
	// 		flash();
	// 	});
	// 	return flashPromise;
	// }

	// const getTime = () => {
	// 	const date = new Date();
	// 	return date.getHours() + ":" + date.getMinutes();
	// }

	// const getDate = () => {
	// 	const date = new Date();
	// 	return date.getDay() + "/" + date.getDate() + "/" + date.getFullYear();
	// }

	// let dateTimeInterval = null;
	// const homeScreen = () => {
	// 	return lcd_reader.writeToLCD(getDate(), getTime()).catch(() => {
	// 		console.log("Home screen error");
	// 	});
	// }

	// const employeeScreen = () => {
	// 	clearInterval(dateTimeInterval);
	// 	return lcd_reader.writeToLCD('Ienacis!', '').catch(() => {
	// 		console.log("Employee screen error");
	// 	});
	// }

	// const scan = (data) => {
	// 	console.log("SCANNED: ", data.toString("hex"));
	// 	previousScan = data.toString("hex");
	// 	previousScanTime = new Date().getTime();
	// }

	// const read = () => {
	// 	return lcd_reader.readUUID().then((data) => {
	// 		lcd_reader.stopReadUUID().catch(() => {
	// 			console.log("Stop UUID read error");
	// 		});
	// 		scan(data);
	// 	}).then(() => {
	// 		employeeScreen().then(() => {
	// 			const cardPresentInterval = setInterval(() => {
	// 				if(!lcd_reader.cardPresent) {
	// 					clearInterval(cardPresentInterval);
	// 					init();
	// 				}
	// 			});
	// 		}).catch(() => {
	// 			console.log("EMPLOYEE SCREEN FAIL");
	// 			read();
	// 		})
	// 	}).catch(() => {
	// 		console.log("READ UUID FAIL");
	// 		read();
	// 	})
	// }


	// lcd_reader.initialize(lcd_reader_error, debug=false).then(() => {
	// 	init();
	// });


	const lcd_reader_error = async (err) => {
		console.log('NFC ERROR CODE:', err.error_code);
		console.log('NFC ERROR MESSAGE:', err.error);
		await lcd_reader.disconnect();
		await main();
	}

	const getTime = () => {
		const date = new Date();
		return date.getHours() + ":" + date.getMinutes();
	}

	const getDate = () => {
		const date = new Date();
		return date.getDay() + "/" + date.getDate() + "/" + date.getFullYear();
	}

	async function main() {
		const init = async () => {
			try {
				await lcd_reader.initialize(lcd_reader_error, debug=false);
			} catch {
				console.log("Failed to initialize.");
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
			} catch {
				console.log("failed, trying...");
				await infiniteAttempt(func);
			}
		}

		const cardNotPresent = async () => {
			try {
				clearInterval(cardPresentInterval);
				await lcd_reader.stopReadUUID();
				await mainScreen();
				await waitForCard();
			} catch {
				cardNotPresent();
			}
		}

		// Initialize the scanner
		console.log("Initializing scanner...");
		await init();
		await mainScreen();

		let cardPresentInterval = null;
		let uuid = null;
		const waitForCard = async () => { 
			try {
				await lcd_reader.buzzerOff();
				uuid = await lcd_reader.readUUID();
				await lcd_reader.buzzerOn();
				console.log("Card scanned...");
				await onCardRead(uuid).then(async (data) => {
					await lcd_reader.writeToLCD(data.data.employee.surname + " " + data.data.employee.name, uuid.toString('hex'));
				});
				cardPresentInterval = setInterval(async () => {
					if(!lcd_reader.cardPresent) {
						cardNotPresent();
					}
				});
			} catch {
				console.log("ERROR!");
				setTimeout(async () => {
					main();
				}, 1000);
			}
		}

		try {
			await waitForCard();
		}
		catch {
			main();
		}
	}

	main();
} else {
	const nfc = new NFC();

	const successLEDBits = 0b10000000;
	const errorLEDBits = 0b01000000;

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
				onCardRead(uid);
				// axios.post(serverURL + "cardScanned", {
				// 	uid,
				// 	admin
				// }).then((res) => {
				// 	switch(res.data.status) {
				// 		case 0: {
				// 			reader.led(errorLEDBits, [0x01, 0x01, 0x03, 0x01]).catch((e) => {
				// 				//console.log("led error: ", e);
				// 			});
				// 			break;
				// 		}
				// 		default: {
				// 			reader.led(successLEDBits, [0x00, 0x02, 0x01, 0x02]).catch((e) => {
				// 				//console.log("led error: ", e);
				// 			});
				// 			break;
				// 		}
				// 	}
				// }).catch((e) => {
				// 	console.log("axios error: ", e);
				// 	reader.led(errorLEDBits, [0x01, 0x01, 0x03, 0x01]).catch((e) => {
				// 		//console.log("led error: ", e);
				// 	});
				// });
			}
		});

		reader.on("card.off", card => {
			console.log("card removed");
		});

		reader.on("error", err => {
			console.log("error: ", err);

			reader.led(errorLEDBits, [0x01, 0x01, 0x03, 0x01]).catch((e) => {
				//console.log("led error: ", e);
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