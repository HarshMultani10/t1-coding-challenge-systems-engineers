import { PnL } from "./types";
import { getPnLCollection } from "./db";

 // YOUR CODE HERE
export async function getPnls(): Promise<Array<PnL>> {
    try {
        const collection = getPnLCollection();
        
        // Get the most recent 50 PnL calculations, sorted by creation time
        const pnlCalculations = await collection
            .find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        // Transform the data to match the frontend PnL interface
        const pnls: PnL[] = pnlCalculations.map(calc => {
            console.log('Processing PnL calc:', JSON.stringify(calc, null, 2));
            
            if (!calc.startTime || !calc.endTime) {
                console.error('Missing startTime or endTime in PnL calc:', calc);
                return null;
            }
            
            return {
                startTime: typeof calc.startTime === 'string' ? calc.startTime : calc.startTime.toISOString(),
                endTime: typeof calc.endTime === 'string' ? calc.endTime : calc.endTime.toISOString(),
                pnl: calc.pnl
            };
        }).filter(Boolean) as PnL[];

        console.log(`Sending ${pnls.length} PnL records via JSON endpoint at ${new Date().toISOString()}`);
        return pnls;
    } catch (error) {
        console.error('Error fetching PnL data:', error);
        return [];
    }
}