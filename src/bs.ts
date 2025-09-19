// deno-lint-ignore no-import-prefix
import { clog, concatTypedArrays } from "jsr:@aurellis/helpers@1.4.2";

function help() {
	clog('Error, command usage "brainshit <script.bs> <mode>"');
	clog("script.bs is your bs script file.");
	clog("mode determines the way that your script runs, modes are:");
	clog("	tokenise: print back your script without comments and whitespace");
	clog("	debug: run your script and log ech operation (except script-based logging)");
	clog("	quiet: run the script normally");
}

if (Deno.args.length !== 2) {
	help();
	Deno.exit(0);
}

let raw = "";
try {
	raw = await Deno.readTextFile(Deno.args[0]);
} catch (e) {
	clog(e);
	clog(`Error, could not read input file ${Deno.args[0]}...`, "Error");
	throw Deno.exit(-1);
}

// Tokenise the code

raw = ("\n" + raw + "\n")
	.replaceAll("\r", "")
	.replaceAll(/\n?[^\n]*\/\/[^\n]*\n/g, "")
	.replaceAll(/\s/g, "")
	.replaceAll("\n", "");

let tape = new Float64Array(1);
let register = 0;
let tapeIndex = 0;

function exec(code: string, debug = false) {
	for (let i = 0; i < code.length; ) {
		const char = code[i];

		// Number literal, assign to register.
		if (/\d/.test(char)) {
			let numEnd = i;
			while (/\d/.test(code[numEnd])) {
				numEnd++;
			}
			register = parseFloat(code.substring(i, numEnd));
			if (debug) {
				clog(`Setting register to ${register}...`);
			}
			i = numEnd;
			continue;
		}

		// Condition
		if (/[legn]/.test(char)) {
			const condition = code.substring(i, i + 2);
			let condFunc;
			switch (condition) {
				case "lt": {
					condFunc = () => register < 0;
					break;
				}
				case "le": {
					condFunc = () => register <= 0;
					break;
				}
				case "eq": {
					condFunc = () => register === 0;
					break;
				}
				case "ge": {
					condFunc = () => register >= 0;
					break;
				}
				case "gt": {
					condFunc = () => register > 0;
					break;
				}
				case "ne": {
					condFunc = () => register !== 0;
					break;
				}
				default: {
					clog(`Error, unknown condition ${condition}...`);
					throw Deno.exit(1);
				}
			}

			if (debug) {
				clog(`Found condition ${condition}...`);
			}

			// Get the loop contents
			let end = i + 3;
			for (let depth = 1; depth; end++) {
				if (end >= code.length) {
					clog("Could not locate loop end...");
					throw Deno.exit(1);
				}
				if (code[end] == "[") {
					depth++;
				}
				if (code[end] == "]") {
					depth--;
				}
			}
			while (condFunc()) {
				exec(code.substring(i + 3, end - 1), debug);
			}
			if (debug) {
				clog("Loop exited...");
			}
			i = end;
			continue;
		}

		// Single symbol stuff
		switch (char) {
			case "<": {
				if (tapeIndex === 0) {
					clog("The tape starts at zero, you tried to go negative...");
					throw Deno.exit(1);
				}
				tapeIndex--;
				if (debug) {
					clog(`Moving left to tape[${tapeIndex}]...`);
				}
				break;
			}
			case ">": {
				tapeIndex++;
				if (debug) {
					clog(`Moving right to tape[${tapeIndex}]...`);
				}
				break;
			}
			case "&": {
				register = tapeIndex;
				if (debug) {
					clog(`Setting register to ${register} from tape index...`);
				}
				break;
			}
			case "#": {
				if (register < 0) {
					clog("The tape starts at zero, you tried to go negative...");
					throw Deno.exit(1);
				}
				tapeIndex = Math.floor(register);
				if (debug) {
					clog(`Moving to tape index ${tapeIndex}...`);
				}
				break;
			}
			case "^": {
				register = tape[tapeIndex] ?? 0;
				if (debug) {
					clog(`Setting register to ${register}, from tape[${tapeIndex}]...`);
				}
				break;
			}
			case "$": {
				if (tape.length <= tapeIndex) {
					// Double the length of the tape...
					tape = concatTypedArrays(tape, new Float64Array(tape.length));
				}
				tape[tapeIndex] = register;
				if (debug) {
					clog(`Setting tape[${tapeIndex}] to ${register}...`);
				}
				break;
			}
			case "+": {
				register += tape[tapeIndex] ?? 0;
				if (debug) {
					clog(`Setting register to ${register} via add...`);
				}
				break;
			}
			case "-": {
				register -= tape[tapeIndex] ?? 0;
				if (debug) {
					clog(`Setting register to ${register} via subtract...`);
				}
				break;
			}
			case "*": {
				register *= tape[tapeIndex] ?? 0;
				if (debug) {
					clog(`setting register to ${register} via multiply...`);
				}
				break;
			}
			case "/": {
				register /= tape[tapeIndex] || 1;
				if (debug) {
					clog(`Setting register to ${register} via divide...`);
				}
				break;
			}
			case "@": {
				const input = prompt("Program requested input:");
				if (!input) {
					break;
				}
				const length = Math.max(input.length, Math.floor(register));
				const encoded = new TextEncoder().encode(input).subarray(0, length);
				tape.set(encoded, tapeIndex);
				if (debug) {
					clog(`Wrote: ${Array.from(encoded)} to tape[${tapeIndex}]...`);
				}
				break;
			}
			case "!": {
				let endPos = tapeIndex;
				while (endPos - tapeIndex < Math.floor(register) && tape[endPos] < 256 && tape[endPos] >= 0 && !(tape[endPos] % 1)) {
					endPos++;
				}
				const bytes = new Uint8Array(tape.subarray(tapeIndex, endPos));
				Deno.stdout.writeSync(bytes);
				break;
			}
			case "%": {
				console.log(tape[tapeIndex] ?? 0);
				break;
			}
			case "|": {
				if (debug) {
					clog(`Terminating program with code ${register}...`);
				}
				return Deno.exit(register);
			}
			case "=": {
				let dot = false;
				let number = "";
				for (let numEnd = tapeIndex; numEnd - tapeIndex < Math.floor(register); numEnd++) {
					const char = String.fromCharCode(tape[numEnd] ?? "0".charCodeAt(0));
					if (char === ".") {
						if (dot) {
							break;
						}
						dot = true;
						number += ".";
					} else if (/\d/.test(char)) {
						number += char;
					} else {
						break;
					}
				}
				register = parseFloat(number);
				if (debug) {
					clog(`Parsed number: ${register}...`);
				}
				break;
			}
			case "_": {
				const s = (tape[tapeIndex] ?? 0).toString();
				for (let i = 0; i < Math.floor(register) && i < s.length; i++) {
					if (tapeIndex + i >= tape.length) {
						tape = concatTypedArrays(tape, new Float64Array(tape.length));
					}
					tape[tapeIndex + i] = s[i].charCodeAt(0);
				}
				register = Math.min(Math.floor(register), s.length);
				if (debug) {
					clog(`Encoded the number ${s} into a string of length ${register}...`);
				}
				break;
			}
			case "[": {
				clog("Error, loop start found with no condition...");
				throw Deno.exit(1);
			}
			case "]": {
				clog("Error, loop end found with no start or condition...");
				throw Deno.exit(1);
			}
			default: {
				clog(`Error, ${char} is not recognised as a valid instruction...`);
				throw Deno.exit(1);
			}
		}
		i++;
	}
}

// Mode from args[1]

switch (Deno.args[1]) {
	case "tokenise": {
		console.log(raw);
		break;
	}
	case "debug": {
		exec(raw, true);
		break;
	}
	case "quiet": {
		exec(raw);
		break;
	}
	default: {
		help();
		break;
	}
}
