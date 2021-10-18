"use strict"

export const WSP = {
    NULL: 0x00,
    HT: 0x09,
    LF: 0x0A,
    FF: 0x0C,
    CR: 0x0D,
    SP: 0x20,
}

export const DLM = {
    LeftParenthesis: 0x28,
    RightParenthesis: 0x29,
    LessThanSign: 0x3C,
    GreaterThanSign: 0x3E,
    LeftSquareBracket: 0x5B,
    RightSquareBracket: 0x5D,
    LeftCurlyBracket: 0x7B,
    RightCurlyBracket: 0x7D,
    Solidus: 0x2F,
    PercentSign: 0x25,
}

export const T = {
    Null: 0,
    Boolean: 1,
    Integer: 2,
    Real: 3,
    Name: 4,
    String: 5,
    Array: 6,
    Dictionary: 7,
    Stream: 8,
    Keyword: 10,
    EOF: 11,
}
