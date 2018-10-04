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
    .then((result) => {
        const srcMap = result[0];
        const dstMap = result[1];

        const copyOperations: Array<CopyOperation> = _.reduce<string, Array<CopyOperation>>(
            Object.keys(dstMap),
            (acc, curDstFileName) => {
                if (srcMap[curDstFileName]) {
                    const copyOperation = new CopyOperation(srcMap[curDstFileName], dstMap[curDstFileName]);
                    acc.push(copyOperation);
                }
                return acc;
            },
            []
        );

        // Print a preview of the operations that are about to happen.
        console.log(_.map(
            copyOperations,
            (curCopyOperation) => `${curCopyOperation.source.toString()} ==> ${curCopyOperation.destination.toString()}`
        ).join("\n"));


        //
        // todo: Prompt the user to confirm to continue.
        //

        const copyPromises = _.map(copyOperations,
            (curCopyOperation) => curCopyOperation.execute()
        );

        return BBPromise.all(copyPromises);
    })
    .then((dstFiles) => {
        console.log("Updated the following files:");
        console.log(_.map(dstFiles, (dstFile: File) => dstFile.absPath()).join("\n"));
    });
}


main()
.then(() => {
})
.catch((err) => {
    console.log(err);
    process.exit(-1);
});


function getCmdLineArgs(): Promise<{srcDir: Directory, dstDir: Directory}> {

    if (!process.argv[2] || !process.argv[3]) {
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

