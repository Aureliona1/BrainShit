# Brain Shit, the slightly simpler cousin to BrainFuck

## Comments

Comments are enclosed in `\n // <comment here> \n`.
i.e., they must be on their own line.

## Basic idea

You are operating on a (theoretically) infinite tape of 64-bit floats, and you have a temporary register that you can read and write. You may use the following operations to manipulate your program.

-   < and > to move left and right on the tape
-   & to set the temporary register to your current position
-   \# to seek to the position in the temporary register, this will be floored.
-   ^ to write the value on the tape to the register.
-   $ to write the value in the register onto the current tape position.
-   Any number literal will be automatically written into the register, this can include decimals.
-   \+ to add the current tape value to the register value.
-   \- to subtract the current tape value from the register value.
-   \* to multiply the register value by the tape value
-   / to divide the register value by the tape value.
-   @ halts the program and reads input from stdin, the input will be truncated to the floor of the length specified in the register. The input will be written to the tape from the current tape position.
-   ! prints decoded ASCII string from current tape location until the tape location + floor(register), or until it hits a value that isn't an 8-bit unsigned integer..
-   % Prints the number at the current tape value to stdout, followed by a \n.
-   = Is the built in number parser, it will go from the current tape location until it either reaches a string length specified by the register value, or reaches a value that invalidates the number (i.e., a letter or symbol). The resulting number will be put in the register. This will not move the tape index.
-   \_ is the built in number interpreter, it will write the number at tape[i] as an encoded base-10 string starting from the current tape index until the number terminates, or the string is limited by the value in the register. The length of the created string will be set in the register.

### Conditions

conditional logic is handled as a "while" loop.

A loop of code begins with a condition that compares the value in the register against 0.
If the condition evaluates to true, the code enters the loop, if false it skips the loop.
This condition is re-evaluated at the start of every loop.

The available conditions are lt, le, eq, ge, gt, and ne.
The loop code block is enclosed in [].

So, a loop that prints the numbers from 0 - 10 would look like.

```bs
// let the limit of the loop be 10 -> tape[0]
10$>0$<^>-gt[
	%1+$<^>-
	// the value in the register will be 10 - i, the code goes back to the condition.
]
// done
```

### Program termination

The program will run until there are no instructions left, or it hits a | symbol, the return code of the program will be the value in the register when the program terminates.
It is best practice to put a | at the end of your code anyway, to specify that it is the end.

## Hello world

```bs
72$>101$>108$>108$>111$>32$>87$>111$>114$>108$>100$>33$>0#12!
```
