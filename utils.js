"use strict"

import { WSP, DLM } from "./constants.js"

export const printByteArray = (arr) => {
    for (let i = 0; i < arr.length; i++) {
        console.log(`[${i}]: ${arr[i]}: ${String.fromCharCode(arr[i])}`)
    }
}

export const byteArrayToString = (arr) => {
    const chars = []
    for (let i = 0; i < arr.length; i++) {
        chars.push(String.fromCharCode(arr[i]))
    }
    return chars.join("")
}

export const isSpace = (b) => {
    switch (b) {
        case WSP.NULL:
            return true
        case WSP.HT:
            return true
        case WSP.LF:
            return true
        case WSP.FF:
            return true
        case WSP.CR:
            return true
        case WSP.SP:
            return true
        default:
            return false
    }
}

export const isDelim = (b) => {
    switch (b) {
        case DLM.LeftParenthesis:
            return true
        case DLM.RightParenthesis:
            return true
        case DLM.LessThanSign:
            return true
        case DLM.GreaterThanSign:
            return true
        case DLM.LeftSquareBracket:
            return true
        case DLM.RightSquareBracket:
            return true
        case DLM.LeftCurlyBracket:
            return true
        case DLM.RightCurlyBracket:
            return true
        case DLM.Solidus:
            return true
        case DLM.PercentSign:
            return true
        default:
            return false
    }
}

export const isRegular = (b) => {
    return !isSpace(b) && !isDelim(b)
}

export const isNumber = (str) => {
    return !Number.isNaN(Number.parseFloat(str))
}

export const isInteger = (str) => {
    return Number.isSafeInteger(Number.parseFloat(str))
}

export const isReal = (str) => {
    return !Number.isNaN(Number.parseFloat(str))
}

export const parseNumber = (str) => {
    return Number.parseInt(str, 10)
}

export const parseReal = (str) => {
    return Number.parseFloat(str)
}

export const trimObject = (obj) => {
    if (typeof obj === "string") {
        return obj.trim()
    }
    return obj
}

export const toHexString = (bytes) => {
    return Array.from(bytes, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

export const hexDecode = (hex) => {
    let ascii = '';
    for (let i = 0; i < hex.length; i += 2) {
        ascii += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return ascii;
}

export const getVs = (buffer, w) => {
    let v1 = decodeInt(buffer.slice(0, w[0]))
    if (w[0] === 0) {
        v1 = 1
    }
    const v2 = decodeInt(buffer.slice(w[0], w[0] + w[1]))
    const v3 = decodeInt(buffer.slice(w[0] + w[1], w[0] + w[1] + w[2]))
    return {
        v1, v2, v3
    }
}

export const decodeInt = (buffer) => {
    let int = 0
    for (let i = 0; i < buffer.length; i++) {
        int = int << 8 | Number(buffer[i])
    }
    return int
}
