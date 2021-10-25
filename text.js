"use strict"

import { Lexer } from "./lexer.js"
import { T } from "./constants.js"
import {GlyphState, Text} from "./glyph.js"
import {Matrix3x3} from "./matrix.js"

const CATEGORY = {
    GeneralGraphicsState: 1,
    SpecialGraphicsState: 2,
    PathConstruction: 3,
    PathPainting: 4,
    ClippingPaths: 5,
    TextObjects: 6,
    TextState: 7,
    TextPositioning: 8,
    TextShowing: 9,
    Type3Fonts: 10,
    Color: 11,
    ShadingPatterns: 12,
    InlineImages: 13,
    XObjects: 14,
    MarkedContent: 15,
    Compatibility: 16
}

const OP = {
    cm: {
        value: "cm",
        type: CATEGORY.SpecialGraphicsState,
        args: 6
    },
    q: {
        value: "q",
        type: CATEGORY.SpecialGraphicsState,
        args: 0
    },
    Q: {
        value: "Q",
        type: CATEGORY.SpecialGraphicsState,
        args: 0
    },
    BT: {
        value: "BT",
        type: CATEGORY.TextObjects,
        args: 0
    },
    ET: {
        value: "ET",
        type: CATEGORY.TextObjects,
        args: 0
    },
    Tc: {
        value: "Tc",
        type: CATEGORY.TextState,
        args: 1
    },
    Tw: {
        value: "Tw",
        type: CATEGORY.TextState,
        args: 1
    },
    Tz: {
        value: "Tz",
        type: CATEGORY.TextState,
        args: 1
    },
    TL: {
        value: "TL",
        type: CATEGORY.TextState,
        args: 1
    },
    Tf: {
        value: "Tf",
        type: CATEGORY.TextState,
        args: 2
    },
    Tr: {
        value: "Tr",
        type: CATEGORY.TextState,
        args: 1
    },
    Ts: {
        value: "Ts",
        type: CATEGORY.TextState,
        args: 1,
    },
    Td: {
        value: "Td",
        type: CATEGORY.TextPositioning,
        args: 2
    },
    TD: {
        value: "TD",
        type: CATEGORY.TextPositioning,
        args: 2,
    },
    Tm: {
        value: "Tm",
        type: CATEGORY.TextPositioning,
        args: 6,
    },
    TAsterisk: {
        value: "T*",
        type: CATEGORY.TextPositioning,
        args: 0,
    },
    Tj: {
        value: "Tj",
        type: CATEGORY.TextShowing,
        args: 1
    },
    TJ: {
        value: "TJ",
        type: CATEGORY.TextShowing,
        args: 1
    },
    TSQuote: {
        value: "'",
        type: CATEGORY.TextShowing,
        args: 1
    },
    TDQuote: {
        value: "\"",
        type: CATEGORY.TextShowing,
        args: 3
    },

}

