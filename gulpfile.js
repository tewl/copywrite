require('ts-node').register();   // Allow use of TS files
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const gulp = require("gulp");
const stripJsonComments = require("strip-json-comments");
const del = require("del");
const _ = require("lodash");


////////////////////////////////////////////////////////////////////////////////
// Default
////////////////////////////////////////////////////////////////////////////////

gulp.task("default", () => {
    const usage = [
        "Gulp tasks",
        "  clean  - Delete built and temporary files",
        "  tslint - Run TSLint on source files",
        "  ut     - Run unit tests",
        "  build  - Run TSLint, unit tests, and compile TypeScript"
    ];
    console.log(usage.join("\n"));
});


////////////////////////////////////////////////////////////////////////////////
// Clean
////////////////////////////////////////////////////////////////////////////////

gulp.task("clean", () => {
    return clean();
});


function clean() {
    return del([
        "tmp/**",
        "dist/**"
    ]);
}


////////////////////////////////////////////////////////////////////////////////
// TSLint
////////////////////////////////////////////////////////////////////////////////

gulp.task("tslint", function ()
{
    "use strict";
    return runTslint(true);
});


function runTslint(emitError)
{
    "use strict";
    let tslintArgs = [
        "--project", "./tsconfig.json",
        "--format", "stylish"
    ];


    // Add the globs defining source files to the list of arguments.
    tslintArgs = tslintArgs.concat(getSrcGlobs(true, false));

    return spawn(
        "./node_modules/.bin/tslint",
        tslintArgs,
        __dirname
    )
    .catch((err) => {
        // If we're supposed to emit an error, then go ahead and rethrow it.
        // Otherwise, just eat it.
        if (emitError) {
            throw err;
        }
    });
}


////////////////////////////////////////////////////////////////////////////////
// Unit Tests
////////////////////////////////////////////////////////////////////////////////

gulp.task("ut", () => {
    return runUnitTests();
});


function runUnitTests() {
    return spawn(
        "./node_modules/.bin/ts-node",
        [
            "./node_modules/.bin/jasmine",
            "JASMINE_CONFIG_PATH=test/ut/jasmine.json"
        ],
        __dirname
    );

}


////////////////////////////////////////////////////////////////////////////////
// Build
////////////////////////////////////////////////////////////////////////////////

gulp.task("build", () => {

    let errorsEncountered = false;

    return clean()
    .then(() => {
        // Do not build if there are TSLint errors.
        return runTslint(true)
        .catch(() => {
            errorsEncountered = true;
        });
    })
    .then(() => {
        // Do not build if the unit tests are failing.
        return runUnitTests()
        .catch(() => {
            errorsEncountered = true;
        });
    })
    .then(() => {
        // Everything seems ok.  Go ahead and compile.
        return compileTypeScript()
        .catch(() => {
            errorsEncountered = true;
        });
    })
    .then(() => {
        return makeExecutable()
        .catch(() => {
            errorsEncountered = true;
        });
    })
    .then(() => {
        if (errorsEncountered) {
            throw "Errors encountered."
        }
    });

});


function compileTypeScript() {
    const ts         = require("gulp-typescript");
    const sourcemaps = require("gulp-sourcemaps");

    // The gulp-typescript package interacts correctly with gulp if you
    // return this outer steam from your task function.  I, however, prefer
    // to use promises so that build steps can be composed in a more modular
    // fashion.
    const tsResultDfd = createDeferred();
    const jsDfd = createDeferred();
    const dtsDfd = createDeferred();

    const outDir = path.join(__dirname, "dist");
    let numErrors = 0;

    const tsResults = gulp.src(getSrcGlobs(false, true))
    .pipe(sourcemaps.init())
    .pipe(ts(getTsConfig(), ts.reporter.longReporter()))
    .on("error", () => {
        numErrors++;
    })
    .on("finish", () => {
        if (numErrors > 0) {
            tsResultDfd.reject(new Error(`TypeScript transpilation failed with ${numErrors} errors.`));
        } else {
            tsResultDfd.resolve();
        }
    });

    tsResults.js
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(outDir))
    .on("finish", () => {
        jsDfd.resolve();
    });

    tsResults.dts
    .pipe(gulp.dest(outDir))
    .on("finish", () => {
        dtsDfd.resolve();
    });

    return Promise.all([tsResultDfd.promise, jsDfd.promise, dtsDfd.promise]);
}


function makeExecutable() {
    const {File} = require("./devLib/file");
    const {makeNodeScriptExecutable} = require("./devLib/nodeUtil");

    const executableFile = new File("dist", "app", "copywrite.js");
    return makeNodeScriptExecutable(executableFile);
}


////////////////////////////////////////////////////////////////////////////////
// Project Management
////////////////////////////////////////////////////////////////////////////////

function getSrcGlobs(includeSpecs, includeLib) {
    "use strict";

    const srcGlobs = ["src/**/*.ts"];
    if (!includeSpecs) {
        srcGlobs.push("!src/**/*.spec.ts");
    }
    if (!includeLib) {
        srcGlobs.push("!src/depot/**/*.ts");
    }


    return srcGlobs;
}


function getTsConfig(tscConfigOverrides) {
    "use strict";

    const tsConfigFile = path.join(__dirname, "tsconfig.json");
    const tsConfigJsonText = fs.readFileSync(tsConfigFile, "utf8");
    const compilerOptions = JSON.parse(stripJsonComments(tsConfigJsonText)).compilerOptions;

    // Apply any overrides provided by the caller.
    _.assign(compilerOptions, tscConfigOverrides);

    compilerOptions.typescript = require("typescript");
    return compilerOptions;
}



////////////////////////////////////////////////////////////////////////////////
// Misc
////////////////////////////////////////////////////////////////////////////////

function spawn(cmd, args, cwd) {

    return new Promise((resolve, reject) => {
        const childProc = cp.spawn(
            cmd,
            args,
            {
                cwd: cwd,
                stdio: "inherit"
            }
        );

        childProc.once("exit", (exitCode) => {
            if (exitCode === 0) {
                resolve();
            } else {
                reject(new Error(`Child process exit code: ${exitCode}.`));
            }
        });
    });
}


function createDeferred() {
    const dfd = {};
    dfd.promise = new Promise((resolve, reject) => {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });
    return dfd;
}
