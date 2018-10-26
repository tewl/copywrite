import inquirer = require("inquirer")
import table = require("text-table")

import {Directory} from "../lib/directory";
import {File} from "../lib/file";
import * as BBPromise from "bluebird";
import * as _ from "lodash";
import {CopyOperation} from "./copyOperation";


function main(): Promise<void> {
    return getCmdLineArgs()
    .then((args) => {
        const srcMapPromise = getFileMap(args.srcDir);
        const dstMapPromise = getFileMap(args.dstDir);
        return BBPromise.all([srcMapPromise, dstMapPromise]);
    })
    .then(([srcMap, dstMap]) => {

        let copyOperations: Array<CopyOperation> = _.reduce<string, Array<CopyOperation>>(
            Object.keys(dstMap),
            (acc, curDstFileName) => {
                // If the current destination file is also a source file, create
                // a copy operation for it.
                if (srcMap[curDstFileName]) {
                    const copyOperation = new CopyOperation(srcMap[curDstFileName], dstMap[curDstFileName]);
                    acc.push(copyOperation);
                }
                return acc;
            },
            []
        );

        const areIdenticalPromises = _.map(copyOperations,
            (curCopyOperation) => curCopyOperation.filesAreIdentical()
        );
        return BBPromise.all(areIdenticalPromises)
        .then((areIdenticalResults) => {
            copyOperations = _.filter(copyOperations,
                // Keep the copy operations where the files are not identical.
                (curCopyOperation, index) => !areIdenticalResults[index]
            );

            return copyOperations;
        });
    })
    .then((copyOperations) => {
        // Print a preview of the operations that are about to happen.
        console.log("");
        if (copyOperations.length === 0) {
            console.log("All files are identical.");
            return copyOperations;
        }
        else {
            const rows = _.map(copyOperations, (curCopyOperation) => {
                return [curCopyOperation.source.toString(), curCopyOperation.destination.toString()];
            });
            const previewTable = table(rows, {hsep: " ==> "});
            console.log(previewTable);
            return promptToContinue(
                `Proceed with copying ${copyOperations.length} files?`,
                copyOperations
            );
        }
    })
    .then((copyOperations) => {
        const copyPromises = _.map(copyOperations,
            (curCopyOperation) => curCopyOperation.execute()
        );
        return BBPromise.all(copyPromises);
    })
    .then((dstFiles) => {
        console.log(`Copied ${dstFiles.length} files.`);
    });
}


main()
.catch((err) => {
    console.log(err);
    process.exit(-1);
});


function getCmdLineArgs(): Promise<{srcDir: Directory, dstDir: Directory}> {

    if (!process.argv[2] || !process.argv[3]) {
        console.log("copywrite is a tool that updates files found in destination_dir with the " +
                    "version found in source_dir");
        console.log("Usage:");
        console.log("copywrite.ts source_dir destination_dir");
        process.exit(-1);
    }

    const srcDir = new Directory(process.argv[2]);
    const dstDir = new Directory(process.argv[3]);

    const srcPromise = srcDir.exists();
    const dstPromise = dstDir.exists();

    return BBPromise.all([srcPromise, dstPromise])
    .then((results) => {

        const srcDirExists = !!results[0];
        if (!srcDirExists) {
            throw new Error(`Source directory ${srcDir.toString()} does not exist.`);
        }

        const dstDirExists = !!results[1];
        if (!dstDirExists) {
            throw new Error(`Destination directory ${dstDir.toString()} does not exist.`);
        }

        return {
            srcDir: srcDir,
            dstDir: dstDir
        };
    });
}


// TODO: What should be done if the same filename is seen in multiple
// directories?
function getFileMap(dstDir: Directory): Promise<{[s: string]: File}> {
    return dstDir.files(true)
    .then((dstFiles) => {
        return _.reduce<File, {[s: string]: File}>(
            dstFiles,
            (acc, curDstFile) => {
                acc[curDstFile.fileName] = curDstFile;
                return acc;
            },
            {}
        );
    });
}



/**
 * Helper function that prompts the user to confirm whether they want to
 * continue.
 * @return {Promise<void>} A Promise that is resolved if the user wishes to
 * continue and is rejected if they decline.
 */
function promptToContinue<T>(message: string, resolveValue: T): Promise<T> {
    const questionConfirmation = {
        type: "confirm",
        name: "confirm",
        message: message || "Continue?"
    };


    return inquirer.prompt<{confirm: boolean}>([questionConfirmation])
    .then((answers) => {
        if (!answers.confirm) {
            throw "Operation cancelled by user.";
        }
        else {
            return resolveValue;
        }
    });
}
