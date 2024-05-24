const b = require('bonescript')

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

async function main() {
	const [, , pin, ms] = process.argv
	const msInt = parseInt(ms)

	console.log(`Going to set pin ${pin} for ${ms} ms`)

    	b.pinMode(pin, b.OUTPUT);
	b.digitalWrite(pin, 1)

	await sleep(msInt)

	b.digitalWrite(pin, 0)
}


main()

