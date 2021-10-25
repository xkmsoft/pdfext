"use strict"

import { WSP, DLM, T } from "./constants.js"
import { Reference, Definition, Stream, Dict } from "./objects.js"
import {
    isDelim,
    isInteger,
    isReal,
    isSpace,
    parseNumber,
    parseReal,
    hexDecode,
    trimObject,
    isNumber
} from "./utils.js"

export class Lexer {
    constructor(data, offset) {
        this.data = data
        this.offset = offset
        this.pos = 0
        this.tokens = []
        this.ref = null
    }

    peek() {
        return this.readByte()
    }

    rewind(steps = 1) {
        this.pos = this.pos - steps
    }

    setPosition(position) {
        this.pos = position
    }

    rewindToken(token) {
        if (this.tokens.length) {
            const last = this.tokens[this.tokens.length - 1]
            if (last.tok === token.value) {
                this.rewind(last.steps)
                this.tokens.pop()
            } else {
                console.error(`Failed to rewind the token: type: ${token.type} value: ${token.value}`)
            }
        }
    }

    readByte() {
        if (this.pos >= this.data.length) {
            return -1
        }
        const byte = this.data[this.pos]
        this.pos++
        return byte
    }

    readToken() {
        const t0 = this.pos
        let byte = this.readByte()
        while (true) {
            if (isSpace(byte)) {
                byte = this.readByte()
            } else if (byte === DLM.PercentSign) {
                while (byte !== WSP.LF) {
                    byte = this.readByte()
                }
            } else {
                break
            }
        }
        switch (byte) {
            case DLM.LessThanSign:
                if (this.peek() === DLM.LessThanSign) {
                    this.tokens.push({tok: "<<", steps: this.pos - t0})
                    return {type: T.Keyword, value: "<<"}
                }
                this.rewind()
                const hexString = this.readHexString()
                this.tokens.push({tok: hexString, steps: this.pos - t0})
                return {type: T.String, value: hexString}

            case DLM.LeftParenthesis:
                const literalString = this.readLiteralString()
                this.tokens.push({tok: literalString, steps: this.pos - t0})
                return {type: T.String, value: literalString}

            case DLM.LeftSquareBracket:
                this.tokens.push({tok: String.fromCharCode(byte), steps: this.pos - t0})
                return {type: T.Keyword, value: String.fromCharCode(byte)}

            case DLM.RightSquareBracket:
                this.tokens.push({tok: String.fromCharCode(byte), steps: this.pos - t0})
                return {type: T.Keyword, value: String.fromCharCode(byte)}

            case DLM.LeftCurlyBracket:
                this.tokens.push({tok: String.fromCharCode(byte), steps: this.pos - t0})
                return {type: T.Keyword, value: String.fromCharCode(byte)}

            case DLM.RightCurlyBracket:
                this.tokens.push({tok: String.fromCharCode(byte), steps: this.pos - t0})
                return {type: T.Keyword, value: String.fromCharCode(byte)}

            case DLM.Solidus:
                const name = this.readName()
                this.tokens.push({tok: name, steps: this.pos - t0})
                return {type: T.Name, value: name}

            case DLM.GreaterThanSign:
                if (this.peek() === DLM.GreaterThanSign) {
                    this.tokens.push({tok: ">>", steps: this.pos - t0})
                    return {type: T.Keyword, value: ">>"}
                }
                this.rewind()
                break
            default:
                if (isDelim(byte)) {
                    //console.error(`unexpected delimiter: ${String.fromCharCode(byte)}`)
                    return {type: T.Null, value: null}
                }
                this.rewind()
                const keyword = this.readKeyword()
                this.tokens.push({tok: keyword.value, steps: this.pos - t0})
                return keyword
        }
    }