export const textDecoder = (data, reader, fonts) => {

    const decode = () => {
        const texts = []
        const lexer = new Lexer(data)
        let glyph = GlyphState.initialize(fonts, reader)
        const glyphStack = []
        interpreter(lexer, (stack, op) => {
            let args = []
            for (let i = stack.length - 1; i >= 0; i--) {
                // FIFO behaviour
                args.push(stack.shift())
            }
            // Update CTM
            if (op === OP.cm.value) {
                if (args.length !== OP.cm.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ a, b, c, d, e, f ] = args
                const matrix = new Matrix3x3([
                    a, b, 0,
                    c, d, 0,
                    e, f, 1,
                ])
                glyph.ctm = matrix.Mul(glyph.ctm)
                return
            }

            // Save current graphic state into the stack
            if (op === OP.q.value) {
                glyphStack.push(glyph)
                return
            }

            // Restore graphics state from the stack
            if (op === OP.Q.value) {
                glyph = glyphStack.pop()
                return
            }

            // Begin text
            if (op === OP.BT.value) {
                glyph = GlyphState.initialize(fonts, reader)
                return
            }

            // End text
            if (op === OP.ET.value) {
                return
            }

            // Set character space
            if (op === OP.Tc.value) {
                if (args.length !== OP.Tc.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ charSpace ] = args
                glyph.Tc(charSpace)
                return
            }

            // Set word space
            if (op === OP.Tw.value) {
                if (args.length !== OP.Tw.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ wordSpace ] = args
                glyph.Tw(wordSpace)
                return
            }

            // Set horizontal scale
            if (op === OP.Tz.value) {
                if (args.length !== OP.Tz.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ scale ] = args
                glyph.Tz(scale)
                return
            }

            // Set Leading
            if (op === OP.TL.value) {
                if (args.length !== OP.TL.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ leading ] = args
                glyph.TL(leading)
                return
            }

            // Set text font and size
            if (op === OP.Tf.value) {
                if (args.length !== OP.Tf.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ textFont, textSize ] = args
                glyph.Tf(textFont, textSize)
                return
            }

            // Set rendering mode
            if (op === OP.Tr.value) {
                if (args.length !== OP.Tr.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ mode ] = args
                glyph.Tr(mode)
                return
            }

            // Set text rise
            if (op === OP.Ts.value) {
                if (args.length !== OP.Ts.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ rise ] = args
                glyph.Ts(rise)
                return
            }

            // Move to the start of the next line
            if (op === OP.Td.value) {
                if (args.length !== OP.Td.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ tx, ty ] = args
                glyph.Td(tx, ty)
                return
            }

            // Move to the start of the next line
            if (op === OP.TD.value) {
                if (args.length !== OP.TD.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ tx, ty ] = args
                glyph.TD(tx, ty)
                return
            }

            // Set the text matrix (tm) and the text line matrix (tlm)
            if (op === OP.Tm.value) {
                if (args.length !== OP.Tm.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ a, b, c, d, e, f ] = args
                glyph.Tm(a, b, c, d, e, f)
                return
            }

            // Move to the start of the next line
            if (op === OP.TAsterisk.value) {
                if (args.length !== OP.TAsterisk.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                glyph.TAsterisk()
                return
            }

            // Show text
            if (op === OP.Tj.value) {
                if (args.length !== OP.Tj.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ text ] = args
                texts.push(...glyph.showTextString(text))
                return
            }

            // Move to the next line and show a text string
            if (op === OP.TSQuote.value) {
                if (args.length !== OP.TSQuote.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ text ] = args
                glyph.TAsterisk()
                texts.push(...glyph.showTextString(text))
                return
            }

            // Move to the next line and show a text string
            if (op === OP.TDQuote.value) {
                if (args.length !== OP.TDQuote.args) {
                    console.error(`bad parameters for operand: ${op}`)
                    return
                }
                const [ wordSpace, charSpace, text ] = args
                glyph.Tw(wordSpace)
                glyph.Tc(charSpace)
                glyph.TAsterisk()
                texts.push(...glyph.showTextString(text))
                return
            }

            // Show one or more text strings, allowing individual glyph positioning
            if (op === OP.TJ.value) {
                if (args.length !== OP.TJ.args) {
                    console.error(`bad parameters for operand ${op}`)
                    return
                }
                const [ array ] = args
                for (let i = 0; i < array.length; i++) {
                    const value = array[i]
                    if (typeof value === "string") {
                        texts.push(...glyph.showTextString(value))
                    }
                    if (typeof value === "number") {
                        const tx = -1 * value / 1000 * glyph.tfs * glyph.th
                        const matrix = new Matrix3x3([
                            1,  0, 0,
                            0,  1, 0,
                            tx, 0, 1
                        ])
                        glyph.tm = matrix.Mul(glyph.tm)
                    }
                }
            }
        })

        return normalize(texts)
    }

    const interpreter = (lexer, callback) => {
        let stack = []
        const validOperands = Object.keys(OP).map(key => OP[key].value)
        while (true) {
            const token = lexer.readToken()
            if (token.type === T.EOF) {
                break
            }
            if (lexer.pos >= data.length) {
                break
            }
            if (token.type === T.Keyword) {
                if (token.value === OP.BT.value) {
                    // Begin Text
                    stack = []
                    callback(stack, token.value)
                }
                if (token.value === OP.ET.value) {
                    // End Text
                    stack = []
                    callback(stack, token.value)
                }
                if (token.value === "[") {
                    stack.push(lexer.readArray())
                    continue
                }
                const index = validOperands.indexOf(token.value)
                if (index === -1) {
                    stack = []
                } else {
                    callback(stack, token.value)
                }
            } else {
                stack.push(token.value)
            }
        }
    }

    const normalize = (texts) => {
        const words = []
        // Sort by y coordinate to sort the text by lines without breaking the x order
        const sorted = texts.sort((a, b) => {
            if (a.y < b.y) {
                return 1
            }
            if (a.y > b.y) {
                return -1
            }
            return 0
        })
        const yThreshold = 0.1
        const xThreshold = 0.1
        let word = ''
        for (let i = 0; i < sorted.length; i++) {
            const prev = sorted[i - 1]
            const curr = sorted[i]
            if (prev === undefined) {
                word += curr.text
                continue
            }
            const charSpace = curr.fontSize / 6
            const wordSpace = curr.fontSize * 2 / 3
            const deltaY = Math.abs(curr.y - prev.y)
            const deltaFont = Math.abs(curr.fontSize - prev.fontSize)
            const haveSameFonts = prev.fontName === curr.fontName

            if (deltaY > yThreshold) {
                // Line changes; push the word and reset the word buffer
                words.push(word)
                word = curr.text
                continue
            }
            if (haveSameFonts && (deltaFont < xThreshold) && (curr.x <= (prev.x + prev.w) + charSpace )) {
                // Same word; continue to concatenate
                word += curr.text
                if (i + 1 === sorted.length) {
                    words.push(word)
                }
            } else if (haveSameFonts && (deltaFont < xThreshold) && (curr.x <= (prev.x + prev.w) + wordSpace )) {
                // Word changes: push the current text into the array
                words.push(word)
                word = curr.text
            }
        }
        return words
    }

    return {
        decode: decode
    }
}
