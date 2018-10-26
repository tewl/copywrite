import {Argv, Arguments} from "yargs";
import {Directory} from "../depot/directory";

export const command = "full <sourceDir> <destDir>";
export const describe = "Empty destDir and copy all contents of sourceDir into it";
export function builder(argv: Argv) {
    return argv
    .check(
        (argv: Arguments) => {
            const srcDir = new Directory(argv.sourceDir);
            const destDir = new Directory(argv.destDir);

            if (!srcDir.existsSync()) {
                throw new Error(`The source directory "${srcDir.toString()}" does not exist.`);
            }

            if (!destDir.existsSync()) {
                throw new Error(`The destination directory "${destDir.toString()}" does not exist.`);
            }

            return true;
        },
        false
    )
    .positional("sourceDir", {
        describe: "The source directory",
        type: "string"
    })
    .positional("destDir", {
        describe: "The destination directory",
        type: "string"
    });
}

export function handler(args: Arguments) {
    console.log("full handler invoked!");
    console.log("args:", args);
}
