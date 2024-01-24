import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class UtilitiesService {
    constructor(
        private readonly httpService: HttpService
    ) { }

    isMoreThanTimeApart(date1: Date, timeDifferenceMilliseconds: number): boolean {
        const timeDifferenceInSeconds = Math.abs((date1.getTime() - new Date().getTime()) / 1000);
        return timeDifferenceInSeconds > (timeDifferenceMilliseconds / 1000);
    }

    async isValidImageLink(url: string): Promise<boolean> {
        try {
            const response: AxiosResponse = await this.httpService.axiosRef.head(url)
            const contentType = response.headers['content-type'];
            return contentType && contentType.startsWith('image/');
        } catch (error) {
            return false;
        }
    }

    replaceEncodedCharacters(name: string) {
        const decodedFilename = decodeURIComponent(name);
        const substitutedFilename = decodedFilename.replace(/%(..)/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        return substitutedFilename;
    }

    async isValidUrl(url: string): Promise<boolean> {
        try {
            const response = await this.httpService.axiosRef.head(url)
            if (response.status >= 200 && response.status < 300) return true
            return false
        } catch (error) {
            return false;
        }
    }
}