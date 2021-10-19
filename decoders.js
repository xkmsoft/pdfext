import { inflateSync } from "zlib"
import { pngDecode } from "./filters.js"

export const Decoders = {
    ASCIIHexDecode: "ASCIIHexDecode",
    ASCII85Decode: "ASCII85Decode",
    LZWDecode: "LZWDecode",
    FlateDecode: "FlateDecode",
    RunLengthDecode: "RunLengthDecode",
    CCITTFaxDecode: "CCITTFaxDecode",
    JBIG2Decode: "JBIG2Decode",
    DCTDecode: "DCTDecode",
    JPXDecode: "JPXDecode",
    Crypt: "Crypt",
}

export const FlateDecode = (data, decodeParams) => {
    if (decodeParams === undefined) {
        try {
            return inflateSync(data)
        } catch (e) {
            throw e
        }
    }
    const { Predictor, Columns } = decodeParams
    if (Predictor !== undefined && Columns !== undefined) {
        try {
            const inflated = inflateSync(data)
            return pngDecode(inflated, Predictor, Columns)
        } catch (e) {
            throw e
        }
    }
    throw new Error(`FlateDecode: DecodeParms is defined but either Predictor or Columns is missing`)
}
