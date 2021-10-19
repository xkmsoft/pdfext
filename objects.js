"use strict"

import * as util from "util";
import { Lexer } from "./lexer.js"
import { T } from "./constants.js"
import { textDecoder } from "./text.js"
import { byteArrayToString, isSpace } from "./utils.js"
import { Decoders, FlateDecode } from "./decoders.js"

const inspectOptions = {showHidden: false, depth: null, colors: true}

export class Base {
    Key(key, reader) {}
    HasKey(key) {}
}

export class Reader {
    constructor(data, xrefs) {
        this.data = data
        this.xrefs = xrefs
    }

    inspect() {
        console.log(util.inspect(this, inspectOptions))
    }
}

export class Reference {
    constructor(id, gen) {
        this.id = id
        this.gen = gen
    }

    resolve (reader) {
        const data = reader.data
        const xrefs = reader.xrefs
        const xref = this.findXRef(xrefs, this)
        if (xref === null) {
            throw new Error("could not find the XRef of the reference object")
        }
        if (!xref instanceof XRef) {
            throw new Error("could not find the XRef of the reference object")
        }
        if (xref.stream === null) {
            const lexer = new Lexer(data.slice(xref.offset, data.length - 1), xref.offset)
            const definition = lexer.readObject()
            if (definition.obj instanceof Stream) {
                const decoded = definition.obj.decode(reader)
                if (definition.HasKey("Subtype")) {
                    const subType = definition.Key("Subtype")
                    if (subType === "XML") {
                        // Decoded data is XML structure
                        return byteArrayToString(decoded)
                    }
                    throw new Error(`Unknown subtype ${subType}`)
                }
                return textDecoder(decoded).decode().map(w => w.text)
                // return simpleTextDecoder(decoded).decode()
            } else {
                return definition
            }
        }
        const stream = this.findXRef(xrefs, xref.stream)
        if (stream === null) {
            throw new Error("Could not find the XRef of the stream object")
        }
        if (!stream instanceof XRef) {
            throw new Error("Stream object is not instance of XRef")
        }
        const lex1 = new Lexer(data.slice(stream.offset, data.length - 1), stream.offset)
        const def = lex1.readObject()
        const decoded = def.obj.decode(reader)
        if (!def.obj instanceof Stream) {
            throw new Error("Stream object is not instance of Stream")
        }
        if (def.obj.dict.Type !== "ObjStm") {
            throw new Error("Stream dictionary Type field is not ObjStm")
        }
        const n = def.obj.dict.N
        if (n === undefined) {
            throw new Error("N could not be found in ObjStm dictionary")
        }
        const first = def.obj.dict.First
        if (first === undefined) {
            throw new Error("First could not be found in ObjStm dictionary")
        }
        const lexer = new Lexer(decoded, 0)
        for (let i = 0; i < n; i++) {
            const id = lexer.readToken()
            const offset = lexer.readToken()
            if (offset.type === T.Integer && id.type === T.Integer && id.value === this.id ) {
                lexer.setPosition(first + offset.value)
                return lexer.readObject()
            }
        }
        throw new Error(`Failed to resolve the object stream with id:${this.id} gen:${this.gen}`)
    }

    findXRef (xrefs, ref) {
        for (let i = 0; i < xrefs.length; i++) {
            if (xrefs[i].ref.id === ref.id && xrefs[i].ref.gen === ref.gen) {
                return xrefs[i]
            }
        }
        return null
    }

    inspect() {
        console.log(util.inspect(this, inspectOptions))
    }
}

export class Definition extends Base {
    constructor(ref, obj) {
        super()
        this.ref = ref
        this.obj = obj
    }

    Key(key, reader) {
        super.Key(key, reader)
        if (this.obj instanceof Dict) {
            if (this.obj[key] === undefined) {
                console.error(`Key: ${key} is not defined in the obj which is Dictionary instance`)
                return undefined
            }
            if (this.obj[key] instanceof Reference) {
                return this.obj[key].resolve(reader)
            } else {
                return this.obj[key]
            }
        }
        if (this.obj instanceof Stream) {
            if (this.obj.dict[key] === undefined) {
                console.error(`Key: ${key} is not defined in the obj.dict which is Stream instance`)
                return undefined
            }
            if (this.obj.dict[key] instanceof Reference) {
                return this.obj.dict[key].resolve(reader)
            } else {
                return this.obj.dict[key]
            }
        }
    }

    HasKey(key) {
        if (this.obj instanceof Dict) {
            return this.obj[key] !== undefined
        }
        if (this.obj instanceof Stream) {
            return this.obj.dict[key] !== undefined
        }
    }

    inspect() {
        console.log(util.inspect(this, inspectOptions))
    }
}

export class Stream {
    constructor(dict, ref, offset) {
        this.dict = dict
        this.ref = ref
        this.offset = offset
    }

    sliceData (reader, length, ignoreWhiteSpace) {
        if (ignoreWhiteSpace) {
            return reader.data.slice(this.offset, this.offset + length)
        }
        const data = reader.data.slice(this.offset, this.offset + length)
        if (isSpace(data[0])) {
            // In some cases, sliced buffer has white space in the first index which triggers invalid header check.
            // Shifting 1 byte resolves
            return reader.data.slice(this.offset + 1, this.offset + length + 1)
        }
        return data
    }

    decode (reader) {
        let { Filter, Length, DecodeParms } = this.dict
        if (Length === undefined) {
            throw new Error("Length is not defined")
        }
        if (Length instanceof Reference) {
            const length = Length.resolve(reader)
            Length = length.obj
            if (!Number.isInteger(Length)) {
                throw new Error(`Length ${Length} is not a valid integer`)
            }
        }
        if (this.offset === undefined) {
            throw new Error("offset is not defined")
        }
        if (Filter === undefined) {
            return this.sliceData(reader, Length, true)
        }
        const data = this.sliceData(reader, Length, false)
        switch (Filter) {
            case Decoders.ASCIIHexDecode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.ASCII85Decode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.LZWDecode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.FlateDecode:
                return FlateDecode(data, DecodeParms)
            case Decoders.RunLengthDecode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.CCITTFaxDecode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.JBIG2Decode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.DCTDecode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.JPXDecode:
                throw new Error(`Filter ${Filter} is not supported yet`)
            case Decoders.Crypt:
                throw new Error(`Filter ${Filter} is not supported yet`)
            default:
                throw new Error(`Unknown Filter ${Filter}`)
            }
    }

    inspect() {
        console.log(util.inspect(this, inspectOptions))
    }
}

export class XRef {
    constructor(ref, stream, inStream, offset) {
        this.ref = ref
        this.stream = stream
        this.inStream = inStream
        this.offset = offset
    }

    inspect() {
        console.log(util.inspect(this, inspectOptions))
    }
}

export class Dict extends Base {
    constructor() {
        super()
    }

    Key(key, reader) {
        super.Key(key, reader)
        if (this[key] === undefined) {
            console.error(`Key: ${key} is not defined in the Dictionary instance`)
        }
        if (this[key] instanceof Reference) {
            return this[key].resolve(reader)
        } else {
            return this[key]
        }
    }

    HasKey(key) {
        return this[key] !== undefined
    }

    inspect() {
        console.log(util.inspect(this, inspectOptions))
    }
}
