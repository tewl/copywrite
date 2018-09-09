import {Directory} from "../lib/directory";
import {File} from "../lib/file";
import * as BBPromise from "bluebird";
import * as _ from "lodash";


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

        const copyPromises = _.reduce<string, Array<Promise<File>>>(
            Object.keys(dstMap),
            (acc, curDstFileName) => {
                if (srcMap[curDstFileName]) {
                    const copyPromise = srcMap[curDstFileName].copy(dstMap[curDstFileName]);
                    acc.push(copyPromise);
                }
                return acc;
            },
            []
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

