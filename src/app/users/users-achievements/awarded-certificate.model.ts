export interface AwardedCertificate {
    _id?: string;
    _rev?: string;
    certificationId: string;
    userId: string;
    status: 'pending' | 'approved' | 'denied';
    issuedAt?: string;
    fullName: string,
    courseName: string,
    templateUrl?: string;
}
