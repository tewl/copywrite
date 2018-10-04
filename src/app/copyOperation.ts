import {File} from "../lib/file";
import {Directory} from "../lib/directory";


export class CopyOperation {

    private readonly _src: File;
    private readonly _dst: Directory | File;


    constructor(src: File, dst: Directory | File) {
        this._src = src;
        this._dst = dst;
    }


    public get source(): File {
        return this._src;
    }


    public get destination(): Directory | File {
        return this._dst;
    }


    public execute(): Promise<File> {
        return this._src.copy(this._dst);
    }


}
