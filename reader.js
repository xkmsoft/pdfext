"use strict"

import { readFileSync } from "fs"
import { Buffer } from 'buffer'
import * as util from "util";
import { Lexer } from "./lexer.js";
import { getVs } from "./utils.js";
import { Reader, Reference, Stream, XRef } from "./objects.js";
import { T } from "./constants.js";

export class PDFReader {
    constructor(path) {
        this.data = this.readPDFFile(path)
        this.trailerOffsets = []
        this.trailer = null
        this.xrefOffsets = this.findXrefOffsets()
        this.xrefs = []
        this.readXRefTables()
        this.reader = new Reader(this.data, this.xrefs)
        this.rootCatalog = null
        this.pagesCatalog = null
        this.pages = []
        this.buildPDFStructure()
    }

    readPDFFile (path) {
        const content = readFileSync(path)
        return Buffer.from(content)
    }

    readXRefTables () {
        if (this.xrefOffsets.length === 0) {
            throw new Error(`Xref offsets could not be found`)
        }
        this.trailerOffsets = this.findTrailerOffsets()
        if (this.trailerOffsets.length === 0) {
            // In stream
            const xrefs = []
            const xrefOffset = this.xrefOffsets[0]
            const lexer = new Lexer(this.data.slice(xrefOffset, this.data.length - 1), xrefOffset)
            const trailer = lexer.readObject()
            if (trailer.HasKey("Prev")) {
                const prev = trailer.Key("Prev")
                const lex2 = new Lexer(this.data.slice(prev, this.data.length - 1), prev)
                const trailer2 = lex2.readObject()
                const refs = this.readXrefReferences(trailer2)
                xrefs.push(refs)
            }
            const refs = this.readXrefReferences(trailer)
            xrefs.push(refs)
            this.trailer = trailer
            if (this.trailer.Key("Size") !== xrefs.flat().length) {
                throw new Error(`All references could not be found. Size in the trailer ${this.trailer.Key('Size')} and the found ${xrefs.length}`)
            }
            this.xrefs = xrefs.flat()
        } else {
            // In trailer
            const xrefOffset = this.xrefOffsets[0]
            const xrefs = []
            let matched = false
            for (let i = 0; i < this.trailerOffsets.length; i++) {
                const lexer = new Lexer(this.data.slice(this.trailerOffsets[i] + 8, this.data.length - 1), this.trailerOffsets[i])
                this.trailer = lexer.readObject()
                if (this.trailer.HasKey("Prev")) {
                    const prev = this.trailer.Key("Prev")
                    const refs = this.findReferences(prev, this.data.length - 1)
                    xrefs.push(refs)
                }
                const refs = this.findReferences(xrefOffset, this.trailerOffsets[i])
                xrefs.push(refs)
                if (this.trailer.Key("Size") === xrefs.flat().length) {
                    // Size matches: break
                    this.xrefs = xrefs.flat()
                    matched = true
                    break
                }
            }
            if (!matched) {
                throw new Error(`All references could not be found. Size in the trailer ${this.trailer.Key('Size')} and the found ${xrefs.length}`)
            }
        }
    }

    readXrefReferences (trailer) {
        if (!trailer.obj instanceof Stream) {
            throw new Error("trailer object is not Stream")
        }
        const decoded = trailer.obj.decode(new Reader(this.data))
        const dict = trailer.obj.dict
        let index = dict.Index
        if (index === undefined) {
            const size = dict.Size
            if (size === undefined) {
                throw new Error("Size could not be found")
            }
            if (!Number.isInteger(size)) {
                throw new Error("Size is not a valid integer")
            }
            index = [0, size]
        }
        if (!Array.isArray(index)) {
            throw new Error("Index is not array")
        }
        if (index.length % 2 !== 0) {
            throw new Error(`Invalid index array length: ${index.length}`)
        }
        const w = dict.W
        if (w === undefined) {
            throw new Error('W array could not be found')
        }
        if (!Array.isArray(w)) {
            throw new Error('W is not array')
        }
        if (w.length < 3) {
            throw new Error(`Invalid W array size: ${w.length}`)
        }
        const length = dict.Length
        if (length === undefined) {
            throw new Error('Length could not be found')
        }
        if (!Number.isInteger(length)) {
            throw new Error(`Length is not valid integer: ${length}`)
        }
        const wTotal = w.reduce((a, b) => a + b, 0)
        const start = index[0]
        const end = index[1]
        if (wTotal * end !== decoded.length) {
            throw new Error("Invalid parameters wTotal * index[1] must be decoded stream length")
        }
        const xrefs = []
        let buffer = []
        let looper = 0
        for (let i = 0; i <= end * wTotal; i++) {
            if (i !== 0 && i % wTotal === 0) {
                const { v1, v2, v3 } = getVs(buffer, w)
                switch (v1) {
                    case 0:
                        const x0 = new XRef(new Reference(0, 65535))
                        xrefs.push(x0)
                        break
                    case 1:
                        const x1 = new XRef(new Reference(start + looper, v3), null, false, v2)
                        xrefs.push(x1)
                        break
                    case 2:
                        const x2 = new XRef(new Reference(start + looper, 0), new Reference(v2, 0), true, v3)
                        xrefs.push(x2)
                        break
                    default:
                        throw new Error(`Invalid xref stream type: ${v1}`)
                }
                buffer = []
                looper++
            }
            buffer.push(decoded[i])
        }
        return xrefs
    }

