export interface Certification {
    _id?: string;
    _rev?: string;
    name: string;
    courseIds: string[];
    templateUrl?: string;
    _attachments?: any;
}
