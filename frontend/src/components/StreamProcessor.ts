import { ReadableStream } from "stream/web";

export class StreamProcessor {
    private buffer: string = '';
    private decoder = new TextDecoder('utf-8');

    constructor(
        private onMessage: (message: any) => void,
        private onError?: (error: string) => void
    ) { }

    async processStream(stream: ReadableStream<Uint8Array>) {
        const reader = stream.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // Process any remaining buffered data when stream ends
                    this.processBuffer(true);
                    break;
                }

                if (value) {
                    // Decode the chunk and add it to the buffer
                    this.buffer += this.decoder.decode(value, { stream: true });
                    this.processBuffer();
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Stream processing error';
            this.onError?.(errorMessage);
        }
    }

    private processBuffer(isEnd: boolean = false) {
        let boundary: number;

        while ((boundary = this.buffer.indexOf('\n')) >= 0) {
            const completeLine = this.buffer.slice(0, boundary).trim(); // Extract the complete line
            this.buffer = this.buffer.slice(boundary + 1); // Remove the processed line from the buffer

            if (completeLine.startsWith('data: ')) {
                const jsonString = completeLine.slice(6); // Remove the "data: " prefix
                try {
                    const parsedMessage = JSON.parse(jsonString);
                    this.onMessage(parsedMessage);
                } catch (error) {
                    const errorMessage = `Failed to parse JSON: ${jsonString}`;
                    console.error(errorMessage, error);
                    this.onError?.(errorMessage);
                }
            }
        }

        if (isEnd && this.buffer.trim()) {
            // If it's the end of the stream and there's leftover data
            try {
                const parsedMessage = JSON.parse(this.buffer.trim());
                this.onMessage(parsedMessage);
            } catch (error) {
                const errorMessage = `Failed to parse JSON at the end of stream: ${this.buffer.trim()}`;
                console.error(errorMessage, error);
                this.onError?.(errorMessage);
            }
        }
    }
}