    findAllIndexes(buffer, value) {
        const indexes = []
        let index = -1
        while ((index = buffer.indexOf(value, index + 1)) !== -1){
            indexes.push(index)
        }
        return indexes
    }

    findXrefOffsets () {
        const versions = [
            Buffer.from([115, 116, 97, 114, 116, 120, 114, 101, 102, 10]),
            Buffer.from([115, 116, 97, 114, 116, 120, 114, 101, 102, 13]),
        ]
        let indexes = []
        for (let i = 0; i < versions.length; i++) {
            indexes = this.findAllIndexes(this.data, versions[i])
            if (indexes.length) {
                break
            }
        }
        if (indexes.length === 0) {
            return []
        }
        const offsets = []
        for (let i = 0; i < indexes.length; i++) {
            const lexer = new Lexer(this.data.slice(indexes[i] + versions[0].length, this.data.length - 1))
            const token = lexer.readToken()
            if (token.type === T.Integer && token.value !== 0) {
                offsets.push(token.value)
            }
        }
        return offsets
    }

    findTrailerOffsets () {
        const versions = [
            Buffer.from([116, 114, 97, 105, 108, 101, 114, 10]),
            Buffer.from([116, 114, 97, 105, 108, 101, 114, 13])
        ]
        let indexes = []
        for (let i = 0; i < versions.length; i++) {
            indexes = this.findAllIndexes(this.data, versions[i])
            if (indexes.length) {
                break
            }
        }
        return indexes
    }

    findReferences (xrefOffset, trailerOffset) {
        const xref = Buffer.from([120, 114, 101, 102, 10])
        const refs = []
        const lexer = new Lexer(this.data.slice(xrefOffset + xref.length, trailerOffset))
        while (true) {
            const number = lexer.readToken()
            const count = lexer.readToken()
            if (number.type === T.EOF || count.type === T.EOF) {
                break
            }
            if (number.type !== T.Integer && count.type !== T.Integer) {
                break
            }
            const ref = { id: number.value, count: count.value, refs: [] }
            for (let i = 0; i < ref.count; i++) {
                const offset = lexer.readToken()
                const gen = lexer.readToken()
                const inUse = lexer.readToken()
                if (offset.type !== T.Integer && gen.type !== T.Integer && inUse.type !== T.Keyword) {
                    throw new Error(`Malformed references offset and generation should be numbers and in use flag single character`)
                }
                ref.refs.push(new XRef(
                    new Reference(ref.id + i, gen.value),
                    null,
                    false,
                    offset.value
                ))
            }
            refs.push(ref)
        }
        // Flattening the refs to obtain single array of XRefs
        return refs.reduce((acc, val) => acc.concat(val.refs), [])
    }

    buildPDFStructure () {
        this.rootCatalog = this.trailer.Key("Root", this.reader)
        this.pagesCatalog = this.rootCatalog.Key("Pages", this.reader)
        const pageCount = this.pagesCatalog.Key("Count")
        const kidsCount = this.pagesCatalog.Key("Kids").length
        if (pageCount === kidsCount) {
            // Pages do not have any grand-children
            for (let index = 0; index < kidsCount; index++) {
                const page = this.findPage(this.pagesCatalog.Key("Kids"), index)
                this.pages.push(page)
            }
        }
        if (pageCount > kidsCount) {
            // Pages have also grand-children | in-definite levels (recursively will be found)
            for (let index = 0; index < kidsCount; index++) {
                const pages = this.pagesCatalog.Key("Kids")[index].resolve(this.reader)
                const kids = this.findKids(pages)
                this.pages.push(...kids)
            }
        }
        if (pageCount === this.pages.length) {
            console.log(`All ${pageCount} pages build successfully`)
        } else {
            throw new Error(`Reported page size is ${pageCount} but the built page size is ${this.pages.length}`)
        }
    }

    findKids (p) {
        const pages = []
        for (let j = 0; j < p.Key("Kids").length; j++) {
            const page = p.Key("Kids")[j].resolve(this.reader)
            page.Key("Type") === "Pages" ? pages.push(...this.findKids(page)) : pages.push(page)
        }
        return pages
    }

    findPage (kids, index) {
        if (index > kids.length - 1) {
            throw new Error(`Invalid structure: page ${index + 1} does not exists in the Kids array even though 
            reported page number in the catalog was ${this.pageSize()}. Current kids size: ${kids.length}`)
        }
        const page = kids[index].resolve(this.reader)
        // If type is Pages (intermediate leaf): keep searching recursively until find the leaf which has type Page
        return (page.Key("Type") === "Pages") ? this.findPage(page.Key("Kids"), index) : page
    }

    pageSize () {
        return this.pages.length
    }

    page (index) {
        if (index + 1 > this.pageSize()) {
            throw new Error(`Page ${index + 1} does not exists in the catalog. Page size of PDF is: ${this.pageSize()}`)
        }
        const page = this.pages[index]
        const resources = page.Key("Resources", this.reader)
        const Font = resources.Key("Font")
        const fontNames = Object.keys(Font)
        const fonts = {}
        for (let i = 0; i < fontNames.length; i++) {
            const key = fontNames[i]
            fonts[key] = Font.Key(key, this.reader)
        }
        return page.Key("Contents", this.reader, fonts)
    }

    inspect () {
        console.log(util.inspect(this, {showHidden: false, depth: null, colors: true}))
    }
}
