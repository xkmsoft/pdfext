"use strict"

import { Lexer } from "./lexer.js";
import { T } from "./constants.js"
import { unicodeConverter } from "./utils.js";

const TEXT_OPS = {
    /*
    BT: Begin Text
     */
    BT: "BT",

    /*
    ET: End Text
     */
    ET: "ET",
}

const STATE_OPS = {
    /*
    Tc: Set the character spacing, Tc, to charSpace, which shall be a number expressed in unscaled text space units.
    Character spacing shall be used by the Tj, TJ, and ' operators. Initial value: 0.
     */
    Tc: "Tc",

    /*
    Tw: Set the word spacing, Tw, to wordSpace, which shall be a number expressed in unscaled text space units.
    Word spacing shall be used by the Tj, TJ, and ' operators. Initial value: 0.
     */
    Tw: "Tw",

    /*
    Tz: Set the horizontal scaling, Th, to (scale ÷ 100). scale shall be a number specifying the percentage of
     the normal width. Initial value: 100 (normal width).
     */
    Tz: "Tz",

    /*
    TL: Set the text leading, Tl, to leading, which shall be a number expressed in unscaled text space units.
    Text leading shall be used only by the T*, ', and " operators. Initial value: 0.
     */
    TL: "TL",

    /*
    Tf: Set the text font, Tf, to font and the text font size, Tfs, to size. font shall be the name of a font
     resource in the Font sub-dictionary of the current resource dictionary; size shall be a number representing
     a scale factor. There is no initial value for either font or size; they shall be specified explicitly
     by using Tf before any text is shown.
     */
    Tf: "Tf",

    /*
    Tr: Set the text rendering mode, Tmode, to render, which shall be an integer. Initial value: 0.
     */
    Tr: "Tr",

    /*
    Ts: Set the text rise, Trise, to rise, which shall be a number expressed in unscaled text space units.
    Initial value: 0.
     */
    Ts: "Ts",

    /*
    Td: Move to the start of the next line, offset from the start of the current line by (tx, ty).
    tx and ty shall denote numbers expressed in unscaled text space units.
     */
    Td: "Td",

    /*
    TD: Move to the start of the next line, offset from the start of the current line by (tx, ty).
    As a side effect, this operator shall set the leading parameter in the text state.
    This operator shall have the same effect as this code:
     */
    TD: "TD",

    /*
    TM: Set the text matrix, Tm, and the text line matrix, Tlm:
    The operands shall all be numbers, and the initial value for Tm and Tlmshall be the identity matrix, [1 0 0 1 0 0].
    Although the operands specify a matrix, they shall be passed to Tm as six separate numbers, not as an array.
    The matrix specified by the operands shall not be concatenated onto the current text matrix, but shall replace it.
     */
    TM: "TM",

    /*
    T*: Move to the start of the next line. This operator has the same effect as the code 0 -Tl Td
    where Tl denotes the current leading parameter in the text state. The negative of Tl is used here because Tl is
     the text leading expressed as a positive number. Going to the next line entails decreasing the y coordinate.
     */
    TAsterisk: "T*",

    /*
    Tj: Shows a text string
     */
    Tj: "Tj",

    /*
    ': Move to the next line and show a text string. This operator shall have the same effect as the code T*
    string Tj
     */
    TSQuote: " '",

    /*
    ": Move to the next line and show a text string, using aw as the word spacing and ac as the character spacing
    (setting the corresponding parameters in the text state). aw and ac shall be numbers expressed in unscaled
    text space units. This operator shall have the same effect as this code:
    aw Tw
    ac Tc
    string '
     */
    TDQuote: ` "`,

    /*
    TJ: Show one or more text strings, allowing individual glyph positioning. Each element of array shall be either
     a string or a number. If the element is a string, this operator shall show the string. If it is a number,
     the operator shall adjust the text position by that amount; that is, it shall translate the text matrix,
     Tm. The number shall be expressed in thousandths of a unit of text space (see 9.4.4, "Text Space Details").
     This amount shall be subtracted from the current horizontal or vertical coordinate, depending on the writing mode.
      In the default coordinate system, a positive adjustment has the effect of moving the next glyph painted either
       to the left or down by the given amount. Figure 46 shows an example of the effect of passing offsets to TJ.
     */
    TJ: "TJ",
}

export const simpleTextDecoder = (data) => {
    const slice = data

    const decode = () => {
        const texts = []
        const lexer = new Lexer(slice)
        while (true) {
            const token = lexer.readToken()
            if (token.type === T.EOF) {
                break
            }
            if (lexer.pos >= slice.length) {
                break
            }
            if (token.type === T.String) {
                texts.push(token.value)
            }
        }
        return texts
    }

    return {
        decode: decode
    }
}

export const textDecoder = (data) => {
    const slice = data

    const decode = () => {
        const texts = []
        const lexer = new Lexer(slice)
        let x, y, font, fontSize, text
        interpreter(lexer, (stack, op) => {
            let args = []
            for (let i = stack.length - 1; i >= 0; i--) {
                args.push(stack.pop())
            }
            switch (op) {
                case STATE_OPS.TD:
                    if (args.length !== 2) {
                        console.error(`bad parameters for operand: ${op}`)
                        break
                    }
                    x = args[0]
                    y = args[1]
                    break
                case STATE_OPS.Tf:
                    if (args.length !== 2) {
                        console.error(`bad parameters for operand: ${op}`)
                        break
                    }
                    font = args[0]
                    fontSize = args[1]
                    break
                case STATE_OPS.Tj:
                    if (args.length !== 1) {
                        console.error(`bad parameters for operand: ${op}`)
                        break
                    }
                    text = args[0]
                    texts.push({font, fontSize, x, y, text: unicodeConverter(text)})
                    break
                case STATE_OPS.TJ:
                    if (args.length !== 1) {
                        console.error(`bad parameters for operand ${op}`)
                        break
                    }
                    const values = args[0]
                    for (let i = 0; i < values.length; i++) {
                        const value = values[i]
                        if (typeof value === "string") {
                            texts.push({font, fontSize, x, y, text: unicodeConverter(value)})
                        }
                    }
                    break
                default:
                    return
            }
        })
        return texts
    }

    const interpreter = (lexer, callback) => {
        let stack = []
        // TODO: Improve the interpreter by implementing all valid operands
        //  PDF 32000-1:2008 --> Section 9: Text
        const validOperands = [STATE_OPS.TD, STATE_OPS.Tf, STATE_OPS.Tj, STATE_OPS.TJ]
        while (true) {
            const token = lexer.readToken()
            if (token.type === T.EOF) {
                break
            }
            if (lexer.pos >= slice.length) {
                break
            }
            if (token.type === T.Keyword) {
                if (token.value === TEXT_OPS.BT) {
                    // Begin Text
                    stack = []
                    continue
                }
                if (token.value === TEXT_OPS.ET) {
                    // End Text
                    stack = []
                    continue
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

    return {
        decode: decode
    }
}