    readObject() {
        let token = this.readToken()
        switch (token.type) {
            case T.Null:
                return token.value
            case T.Keyword:
                switch (token.value) {
                    case "<<":
                        return this.readDict()
                    case "[":
                        return this.readArray()
                }
                break
            default:
                break
        }
        if (token.type === T.Integer) {
            const token2 = this.readToken()
            if (token2.type === T.Integer) {
                const token3 = this.readToken()
                if (token3.value === "R") {
                    return new Reference(token.value, token2.value)
                }
                if (token3.value === "obj") {
                    const prev = this.ref
                    this.ref = new Reference(token.value, token2.value)
                    const object = this.readObject()
                    if (object.type !== T.Stream) {
                        const token4 = this.readToken()
                        if (token4.type === T.Keyword) {
                            if (token4.value !== "endobj") {
                                console.error("missing endobj after indirect object definition")
                                this.rewindToken(token4)
                            }
                        }
                        this.ref = prev
                        return new Definition(new Reference(token.value, token2.value), object)
                    } else {
                        return new Definition(new Reference(token.value, token2.value), object.value)
                    }
                }
                this.rewindToken(token3)
            }
            this.rewindToken(token2)
        }
        return token.value
    }

    readLiteralString() {
        let byte
        const buffer = []
        while (true) {
            byte = this.readByte()
            if (byte === DLM.RightParenthesis) {
                break
            }
            buffer.push(String.fromCharCode(byte))
        }
        return buffer.join("")
    }

    readHexString() {
        let byte
        const buffer = []
        while (true) {
            byte = this.readByte()
            if (byte === DLM.GreaterThanSign) {
                break
            }
            buffer.push(String.fromCharCode(byte))
        }
        return hexDecode(buffer.join(""))
    }

    readArray() {
        const array = []
        while (true) {
            const token = this.readToken()
            if (token.type === T.Null || (token.type === T.Keyword && token.value === "]")) {
                break
            }
            this.rewindToken(token)
            array.push(this.readObject())
        }
        return array
    }

    readDict() {
        const dict = new Dict()
        while (true) {
            const token = this.readToken()
            if (token.type === T.Null) {
                break
            }
            if (token.type === T.Keyword && token.value === ">>") {
                break
            }
            if (token.type !== T.Name) {
                console.error(`unexpected non name key ${token.value}`)
                continue
            }
            let object = this.readObject()
            dict[token.value] = trimObject(object)
        }

        const token = this.readToken()
        if (token.value !== "stream") {
            this.rewindToken(token)
            return dict
        }

        const byte = this.readByte()
        switch (byte) {
            case WSP.CR:
                if (this.peek() === WSP.LF) {
                    this.rewind()
                }
                break
            case WSP.LF:
                break
            default:
                break
        }
        const stream = new Stream(dict, this.ref, this.offset + this.pos)
        return {
            type: T.Stream,
            value: stream
        }
    }

    readName() {
        let byte
        const buffer = []
        while (true) {
            byte = this.readByte()
            if (isSpace(byte) || isDelim(byte)) {
                this.rewind()
                break
            }
            buffer.push(String.fromCharCode(byte))
        }
        return buffer.join("").trim()
    }

    readKeyword() {
        const buffer = []
        let byte
        while (true) {
            byte = this.readByte()
            if (byte === -1) {
                break
            }
            if (isDelim(byte) || isSpace(byte)) {
                this.rewind()
                break
            }
            buffer.push(String.fromCharCode(byte))
        }
        const key = buffer.join("")
        if (isNumber(key)) {
            if (isInteger(key)) {
                return {type: T.Integer, value: parseNumber(key)}
            }
            return {type: T.Real, value: parseReal(key)}
        }
        switch (key) {
            case "null":
                return {type: T.Null, value: null}
            case "true":
                return {type: T.Boolean, value: true}
            case "false":
                return {type: T.Boolean, value: false}
            default:
                const trimmed = key.trim()
                if (trimmed.length === 0) {
                    return {type: T.EOF, value: "EOF"}
                }
                return {type: T.Keyword, value: trimmed}
        }
    }
}
