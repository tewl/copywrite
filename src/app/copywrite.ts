import {Directory} from "../lib/directory";
import * as BBPromise from "bluebird";

function getCmdLineArgs(): Promise<{srcDir: Directory, dstDir: Directory}> {
    const srcDir = new Directory(process.argv[2]);
    const dstDir = new Directory(process.argv[3]);

    const srcPromise = srcDir.exists();
    const dstPromise = dstDir.exists();

    return BBPromise.all([srcPromise, dstPromise])
    .then((results) => {

        const srcDirExists = !!results[0];
        if (!srcDirExists) {
            throw `Source directory ${srcDir.toString()} does not exist.`;
        }

        const dstDirExists = !!results[1];
        if (!dstDirExists) {
            throw `Destination directory ${dstDir.toString()} does not exist.`;
        }

        return {
            srcDir: srcDir,
            dstDir: dstDir
        };
    });
}

function main(): Promise<void> {

    return getCmdLineArgs()
    .then(() => {
    });
}


main()
.then(() => {
})
.catch((err) => {
    console.log(err);
    process.exit(-1);
});

