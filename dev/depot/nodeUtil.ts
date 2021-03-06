import {constants} from "fs";
import {EOL} from "os";
import * as _ from "lodash";
import * as BBPromise from "bluebird";
import {Directory} from "./directory";
import {File} from "./file";
import {getOs, OperatingSystem} from "./os";

const NODEJS_SHEBANG = "#!/usr/bin/env node";

export function makeNodeScriptExecutable(file: File): Promise<File>
{
    return file.read()
    .then((text) => {
        const newText = NODEJS_SHEBANG + EOL + text;
        return file.write(newText);
    })
    .then(() => {
        // We need to set the access mode of the file to the current mode with
        // execute permissions OR'ed in (for owner, group and other).  So first
        // get the current mode bits.
        return file.exists();
    })
    .then((stats) => {
        // Turn on all execute bits.
        const newMode = stats!.mode | constants.S_IXUSR | constants.S_IXGRP | constants.S_IXOTH;
        return file.chmod(newMode);
    })
    .then(() => {
        return file;
    });
}


export function makeAllJsScriptsExecutable(dir: Directory, recursive: boolean = false): Promise<Array<File>>
{
    return dir.contents(recursive)
    .then((contents) => {
        const scriptFiles = _.filter(contents.files, (curFile) => curFile.extName === ".js");
        const promises = _.map(scriptFiles, (curScriptFile) => makeNodeScriptExecutable(curScriptFile));
        return BBPromise.all(promises)
        .then(() => {
            return scriptFiles;
        });
    });
}


/**
 * Converts the specified `node_modules/.bin/` script file name to the one
 * that should be executed on the current OS.  On Windows, this means the file
 * with the `.cmd` extension.
 * @param nodeBinFile - The node binary symbolic link file that exists in
 * `node_modules/.bin/`.
 * @return The node script file that should be executed for the current OS.
 */
export function nodeBinForOs(nodeBinFile: File | string): File
{
    const inputFile: File = nodeBinFile instanceof File ? nodeBinFile : new File(nodeBinFile);

    if (getOs() === OperatingSystem.WINDOWS)
    {
        return new File(inputFile.directory, inputFile.baseName + ".cmd");
    }
    else
    {
        return inputFile;
    }
}

