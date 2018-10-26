import * as yargs from "yargs";
import * as commandUpdate from "./commandUpdate";
import * as commandFull from "./commandFull";


// Each command is implemented in its own module.
yargs
.command(commandUpdate)
.command(commandFull)
.help().argv;
