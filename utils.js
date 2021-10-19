"use strict"

import { WSP, DLM } from "./constants.js";
import { Reference, XRef } from "./objects.js";
import {Buffer} from "buffer";

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

export const isInteger = (str) => {
    return Number.isInteger(Number.parseInt(str, 10))
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

/*
	20	32	 	@	40	64	 	`	60	  96
!	21	33	 	A	41	65	 	a	61	  97
"	22	34	 	B	42	66	 	b	62	  98
#	23	35	 	C	43	67	 	c	63	  99
$	24	36	 	D	44	68	 	d	64	100
%	25	37	 	E	45	69	 	e	65	101
&	26	38	 	F	46	70	 	f	66	102
'	27	39	 	G	47	71	 	g	67	103
(	28	40	 	H	48	72	 	h	68	104
)	29	41	 	I	49	73	 	i	69	105
*	2a	42	 	J	4a	74	 	j	6a	106
+	2b	43	 	K	4b	75	 	k	6b	107
,	2c	44	 	L	4c	76	 	l	6c	108
-	2d	45	 	M	4d	77	 	m	6d	109
.	2e	46	 	N	4e	78	 	n	6e	110
/	2f	47	 	O	4f	79	 	o	6f	111
0	30	48	 	P	50	80	 	p	70	112
1	31	49	 	Q	51	81	 	q	71	113
2	32	50	 	R	52	82	 	r	72	114
3	33	51	 	S	53	83	 	s	73	115
4	34	52	 	T	54	84	 	t	74	116
5	35	53	 	U	55	85	 	u	75	117
6	36	54	 	V	56	86	 	v	76	118
7	37	55	 	W	57	87	 	w	77	119
8	38	56	 	X	58	88	 	x	78	120
9	39	57	 	Y	59	89	 	y	79	121
:	3a	58	 	Z	5a	90	 	z	7a	122
;	3b	59	 	[	5b	91	 	{	7b	123
<	3c	60	 	\	5c	92	 	|	7c	124
=	3d	61	 	]	5d	93	 	}	7d	125
>	3e	62	 	^	5e	94	 	~	7e	126
?	3f	63	 	_	5f	95	 	Delete	7f	127
 */

export const isValidChar = (c) => {
    if (c >= 48 && c <= 57) {
        // Numeric
        return true
    }
    if (c >= 56 && c <= 90) {
        // Alpha (Capital)
        return true
    }
    if (c >= 97 && c <= 122) {
        // Alpha (Lowercase)
        return true
    }
    const validSymbols = [32, 33, 34, 39, 40, 41, 42, 45, 46, 58, 59, 61, 63, 64]
    if (validSymbols.includes(c)) {
        // Symbols
        return true
    }
    return false
}

export const cleanText = (s) => {
    // Removal of non-ASCII characters
    if (s.includes("\\")) {
        const parts = s.split("\\")
        const ss = []
        for (let i = 0; i < parts.length; i++) {
            const number = parseNumber(parts[i])
            if (!Number.isNaN(number)) {
                if (isValidChar(number)) {
                    ss.push(String.fromCharCode(number))
                } else {
                    return ''
                }
            }
        }
        return ss.join("")
    }
    return s
}
