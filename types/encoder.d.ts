declare module 'wav-encoder' {
    export interface WavData {
        sampleRate: number;
        channelData: Float32Array[];
    }

    export function encode(data: WavData): Promise<ArrayBuffer>;
}
