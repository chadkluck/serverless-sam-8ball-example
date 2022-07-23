console.log ("COLD START");

const answers = [ "It is certain",
	"It is decidedly so",
	"Without a doubt",
	"Yes definitely",
	"You may rely on it",
	"As I see it, yes",
	"Most likely",
	"Outlook good",
	"Yes",
	"Signs point to yes",
	"Reply hazy try again",
	"Ask again later",
	"Better not tell you now",
	"Cannot predict now",
	"Concentrate and ask again",
	"Don't count on it",
	"My reply is no",
	"My sources say no",
	"Outlook not so good",
	"Very doubtful"
];

exports.get = async (event, context) => {

	let response;

	try {
		var rand = Math.floor(Math.random() * answers.length);

		var prediction = answers[rand];

		// Gets sent to CloudWatch logs. Check it out!
		console.log(`Prediction log: ${prediction}`);

		// place the prediction inside of a data object to return back to client
		var data = {
			prediction: prediction
		};
    
		response = {
			statusCode: 200,
			body: JSON.stringify(data),
			headers: {'content-type': 'application/json'}
		}; 
  
	} catch (err) {
		console.log(err);
		response = err;
	}

	return response;

};