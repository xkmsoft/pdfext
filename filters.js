import {Buffer} from "buffer";

export const FilterBytes = {
    Sub: 1,
    Up: 2,
    Average: 3,
    Paeth: 4,
}

export const PredictionTypes = {
    No: 1,
    TIFF: 2,
    None: 10,
    Sub: 11,
    Up: 12,
    Average: 13,
    Paeth: 14,
    Optimum: 15,
}

export const createRows = (data, columns, filterByte) => {
    const rows = []
    let buffer = []
    for (let i = 0; i < data.length; i++) {
        if (buffer.length === columns + 1) {
            if (buffer[0] !== filterByte) {
                throw new Error("Malformed png up encoding")
            }
            buffer.shift()
            rows.push(buffer)
            buffer = []
        }
        buffer.push(data[i])
    }
    if (buffer[0] !== filterByte) {
        throw new Error("Malformed png up encoding")
    }
    buffer.shift()
    rows.push(buffer)
    return rows
}

export const pngDecode = (data, predictor, columns) => {
    switch (predictor) {
        case PredictionTypes.No:
            return data
        case PredictionTypes.TIFF:
            throw new Error(`Prediction type TIFF (${predictor}) is not implemented yet`)
        case PredictionTypes.None:
            return data
        case PredictionTypes.Sub:
            throw new Error(`Prediction type Sub (${predictor}) is not implemented yet`)
        case PredictionTypes.Up:
            try {
                const rows = createRows(data, columns, FilterBytes.Up)
                let prior = Buffer.from(new Array(columns).fill(0))
                const filtered = []
                let buffer = []
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    for (let j = 0; j < row.length; j++) {
                        const byte = (row[j] + prior[j]) % 256
                        buffer.push(byte)
                    }
                    filtered.push(buffer)
                    prior = buffer
                    buffer = []
                }
                return Buffer.from(filtered.flat())
            } catch (e) {
                throw e
            }
        case PredictionTypes.Average:
            throw new Error(`Prediction type Average (${predictor}) is not implemented yet`)
        case PredictionTypes.Paeth:
            throw new Error(`Prediction type Paeth (${predictor}) is not implemented yet`)
        case PredictionTypes.Optimum:
            throw new Error(`Prediction type Optimum (${predictor}) is not implemented yet`)
        default:
            throw new Error(`Unknown predictor (${predictor})`)
    }
}
