import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'bytesToGb'
})

export class BytesToGbPipe implements PipeTransform{
    transform(bytes: string | number, decimals:number = 2): string {
     if (bytes === '' || bytes === null || bytes === undefined)
         return '0 GB';   
       
    //Convert string to number
    const bytesNum = typeof bytes === 'string' ? Number(bytes) : bytes;

    //Handle invalid numbers
    if(isNaN(bytesNum) || !isFinite(bytesNum) ||bytesNum < 0) return 'Invalid';

    //Handle zero
    if(bytesNum === 0) return '0 GB';

    const gb = bytesNum/(1024*1024*1024);
    return gb.toFixed(decimals) + ' GB' 

    }
}
