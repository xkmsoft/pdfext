import {Matrix3x3} from "./matrix.js";
import {Definition, Dict, Reference} from "./objects.js";

export class GlyphState {
    constructor() {
        // Character spacing
        this.tc = 0
        // Word spacing
        this.tw = 0
        // Horizontal scaling
        this.th = 1
        // Leading
        this.tl = 0
        // Text font
        this.tf = undefined
        // Text font dictionary
        this.fonts = undefined
        // Text font size
        this.tfs = undefined
        // Text rendering mode
        this.tmode = 0
        // Text rise
        this.trise = 0
        // Text knockout
        this.tk = true
        // Text matrix
        this.tm = Matrix3x3.Identity()
        // Text line matrix
        this.tlm = Matrix3x3.Identity()
        // Text rendering matrix
        this.trm = Matrix3x3.Identity()
        // Current transformation matrix
        this.ctm = Matrix3x3.Identity()
        // Text
        this.text = ""
        // Reader instance
        this.reader = undefined
    }

    static initialize (fonts, reader) {
        const state = new GlyphState()
        state.fonts = fonts
        state.reader = reader
        return state
    }

    Font () {
        const font = this.fonts[this.tf]
        if (font instanceof Definition) {
            return font.obj
        }
        if (font instanceof Dict) {
            return font
        }
    }

    Widths () {
        const widths = this.Font()["Widths"]
        if (widths instanceof Reference) {
            return widths.resolve(this.reader)
        }
        return widths
    }

    Encoding() {
        const encoding = this.Font()["Encoding"]
        if (encoding instanceof Reference) {
            return encoding.resolve(this.reader)
        }
        return encoding
    }

    Width (n) {
        const font = this.Font()
        if (font === undefined) {
            return 0
        }
        const firstChar = font["FirstChar"]
        const lastChar = font["LastChar"]
        if (n < firstChar || lastChar < n) {
            return 0
        }
        const widths = this.Widths()
        if (widths === undefined) {
            return 0
        }
        return widths[n - firstChar]
    }

    Tc (charSpace) {
        this.tc = charSpace
    }

    Tw (wordSpace) {
        this.tw = wordSpace
    }

    Tz (scale) {
        this.th = scale
    }

    TL (leading) {
        this.tl = leading
    }

    Tf (textFont, fontSize) {
        this.tf = textFont
        this.tfs = fontSize
    }

    Tr (mode) {
        this.tmode = mode
    }

    Ts (rise) {
        this.trise = rise
    }

    Td (tx, ty) {
        const matrix = new Matrix3x3([
            1, 0, 0,
            0, 1, 0,
            tx, ty, 1
        ]).Mul(this.tlm)
        this.tm = matrix
        this.tlm = matrix
    }

    TD (tx, ty) {
        this.tl = -1 * ty
        this.Td(tx, ty)
    }

    Tm (a, b, c, d, e, f) {
        const matrix = new Matrix3x3([
            a, b, 0,
            c, d, 0,
            e, f, 1
        ])
        this.tm = matrix
        this.tlm = matrix
    }

    TAsterisk () {
        const tx = 0
        const ty = -1 * this.tl
        this.Td(tx, ty)
    }

    ComputeTrm () {
        const matrix = new Matrix3x3([
            this.tfs * this.th, 0,          0,
            0,                  this.tfs,   0,
            0,                  this.trise, 1
        ])
        this.trm = matrix.Mul(this.tm).Mul(this.ctm)
    }

    showTextString (text) {
        const texts = []
        let fontName = ""
        const font = this.Font()
        if (font !== undefined) {
            fontName = font["BaseFont"]
            if (fontName === undefined) {
                fontName = "Undefined"
            }
        }
        // TODO: Implement using the current encoding
        //const encoding = this.Encoding()
        for (let i = 0; i < text.length; i++) {
            const char = text[i]
            this.ComputeTrm()
            const w0 = this.Width(char.charCodeAt(0))
            if (char !== " ") {
                const fontSize = this.trm.v[0][0]
                const x = this.trm.v[2][0]
                const y = this.trm.v[2][1]
                const w = w0 / 1000 * this.trm.v[0][0]
                texts.push(new Text(this.tf, fontName, fontSize, x, y, w, char))
            }
            let tx = w0 / 1000 * this.tfs + this.tc
            if (char === " ") {
                tx = tx + this.tw
            }
            tx = tx * this.th
            this.tm = new Matrix3x3([
                1, 0, 0,
                0, 1, 0,
                tx, 0, 1
            ]).Mul(this.tm)
        }
        return texts
    }
}

export class Text {
    constructor(fontName, font, fontSize, x, y, w, text) {
        this.fontName = fontName
        this.font = font
        this.fontSize = fontSize
        this.x = x
        this.y = y
        this.w = w
        this.text = text
    }
}
